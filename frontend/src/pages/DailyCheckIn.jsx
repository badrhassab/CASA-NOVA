import "./DailyCheckIn.css";
import Planet3D from "../components/Planet3D";

const snapshot = [
  { metric: "Heart rate", val: "74 BPM", status: "Nominal", isHeart: true },
  { metric: "Blood pressure", val: "118 / 76 mmHg", status: "Nominal" },
  { metric: "Oxygen saturation", val: "98% SpO₂", status: "Nominal" },
  { metric: "Sleep", val: "7h 25m", status: "Reviewed" },
];

const schedule = [
  { t: "Morning health assessment", done: true },
  { t: "Breakfast and nutrition review" },
  { t: "Scheduled mission activities" },
  { t: "Physical exercise" },
  { t: "Evening health assessment" },
];

// Each recommendation is tied to a NASA HRP risk from the hackathon resources.
const recommendations = [
  ["Follow the assigned nutrition plan.", "Risk of inadequate food and nutrition: a balanced diet is essential to crew health and performance."],
  ["Maintain the scheduled hydration routine.", "Weightlessness alters blood circulation and fluid distribution, which affects the heart and the eyes."],
  ["Complete assigned physical activities.", "Without load, bones can lose up to 1.5% of their mass each month. Exercise counters bone, muscle and heart losses."],
  ["Report unusual symptoms to medical staff.", "On a deep-space mission, help from Earth is delayed. Early reports keep small issues small."],
];

const medical = [
  ["Vital signs overview", "Heart, pressure, oxygen"],
  ["Sleep and activity monitoring", "Rest and schedule"],
  ["Health alerts", "None active"],
  ["Medical recommendations", "See daily list"],
];

const hazards = [
  ["Space radiation", "Higher than on Earth. Raises cancer risk and can damage DNA.", true],
  ["Isolation and confinement", "Long stays in a small space affect mood and teamwork.", false],
  ["Distance from Earth", "Supplies, instructions and medical care arrive late or not at all.", true],
  ["Gravity fields", "Mars gravity is about 38% of Earth's. Muscles, bones and balance adapt.", true],
  ["Hostile, closed environment", "Thin atmosphere, dust storms and cold. Air, light and microbes must be managed.", true],
];

const ECG_PATH =
  "M 0 30 H 60 C 72 23, 88 23, 100 30 H 125 L 132 36 L 142 5 L 154 55 L 164 30 H 185 C 198 18, 216 18, 230 30 H 300 " +
  "H 360 C 372 23, 388 23, 400 30 H 425 L 432 36 L 442 5 L 454 55 L 464 30 H 485 C 498 18, 516 18, 530 30 H 600 " +
  "H 660 C 672 23, 688 23, 700 30 H 725 L 732 36 L 742 5 L 754 55 L 764 30 H 785 C 798 18, 816 18, 830 30 H 900 " +
  "H 960 C 972 23, 988 23, 1000 30 H 1025 L 1032 36 L 1042 5 L 1054 55 L 1064 30 H 1085 C 1098 18, 1116 18, 1130 30 H 1200";

export default function DailyCheckIn() {
  return (
    <div className="ag">
      <section className="ag-hero" aria-labelledby="greet">
        <div className="ag-ghost" aria-hidden="true">042</div>

        <div className="ag-ecg-wrap" aria-hidden="true">
          <svg className="ag-ecg" viewBox="0 0 1200 60" preserveAspectRatio="none">
            <path className="ag-ecg-base" d={ECG_PATH} />
            <path className="ag-ecg-pulse" d={ECG_PATH} />
          </svg>
        </div>

        <p className="mono tag">MISSION DAY 042 · DAILY OVERVIEW</p>
        <h1 id="greet">Good morning, Commander.</h1>

        <div className="ag-stats">
          <div className="ag-stat ag-stat-heart">
            <span className="mono">Cardiac monitor</span>
            <div className="heart-display">
              <svg className="heart-svg-anim" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              <strong>74 <small>BPM</small></strong>
            </div>
            <span className="mono"><b className="heart-live-dot" /> Sinus rhythm · Live</span>
          </div>

          <div className="ag-stat">
            <span className="mono">Health status</span>
            <strong className="ok">Stable</strong>
            <span className="mono">Overall monitoring</span>
          </div>

          <div className="ag-stat">
            <span className="mono">Mission progress</span>
            <strong>Day 042</strong>
            <span className="mono">Mission day</span>
          </div>

          <div className="ag-stat">
            <span className="mono">Today's tasks</span>
            <strong>4/7</strong>
            <div className="bar" role="progressbar" aria-valuemin="0" aria-valuemax="7" aria-valuenow="4" aria-label="Tasks completed">
              <span style={{ width: `${(4 / 7) * 100}%` }} />
            </div>
          </div>
        </div>
      </section>

      <main className="ag-grid">
        <section className="cell c-profile" aria-labelledby="h-profile">
          <span className="mono">ASTRONAUT PROFILE</span>
          <h2 id="h-profile">Commander Alex Morgan</h2>
          <dl className="kv">
            <div><dt>Name</dt><dd>Commander Alex Morgan</dd></div>
            <div><dt>Mission</dt><dd>ISS Expedition</dd></div>
            <div><dt>Role</dt><dd>Mission Specialist</dd></div>
            <div><dt>Mission day</dt><dd>042</dd></div>
            <div><dt>Crew status</dt><dd>Active</dd></div>
          </dl>
        </section>

        <section className="cell c-snap" aria-labelledby="h-snap">
          <span className="mono">HEALTH SNAPSHOT</span>
          <h2 id="h-snap">Vitals today</h2>
          <table>
            <thead><tr><th>Metric</th><th>Current status</th></tr></thead>
            <tbody>
              {snapshot.map((row) => (
                <tr key={row.metric}>
                  <td>
                    {row.isHeart && (
                      <svg className="heart-inline-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                    )}
                    {row.metric}
                  </td>
                  <td>
                    <span className="val-text">{row.val}</span>
                    <span className="pill">{row.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="cell c-mars" aria-labelledby="h-mars">
          <span className="mono">DESTINATION INTELLIGENCE · 3D PLANETARY SYSTEM</span>
          <h2 id="h-mars">Mars</h2>
          <div className="mars-wrap">
            <Planet3D slug="mars" className="mars-3d" />
            <div className="facts">
              <div><span className="mono">Average temperature</span><strong>−63°C</strong></div>
              <div><span className="mono">Gravity</span><strong>3.71 m/s²</strong></div>
              <div><span className="mono">Atmosphere</span><strong>Mostly CO₂</strong></div>
              <div><span className="mono">Day duration</span><strong>24h 37m</strong></div>
            </div>
          </div>
          <ul className="env">
            <li>Thin atmosphere and low atmospheric pressure.</li>
            <li>High radiation exposure compared with Earth.</li>
            <li>Significant temperature variations.</li>
            <li>Interactive 3D model with orbital starfield. Drag to rotate.</li>
          </ul>
          <p className="note">Interactive 3D Mars model. Drag to spin the planet and observe surface terrain.</p>
        </section>

        <section className="cell c-sched" aria-labelledby="h-sched">
          <span className="mono">TODAY'S SCHEDULE</span>
          <h2 id="h-sched">Today's activities</h2>
          <ol className="sched">
            {schedule.map((s) => (
              <li key={s.t} className={s.done ? "done" : ""}>
                <span>{s.t}</span>
                {s.done && <span className="pill">Done</span>}
              </li>
            ))}
          </ol>
          <ul className="acts" aria-label="Activity categories">
            <li>Health assessment</li>
            <li>Nutrition schedule</li>
            <li>Mission operations</li>
            <li>Exercise and recovery</li>
          </ul>
        </section>

        <section className="cell c-reco" aria-labelledby="h-reco">
          <span className="mono">DAILY RECOMMENDATIONS</span>
          <h2 id="h-reco">What to do today</h2>
          <ul className="reco">
            {recommendations.map(([t, why]) => (
              <li key={t}><strong>{t}</strong><p>{why}</p></li>
            ))}
          </ul>
        </section>

        <section className="cell c-med" aria-labelledby="h-med">
          <span className="mono">HEALTH &amp; MEDICAL SUMMARY</span>
          <h2 id="h-med">Medical summary</h2>
          <ul className="med">
            {medical.map(([a, b]) => (
              <li key={a}><span>{a}</span><span>{b}</span></li>
            ))}
          </ul>
        </section>

        <section className="cell c-hazard" aria-labelledby="h-haz">
          <span className="mono">THE FIVE HAZARDS OF HUMAN SPACEFLIGHT · NASA HRP</span>
          <h2 id="h-haz">What a Mars mission asks of the body</h2>
          <ul className="haz">
            {hazards.map(([t, d, hit]) => (
              <li key={t} className={hit ? "hit" : ""}>
                <span className="mono">{hit ? "RELEVANT TO MARS SURFACE" : "TRACKED IN TRANSIT"}</span>
                <strong>{t}</strong>
                <p>{d}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="ag-foot">
        <span className="mono">Illustrative interface. Values and astronaut identity are placeholders, not actual medical measurements.</span>
        <span className="mono">Source: NASA Human Research Program · Canadian Space Agency</span>
      </footer>
    </div>
  );
}
