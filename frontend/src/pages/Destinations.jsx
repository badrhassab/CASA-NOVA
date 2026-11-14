import { useEffect, useState } from "react";
import axios from "axios";
import Header from "../components/Header";
import "./Destinations.css";
import Planet3D from "../components/Planet3D";
import HealthImpact from "../components/HealthImpact";

const API = import.meta.env.VITE_API_URL;
const EARTH_BACKGROUND_MSV_DAY = 0.0075;

const fmt = (v, digits = 2) =>
  v == null ? "—" : Number(v).toLocaleString(undefined, { maximumFractionDigits: digits });
const pad = (n) => String(n).padStart(3, "0");

function formatDuration(hours) {
  if (hours == null) return "—";
  if (hours >= 48) return `${fmt(hours / 24, 1)} Earth days`;
  const h = Math.floor(hours);
  return `${h}h ${Math.round((hours - h) * 60)}m`;
}

function formatTemp(d) {
  if (d.temp_min_c != null && d.temp_max_c != null)
    return `${fmt(d.temp_min_c, 0)}° / ${fmt(d.temp_max_c, 0)}°C`;
  return d.temp_mean_c != null ? `${fmt(d.temp_mean_c, 0)}°C` : "—";
}

function Spec({ label, value, note }) {
  return (
    <div className="spec">
      <div className="mono label">{label}</div>
      <div className="spec-value">{value}</div>
      {note && <div className="mono spec-note">{note}</div>}
    </div>
  );
}

export default function Destinations() {
  const [list, setList] = useState([]);
  const [idx, setIdx] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios
      .get(`${API}/destinations/`)
      .then((res) => setList(res.data))
      .catch(() => setError("Could not load destinations. Is the backend running?"));
  }, []);

  const d = list[idx];
  const go = (step) => setIdx((i) => (i + step + list.length) % list.length);

  if (error) return <div className="planets"><Header /><p className="state">{error}</p></div>;
  if (!d) return <div className="planets"><Header /><p className="state mono">LOADING…</p></div>;

  const radX =
    d.radiation_msv_per_day != null
      ? `${fmt(d.radiation_msv_per_day / EARTH_BACKGROUND_MSV_DAY, 0)}× Earth background`
      : "No surface measurement";
  const comp = Object.entries(d.atmosphere_composition || {});

  return (
    <div className="planets">
      <Header />
      <div className="watermark" aria-hidden>{d.slug}</div>
      <Planet3D key={d.slug} slug={d.slug} />

      <main>
        <section className="hero">
          <div className="hero-left">
            <div className="mono tag"><b /> Destination · {d.body_type}{d.orbits && ` · orbits ${d.orbits}`}</div>
            <h1>{d.name}</h1>
            <p className="mono sub">Environmental specifications for crewed missions</p>
          </div>

          <aside className="hero-card">
            <div className="bar" />
            <div className="mono counter"><span>/ {d.body_type}</span><span>{pad(idx + 1)} / {pad(list.length)}</span></div>
            <p>{d.summary}</p>
            <button className="cta" onClick={() => go(1)}>
              Next destination <span>→</span>
            </button>
          </aside>
        </section>

        <section className="specs">
          <Spec label="Gravity" value={d.gravity_ms2 ? `${fmt(d.gravity_g, 2)} g` : "—"} note={d.gravity_ms2 ? `${fmt(d.gravity_ms2)} m/s²` : null} />
          <Spec label="Temperature" value={formatTemp(d)} note={d.temp_mean_c != null && d.temp_min_c != null ? `mean ${fmt(d.temp_mean_c, 0)}°C` : null} />
          <Spec label="Surface pressure" value={d.surface_pressure_kpa != null ? `${fmt(d.surface_pressure_kpa, 3)} kPa` : "—"} note="Earth ≈ 101.3 kPa" />
          <Spec label="Radiation" value={d.radiation_msv_per_day != null ? `${fmt(d.radiation_msv_per_day)} mSv/d` : "—"} note={radX} />
          <Spec label="Day length" value={formatDuration(d.day_length_hours)} />
          <Spec label="Year length" value={d.year_length_days ? `${fmt(d.year_length_days, 1)} days` : "—"} />
          <Spec label="Radius" value={d.radius_km ? `${fmt(d.radius_km, 1)} km` : "—"} />
          <Spec label="Distance from Sun" value={d.distance_from_sun_au ? `${fmt(d.distance_from_sun_au, 3)} AU` : "—"} />
        </section>

        <HealthImpact key={d.slug} d={d} />

        <section className="columns">
          <div>
            <div className="mono label">Atmosphere</div>
            <p className="body">{d.atmosphere_summary || "—"}</p>
            {comp.map(([gas, pct]) => (
              <div className="comp" key={gas}>
                <span className="mono">{gas}</span>
                <div className="track"><i style={{ width: `${Math.min(pct, 100)}%` }} /></div>
                <span className="mono">{pct}%</span>
              </div>
            ))}
          </div>

          <div>
            <div className="mono label">Radiation environment</div>
            <p className="body">{d.radiation_notes || "—"}</p>
          </div>

          <div>
            <div className="mono label">Good to know</div>
            <ul className="facts">
              {(d.extra_facts || []).map((f) => <li key={f}>{f}</li>)}
            </ul>
          </div>
        </section>

        <nav className="picker">
          {list.map((x, i) => (
            <button key={x.slug} className={i === idx ? "on" : ""} onClick={() => setIdx(i)}>
              <span className="mono">{pad(i + 1)}</span>
              {x.name}
            </button>
          ))}
        </nav>
      </main>
    </div>
  );
}