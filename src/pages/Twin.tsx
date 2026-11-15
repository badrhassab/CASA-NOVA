import React, { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import gsap from 'gsap';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Html, OrbitControls, useGLTF } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Header } from '../components/Header';
import { db } from '../db/db';
import type { DailyCheckin } from '../db/db';
import { BASELINE, STATUS_COLORS, computeScores } from '../lib/scoring';
import type { Status } from '../types';

type Domain = 'mind' | 'heart' | 'immune' | 'bone';
type Scores = ReturnType<typeof computeScores>;
type DomainMetric = { label: string; value: string; delta?: string; alert?: boolean };

const DOMAINS: Domain[] = ['mind', 'heart', 'immune', 'bone'];
const DOMAIN_LABEL: Record<Domain, string> = {
  mind: 'MIND',
  heart: 'HEART',
  immune: 'IMMUNE',
  bone: 'BONE & MUSCLE',
};
const SCORE_KEY: Record<Domain, keyof Pick<DailyCheckin, 'scoreBone' | 'scoreHeart' | 'scoreImmune' | 'scoreMind'>> = {
  mind: 'scoreMind',
  heart: 'scoreHeart',
  immune: 'scoreImmune',
  bone: 'scoreBone',
};
const MONO: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };
const DECISION_NOTE = 'Decision support, not a medical diagnosis.';
const BODY_MODEL_PATH = '/models/body.glb';
const SMALL_BUTTON: React.CSSProperties = {
  ...MONO,
  background: 'transparent',
  color: 'var(--orange)',
  border: '1px solid var(--border)',
  borderRadius: 0,
  padding: '8px 10px',
  fontSize: 9,
  cursor: 'pointer',
};

interface BoundaryState {
  error: Error | null;
}

class TwinErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    console.error('Body Twin render error', error);
  }

  render() {
    if (this.state.error) {
      return (
        <TwinShell>
          <Header />
          <main style={{ maxWidth: 1100, width: '100%', margin: 'auto', padding: 32 }}>
            <TwinTitle />
            <pre style={{ ...MONO, whiteSpace: 'pre-wrap', color: 'var(--orange)', marginTop: 28 }}>
              {this.state.error.message}
            </pre>
          </main>
          <TwinFooter />
        </TwinShell>
      );
    }
    return this.props.children;
  }
}

export const Twin: React.FC = () => (
  <TwinErrorBoundary>
    <TwinContent />
  </TwinErrorBoundary>
);

function TwinContent() {
  const rows = useLiveQuery(
    () => db.dailyCheckins.toArray().then((allRows) => allRows.sort((a, b) => a.day - b.day)),
  );
  const [selectedDay, setSelectedDay] = useState<number | undefined>(undefined);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [playing, setPlaying] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [modelState, setModelState] = useState<'checking' | 'available' | 'missing'>('checking');
  const pageRef = useRef<HTMLElement>(null);
  const [answerElement, setAnswerElement] = useState<HTMLParagraphElement | null>(null);

  const lastDay = rows?.length ? Math.max(...rows.map((row) => row.day)) : 0;

  useEffect(() => {
    if (rows?.length && selectedDay === undefined) {
      setSelectedDay(lastDay);
    }
  }, [lastDay, rows, selectedDay]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setReducedMotion(media.matches);
    updateMotionPreference();
    media.addEventListener('change', updateMotionPreference);
    return () => media.removeEventListener('change', updateMotionPreference);
  }, []);

  useEffect(() => {
    let active = true;
    fetch(BODY_MODEL_PATH, { method: 'HEAD' })
      .then((response) => {
        const contentType = response.headers.get('content-type') ?? '';
        const isModelAsset = response.ok && !contentType.includes('text/html');
        if (active) setModelState(isModelAsset ? 'available' : 'missing');
      })
      .catch(() => {
        if (active) setModelState('missing');
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!playing || !rows?.length) return;
    const timer = window.setInterval(() => {
      setSelectedDay((currentDay) => {
        const current = currentDay ?? 0;
        if (current >= lastDay) {
          setPlaying(false);
          return lastDay;
        }
        return current + 1;
      });
    }, 400);
    return () => window.clearInterval(timer);
  }, [lastDay, playing, rows?.length]);

  const row = rows?.find((item) => item.day === selectedDay);
  const scores = useMemo(() => {
    if (!row) return null;
    return computeScores(row.sensors, row.answers, BASELINE);
  }, [row]);
  const cumulativeRadiation = rows && row
    ? rows.filter((item) => item.day <= row.day).reduce((total, item) => total + item.sensors.radiationMSv, 0)
    : 0;
  const previousRow = rows?.find((item) => item.day === (row?.day ?? -1) - 1);
  const overallDelta = row && previousRow ? row.scoreOverall - previousRow.scoreOverall : null;

  useEffect(() => {
    if (!selectedDomain) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedDomain(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [selectedDomain]);

  useEffect(() => {
    const root = pageRef.current;
    if (!root) return;
    const context = gsap.context(() => {
      const entranceTargets = Array.from(root.querySelectorAll<HTMLElement>('[data-twin-entrance]'));
      if (!entranceTargets.length) return;
      if (reducedMotion) {
        gsap.set(entranceTargets, { opacity: 1, y: 0 });
      } else {
        gsap.fromTo(
          entranceTargets,
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 0.55, stagger: 0.08, ease: 'power2.out' },
        );
      }
    }, root);
    return () => context.revert();
  }, [reducedMotion, rows?.length]);

  useEffect(() => {
    const node = answerElement;
    if (!node || !answer) return;
    const context = gsap.context(() => {
      if (reducedMotion) {
        node.textContent = answer;
        return;
      }
      const counter = { index: 0 };
      node.textContent = '';
      gsap.to(counter, {
        index: answer.length,
        duration: Math.min(2.2, answer.length * 0.01),
        ease: 'none',
        onUpdate: () => {
          node.textContent = answer.slice(0, Math.floor(counter.index));
        },
      });
    }, node);
    return () => context.revert();
  }, [answer, answerElement, reducedMotion]);

  if (rows === undefined) {
    return <LoadingState />;
  }

  if (rows.length === 0) {
    return <EmptyState />;
  }

  if (selectedDay === undefined) {
    return <LoadingState />;
  }

  if (!row || !scores) {
    return <EmptyState />;
  }

  const askTwin = (rawQuestion: string) => {
    const response = buildAnswer(rawQuestion, row, scores, rows, cumulativeRadiation);
    setQuestion(rawQuestion);
    setAnswer(response);
  };

  return (
    <TwinShell>
      <Header />
      <main ref={pageRef} className="twin-page" style={{ width: '100%', maxWidth: 1540, margin: '0 auto', padding: '28px clamp(16px, 3vw, 40px) 32px' }}>
        <header data-twin-entrance>
          <TwinTitle />
          <div style={{ ...MONO, marginTop: 12, color: 'var(--muted)', fontSize: 11, letterSpacing: '.1em' }}>
            CDR-001 · DAY {row.day} · W{Math.floor(row.day / 7) + 1}
          </div>
        </header>

        <DaySelector
          day={row.day}
          lastDay={lastDay}
          playing={playing}
          onSelect={setSelectedDay}
          onTogglePlay={() => {
            if (playing) {
              setPlaying(false);
            } else {
              setSelectedDay(0);
              setPlaying(true);
            }
          }}
        />

        <div className="twin-layout">
          <aside data-twin-entrance>
            <OverallPanel row={row} scores={scores} radiation={cumulativeRadiation} delta={overallDelta} />
          </aside>

          <section data-twin-entrance aria-label="Full body twin" className="twin-figure-column">
            <BodyModelFigure
              row={row}
              scores={scores}
              selected={selectedDomain}
              onSelect={(domain) => setSelectedDomain((current) => current === domain ? null : domain)}
              onClear={() => setSelectedDomain(null)}
              reducedMotion={reducedMotion}
              modelState={modelState}
            />
          </section>

          <aside data-twin-entrance className="twin-detail-column">
            {selectedDomain ? (
              <DomainDetail
                row={row}
                domain={selectedDomain}
                scores={scores}
                rows={rows}
                onClose={() => setSelectedDomain(null)}
              />
            ) : (
              <div className="twin-panel twin-detail-empty">
                <div style={MONO_LABEL}>SELECT A BODY PART</div>
                <div className="twin-empty-score">{scores.overall}</div>
                <StatusLine status={scores.status} />
              </div>
            )}
            <VitalsPanel row={row} />
          </aside>
        </div>

        <AskTwin question={question} value={question} answer={answer} answerRef={setAnswerElement} onChange={setQuestion} onAsk={askTwin} />
      </main>
      <TwinFooter />
    </TwinShell>
  );
}

function LoadingState() {
  return (
    <TwinShell>
      <Header />
      <main style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', ...MONO, color: 'var(--muted)' }}>LOADING…</main>
      <TwinFooter />
    </TwinShell>
  );
}

function EmptyState() {
  return (
    <TwinShell>
      <Header />
      <main style={{ maxWidth: 1100, width: '100%', margin: 'auto', padding: 32 }}>
        <TwinTitle />
        <p style={{ ...MONO, color: 'var(--muted)', fontSize: 12, marginTop: 28 }}>No mission-day data is available yet.</p>
        <Link to="/checkin" style={{ ...MONO, color: 'var(--orange)', fontSize: 11 }}>OPEN DAILY CHECK-IN →</Link>
      </main>
      <TwinFooter />
    </TwinShell>
  );
}

function TwinShell({ children }: { children: ReactNode }) {
  return (
    <div className="twin-shell" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--fg)', fontFamily: "'Inter Tight', sans-serif" }}>
      {children}
      <style>{`
        .twin-layout{display:grid;grid-template-columns:minmax(200px,.8fr) minmax(360px,1.55fr) minmax(250px,1fr);gap:20px;align-items:start;margin-top:22px}
        .twin-panel{border:1px solid var(--border);padding:16px;background:var(--bg)}
        .twin-detail-column{display:grid;gap:12px}
        .twin-figure-column{min-width:0}
        .twin-detail-empty{min-height:230px;display:flex;flex-direction:column;justify-content:center;align-items:flex-start}
        .twin-empty-score{${"font-family:'JetBrains Mono',monospace;"}font-size:clamp(64px,8vw,100px);line-height:1;margin:22px 0}
        .twin-bracket{position:relative}
        .twin-bracket:before,.twin-bracket:after{content:'';position:absolute;width:12px;height:12px;border-color:var(--muted);pointer-events:none}
        .twin-bracket:before{left:0;top:0;border-left:1px solid;border-top:1px solid}
        .twin-bracket:after{right:0;bottom:0;border-right:1px solid;border-bottom:1px solid}
        .twin-scanner-frame{position:absolute;inset:14px;z-index:2;pointer-events:none}
        .twin-scanner-corner{position:absolute;width:16px;height:16px;border-color:color-mix(in srgb,var(--fg) 32%,transparent)}
        .twin-scanner-tl{left:0;top:0;border-left:1px solid;border-top:1px solid}
        .twin-scanner-tr{right:0;top:0;border-right:1px solid;border-top:1px solid}
        .twin-scanner-bl{left:0;bottom:0;border-left:1px solid;border-bottom:1px solid}
        .twin-scanner-br{right:0;bottom:0;border-right:1px solid;border-bottom:1px solid}
        .twin-height-ruler{position:absolute;z-index:3;left:12px;top:8%;bottom:8%;width:29px;pointer-events:none;opacity:.28}
        .twin-height-tick{position:absolute;left:0;width:100%;display:flex;align-items:center;justify-content:flex-end;gap:4px;font:8px 'JetBrains Mono',monospace;color:var(--muted)}
        .twin-height-tick i{display:block;width:7px;border-top:1px solid var(--fg)}
        .twin-height-unit{position:absolute;bottom:-13px;right:0;font:7px 'JetBrains Mono',monospace;color:var(--muted)}
        .twin-hotspot-marker{position:relative;width:7px;height:7px;border:1px solid;border-radius:50%;box-shadow:0 0 0 2px color-mix(in srgb,var(--bg) 72%,transparent)}
        .twin-hotspot-ripple{position:absolute;inset:-3px;border:1px solid;border-radius:50%;animation:twin-hotspot-ripple 1.8s ease-out infinite}
        .twin-domain-label{position:relative;width:120px;height:44px;padding:4px 7px;background:color-mix(in srgb,var(--bg) 70%,transparent);border:1px solid;box-sizing:border-box}
        .twin-domain-label-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:10px 'JetBrains Mono',monospace;letter-spacing:.12em;color:var(--muted);line-height:13px}
        .twin-domain-label-scoreline{display:flex;align-items:center;gap:5px;height:22px}
        .twin-domain-label-score{font:22px 'JetBrains Mono',monospace;line-height:22px}
        .twin-domain-label-dot{width:6px;height:6px;flex:0 0 6px;border-radius:50%}
        .twin-domain-label-status{font:9px 'JetBrains Mono',monospace;color:var(--muted);letter-spacing:.04em}
        @keyframes twin-hotspot-ripple{0%{transform:scale(.65);opacity:.8}100%{transform:scale(2.3);opacity:0}}
        .body-region{cursor:pointer;outline:none}
        .body-region .region-hit{fill:var(--fg);fill-opacity:.04;stroke:transparent;stroke-width:1.5;transition:fill-opacity .16s ease,stroke .16s ease}
        .body-region:hover .region-hit,.body-region:focus .region-hit{fill-opacity:.13}
        @media(max-width:1050px){.twin-layout{grid-template-columns:minmax(190px,.7fr) minmax(330px,1.3fr)}.twin-detail-column{grid-column:1/-1;grid-template-columns:1fr 1fr}}
        @media(max-width:700px){.twin-layout{grid-template-columns:1fr}.twin-detail-column{grid-column:auto;grid-template-columns:1fr}.twin-figure-column{grid-row:1}.twin-page{padding-top:18px!important}}
      `}</style>
    </div>
  );
}

function TwinTitle() {
  return (
    <h1 style={{ margin: 0, fontSize: 'clamp(2.5rem,5vw,4.5rem)', lineHeight: .95, letterSpacing: '-.04em' }}>
      <span style={{ display: 'block', color: 'var(--muted)', fontWeight: 500 }}>Body</span>
      <strong style={{ display: 'block', fontWeight: 700 }}>Twin</strong>
    </h1>
  );
}

const MONO_LABEL: React.CSSProperties = { ...MONO, color: 'var(--muted)', letterSpacing: '.12em', fontSize: 10 };

function TwinFooter() {
  return <footer style={{ ...MONO, padding: '14px 28px 22px', color: 'var(--muted)', fontSize: 10 }}>{DECISION_NOTE}</footer>;
}

function DaySelector({ day, lastDay, playing, onSelect, onTogglePlay }: {
  day: number;
  lastDay: number;
  playing: boolean;
  onSelect: (day: number) => void;
  onTogglePlay: () => void;
}) {
  return (
    <div data-twin-entrance className="day-selector" style={{ display: 'grid', gridTemplateColumns: '42px minmax(90px,1fr) 54px 42px auto auto', alignItems: 'center', gap: 10, borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '12px 0', marginTop: 20 }}>
      <CornerButton label="Previous day" onClick={() => onSelect(Math.max(0, day - 1))}>−</CornerButton>
      <input aria-label="Mission day" type="range" min={0} max={lastDay} value={day} onChange={(event) => onSelect(Number(event.target.value))} style={{ width: '100%', accentColor: 'var(--orange)' }} />
      <strong style={{ ...MONO, textAlign: 'center', fontSize: 13 }}>{String(day).padStart(3, '0')}</strong>
      <CornerButton label="Next day" onClick={() => onSelect(Math.min(lastDay, day + 1))}>+</CornerButton>
      <button onClick={() => onSelect(lastDay)} style={{ ...MONO, border: 0, background: 'transparent', color: 'var(--orange)', cursor: 'pointer', fontSize: 10 }}>LATEST</button>
      <button onClick={onTogglePlay} style={{ ...SMALL_BUTTON, whiteSpace: 'nowrap', color: playing ? 'var(--orange)' : 'var(--fg)' }}>{playing ? 'Ⅱ PAUSE' : '▶ PLAY MISSION'}</button>
    </div>
  );
}

function CornerButton({ children, label, onClick }: { children: ReactNode; label: string; onClick: () => void }) {
  return <button aria-label={label} onClick={onClick} style={{ ...MONO, width: 40, height: 40, background: 'transparent', border: '1px solid var(--border)', borderRadius: 0, color: 'var(--fg)', fontSize: 19, cursor: 'pointer' }}>{children}</button>;
}

function OverallPanel({ row, scores, radiation, delta }: { row: DailyCheckin; scores: Scores; radiation: number; delta: number | null }) {
  const radiationPercent = Math.min(100, radiation / 600 * 100);
  return (
    <div className="twin-panel twin-bracket">
      <div style={MONO_LABEL}>PROFILE · CDR-001</div>
      <div style={{ ...MONO_LABEL, marginTop: 22 }}>MISSION DAY</div>
      <div style={{ ...MONO, fontSize: 28, marginTop: 3 }}>D{row.day}</div>
      <div style={{ ...MONO_LABEL, marginTop: 20 }}>WEIGHT</div>
      <div style={{ ...MONO, fontSize: 22, marginTop: 3 }}>{row.sensors.weight.toFixed(1)} <small style={{ fontSize: 11 }}>kg</small></div>
      <div style={{ ...MONO_LABEL, marginTop: 20 }}>PERSONAL BASELINE</div>
      <div style={{ ...MONO, fontSize: 10, lineHeight: 1.9, marginTop: 5 }}>HR 62 · HRV 65<br />SpO₂ 98 · SLEEP 7.5 h</div>
      <div style={{ ...MONO_LABEL, marginTop: 20 }}>CUMULATIVE RADIATION</div>
      <div style={{ ...MONO, fontSize: 11, margin: '6px 0' }}>{radiation.toFixed(2)} / 600 mSv</div>
      <div style={{ height: 2, background: 'var(--border)' }}><div style={{ width: `${radiationPercent}%`, height: 2, background: 'var(--orange)' }} /></div>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 26 }}>
        <strong style={{ ...MONO, fontSize: 'clamp(54px,7vw,84px)', lineHeight: 1 }}>{scores.overall}</strong>
        <StatusLine status={scores.status} />
      </div>
      <div style={{ ...MONO, color: delta != null && delta < 0 ? 'var(--orange)' : 'var(--muted)', fontSize: 10, marginTop: 7 }}>{delta == null ? '—' : `${delta > 0 ? '+' : ''}${delta} VS PREVIOUS DAY`}</div>
    </div>
  );
}

function StatusLine({ status }: { status: Status }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, ...MONO, fontSize: 10 }}><i style={{ display: 'inline-block', width: 8, height: 8, background: STATUS_COLORS[status], borderRadius: '50%' }} />{status.toUpperCase()}</span>;
}

interface PreparedPart {
  id: string;
  name: string;
  domain: Domain;
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  scale: THREE.Vector3;
  materials: THREE.Material[];
}

interface PreparedModel {
  parts: PreparedPart[];
  anchors: Record<Domain, THREE.Vector3>;
  meshNames: string[];
}

interface RimShaderState {
  color: { value: THREE.Color };
  intensity: { value: number };
}

let meshNamesLogged = false;

class ModelFallbackBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error('Anatomical model could not be prepared; using the procedural body.', error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function BodyModelFigure({ row, scores, selected, onSelect, onClear, reducedMotion, modelState }: {
  row: DailyCheckin;
  scores: Scores;
  selected: Domain | null;
  onSelect: (domain: Domain) => void;
  onClear: () => void;
  reducedMotion: boolean;
  modelState: 'checking' | 'available' | 'missing';
}) {
  const fallback = (
    <ProceduralBodyFigure
      row={row}
      scores={scores}
      selected={selected}
      onSelect={onSelect}
      onClear={onClear}
      reducedMotion={reducedMotion}
    />
  );
  useEffect(() => {
    if (modelState === 'available') useGLTF.preload(BODY_MODEL_PATH);
  }, [modelState]);
  if (modelState === 'missing') return fallback;
  if (modelState === 'checking') {
    return (
      <div className="twin-panel twin-bracket" style={{ minHeight: '75vh', display: 'grid', placeItems: 'center' }}>
        <span style={{ ...MONO, color: 'var(--muted)', fontSize: 10 }}>LOADING MODEL…</span>
      </div>
    );
  }
  return (
    <ModelFallbackBoundary fallback={fallback}>
      <BodyCanvas onClear={onClear}>
        <Suspense fallback={<Html center><div style={{ ...MONO, color: 'var(--muted)', fontSize: 10, whiteSpace: 'nowrap' }}>LOADING MODEL…</div></Html>}>
          <BodyModelScene row={row} scores={scores} selected={selected} onSelect={onSelect} reducedMotion={reducedMotion} />
        </Suspense>
      </BodyCanvas>
    </ModelFallbackBoundary>
  );
}

function BodyCanvas({ children, onClear }: {
  children: ReactNode;
  onClear: () => void;
}) {
  return (
    <div className="twin-panel twin-bracket twin-body-stage" style={{ minHeight: 520, height: 'clamp(520px, 80vh, 900px)', minWidth: 0, position: 'relative', overflow: 'hidden', padding: 0 }}>
      <div style={{ ...MONO_LABEL, position: 'absolute', zIndex: 1, left: 16, top: 16 }}>BODY TWIN · 3D</div>
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, -0.1, 4.1], fov: 30 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        onPointerMissed={onClear}
        shadows={false}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.25} />
        <directionalLight position={[-3, 3, 4]} color="#FFF2E2" intensity={1.15} />
        <directionalLight position={[3, 2, -3]} color="#D8E2F0" intensity={1.25} />
        <directionalLight position={[3, 1, 4]} color="#F3E9DC" intensity={0.25} />
        {children}
        <Environment preset="city" background={false} environmentIntensity={0.3} />
      </Canvas>
      <div aria-hidden="true" className="twin-scanner-frame">
        <i className="twin-scanner-corner twin-scanner-tl" />
        <i className="twin-scanner-corner twin-scanner-tr" />
        <i className="twin-scanner-corner twin-scanner-bl" />
        <i className="twin-scanner-corner twin-scanner-br" />
      </div>
      <div aria-hidden="true" className="twin-height-ruler">
        {[0, 50, 100, 150, 180].map((height) => (
          <div key={height} className="twin-height-tick" style={{ bottom: `${8 + (height / 180) * 82}%` }}>
            <span>{height}</span><i />
          </div>
        ))}
        <span className="twin-height-unit">CM</span>
      </div>
      <div style={{ ...MONO_LABEL, position: 'absolute', zIndex: 3, bottom: 12, left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
        DRAG TO ROTATE · CLICK A REGION
      </div>
    </div>
  );
}

function ProceduralBodyFigure({ row, scores, selected, onSelect, onClear, reducedMotion }: {
  row: DailyCheckin;
  scores: Scores;
  selected: Domain | null;
  onSelect: (domain: Domain) => void;
  onClear: () => void;
  reducedMotion: boolean;
}) {
  const source = useMemo(createProceduralBody, []);
  const prepared = useMemo(() => prepareModel(source), [source]);

  useEffect(() => () => {
    source.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.dispose();
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((material) => material.dispose());
    });
  }, [source]);

  return (
    <BodyCanvas onClear={onClear}>
      <InteractiveBodyScene
        row={row}
        scores={scores}
        selected={selected}
        onSelect={onSelect}
        reducedMotion={reducedMotion}
        prepared={prepared}
      />
    </BodyCanvas>
  );
}

function BodyModelScene({ row, scores, selected, onSelect, reducedMotion }: {
  row: DailyCheckin;
  scores: Scores;
  selected: Domain | null;
  onSelect: (domain: Domain) => void;
  reducedMotion: boolean;
}) {
  const { scene: gltfScene } = useGLTF(BODY_MODEL_PATH);
  const prepared = useMemo(() => prepareModel(gltfScene), [gltfScene]);
  return (
    <InteractiveBodyScene
      row={row}
      scores={scores}
      selected={selected}
      onSelect={onSelect}
      reducedMotion={reducedMotion}
      prepared={prepared}
    />
  );
}

function InteractiveBodyScene({ row, scores, selected, onSelect, reducedMotion, prepared }: {
  row: DailyCheckin;
  scores: Scores;
  selected: Domain | null;
  onSelect: (domain: Domain) => void;
  reducedMotion: boolean;
  prepared: PreparedModel;
}) {
  const [hovered, setHovered] = useState<Domain | null>(null);
  const [userInteracted, setUserInteracted] = useState(false);
  const [palette, setPalette] = useState({ foreground: '#F2F2F0', light: false });
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const bodyRootRef = useRef<THREE.Group>(null);
  const statuses: Record<Domain, Status> = {
    mind: scores.mind.status,
    heart: scores.heart.status,
    immune: scores.immune.status,
    bone: scores.bone.status,
  };
  const domainResults = { mind: scores.mind, heart: scores.heart, immune: scores.immune, bone: scores.bone };
  const intensityScale = palette.light ? 0.6 : 1;
  const focusedTarget = useMemo(
    () => selected ? prepared.anchors[selected] : null,
    [prepared, selected],
  );

  useEffect(() => {
    const readPalette = () => {
      const styles = getComputedStyle(document.documentElement);
      setPalette({
        foreground: styles.getPropertyValue('--fg').trim() || '#F2F2F0',
        light: document.documentElement.classList.contains('light'),
      });
    };
    readPalette();
    const observer = new MutationObserver(readPalette);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (meshNamesLogged) return;
    console.table(prepared.meshNames.map((name) => ({ mesh: name })));
    meshNamesLogged = true;
  }, [prepared.meshNames]);

  useEffect(() => () => {
    prepared.parts.forEach((part) => {
      part.mesh.geometry.dispose();
      part.materials.forEach((material) => material.dispose());
    });
  }, [prepared]);

  useEffect(() => {
    const context = gsap.context(() => {
      prepared.parts.forEach((part) => {
        const status = statuses[part.domain];
        const isDimmed = selected !== null && selected !== part.domain;
        const isSelected = selected === part.domain;
        const isHovered = hovered === part.domain && !isSelected;
        const rimColor = new THREE.Color(isSelected ? '#FF5A1F' : isHovered ? '#FFFFFF' : STATUS_COLORS[status]);
        const statusIntensity: Record<Status, number> = { green: 0, yellow: 0.25, orange: 0.4, red: 0.55 };
        const rimStrength = isSelected ? 0.7 : isHovered ? 0.2 : statusIntensity[status];
        part.materials.forEach((material) => {
          const tintable = material as THREE.MeshStandardMaterial;
          const baseColor = material.userData.baseColor as THREE.Color | undefined;
          const targetColor = baseColor?.clone().multiplyScalar(isDimmed ? 0.45 : 1);
          if (tintable.color && targetColor) {
            gsap.to(tintable.color, {
              r: targetColor.r,
              g: targetColor.g,
              b: targetColor.b,
              duration: reducedMotion ? 0 : 0.5,
              overwrite: true,
            });
          }
          const rim = material.userData.rimState as RimShaderState | undefined;
          const rimTarget = material.userData.rimTarget as { value: number } | undefined;
          if (rim && rimTarget) {
            gsap.to(rim.color.value, {
              r: rimColor.r,
              g: rimColor.g,
              b: rimColor.b,
              duration: reducedMotion ? 0 : 0.5,
              overwrite: true,
            });
            gsap.to(rimTarget, {
              value: rimStrength * intensityScale,
              duration: reducedMotion ? 0 : 0.5,
              overwrite: true,
            });
          }
        });
      });
    });
    return () => context.revert();
  }, [hovered, intensityScale, palette.light, prepared, reducedMotion, row.day, scores, selected]);

  useFrame(({ clock }) => {
    const bodyRoot = bodyRootRef.current;
    if (bodyRoot && !reducedMotion && !userInteracted) {
      bodyRoot.rotation.y = Math.sin(clock.elapsedTime * 0.35) * 0.035;
    }
    prepared.parts.forEach((part) => {
      const status = statuses[part.domain];
      part.materials.forEach((material) => {
        const rim = material.userData.rimState as RimShaderState | undefined;
        const target = material.userData.rimTarget as { value: number } | undefined;
        if (!rim || !target) return;
        const shouldPulse = !reducedMotion
          && status !== 'green'
          && selected !== part.domain
          && hovered !== part.domain;
        const frequency = status === 'orange' || status === 'red' ? 2.1 : 0.85;
        const pulse = shouldPulse ? Math.max(0, Math.sin(clock.elapsedTime * frequency)) * 0.035 * intensityScale : 0;
        rim.intensity.value = Math.max(0, target.value + pulse);
      });
    });
  });

  return (
    <>
      <ScannerPlatform foreground={palette.foreground} reducedMotion={reducedMotion} />
      <group ref={bodyRootRef}>
        {prepared.parts.map((part) => (
          <group
            key={part.id}
            position={part.position}
            quaternion={part.rotation}
            scale={part.scale}
            onPointerOver={(event) => { event.stopPropagation(); setHovered(part.domain); document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { setHovered(null); document.body.style.cursor = ''; }}
            onClick={(event) => { event.stopPropagation(); onSelect(part.domain); }}
          >
            <primitive object={part.mesh} />
          </group>
        ))}
        {DOMAINS.map((domain) => {
          const anchor = prepared.anchors[domain];
          const isLeft = domain === 'mind' || domain === 'heart';
          const labelY = anchor.y + (domain === 'mind' || domain === 'immune' ? 0.08 : -0.08);
          const labelPosition = new THREE.Vector3(isLeft ? -1.12 : 1.12, labelY, anchor.z);
          const elbow = new THREE.Vector3(isLeft ? -0.91 : 0.91, labelY, anchor.z);
          return (
            <DomainHotspot
              key={domain}
              domain={domain}
              anchor={anchor}
              elbow={elbow}
              labelPosition={labelPosition}
              score={domainResults[domain].score}
              status={statuses[domain]}
              selected={selected === domain}
              reducedMotion={reducedMotion}
              index={DOMAINS.indexOf(domain)}
              ink={palette.foreground}
              bodyRootRef={bodyRootRef}
            />
          );
        })}
      </group>
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan={false}
        minDistance={2.45}
        maxDistance={5.1}
        minPolarAngle={Math.PI / 2 - 0.36}
        maxPolarAngle={Math.PI / 2 + 0.36}
        minAzimuthAngle={-Math.PI / 3}
        maxAzimuthAngle={Math.PI / 3}
        autoRotate={false}
        onStart={() => setUserInteracted(true)}
      />
      <CameraFocus selected={selected} reducedMotion={reducedMotion} controlsRef={controlsRef} focus={focusedTarget} />
    </>
  );
}

function DomainHotspot({ domain, anchor, elbow, labelPosition, score, status, selected, reducedMotion, index, ink, bodyRootRef }: {
  domain: Domain;
  anchor: THREE.Vector3;
  elbow: THREE.Vector3;
  labelPosition: THREE.Vector3;
  score: number;
  status: Status;
  selected: boolean;
  reducedMotion: boolean;
  index: number;
  ink: string;
  bodyRootRef: React.RefObject<THREE.Group | null>;
}) {
  const markerRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);
  const counter = useRef({ value: score });
  const lineProgress = useRef({ value: reducedMotion ? 1 : 0 });
  const worldMarker = useMemo(() => new THREE.Vector3(), []);
  const viewDirection = useMemo(() => new THREE.Vector3(), []);
  const facingDirection = useMemo(() => new THREE.Vector3(), []);
  const leaderData = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const segmentCount = 28;
    for (let segment = 0; segment < 2; segment += 1) {
      const from = segment === 0 ? anchor : elbow;
      const to = segment === 0 ? elbow : labelPosition;
      for (let step = 0; step < segmentCount; step += 1) {
        points.push(from.clone().lerp(to, step / segmentCount));
      }
    }
    points.push(labelPosition.clone());
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: ink, transparent: true, opacity: 0.5, depthTest: false });
    const line = new THREE.Line(geometry, material);
    line.renderOrder = 5;
    line.frustumCulled = false;
    return { line, vertexCount: points.length };
  }, [anchor.x, anchor.y, anchor.z, elbow.x, elbow.y, elbow.z, ink, labelPosition.x, labelPosition.y, labelPosition.z]);
  const markerColor = selected ? '#FF5A1F' : STATUS_COLORS[status];
  const cornerStyle: React.CSSProperties = {
    position: 'absolute',
    width: 6,
    height: 6,
    pointerEvents: 'none',
  };

  useEffect(() => {
    const context = gsap.context(() => {
      if (markerRef.current) {
        gsap.fromTo(markerRef.current, { scale: 0, opacity: 0 }, {
          scale: 1,
          opacity: 1,
          duration: reducedMotion ? 0 : 0.32,
          delay: reducedMotion ? 0 : index * 0.12,
          ease: 'back.out(1.8)',
        });
      }
      if (labelRef.current) {
        gsap.fromTo(labelRef.current, { x: labelPosition.x < 0 ? 12 : -12, opacity: 0 }, {
          x: 0,
          opacity: 1,
          duration: reducedMotion ? 0 : 0.38,
          delay: reducedMotion ? 0 : index * 0.12 + 0.08,
          ease: 'power2.out',
        });
      }
    });
    return () => context.revert();
  }, [index, labelPosition.x, reducedMotion]);

  useEffect(() => {
    const context = gsap.context(() => {
      if (reducedMotion) {
        lineProgress.current.value = 1;
        return;
      }
      gsap.to(lineProgress.current, {
        value: 1,
        duration: 0.55,
        delay: index * 0.12,
        ease: 'power2.out',
        overwrite: true,
      });
    });
    return () => context.revert();
  }, [index, reducedMotion]);

  useEffect(() => {
    const current = counter.current;
    const context = gsap.context(() => {
      gsap.to(current, {
        value: score,
        duration: reducedMotion ? 0 : 0.42,
        ease: 'power2.out',
        onUpdate: () => {
          if (scoreRef.current) scoreRef.current.textContent = String(Math.round(current.value));
        },
      });
    });
    return () => context.revert();
  }, [reducedMotion, score]);

  useEffect(() => () => {
    leaderData.line.geometry.dispose();
    (leaderData.line.material as THREE.Material).dispose();
  }, [leaderData]);

  useFrame(({ camera }) => {
    leaderData.line.geometry.setDrawRange(0, Math.max(2, Math.ceil(leaderData.vertexCount * lineProgress.current.value)));
    const root = bodyRootRef.current;
    if (!root || !markerRef.current || !labelRef.current) return;
    worldMarker.copy(anchor).applyMatrix4(root.matrixWorld);
    facingDirection.set(0, 0, 1).transformDirection(root.matrixWorld);
    viewDirection.copy(camera.position).sub(worldMarker).normalize();
    const visible = facingDirection.dot(viewDirection) > 0.04;
    markerRef.current.style.visibility = visible ? 'visible' : 'hidden';
    labelRef.current.style.visibility = visible ? 'visible' : 'hidden';
    leaderData.line.visible = visible;
  });

  return (
    <>
      <primitive object={leaderData.line} />
      <Html position={anchor} center style={{ pointerEvents: 'none', zIndex: 20 }}>
        <div ref={markerRef} className="twin-hotspot-marker" style={{ background: markerColor, borderColor: markerColor }}>
          {status !== 'green' && <span className="twin-hotspot-ripple" style={{ borderColor: markerColor }} />}
        </div>
      </Html>
      <Html position={labelPosition} center style={{ pointerEvents: 'none', zIndex: 10 }}>
        <div
          ref={labelRef}
          className="twin-domain-label"
          style={{
            borderColor: selected ? 'var(--orange)' : 'color-mix(in srgb, var(--muted) 60%, transparent)',
          }}
        >
          <i style={{ ...cornerStyle, left: -1, top: -1, borderLeft: '1px solid var(--orange)', borderTop: '1px solid var(--orange)' }} />
          <i style={{ ...cornerStyle, right: -1, top: -1, borderRight: '1px solid var(--orange)', borderTop: '1px solid var(--orange)' }} />
          <i style={{ ...cornerStyle, left: -1, bottom: -1, borderLeft: '1px solid var(--orange)', borderBottom: '1px solid var(--orange)' }} />
          <i style={{ ...cornerStyle, right: -1, bottom: -1, borderRight: '1px solid var(--orange)', borderBottom: '1px solid var(--orange)' }} />
          <div className="twin-domain-label-name">{DOMAIN_LABEL[domain]}</div>
          <div className="twin-domain-label-scoreline">
            <span ref={scoreRef} className="twin-domain-label-score" style={{ color: selected ? 'var(--orange)' : 'var(--fg)' }}>{score}</span>
            <i className="twin-domain-label-dot" style={{ background: STATUS_COLORS[status] }} />
            <span className="twin-domain-label-status">{status.toUpperCase()}</span>
          </div>
        </div>
      </Html>
    </>
  );
}

function ScannerPlatform({ foreground, reducedMotion }: { foreground: string; reducedMotion: boolean }) {
  const radii = [0.6, 0.9, 1.2];
  const ringGeometries = useMemo(() => radii.map((radius) => {
    const points = Array.from({ length: 128 }, (_, index) => {
      const angle = (index / 128) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    });
    return new THREE.BufferGeometry().setFromPoints(points);
  }), []);
  const tickGeometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let index = 0; index < 96; index += 1) {
      const angle = (index / 96) * Math.PI * 2;
      const inner = index % 8 === 0 ? 1.12 : 1.17;
      points.push(
        new THREE.Vector3(Math.cos(angle) * inner, Math.sin(angle) * inner, 0),
        new THREE.Vector3(Math.cos(angle) * 1.2, Math.sin(angle) * 1.2, 0),
      );
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  useEffect(() => () => {
    ringGeometries.forEach((geometry) => geometry.dispose());
    tickGeometry.dispose();
  }, [ringGeometries, tickGeometry]);

  return (
    <>
      <group position={[0, -0.925, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        {ringGeometries.map((geometry, index) => (
          <lineLoop key={radii[index]} geometry={geometry}>
            <lineBasicMaterial color={foreground} transparent opacity={[0.25, 0.15, 0.08][index]} depthWrite={false} />
          </lineLoop>
        ))}
        <lineSegments geometry={tickGeometry}>
          <lineBasicMaterial color={foreground} transparent opacity={0.08} depthWrite={false} />
        </lineSegments>
      </group>
      <ScannerSweep reducedMotion={reducedMotion} />
    </>
  );
}

function ScannerSweep({ reducedMotion }: { reducedMotion: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => new THREE.RingGeometry(0.985, 1, 96), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh || reducedMotion) return;
    const progress = (clock.elapsedTime % 6) / 6;
    const y = -0.88 + progress * 1.76;
    const radius = scannerRadiusAt(progress);
    mesh.position.y = y;
    mesh.scale.setScalar(radius);
  });
  return (
    <mesh ref={meshRef} geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.88, 0]} scale={0.1}>
      <meshBasicMaterial color="#FF5A1F" transparent opacity={0.4} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

function scannerRadiusAt(progress: number): number {
  const profile: Array<[number, number]> = [
    [0, 0.09], [0.12, 0.11], [0.28, 0.13], [0.4, 0.17], [0.5, 0.24],
    [0.59, 0.17], [0.69, 0.25], [0.78, 0.37], [0.84, 0.22], [0.91, 0.14], [1, 0.09],
  ];
  const upperIndex = profile.findIndex(([height]) => height >= progress);
  if (upperIndex <= 0) return profile[0][1];
  const [lowHeight, lowRadius] = profile[upperIndex - 1];
  const [highHeight, highRadius] = profile[upperIndex];
  const ratio = (progress - lowHeight) / (highHeight - lowHeight);
  return lowRadius + (highRadius - lowRadius) * ratio;
}

function createProceduralBody(): THREE.Group {
  const body = new THREE.Group();
  body.name = 'procedural-astronaut-body';
  const material = new THREE.MeshStandardMaterial({
    color: '#b7aaa1',
    roughness: 0.78,
    metalness: 0.02,
  });

  const addPart = (
    name: string,
    geometry: THREE.BufferGeometry,
    position: [number, number, number],
    rotation: [number, number, number] = [0, 0, 0],
  ) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    body.add(mesh);
  };

  const capsule = (radius: number, length: number) =>
    new THREE.CapsuleGeometry(radius, length, 6, 12);
  const roundedBox = (width: number, height: number, depth: number, radius: number) =>
    new RoundedBoxGeometry(width, height, depth, 4, radius);
  const sphere = (radius: number) => new THREE.SphereGeometry(radius, 20, 16);

  addPart('head', sphere(0.15), [0, 1.62, 0]);
  addPart('neck', capsule(0.065, 0.12), [0, 1.39, 0]);
  addPart('chest', roundedBox(0.53, 0.48, 0.25, 0.09), [0, 1.08, 0]);
  addPart('abdomen', roundedBox(0.4, 0.37, 0.21, 0.07), [0, 0.67, 0]);
  addPart('pelvis', roundedBox(0.46, 0.24, 0.25, 0.07), [0, 0.36, 0]);

  for (const side of [-1, 1] as const) {
    const suffix = side < 0 ? 'left' : 'right';
    const armRotation = side < 0 ? -0.22 : 0.22;
    addPart(`${suffix}-shoulder`, sphere(0.105), [side * 0.32, 1.25, 0]);
    addPart(`${suffix}-upper-arm`, capsule(0.075, 0.28), [side * 0.41, 1.01, 0], [0, 0, armRotation]);
    addPart(`${suffix}-lower-arm`, capsule(0.061, 0.29), [side * 0.5, 0.64, 0], [0, 0, armRotation * 0.65]);
    addPart(`${suffix}-hand`, sphere(0.069), [side * 0.53, 0.43, 0]);
    addPart(`${suffix}-thigh`, capsule(0.105, 0.34), [side * 0.14, 0.02, 0]);
    addPart(`${suffix}-calf`, capsule(0.074, 0.37), [side * 0.15, -0.47, 0]);
    addPart(`${suffix}-foot`, roundedBox(0.14, 0.09, 0.25, 0.025), [side * 0.15, -0.75, 0.055]);
  }

  return body;
}

function prepareModel(source: THREE.Group): PreparedModel {
  const scene = source.clone(true);
  scene.updateMatrixWorld(true);
  const wholeBox = new THREE.Box3().setFromObject(scene);
  const wholeSize = wholeBox.getSize(new THREE.Vector3());
  const center = wholeBox.getCenter(new THREE.Vector3());
  const scaleFactor = 1.8 / Math.max(wholeSize.y, 0.001);
  const width = Math.max(wholeSize.x, 0.001);
  const rawParts: Array<{ name: string; domain: Domain; mesh: THREE.Mesh; position: THREE.Vector3; rotation: THREE.Quaternion; scale: THREE.Vector3; bounds: THREE.Box3 }> = [];
  const meshNames: string[] = [];
  const domainCenters: Record<Domain, THREE.Vector3[]> = { mind: [], heart: [], immune: [], bone: [] };

  scene.traverse((object) => {
    const candidate = object as THREE.Mesh;
    if (!candidate.isMesh || !candidate.geometry) return;
    const name = candidate.name || candidate.geometry.name || 'unnamed mesh';
    meshNames.push(name);
    const worldPosition = new THREE.Vector3();
    const worldRotation = new THREE.Quaternion();
    const worldScale = new THREE.Vector3();
    candidate.matrixWorld.decompose(worldPosition, worldRotation, worldScale);
    const sourceBounds = new THREE.Box3().setFromObject(candidate);
    const explicitlyNamed = hasDomainMeshName(name);
    const segments = explicitlyNamed
      ? [{ domain: mapMeshDomain(name, sourceBounds.getCenter(new THREE.Vector3()), wholeBox, width), geometry: candidate.geometry.clone(), bounds: sourceBounds }]
      : splitCombinedMesh(candidate, wholeBox, width);
    const normalizedPosition = worldPosition.sub(center).multiplyScalar(scaleFactor);
    worldScale.multiplyScalar(scaleFactor);

    segments.forEach((segment, segmentIndex) => {
      const boundsCenter = segment.bounds.getCenter(new THREE.Vector3());
      domainCenters[segment.domain].push(boundsCenter);
      const mesh = candidate.clone(false);
      mesh.geometry = segment.geometry;
      mesh.name = `${name} · ${segment.domain}`;
      mesh.userData.domain = segment.domain;
      const clonedMaterials = (Array.isArray(candidate.material) ? candidate.material : [candidate.material]).map((material) => {
        const clone = material.clone();
        const tintable = clone as THREE.MeshStandardMaterial;
        if (tintable.color) {
          const originalColor = tintable.color.clone();
          const baseColor = originalColor.clone().multiplyScalar(0.75).lerp(new THREE.Color('#85827F'), 0.08);
          clone.userData.originalColor = originalColor;
          clone.userData.baseColor = baseColor.clone();
          tintable.color.copy(baseColor);
        }
        tintable.roughness = 0.65;
        tintable.metalness = 0.05;
        if (tintable.emissive) tintable.emissive.set('#000000');
        tintable.emissiveIntensity = 0;
        const rimState: RimShaderState = {
          color: { value: new THREE.Color('#000000') },
          intensity: { value: 0 },
        };
        clone.userData.rimState = rimState;
        clone.userData.rimTarget = { value: 0 };
        tintable.onBeforeCompile = (shader) => {
          shader.uniforms.astroguardRimColor = rimState.color;
          shader.uniforms.astroguardRimIntensity = rimState.intensity;
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            '#include <common>\nuniform vec3 astroguardRimColor;\nuniform float astroguardRimIntensity;',
          );
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <emissivemap_fragment>',
            '#include <emissivemap_fragment>\nfloat astroguardFresnel = pow(1.0 - max(dot(normalize(normal), normalize(-vViewPosition)), 0.0), 2.4);\ntotalEmissiveRadiance += astroguardRimColor * astroguardFresnel * astroguardRimIntensity;',
          );
        };
        tintable.customProgramCacheKey = () => 'astroguard-anatomy-rim-v1';
        tintable.needsUpdate = true;
        return clone;
      });
      mesh.material = Array.isArray(candidate.material) ? clonedMaterials : clonedMaterials[0];
      mesh.position.set(0, 0, 0);
      mesh.quaternion.identity();
      mesh.scale.set(1, 1, 1);
      mesh.matrixAutoUpdate = true;
      rawParts.push({
        name: `${name}-${segment.domain}-${segmentIndex}`,
        domain: segment.domain,
        mesh,
        position: normalizedPosition.clone(),
        rotation: worldRotation.clone(),
        scale: worldScale.clone(),
        bounds: segment.bounds,
      });
    });
  });

  const anchors = {} as Record<Domain, THREE.Vector3>;
  DOMAINS.forEach((domain) => {
    const centers = domainCenters[domain];
    if (!centers.length) {
      const height = domain === 'mind' ? 0.82 : domain === 'heart' ? 0.42 : domain === 'immune' ? 0.05 : -0.48;
      anchors[domain] = new THREE.Vector3(0, height, 0);
      return;
    }
    const averageCenter = centers.reduce((sum, point) => sum.add(point), new THREE.Vector3()).divideScalar(centers.length);
    anchors[domain] = averageCenter.sub(center).multiplyScalar(scaleFactor);
  });

  const markerAt = (xRatio: number, yRatio: number) => new THREE.Vector3(
    wholeBox.min.x + wholeSize.x * xRatio,
    wholeBox.min.y + wholeSize.y * yRatio,
    wholeBox.max.z + wholeSize.z * 0.06,
  ).sub(center).multiplyScalar(scaleFactor);
  anchors.mind = markerAt(0.5, 0.89);
  anchors.heart = markerAt(0.46, 0.69);
  anchors.immune = markerAt(0.5, 0.52);
  anchors.bone = markerAt(0.64, 0.32);

  return {
    parts: rawParts.map((part, index) => ({ ...part, id: `${part.domain}-${index}`, materials: Array.isArray(part.mesh.material) ? part.mesh.material : [part.mesh.material] })),
    anchors,
    meshNames,
  };
}

function hasDomainMeshName(name: string): boolean {
  const lower = name.toLowerCase();
  return [
    'head', 'skull', 'brain', 'face', 'neck',
    'chest', 'thorax', 'pectoral', 'rib', 'heart',
    'abdomen', 'torso', 'stomach', 'belly', 'spine',
    'arm', 'hand', 'shoulder', 'leg', 'thigh', 'calf', 'foot', 'pelvis', 'hip', 'knee',
  ].some((part) => lower.includes(part));
}

function splitCombinedMesh(
  mesh: THREE.Mesh,
  wholeBounds: THREE.Box3,
  wholeWidth: number,
): Array<{ domain: Domain; geometry: THREE.BufferGeometry; bounds: THREE.Box3 }> {
  const sourceGeometry = mesh.geometry;
  const position = sourceGeometry.getAttribute('position');
  const sourceIndices = sourceGeometry.index?.array;
  const triangleVertexCount = sourceIndices?.length ?? position.count;
  if (triangleVertexCount < 3000) {
    const bounds = new THREE.Box3().setFromObject(mesh);
    return [{
      domain: mapMeshDomain(mesh.name, bounds.getCenter(new THREE.Vector3()), wholeBounds, wholeWidth),
      geometry: sourceGeometry.clone(),
      bounds,
    }];
  }

  const wholeHeight = Math.max(wholeBounds.max.y - wholeBounds.min.y, 0.001);
  const centerX = (wholeBounds.min.x + wholeBounds.max.x) / 2;
  const vertexIndices: Record<Domain, number[]> = { mind: [], heart: [], immune: [], bone: [] };
  const localBounds: Record<Domain, THREE.Box3> = {
    mind: new THREE.Box3().makeEmpty(),
    heart: new THREE.Box3().makeEmpty(),
    immune: new THREE.Box3().makeEmpty(),
    bone: new THREE.Box3().makeEmpty(),
  };

  const vertexIndex = (index: number) => sourceIndices ? Number(sourceIndices[index]) : index;
  const worldPoint = new THREE.Vector3();
  const triangleCenter = new THREE.Vector3();
  const point = new THREE.Vector3();
  const localPoint = new THREE.Vector3();
  for (let offset = 0; offset + 2 < triangleVertexCount; offset += 3) {
    const a = vertexIndex(offset);
    const b = vertexIndex(offset + 1);
    const c = vertexIndex(offset + 2);
    worldPoint.set(
      (position.getX(a) + position.getX(b) + position.getX(c)) / 3,
      (position.getY(a) + position.getY(b) + position.getY(c)) / 3,
      (position.getZ(a) + position.getZ(b) + position.getZ(c)) / 3,
    ).applyMatrix4(mesh.matrixWorld);
    triangleCenter.copy(worldPoint);
    const heightRatio = (triangleCenter.y - wholeBounds.min.y) / wholeHeight;
    const distanceFromMidline = Math.abs(triangleCenter.x - centerX);
    let domain: Domain;
    if (heightRatio >= 0.83) {
      domain = 'mind';
    } else if (distanceFromMidline > wholeWidth * 0.17 && heightRatio > 0.28) {
      domain = 'bone';
    } else if (heightRatio >= 0.63) {
      domain = 'heart';
    } else if (heightRatio >= 0.43) {
      domain = 'immune';
    } else {
      domain = 'bone';
    }

    vertexIndices[domain].push(a, b, c);
    for (const index of [a, b, c]) {
      localPoint.set(position.getX(index), position.getY(index), position.getZ(index));
      point.copy(localPoint).applyMatrix4(mesh.matrixWorld);
      localBounds[domain].expandByPoint(localPoint);
    }
  }

  return DOMAINS.flatMap((domain) => {
    const indices = vertexIndices[domain];
    const bounds = localBounds[domain];
    if (indices.length === 0 || bounds.isEmpty()) return [];
    const geometry = sourceGeometry.clone();
    geometry.setIndex(indices);
    geometry.clearGroups();
    geometry.addGroup(0, indices.length, 0);
    geometry.boundingBox = bounds.clone();
    const localCenter = bounds.getCenter(new THREE.Vector3());
    const localRadius = bounds.getSize(new THREE.Vector3()).length() / 2;
    geometry.boundingSphere = new THREE.Sphere(localCenter, localRadius);
    const worldBounds = bounds.clone().applyMatrix4(mesh.matrixWorld);
    return [{ domain, geometry, bounds: worldBounds }];
  });
}

function mapMeshDomain(name: string, center: THREE.Vector3, bounds: THREE.Box3, width: number): Domain {
  const lower = name.toLowerCase();
  const keywords: Array<[Domain, string[]]> = [
    ['mind', ['head', 'skull', 'brain', 'face', 'neck']],
    ['heart', ['chest', 'thorax', 'pectoral', 'rib', 'heart']],
    ['immune', ['abdomen', 'torso', 'stomach', 'belly', 'spine']],
    ['bone', ['arm', 'hand', 'shoulder', 'leg', 'thigh', 'calf', 'foot', 'pelvis', 'hip', 'knee']],
  ];
  const namedDomain = keywords.find(([, words]) => words.some((word) => lower.includes(word)));
  if (namedDomain) return namedDomain[0];

  const height = Math.max(bounds.max.y - bounds.min.y, 0.001);
  const positionRatio = (center.y - bounds.min.y) / height;
  const lateralArm = positionRatio > 0.45 && positionRatio < 0.85 && Math.abs(center.x - (bounds.min.x + bounds.max.x) / 2) > width * 0.12;
  if (lateralArm) return 'bone';
  if (positionRatio >= 0.85) return 'mind';
  if (positionRatio >= 0.6) return 'heart';
  if (positionRatio >= 0.45) return 'immune';
  return 'bone';
}

function CameraFocus({ selected, reducedMotion, controlsRef, focus }: {
  selected: Domain | null;
  reducedMotion: boolean;
  controlsRef?: React.RefObject<OrbitControlsImpl | null>;
  focus?: THREE.Vector3 | null;
}) {
  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);
  useEffect(() => {
    scene.environmentIntensity = 0.2;
  }, [scene]);
  useEffect(() => {
    const controls = controlsRef?.current;
    if (!controls) return;
    const target = focus?.clone() ?? new THREE.Vector3(0, 0, 0);
    const currentTarget = controls.target.clone();
    const direction = camera.position.clone().sub(currentTarget).normalize();
    const destination = target.clone().add(direction.multiplyScalar(selected ? 2.45 : 4.2));
    if (reducedMotion) {
      controls.target.copy(target);
      camera.position.copy(destination);
      controls.update();
      return;
    }
    const context = gsap.context(() => {
      gsap.to(controls.target, {
        x: target.x,
        y: target.y,
        z: target.z,
        duration: 0.8,
        ease: 'power2.inOut',
        onUpdate: () => controls.update(),
      });
      gsap.to(camera.position, {
        x: destination.x,
        y: destination.y,
        z: destination.z,
        duration: 0.8,
        ease: 'power2.inOut',
        onUpdate: () => controls.update(),
      });
    });
    return () => context.revert();
  }, [camera, controlsRef, focus, reducedMotion, scene, selected]);
  return null;
}

function DomainDetail({ row, domain, scores, rows, onClose }: {
  row: DailyCheckin;
  domain: Domain;
  scores: Scores;
  rows: DailyCheckin[];
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const score = scores[domain];
  const reason = row.reasons?.[domain] ?? score;
  const metrics = getDomainMetrics(row, domain);
  const trend = rows
    .filter((item) => item.day <= row.day && item.day >= row.day - 13)
    .map((item) => ({ day: item.day, score: item[SCORE_KEY[domain]] }))
    .sort((a, b) => a.day - b.day);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const context = gsap.context(() => {
      gsap.fromTo(panel, { x: 18, opacity: 0 }, { x: 0, opacity: 1, duration: 0.35, ease: 'power2.out' });
    }, panel);
    return () => context.revert();
  }, [domain]);

  return (
    <section ref={panelRef} className="twin-panel twin-bracket" aria-label={`${DOMAIN_LABEL[domain]} detail`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div style={MONO_LABEL}>{DOMAIN_LABEL[domain]} · DAY {row.day}</div>
        <button onClick={onClose} style={SMALL_BUTTON}>CLOSE</button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 14 }}>
        <strong style={{ ...MONO, fontSize: 46, lineHeight: 1 }}>{score.score}</strong>
        <StatusLine status={score.status} />
      </div>
      <p style={{ ...MONO, fontSize: 10, lineHeight: 1.7, margin: '13px 0 5px' }}><span style={{ color: 'var(--muted)' }}>WHY · </span>{reason.why}</p>
      <p style={{ ...MONO, fontSize: 10, lineHeight: 1.7, margin: '5px 0 10px' }}><span style={{ color: 'var(--muted)' }}>RECOMMENDED ACTION · </span>{reason.action}</p>
      <div style={{ width: '100%', height: 150 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid stroke="var(--muted)" strokeOpacity={0.12} vertical={false} />
            <XAxis dataKey="day" tick={{ fill: 'var(--muted)', fontSize: 9, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: 'var(--muted)', fontSize: 9, fontFamily: 'JetBrains Mono' }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 0, color: 'var(--fg)', fontFamily: 'JetBrains Mono', fontSize: 9 }} />
            <ReferenceLine y={80} stroke="var(--muted)" strokeDasharray="4 4" />
            <ReferenceLine x={row.day} stroke="var(--orange)" strokeWidth={1.5} />
            <Line dataKey="score" type="monotone" stroke="var(--fg)" strokeWidth={1.5} dot={false} activeDot={{ r: 4, fill: 'var(--orange)', stroke: 'var(--bg)' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8, marginTop: 8 }}>
        {metrics.map((metric) => (
          <div key={metric.label} style={{ borderTop: '1px solid var(--border)', paddingTop: 7 }}>
            <div style={{ ...MONO_LABEL, fontSize: 8 }}>{metric.label}</div>
            <div style={{ ...MONO, fontSize: 10, marginTop: 3 }}>{metric.value}</div>
            {metric.delta && <div style={{ ...MONO, color: metric.alert ? 'var(--orange)' : 'var(--muted)', fontSize: 8, marginTop: 3 }}>{metric.delta}</div>}
          </div>
        ))}
      </div>
      {row.answers.blurredVision === 'yes' && <p style={{ ...MONO, color: 'var(--orange)', fontSize: 9, lineHeight: 1.6 }}>SANS WARNING: report vision changes and follow the mission medical protocol.</p>}
      <Link to={`/checkin?day=${row.day}`} style={{ ...MONO, display: 'inline-block', color: 'var(--orange)', fontSize: 9, marginTop: 12 }}>OPEN IN DAILY CHECK-IN →</Link>
    </section>
  );
}

function getDomainMetrics(row: DailyCheckin, domain: Domain): DomainMetric[] {
  const { sensors, answers } = row;
  const deltaMetric = (label: string, value: number, baseline: number, unit: string, alert: boolean): DomainMetric => {
    const delta = value - baseline;
    return {
      label,
      value: `${value}${unit}`,
      delta: `${delta > 0 ? '+' : ''}${Number(delta.toFixed(1))} VS BASELINE`,
      alert,
    };
  };
  const textMetric = (label: string, value: string | number): DomainMetric => ({ label, value: String(value) });
  if (domain === 'mind') {
    return [
      textMetric('MOOD', `${answers.mood}/10`),
      textMetric('STRESS', `${answers.stress}/10`),
      textMetric('SLEEP QUALITY', `${answers.sleepQuality}/10`),
      answers.reactionMs == null
        ? textMetric('REACTION', '—')
        : deltaMetric('REACTION', answers.reactionMs, BASELINE.reactionMs, ' ms', answers.reactionMs > BASELINE.reactionMs + 50),
    ];
  }
  if (domain === 'heart') {
    return [
      deltaMetric('HR', sensors.hr, BASELINE.hr, ' bpm', sensors.hr > BASELINE.hr + 8),
      deltaMetric('HRV', sensors.hrv, BASELINE.hrv, ' ms', sensors.hrv < BASELINE.hrv - 14),
      deltaMetric('SpO₂', sensors.spo2, BASELINE.spo2, '%', sensors.spo2 < 95),
      textMetric('PUFFINESS', answers.facePuffiness ?? 'none'),
      textMetric('HEADACHE', answers.headache ?? 'none'),
      textMetric('BLURRED VISION', answers.blurredVision ?? 'no'),
      textMetric('DIZZINESS', answers.dizziness ?? 'no'),
    ];
  }
  if (domain === 'immune') {
    return [
      deltaMetric('TEMPERATURE', sensors.temperature, BASELINE.temperature, ' °C', sensors.temperature > BASELINE.temperature + 0.5),
      textMetric('SYMPTOMS', answers.immuneSymptoms.join(', ')),
      textMetric('RADIATION', `${sensors.radiationMSv} mSv`),
      textMetric('SOLAR EVENT', answers.solarParticleEvent ?? 'no'),
    ];
  }
  return [
    textMetric('TRAINING SESSION', answers.trainingSession),
    textMetric('JOINT PAIN', `${answers.jointPain}/10`),
    textMetric('PAIN ZONES', answers.painZones.length ? answers.painZones.join(', ') : 'none'),
    textMetric('RESISTANCE MIN', `${answers.resistanceMin} min`),
  ];
}

function VitalsPanel({ row }: { row: DailyCheckin }) {
  const items = [
    { label: 'HR', value: row.sensors.hr, unit: 'bpm', baseline: BASELINE.hr, alert: row.sensors.hr > BASELINE.hr + 8 },
    { label: 'HRV', value: row.sensors.hrv, unit: 'ms', baseline: BASELINE.hrv, alert: row.sensors.hrv < BASELINE.hrv - 14 },
    { label: 'SpO₂', value: row.sensors.spo2, unit: '%', baseline: BASELINE.spo2, alert: row.sensors.spo2 < 95 },
    { label: 'TEMP', value: row.sensors.temperature, unit: '°C', baseline: BASELINE.temperature, alert: row.sensors.temperature > BASELINE.temperature + 0.5 },
    { label: 'SLEEP', value: row.sensors.sleepHours, unit: 'h', baseline: BASELINE.sleepHours, alert: row.sensors.sleepHours < 5.5 },
    { label: 'WEIGHT', value: row.sensors.weight, unit: 'kg', baseline: BASELINE.weight, alert: Math.abs(row.sensors.weight - BASELINE.weight) > 2 },
  ];
  return (
    <div className="twin-panel">
      <div style={MONO_LABEL}>VITALS · AUTO</div>
      {items.map((item) => {
        const delta = item.value - item.baseline;
        return (
          <div key={item.label} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
              <span style={{ ...MONO_LABEL, fontSize: 9 }}>{item.label}</span>
              <span style={{ ...MONO, border: '1px solid var(--border)', padding: '3px 5px', fontSize: 8, color: 'var(--muted)' }}>AUTO · WEARABLE</span>
            </div>
            <div style={{ ...MONO, fontSize: 20, marginTop: 4 }}>{item.value}<small style={{ color: 'var(--muted)', fontSize: 9, marginLeft: 5 }}>{item.unit}</small></div>
            <div style={{ ...MONO, fontSize: 8, color: item.alert ? 'var(--orange)' : 'var(--muted)', marginTop: 3 }}>{delta === 0 ? 'AT BASELINE' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)} VS BASELINE`}</div>
          </div>
        );
      })}
    </div>
  );
}

function AskTwin({ question, value, answer, answerRef, onChange, onAsk }: {
  question: string;
  value: string;
  answer: string;
  answerRef: (node: HTMLParagraphElement | null) => void;
  onChange: (value: string) => void;
  onAsk: (question: string) => void;
}) {
  const prompts = [
    'What is my biggest issue today?',
    'How is my HRV vs my baseline?',
    'How much radiation so far?',
    'What should I do today?',
    'What changed since last week?',
  ];
  return (
    <section data-twin-entrance className="twin-panel" style={{ marginTop: 20 }}>
      <div style={MONO_LABEL}>ASK YOUR TWIN</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 12 }}>
        {prompts.map((prompt) => <button key={prompt} onClick={() => onAsk(prompt)} style={SMALL_BUTTON}>{prompt.toUpperCase()}</button>)}
      </div>
      <form onSubmit={(event) => { event.preventDefault(); onAsk(value); }} style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <input aria-label="Ask your Twin" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Ask about HRV, sleep, radiation..." style={{ flex: 1, minWidth: 0, color: 'var(--fg)', background: 'transparent', border: '1px solid var(--border)', borderRadius: 0, padding: '9px 10px', fontFamily: 'JetBrains Mono', fontSize: 10 }} />
        <button type="submit" style={SMALL_BUTTON}>ASK</button>
      </form>
      {question && <p ref={answerRef} aria-live="polite" style={{ ...MONO, fontSize: 10, lineHeight: 1.8, minHeight: 36, marginBottom: 0 }}>{answer}</p>}
    </section>
  );
}

function buildAnswer(question: string, row: DailyCheckin, scores: Scores, rows: DailyCheckin[], cumulativeRadiation: number) {
  const query = question.toLowerCase();
  let response: string;
  if (query.includes('hrv')) {
    const week = rows.filter((item) => item.day <= row.day && item.day >= row.day - 6);
    const avg = week.length ? week.reduce((sum, item) => sum + item.sensors.hrv, 0) / week.length : row.sensors.hrv;
    response = `HRV ${row.sensors.hrv} ms vs ${BASELINE.hrv} ms baseline (${row.sensors.hrv - BASELINE.hrv >= 0 ? '+' : ''}${row.sensors.hrv - BASELINE.hrv} ms); 7-day average ${avg.toFixed(1)} ms.`;
  } else if (query.includes('radiation')) {
    const events = rows.filter((item) => item.day <= row.day && item.answers.solarParticleEvent === 'yes').length;
    response = `${cumulativeRadiation.toFixed(2)} mSv through day ${row.day}, ${(cumulativeRadiation / 600 * 100).toFixed(1)}% of 600 mSv; ${events} solar event days.`;
  } else if (query.includes('sleep')) {
    response = `Sleep ${row.sensors.sleepHours} h vs ${BASELINE.sleepHours} h baseline; quality ${row.answers.sleepQuality}/10, fatigue ${row.answers.morningFatigue}/10.`;
  } else if (query.includes('mood')) {
    response = `Mood ${row.answers.mood}/10 vs ${BASELINE.mood}/10 baseline; stress ${row.answers.stress}/10, motivation ${row.answers.motivation}/10.`;
  } else if (query.includes('vision')) {
    response = row.answers.blurredVision === 'yes' ? 'SANS WARNING: blurred vision reported. Report vision changes and follow the mission medical protocol.' : 'No blurred vision reported today.';
  } else if (query.includes('bone')) {
    response = `Bone and muscle ${scores.bone.score}/100. ${scores.bone.why}. ${scores.bone.action}`;
  } else if (query.includes('heart')) {
    response = `Heart ${scores.heart.score}/100; HR ${row.sensors.hr} bpm, HRV ${row.sensors.hrv} ms, SpO₂ ${row.sensors.spo2}%. ${scores.heart.why}. ${scores.heart.action}`;
  } else if (query.includes('immune')) {
    response = `Immune ${scores.immune.score}/100; temperature ${row.sensors.temperature} °C, radiation ${row.sensors.radiationMSv} mSv. ${scores.immune.why}. ${scores.immune.action}`;
  } else if (query.includes('biggest') || query.includes('issue')) {
    const worst = [...DOMAINS].sort((left, right) => scores[left].score - scores[right].score)[0];
    response = `Biggest issue: ${DOMAIN_LABEL[worst]} ${scores[worst].score}/100. ${scores[worst].why}. ${scores[worst].action}`;
  } else if (query.includes('should') || query.includes('do today')) {
    const actions = DOMAINS.filter((domain) => scores[domain].status !== 'green').slice(0, 3).map((domain) => scores[domain].action);
    response = actions.length ? actions.join(' ') : 'Keep your routine.';
  } else if (query.includes('changed') || query.includes('last week')) {
    const weekIndex = Math.floor(row.day / 7);
    const currentWeek = rows.filter((item) => Math.floor(item.day / 7) === weekIndex);
    const priorWeek = rows.filter((item) => Math.floor(item.day / 7) === weekIndex - 1);
    if (!priorWeek.length) {
      response = 'No previous week is available for comparison.';
    } else {
      response = DOMAINS.map((domain) => {
        const key = SCORE_KEY[domain];
        const currentAverage = currentWeek.reduce((sum, item) => sum + item[key], 0) / currentWeek.length;
        const priorAverage = priorWeek.reduce((sum, item) => sum + item[key], 0) / priorWeek.length;
        const delta = currentAverage - priorAverage;
        return `${DOMAIN_LABEL[domain]} ${delta > 0 ? '+' : ''}${delta.toFixed(1)}`;
      }).join(' · ');
    }
  } else {
    response = 'I can answer about: HRV, sleep, radiation, mood, bone, heart, immune, vision.';
  }
  return `${response} ${DECISION_NOTE}`;
}
