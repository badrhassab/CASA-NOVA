import { useState } from "react";
import { assess, verdict, ACTIONS, LEVELS, CAREER_LIMIT_MSV } from "../health/risk";

export default function HealthImpact({ d }) {
  const [days, setDays] = useState(30);
  const [done, setDone] = useState({});

  const risks = assess(d, days);
  const v = verdict(risks);
  const radiation = risks.find((r) => r.key === "radiation");
  const toAct = risks.filter((r) => r.level >= 1);

  const toggle = (id) => setDone((s) => ({ ...s, [id]: !s[id] }));

  return (
    <section className="hi">
      <div className="hi-head">
        <div>
          <div className="mono label">Mission health impact</div>
          <div className={`hi-verdict lv${v.worst}`}>{v.text}</div>
        </div>

        <div className="hi-slider">
          <div className="mono label">Stay duration · {days} days</div>
          <input
            type="range" min="1" max="900" value={days}
            onChange={(e) => setDays(+e.target.value)}
          />
          <div className="mono hi-ticks"><span>1 d</span><span>30 d</span><span>180 d</span><span>900 d</span></div>
        </div>
      </div>

      {radiation?.pct != null && (
        <div className="hi-dose">
          <div className="mono label">
            Cumulative radiation dose · limit {CAREER_LIMIT_MSV} mSv
          </div>
          <div className="hi-bar">
            <i className={`lv${radiation.level}`} style={{ width: `${Math.min(radiation.pct, 100)}%` }} />
          </div>
          <div className="mono hi-dose-n">{radiation.value} · {Math.round(radiation.pct)}%</div>
        </div>
      )}

      <div className="hi-grid">
        {risks.map((r) => (
          <div className="hi-card" key={r.key}>
            <div className="hi-card-top">
              <span className="mono label">{r.label}</span>
              <span className={`mono hi-badge lv${r.level ?? "n"}`}>
                {r.level == null ? "No data" : LEVELS[r.level]}
              </span>
            </div>
            <div className="hi-value">{r.value}</div>
            {r.nasa && <div className="mono hi-nasa">{r.hazard} → {r.nasa}</div>}
            <p>{r.detail}</p>
          </div>
        ))}
      </div>

      {v.worst === 3 ? (
        <p className="hi-stop">
          At least one hazard is not survivable with current technology. No crewed stay is recommended here.
        </p>
      ) : (
        toAct.length > 0 && (
          <div className="hi-actions">
            <div className="mono label">Recommended actions</div>
            <div className="hi-actions-grid">
              {toAct.map((r) => {
                const actionsList = ACTIONS[r.key] || [];
                return (
                  <div key={r.key}>
                    <div className="hi-act-title">{r.label}</div>
                    {actionsList.map((a) => {
                      const id = `${d.slug}:${r.key}:${a}`;
                      return (
                        <label key={id} className={done[id] ? "chk done" : "chk"}>
                          <input type="checkbox" checked={!!done[id]} onChange={() => toggle(id)} />
                          <span>{a}</span>
                        </label>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}

      <p className="mono hi-foot">
        Indicative assessment from published environment data. Not medical advice; the crew flight surgeon decides.
      </p>
    </section>
  );
}