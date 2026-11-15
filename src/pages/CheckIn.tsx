import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { Header } from '../components/Header';
import { useLiveQuery } from 'dexie-react-hooks';
import { getAllDays, addOrUpdateDay } from '../db/queries';
import { BASELINE, computeScores, STATUS_COLORS } from '../lib/scoring';
import { CornerButton } from '../checkin/components/CornerButton';
import { QuestionRenderer } from '../checkin/components/QuestionRenderer';
import { Stepper } from '../checkin/components/Stepper';
import { TwinPreview } from '../checkin/components/TwinPreview';
import {
  NOTES_FIELDS,
  QUESTION_FIELDS,
  SECTIONS,
  formatSectionCounter,
} from '../checkin/questions';
import { STATUS_LABEL } from '../checkin/evaluate';
import { PREFILLED_SUBJECTIVE_KEYS } from '../data/dailyAnswers';
import { formatDelta, isLargeDeviation } from '../checkin/sensors';
import { useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import type { CheckInAnswers, QuestionField, SectionDef, WizardPhase } from '../checkin/types';

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export const CheckIn: React.FC = () => {
  const [searchParams] = useSearchParams();
  // Pre-selected daily answers from seeded PRNG
  const rows = useLiveQuery(getAllDays);
  const dayRows = rows ?? [];
  const lastDay = dayRows.length ? Math.max(...dayRows.map((row) => row.day)) : -1;
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  useEffect(() => {
    if (rows === undefined || selectedDay !== null) return;
    const requestedDay = Number(searchParams.get('day'));
    const initialDay = searchParams.has('day') && Number.isInteger(requestedDay) && requestedDay >= 0 && requestedDay <= lastDay + 1
      ? requestedDay
      : lastDay + 1;
    setSelectedDay(initialDay);
  }, [rows, selectedDay, searchParams, lastDay]);
  const day = selectedDay;
  const storedRow = day === null ? undefined : dayRows.find((row) => row.day === day);
  const previousRow = day === null ? undefined : dayRows.find((row) => row.day === day - 1);
  const dailyDefaults = useMemo(() => {
    if (storedRow) return storedRow.answers;
    const seed = (day ?? 0) + 0x9e3779b9;
    const noise = (offset: number) => {
      let value = (seed + offset) | 0;
      value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
      value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
      return ((value ^ (value >>> 16)) >>> 0) / 4294967296 - 0.5;
    };
    const baseAnswers = previousRow?.answers ?? dayRows[dayRows.length - 1]?.answers;
    const sensors = { ...BASELINE, hr: Math.round(BASELINE.hr + noise(1) * 4), hrv: Math.round(BASELINE.hrv + noise(2) * 4), spo2: Math.round(BASELINE.spo2 + noise(3)), temperature: Number((BASELINE.temperature + noise(4) * 0.2).toFixed(1)), weight: Number((BASELINE.weight + noise(5) * 0.4).toFixed(1)), sleepHours: Number((BASELINE.sleepHours + noise(6) * 0.4).toFixed(1)), resistanceMin: BASELINE.resistanceMin, cardioMin: BASELINE.cardioMin, radiationMSv: BASELINE.radiationMSv };
    return { ...(baseAnswers ?? { sleepQuality: 8, morningFatigue: 3, trainingSession: 'Done' as const, jointPain: 0, painZones: [], facePuffiness: 'none' as const, headache: 'none' as const, blurredVision: 'no' as const, dizziness: 'no' as const, immuneSymptoms: ['None'], solarParticleEvent: 'no' as const, mood: 8, stress: 3, motivation: 8, socialContact: 'normal' as const, reactionMs: 250, notes: '' }), ...sensors };
  }, [storedRow, previousRow, day, dayRows]);

  const [answers, setAnswers] = useState<CheckInAnswers>(() => ({ ...dailyDefaults }));
  const [sectionIndex, setSectionIndex] = useState(0);
  const [phase, setPhase] = useState<WizardPhase>('sections');
  // Initialize with all sections touched so pre-selected answers feed Twin preview immediately
  const [sectionFlash, setSectionFlash] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [ready, setReady] = useState(false);

  // Track fields edited away from today's pre-filled values
  const [editedFields, setEditedFields] = useState<Set<keyof CheckInAnswers>>(() => new Set());

  const stageRef = useRef<HTMLDivElement>(null);
  const navDir = useRef<1 | -1>(1);
  const dateKey = storedRow?.date ?? todayKey();

  // prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => setReady(true), []);

  useEffect(() => {
    if (day === null) return;
    setAnswers({ ...dailyDefaults });
    setEditedFields(new Set());
  }, [day, dailyDefaults]);

  const sensors = useMemo(() => ({ hr: answers.hr, hrv: storedRow?.sensors.hrv ?? BASELINE.hrv, spo2: answers.spo2, temperature: answers.temperature, weight: answers.weight, sleepHours: answers.sleepHours, resistanceMin: answers.resistanceMin, cardioMin: answers.cardioMin, radiationMSv: answers.radiationMSv }), [answers, storedRow]);
  const scores = useMemo(() => computeScores(sensors, answers, BASELINE), [sensors, answers]);
  const twin = useMemo(() => ({ overall: scores.status, why: scores.why, domains: [scores.bone, scores.heart, scores.immune, scores.mind].map((d, i) => ({ ...d, domain: (['bone','heart','immune','mind'] as const)[i] })) }), [scores]);
  const analysis = useMemo(() => ({ ...scores, domains: [scores.bone, scores.heart, scores.immune, scores.mind].map((d, i) => ({ ...d, domain: (['bone','heart','immune','mind'] as const)[i] })) }), [scores]);

  const setField = useCallback(<K extends keyof CheckInAnswers>(id: K, value: CheckInAnswers[K]) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    // If it's a prefillable subjective field, mark it as edited
    if ((PREFILLED_SUBJECTIVE_KEYS as ReadonlyArray<string>).includes(id as string)) {
      setEditedFields((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    }
  }, []);

  const resetToDaily = useCallback(() => {
    setAnswers({ ...dailyDefaults });
    setEditedFields(new Set());
  }, [dailyDefaults]);

  const changeMissionDay = (day: number) => {
    setSelectedDay(day);
    setSectionIndex(0);
    setPhase('sections');
  };

  const animating = useRef(false);

  const animateIn = useCallback(
    (dir: 1 | -1) => {
      const root = stageRef.current;
      if (!root) return;
      const fields = root.querySelectorAll<HTMLElement>('.ck-field');

      if (reducedMotion || prefersReducedMotion()) {
        gsap.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.2 });
        return;
      }

      gsap.fromTo(
        root,
        { y: dir > 0 ? 40 : -30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' },
      );
      if (fields.length) {
        gsap.fromTo(
          fields,
          { y: dir > 0 ? 20 : -12, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.45,
            stagger: 0.08,
            ease: 'power3.out',
            delay: 0.05,
          },
        );
      }
    },
    [reducedMotion],
  );

  const transitionTo = useCallback(
    (dir: 1 | -1, apply: () => void) => {
      if (animating.current) return;
      navDir.current = dir;
      const root = stageRef.current;

      const commit = () => {
        apply();
        window.requestAnimationFrame(() => {
          animating.current = false;
        });
      };

      if (!root || reducedMotion || prefersReducedMotion()) {
        commit();
        return;
      }

      animating.current = true;
      gsap.to(root, {
        y: dir > 0 ? -30 : 40,
        opacity: 0,
        duration: 0.35,
        ease: 'power2.in',
        onComplete: commit,
      });
    },
    [reducedMotion],
  );

  const goNext = useCallback(() => {
    if (phase === 'sections') {
      transitionTo(1, () => {
        setSectionFlash(true);
        window.setTimeout(() => setSectionFlash(false), 700);
        if (sectionIndex < SECTIONS.length - 1) {
          const next = sectionIndex + 1;
          setSectionIndex(next);
        } else {
          setPhase('notes');
        }
      });
      return;
    }

    if (phase === 'notes') {
      transitionTo(1, () => {
        setPhase('recap');
      });
    }
  }, [phase, sectionIndex, transitionTo]);

  const goBack = useCallback(() => {
    if (phase === 'summary') {
      transitionTo(-1, () => setPhase('recap'));
      return;
    }
    if (phase === 'recap') {
      transitionTo(-1, () => setPhase('notes'));
      return;
    }
    if (phase === 'notes') {
      transitionTo(-1, () => {
        setPhase('sections');
        setSectionIndex(SECTIONS.length - 1);
      });
      return;
    }
    if (sectionIndex > 0) {
      transitionTo(-1, () => setSectionIndex((i) => i - 1));
    }
  }, [phase, sectionIndex, transitionTo]);

  // Stage enter animation on section/phase change
  useEffect(() => {
    if (!ready) return;
    animateIn(navDir.current);
  }, [sectionIndex, phase, ready, animateIn]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        goBack();
      } else if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        if (phase !== 'summary' && phase !== 'recap') goNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goBack, goNext, phase]);

  const skipSection = () => goNext();

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  };

  const saveEntry = async () => {
    console.log('SAVE CLICKED', selectedDay);
    try {
      if (selectedDay === null || !Number.isInteger(selectedDay) || selectedDay < 0 || selectedDay > lastDay + 1) {
        throw new Error('Selected mission day is invalid.');
      }
      const n = await addOrUpdateDay(selectedDay, sensors, answers);
      console.log('SAVED', selectedDay, n);
      setPhase('summary');
      showToast('Saved offline ✓ · Day ' + selectedDay + ' · W' + (Math.floor(selectedDay / 7) + 1));
    } catch (e) {
      console.error('SAVE FAILED', e);
      showToast('Save failed: ' + String(e));
    }
  };

  const editSectionFromRecap = (targetIdx: number) => {
    navDir.current = -1;
    setPhase('sections');
    setSectionIndex(targetIdx);
  };

  const currentFields =
    phase === 'notes'
      ? NOTES_FIELDS
      : SECTIONS[sectionIndex]?.fields ?? [];

  const canGoBack = !(phase === 'sections' && sectionIndex === 0);

  const getFieldTag = (fieldId: keyof CheckInAnswers): 'auto' | 'today' | 'edited' | null => {
    const field = QUESTION_FIELDS.find((f) => f.id === fieldId);
    if (field?.auto) return 'auto';
    if (editedFields.has(fieldId)) return 'edited';
    if ((PREFILLED_SUBJECTIVE_KEYS as ReadonlyArray<string>).includes(fieldId as string)) return 'today';
    return null;
  };

  return (
    <div
      className="relative min-h-screen flex flex-col"
      style={{
        backgroundColor: 'var(--bg)',
        color: 'var(--fg)',
        fontFamily: "'Inter Tight', sans-serif",
      }}
    >
      <Header />

      <main
        className="flex-1 w-full mx-auto px-6 md:px-12 pb-16 pt-6"
        style={{ maxWidth: 1280 }}
      >
        <div className="ck-mission-day">
          <label htmlFor="mission-day" className="ck-mono">MISSION DAY <strong>{String(day ?? 0).padStart(3, '0')}</strong>{!storedRow && <span style={{ color: 'var(--orange)', marginLeft: 10 }}>NEW DAY</span>}</label>
          <input id="mission-day" type="range" min="0" max={lastDay + 1} value={day ?? 0} disabled={day === null} onChange={(e) => changeMissionDay(Number(e.target.value))} aria-label="Mission day" />
          <button type="button" className="ck-sync" onClick={() => { changeMissionDay(day ?? 0); setToast('Sensors synced ✓'); window.setTimeout(() => setToast(null), 1800); }}>↻ SYNC SENSORS</button>
        </div>

        <div
          className="ck-layout"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 40,
            alignItems: 'start',
          }}
        >
          {/* ── Wizard column ─────────────────────────────────────────── */}
          <section className="min-w-0">
            <h1
              style={{
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
                letterSpacing: '-0.04em',
                lineHeight: 0.95,
                margin: '0 0 28px',
              }}
            >
              <span style={{ color: 'var(--muted)', fontWeight: 500, display: 'block' }}>
                Daily
              </span>
              <span style={{ color: 'var(--fg)', fontWeight: 600, display: 'block' }}>
                Check-in
              </span>
            </h1>

            {phase === 'sections' && (
              <>
                <Stepper activeIndex={sectionIndex} reducedMotion={reducedMotion} />
                <div className="flex items-center justify-between gap-3 mt-4 mb-8 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: 'var(--muted)',
                      }}
                    >
                      {formatSectionCounter(sectionIndex)}
                    </span>
                    {sectionFlash && (
                      <span
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 11,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: 'var(--orange)',
                        }}
                      >
                        Section complete
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={resetToDaily}
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--muted)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      textDecoration: 'underline',
                      textUnderlineOffset: 3,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--orange)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; }}
                  >
                    Reset to today's answers
                  </button>
                </div>
              </>
            )}

            {phase === 'notes' && (
              <div className="flex items-center justify-between mb-8">
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                  }}
                >
                  Notes · optional
                </span>
              </div>
            )}

            {/* Stage */}
            <div ref={stageRef}>
              {phase === 'sections' || phase === 'notes' ? (
                <>
                  {currentFields.map((field) => (
                    <QuestionRenderer
                      key={field.id}
                      field={field}
                      answers={answers}
                      onChange={setField}
                      reducedMotion={reducedMotion}
                      tag={getFieldTag(field.id)}
                    />
                  ))}

                  <div
                    className="flex items-center justify-between mt-10 gap-4 flex-wrap"
                    style={{ minHeight: 56 }}
                  >
                    <div className="flex items-center gap-4">
                      <CornerButton
                        onClick={goBack}
                        disabled={!canGoBack}
                        ariaLabel="Back"
                      >
                        ←
                      </CornerButton>
                      <button
                        type="button"
                        onClick={skipSection}
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 11,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: 'var(--muted)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        Skip section
                      </button>
                    </div>
                    <CornerButton onClick={goNext} ariaLabel="Next">
                      →
                    </CornerButton>
                  </div>
                </>
              ) : phase === 'recap' ? (
                <RecapScreen
                  answers={answers}
                  editedFields={editedFields}
                  analysis={analysis}
                  onSave={saveEntry}
                  onBack={goBack}
                  onEditSection={editSectionFromRecap}
                  reducedMotion={reducedMotion}
                />
              ) : (
                <div className="ck-summary">
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        background: STATUS_COLORS[analysis.status],
                      }}
                    />
                    <h2
                      style={{
                        fontFamily: "'Inter Tight', sans-serif",
                        fontSize: 'clamp(2rem, 4vw, 3.2rem)',
                        fontWeight: 600,
                        letterSpacing: '-0.04em',
                        margin: 0,
                      }}
                    >
                      {STATUS_LABEL[analysis.status]}
                    </h2>
                  </div>
                  <p
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'var(--muted)',
                      marginBottom: 36,
                    }}
                  >
                    Daily check-in saved · {dateKey}
                  </p>

                  <div className="flex flex-col gap-8 mb-12">
                    {analysis.domains.map((d) => (
                      <div key={d.domain}>
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: STATUS_COLORS[d.status],
                            }}
                          />
                          <span
                            style={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: 12,
                              letterSpacing: '0.1em',
                              textTransform: 'uppercase',
                            }}
                          >
                            {d.domain} · {d.score}
                          </span>
                        </div>
                        <p style={{ margin: '0 0 6px', fontSize: 15, color: 'var(--fg)', lineHeight: 1.45 }}>
                          {d.why}
                        </p>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)', lineHeight: 1.45 }}>
                          → {d.action}
                        </p>
                      </div>
                    ))}
                  </div>

                  <CornerButton
                    onClick={() => {
                      setPhase('sections');
                      setSectionIndex(0);
                    }}
                  >
                    New Check-in
                  </CornerButton>
                </div>
              )}
            </div>
          </section>

          {/* ── Twin preview ──────────────────────────────────────────── */}
          <div className="ck-twin-col">
            <TwinPreview state={twin} reducedMotion={reducedMotion} />
          </div>
        </div>
      </main>

      <footer
        className="px-6 md:px-12 pb-6"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
        }}
      >
        Decision support, not a medical diagnosis.
      </footer>

      {toast && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: 28,
            left: '50%',
            transform: 'translateX(-50%)',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '12px 18px',
            border: '1px solid var(--orange)',
            color: 'var(--orange)',
            background: 'var(--bg)',
            zIndex: 50,
          }}
        >
          {toast}
          {toast?.startsWith('Saved offline') && <Link to={`/report?week=${Math.floor(selectedDay / 7)}`} style={{ display: 'block', marginTop: 8, color: 'var(--fg)', textAlign: 'center' }}>View in Report →</Link>}
        </div>
      )}

      <style>{`
        @media (min-width: 960px) {
          .ck-layout {
            grid-template-columns: 65fr 35fr !important;
          }
          .ck-twin-preview {
            position: sticky;
            top: 24px;
            border-left: 1px solid var(--border) !important;
            border-top: none !important;
            padding: 8px 0 8px 28px !important;
          }
        }
        .ck-twin-col { order: 2; }
        .ck-mission-day { display:flex; align-items:center; gap:18px; margin:0 0 30px; border-bottom:1px solid var(--border); padding:0 0 18px; }
        .ck-mission-day .ck-mono,.ck-sync { font: 11px 'JetBrains Mono',monospace; letter-spacing:.1em; color:var(--muted); }
        .ck-mission-day strong { color:var(--fg); font-size:14px; margin-left:8px; }
        .ck-mission-day input { flex:1; accent-color:var(--orange); }
        .ck-sync { border:0; padding:0; background:none; color:var(--orange); cursor:pointer; white-space:nowrap; }
        @media(max-width:600px) { .ck-mission-day { gap:10px; flex-wrap:wrap; } .ck-mission-day input { order:3; flex-basis:100%; } }
        .ck-twin-preview {
          border-left: none !important;
          border-top: 1px solid var(--border);
          padding: 28px 0 0 !important;
        }
      `}</style>
    </div>
  );
};

// ─── Recap Screen ────────────────────────────────────────────────────────────

interface RecapScreenProps {
  answers: CheckInAnswers;
  editedFields: Set<keyof CheckInAnswers>;
  analysis: ReturnType<typeof computeScores> & { domains: Array<{ domain: string; score: number; status: import('../types').Status; why: string; action: string }> };
  onSave: () => void;
  onBack: () => void;
  onEditSection: (idx: number) => void;
  reducedMotion: boolean;
}

function RecapScreen({
  answers,
  editedFields,
  analysis,
  onSave,
  onBack,
  onEditSection,
  reducedMotion,
}: RecapScreenProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  const toggleSection = (idx: number) => {
    setCollapsed((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // GSAP stagger reveal (0.05s stagger)
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const rows = root.querySelectorAll<HTMLElement>('.recap-row');
    if (!rows.length) return;

    if (reducedMotion || prefersReducedMotion()) {
      gsap.set(rows, { opacity: 1, y: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        rows,
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: 0.35,
          stagger: 0.05,
          ease: 'power2.out',
        },
      );
    }, root);

    return () => ctx.revert();
  }, [reducedMotion]);

  // One-line why
  const nonGreen = analysis.domains.filter((d) => d.status !== 'green');
  const oneLineWhy = nonGreen.length > 0
    ? nonGreen.map((d) => d.why).join(' · ')
    : 'All physiological and subjective markers within nominal baseline limits.';

  const isAbnormalField = (field: QuestionField, value: unknown): boolean => {
    if (field.auto && field.baseline != null && typeof value === 'number') {
      return isLargeDeviation(field.id as never, value);
    }
    if (field.id === 'facePuffiness' && value !== 'none' && value != null) return true;
    if (field.id === 'headache' && value !== 'none' && value != null) return true;
    if (field.id === 'blurredVision' && value === 'yes') return true;
    if (field.id === 'dizziness' && value === 'yes') return true;
    if (field.id === 'immuneSymptoms' && Array.isArray(value) && value.some((s) => s !== 'none')) return true;
    if (field.id === 'solarParticleEvent' && value === 'yes') return true;
    if (field.id === 'jointPain' && typeof value === 'number' && value >= 3) return true;
    if (field.id === 'sleepQuality' && typeof value === 'number' && value <= 4) return true;
    if (field.id === 'morningFatigue' && typeof value === 'number' && value >= 6) return true;
    if (field.id === 'mood' && typeof value === 'number' && value <= 5) return true;
    if (field.id === 'stress' && typeof value === 'number' && value >= 6) return true;
    if (field.id === 'motivation' && typeof value === 'number' && value <= 4) return true;
    if (field.id === 'socialContact' && value === 'none') return true;
    return false;
  };

  const formatAnswerValue = (field: QuestionField, value: unknown): string => {
    if (value == null) return '—';
    if (Array.isArray(value)) {
      if (value.length === 0) return 'NONE';
      return value.join(', ').toUpperCase();
    }
    if (typeof value === 'number') {
      const decimals = field.decimals ?? 0;
      const numStr = decimals > 0 ? value.toFixed(decimals) : String(Math.round(value));
      return field.unit ? `${numStr} ${field.unit.toUpperCase()}` : numStr;
    }
    return String(value).toUpperCase();
  };

  return (
    <div ref={rootRef} className="ck-recap">
      {/* ── Top: overall traffic-light status + one-line Why ─────────── */}
      <div className="recap-row flex items-center gap-3 mb-2">
        <span
          style={{
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: STATUS_COLORS[analysis.status],
            flexShrink: 0,
          }}
        />
        <h2
          style={{
            fontFamily: "'Inter Tight', sans-serif",
            fontSize: 'clamp(2rem, 4vw, 3.2rem)',
            fontWeight: 600,
            letterSpacing: '-0.04em',
            margin: 0,
          }}
        >
          {STATUS_LABEL[analysis.status]}
        </h2>
      </div>

      <p
        className="recap-row"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          letterSpacing: '0.04em',
          color: 'var(--muted)',
          margin: '0 0 32px',
          lineHeight: 1.5,
        }}
      >
        {oneLineWhy}
      </p>

      {/* ── 6 collapsible/stacked sections ──────────────────────────── */}
      <div className="flex flex-col gap-6 mb-12">
        {SECTIONS.map((section: SectionDef) => {
          const isCollapsed = !!collapsed[section.index];

          return (
            <div
              key={section.id}
              className="recap-row"
              style={{
                borderTop: '1px solid var(--border)',
                paddingTop: 16,
              }}
            >
              {/* Section Header */}
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div
                  className="flex items-center gap-3 cursor-pointer select-none"
                  onClick={() => toggleSection(section.index)}
                >
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 12,
                      letterSpacing: '0.1em',
                      color: 'var(--muted)',
                    }}
                  >
                    {isCollapsed ? '[ + ]' : '[ − ]'}
                  </span>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 13,
                      fontWeight: 600,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: 'var(--fg)',
                    }}
                  >
                    {section.label}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onEditSection(section.index)}
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--orange)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Edit ↗
                </button>
              </div>

              {/* Rows */}
              {!isCollapsed && (
                <div className="flex flex-col gap-3 pl-2 sm:pl-6">
                  {section.fields.map((field) => {
                    const visible = field.showIf ? field.showIf(answers) : true;
                    if (!visible) return null;

                    const val = answers[field.id];
                    const abnormal = isAbnormalField(field, val);
                    const isEdited = editedFields.has(field.id);
                    const tagType = field.auto
                      ? 'AUTO'
                      : isEdited
                        ? 'EDITED'
                        : (PREFILLED_SUBJECTIVE_KEYS as ReadonlyArray<string>).includes(field.id as string)
                          ? "TODAY'S ANSWER"
                          : null;

                    // Sensor delta string
                    let deltaStr: string | null = null;
                    if (field.auto && field.baseline != null && typeof val === 'number') {
                      deltaStr = formatDelta(val, field.baseline, field.decimals ?? 0);
                    }

                    return (
                      <div
                        key={field.id}
                        className="flex items-baseline justify-between gap-4 flex-wrap py-1"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            style={{
                              fontFamily: "'Inter Tight', sans-serif",
                              fontSize: 14,
                              color: 'var(--muted)',
                            }}
                          >
                            {field.label}
                          </span>
                          {tagType && (
                            <span
                              style={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: 9,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                color: tagType === 'EDITED' ? 'var(--orange)' : 'var(--muted)',
                                border: `1px solid ${tagType === 'EDITED' ? 'var(--orange)' : 'var(--border)'}`,
                                padding: '1px 5px',
                              }}
                            >
                              {tagType}
                            </span>
                          )}
                        </div>

                        <div className="flex items-baseline gap-3">
                          {deltaStr && (
                            <span
                              style={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontSize: 11,
                                color: abnormal ? 'var(--orange)' : 'var(--muted)',
                                letterSpacing: '0.04em',
                              }}
                            >
                              ({deltaStr})
                            </span>
                          )}
                          <span
                            style={{
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: 14,
                              color: abnormal ? 'var(--orange)' : 'var(--fg)',
                              letterSpacing: '0.02em',
                              fontWeight: abnormal ? 600 : 400,
                            }}
                          >
                            {formatAnswerValue(field, val)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Bottom action buttons ───────────────────────────────────── */}
      <div className="recap-row flex items-center gap-6 flex-wrap">
        <CornerButton accent onClick={onSave}>
          Save entry
        </CornerButton>
        <CornerButton onClick={onBack}>
          Back
        </CornerButton>
      </div>
    </div>
  );
}

export default CheckIn;
