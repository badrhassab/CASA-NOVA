import { useEffect, useRef, useState } from "react";
import axios from "axios";
import "./LifeSupport.css";
import Header from "../components/Header";

/* ---------- helpers ---------- */
const jitter = (n) => (Math.random() - 0.5) * n;
const low = (v, c, a) => (v < a ? "alarm" : v < c ? "caution" : "ok");
const high = (v, c, a) => (v > a ? "alarm" : v > c ? "caution" : "ok");
const RANK = { ok: 0, caution: 1, alarm: 2 };

const START = {
  o2: 20.9, // cabin O2 %
  p: 101.3, // cabin pressure kPa
  co2: 2.2, // ppCO2 mmHg
  scrub: 97, // scrubber efficiency %
  lsBat: 92, // life-support battery %
  suitO2: 100, // suit O2 reserve %
  suitBat: 100, // suit battery %
  hist: Array(40).fill(2.2),
};

/* Local fallback, mirrors backend/api/life_support.py. */
function step(s, mode, scenario) {
  const eva = mode === "eva";
  const fault = scenario === "scrubber";
  const leak = scenario === "leak";
  const co2 = Math.max(1.8, (fault ? s.co2 + 0.07 : s.co2 + (2.2 - s.co2) * 0.15) + jitter(0.03));
  return {
    o2: 20.9 + jitter(0.06),
    p: Math.min(101.3, leak ? Math.max(40, s.p - 0.6) : s.p + 2),
    co2,
    scrub: fault ? Math.max(35, s.scrub - 2.5) : Math.min(97, s.scrub + 1.5),
    lsBat: Math.max(0, s.lsBat - 0.01),
    suitO2: eva ? Math.max(0, s.suitO2 - 0.15) : Math.min(100, s.suitO2 + 2),
    suitBat: eva ? Math.max(0, s.suitBat - 0.12) : Math.min(100, s.suitBat + 1),
    hist: [...s.hist.slice(1), co2],
  };
}

function assess(s, mode) {
  const ppO2 = (s.p * s.o2) / 100;
  const eva = mode === "eva";
  const list = [
    {
      id: "o2",
      level: low(ppO2, 19, 16),
      title: ["Oxygen is too low.", "Oxygen is thinning."],
      action: "Check the cabin leak log and O₂ supply. Low oxygen can cause hypoxia, so put on the emergency mask if symptoms start.",
    },
    {
      id: "co2",
      level: high(s.co2, 3, 5),
      title: ["CO₂ is too high.", "CO₂ is rising."],
      action: "Switch to the backup scrubber bed and slow your work pace. Raised CO₂ brings headaches and slower thinking.",
    },
    {
      id: "suit",
      level: eva ? low(s.suitO2, 30, 15) : "ok",
      title: ["Return to the airlock now.", "Suit air is running low."],
      action: "End the spacewalk and head back. Spacewalks already carry low-oxygen and high-CO₂ risks.",
    },
    {
      id: "bat",
      level: [low(s.lsBat, 30, 15), eva ? low(s.suitBat, 30, 15) : "ok"].sort((a, b) => RANK[b] - RANK[a])[0],
      title: ["Power is almost gone.", "Power is running low."],
      action: "Cut non-essential loads and switch to the reserve battery.",
    },
  ];
  const issues = list.filter((a) => a.level !== "ok").sort((a, b) => RANK[b.level] - RANK[a.level]);
  return { ppO2, issues, worst: issues[0] };
}

/* ---------- small parts ---------- */
const Bar = ({ pct, level }) => (
  <div className="ls-bar" role="img" aria-label={`${Math.round(pct)} percent`}>
    <span className={`ls-fill ${level}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
  </div>
);

function Spark({ data }) {
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * 240},${48 - ((Math.min(8, Math.max(1.5, v)) - 1.5) / 6.5) * 44}`)
    .join(" ");
  const limitY = 48 - ((5 - 1.5) / 6.5) * 44;
  return (
    <svg className="ls-spark" viewBox="0 0 240 48" preserveAspectRatio="none" aria-hidden="true">
      <line x1="0" x2="240" y1={limitY} y2={limitY} className="limit" />
      <polyline points={pts} />
    </svg>
  );
}

function Ring({ value, level }) {
  const R = 96;
  const C = 2 * Math.PI * R;
  const arc = C * 0.75; // 270 degree gauge
  const frac = Math.max(0, Math.min(1, value / 25));
  const tick = (v) => (
    <line key={v} x1={120 + R - 12} x2={120 + R + 12} y1="120" y2="120" transform={`rotate(${(v / 25) * 270} 120 120)`} />
  );
  return (
    <figure className="ls-ring" aria-label={`Oxygen pressure ${value.toFixed(1)} kilopascals`}>
      <svg viewBox="0 0 240 240" aria-hidden="true">
        <g transform="rotate(135 120 120)">
          <circle className="track" cx="120" cy="120" r={R} strokeDasharray={`${arc} ${C}`} />
          <circle className={`val ${level}`} cx="120" cy="120" r={R} strokeDasharray={`${arc * frac} ${C}`} />
          {[16, 19].map(tick)}
        </g>
      </svg>
      <figcaption>
        <b>{value.toFixed(1)}</b>
        <span>kPa oxygen pressure</span>
        <small>Safe above 19</small>
      </figcaption>
    </figure>
  );
}

const Panel = ({ title, level, children }) => (
  <section className="ls-panel">
    <header>
      <h2>{title}</h2>
      <span className={`ls-dot ${level}`} aria-label={level} />
    </header>
    {children}
  </section>
);

const Seg = ({ value, onChange, options, label }) => (
  <div className="ls-seg" role="group" aria-label={label}>
    {options.map(([v, text]) => (
      <button key={v} aria-pressed={value === v} onClick={() => onChange(v)}>
        {text}
      </button>
    ))}
  </div>
);

const ALERT_ICON = { ok: "✓", caution: "!", alarm: "!!" };

function AlertBanner({ level, issues }) {
  const count = issues.length;
  const label =
    level === "ok"
      ? "All systems nominal"
      : level === "alarm"
        ? `${count} critical alert${count > 1 ? "s" : ""}`
        : `${count} advisory warning${count > 1 ? "s" : ""}`;
  return (
    <div className={`ls-alert ls-alert-${level}`} role="status" aria-live="polite">
      <span className="ls-alert-icon">{ALERT_ICON[level]}</span>
      {label}
    </div>
  );
}

/* ---------- page ---------- */
export default function LifeSupport() {
  const [mode, setMode] = useState("cabin");
  const [scenario, setScenario] = useState("nominal");
  const [s, setS] = useState(START);
  const [online, setOnline] = useState(false);
  const sRef = useRef(START);

  useEffect(() => {
    sRef.current = s;
  }, [s]);

  // Ask the backend for the next second. If it is unreachable, simulate locally.
  const apiBase = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const { data } = await axios.post(
          `${apiBase}/life-support/step/`,
          { state: sRef.current, mode, scenario },
          { timeout: 800 }
        );
        setS(data);
        setOnline(true);
      } catch {
        setS((cur) => step(cur, mode, scenario));
        setOnline(false);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [mode, scenario]);

  const { ppO2, issues, worst } = assess(s, mode);
  const level = worst ? worst.level : "ok";
  const eva = mode === "eva";
  const suitMin = Math.round(s.suitO2 * 4.8); // 100% = 8 h
  const lv = (id) => issues.find((i) => i.id === id)?.level || "ok";

  return (
    <>
      <Header />
      <main className={`ls ls-${level}${!online ? " ls-offline" : ""}`}>
        <div className="ls-top">
          <div>
            <p className="ls-kicker">Oxygen and life support</p>
            <p className="ls-sub">{online ? "Live telemetry · simulated sensors" : "Offline simulation"}</p>
          </div>
          <div className="ls-controls">
            <Seg label="Where are you" value={mode} onChange={setMode} options={[["cabin", "In cabin"], ["eva", "Spacewalk"]]} />
            <Seg
              label="Test scenario"
              value={scenario}
              onChange={setScenario}
              options={[["nominal", "Normal"], ["scrubber", "Scrubber fault"], ["leak", "Cabin leak"]]}
            />
          </div>
        </div>

        <AlertBanner level={level} issues={issues} />

        <div className="ls-hero">
          <div>
            <h1 aria-live="polite">{worst ? worst.title[worst.level === "alarm" ? 0 : 1] : "Air is steady."}</h1>
            <p className="ls-lead">
              {worst
                ? worst.action
                : "Cabin air, CO₂ removal, suit reserve and batteries are all inside safe limits. No action needed."}
            </p>
          </div>
          <Ring value={ppO2} level={lv("o2")} />
        </div>

        <div className="ls-grid">
          <Panel title="Cabin air" level={lv("o2")}>
            <div className="ls-big">
              {s.o2.toFixed(1)}<small>% O₂</small>
            </div>
            <dl>
              <div><dt>Pressure</dt><dd>{s.p.toFixed(1)} kPa</dd></div>
              <div><dt>Oxygen pressure</dt><dd className={lv("o2")}>{ppO2.toFixed(1)} kPa</dd></div>
            </dl>
            <Bar pct={(s.p / 101.3) * 100} level={lv("o2")} />
            <p className="ls-note">Sea-level air is 101.3 kPa and 20.9% O₂.</p>
          </Panel>

          <Panel title="CO₂ removal" level={lv("co2")}>
            <div className="ls-big">
              {s.co2.toFixed(1)}<small>mmHg CO₂</small>
            </div>
            <Spark data={s.hist} />
            <dl>
              <div><dt>Scrubber efficiency</dt><dd>{Math.round(s.scrub)}%</dd></div>
            </dl>
            <Bar pct={s.scrub} level={s.scrub < 60 ? "alarm" : s.scrub < 85 ? "caution" : "ok"} />
            <p className="ls-note">The dashed line marks the demo warning limit.</p>
          </Panel>

          <Panel title="Spacesuit oxygen" level={lv("suit")}>
            <div className="ls-big">
              {Math.floor(suitMin / 60)}h {String(suitMin % 60).padStart(2, "0")}m<small>of air</small>
            </div>
            <Bar pct={s.suitO2} level={eva ? lv("suit") : "ok"} />
            <dl>
              <div><dt>Reserve</dt><dd>{Math.round(s.suitO2)}%</dd></div>
              <div><dt>Suit</dt><dd>{eva ? "In use" : "Docked, refilling"}</dd></div>
            </dl>
            <p className="ls-note">Suit pressure is lower than cabin pressure, so crews prebreathe oxygen first to avoid decompression sickness.</p>
          </Panel>

          <Panel title="Batteries" level={lv("bat")}>
            <dl className="ls-stack">
              <div><dt>Life support</dt><dd>{Math.round(s.lsBat)}%</dd></div>
            </dl>
            <Bar pct={s.lsBat} level={low(s.lsBat, 30, 15)} />
            <dl className="ls-stack">
              <div><dt>Spacesuit</dt><dd>{Math.round(s.suitBat)}%</dd></div>
            </dl>
            <Bar pct={s.suitBat} level={eva ? low(s.suitBat, 30, 15) : "ok"} />
            <p className="ls-note">Suit battery drains only during a spacewalk.</p>
          </Panel>
        </div>

        <section className="ls-why" aria-label="Why this matters">
          <h2>Why we watch these numbers</h2>
          <ul>
            <li><b>Hypoxia.</b> Avoiding the bends on a spacewalk can leave oxygen levels in the body slightly low.</li>
            <li><b>Spacewalk limits.</b> Spacesuits bring low oxygen, high CO₂ and decompression sickness together.</li>
            <li><b>Far from Earth.</b> A reply from the ground can take 20 minutes, so the app must tell you what to do first.</li>
          </ul>
          <p className="ls-note">Values and limits here are demo values for the hackathon, not flight rules.</p>
        </section>
      </main>
    </>
  );
}
