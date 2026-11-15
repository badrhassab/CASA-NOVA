import React, { useEffect, useState } from "react";
import axios from "axios";
import Header from "../components/Header";
import "./Destinations.css";
import Planet3D from "../components/Planet3D";
import HealthImpact from "../components/HealthImpact";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
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

function normalizeDestination(d, index = 0) {
  const name = d.name || `Destination ${index + 1}`;
  let slug = d.slug;
  if (!slug) {
    const lower = name.toLowerCase();
    if (lower.includes('mars') || lower.includes('jezero')) slug = 'mars';
    else if (lower.includes('lune') || lower.includes('moon') || lower.includes('artemis') || lower.includes('shackleton')) slug = 'moon';
    else if (lower.includes('europa')) slug = 'europa';
    else if (lower.includes('venus')) slug = 'venus';
    else if (lower.includes('iss') || lower.includes('station')) slug = 'moon';
    else slug = 'mars';
  }

  let comp = {};
  if (typeof d.atmosphere_composition === 'object' && d.atmosphere_composition !== null && !Array.isArray(d.atmosphere_composition)) {
    comp = d.atmosphere_composition;
  } else if (typeof d.atmosphere_composition === 'string') {
    const parts = d.atmosphere_composition.split(',');
    for (const p of parts) {
      const m = p.match(/([\d.]+)\s*%\s*([^()]+)/);
      if (m) {
        comp[m[2].trim()] = parseFloat(m[1]);
      }
    }
    if (Object.keys(comp).length === 0 && d.atmosphere_composition.trim()) {
      comp[d.atmosphere_composition] = 100;
    }
  }

  const surface_gravity_g = d.surface_gravity_g != null
    ? parseFloat(d.surface_gravity_g)
    : (d.gravity_g != null ? parseFloat(d.gravity_g) : 0.38);

  const gravity_ms2 = d.gravity_ms2 != null
    ? parseFloat(d.gravity_ms2)
    : surface_gravity_g * 9.80665;

  const radiation_msv_per_day = d.radiation_msv_per_day != null
    ? parseFloat(d.radiation_msv_per_day)
    : (d.radiation_environment_msv_yr != null
      ? parseFloat(d.radiation_environment_msv_yr) / 365.25
      : 0.67);

  return {
    ...d,
    slug,
    name,
    body_type: d.body_type || 'Planet',
    orbits: d.orbits || (slug === 'moon' ? 'Earth' : 'Sun'),
    summary: d.summary || `${name} — Target destination for long-duration human exploration.`,
    radius_km: d.radius_km || (slug === 'moon' ? 1737.4 : 3389.5),
    gravity_g: surface_gravity_g,
    gravity_ms2,
    temp_min_c: d.temp_min_c != null ? d.temp_min_c : (d.temperature_min_c != null ? parseFloat(d.temperature_min_c) : -140),
    temp_max_c: d.temp_max_c != null ? d.temp_max_c : (d.temperature_max_c != null ? parseFloat(d.temperature_max_c) : 20),
    temp_mean_c: d.temp_mean_c != null ? d.temp_mean_c : -63,
    atmosphere_summary: d.atmosphere_summary || (typeof d.atmosphere_composition === 'string' ? d.atmosphere_composition : 'Atmospheric telemetry active'),
    atmosphere_composition: comp,
    surface_pressure_kpa: d.surface_pressure_kpa != null ? d.surface_pressure_kpa : 0.636,
    radiation_msv_per_day,
    radiation_notes: d.radiation_notes || (d.radiation_environment_msv_yr ? `${d.radiation_environment_msv_yr} mSv/yr annual baseline radiation environment.` : 'Curiosity and Artemis radiation dosimetry reference.'),
    day_length_hours: d.day_length_hours != null ? parseFloat(d.day_length_hours) : 24.62,
    year_length_days: d.year_length_days || 687,
    distance_from_sun_au: d.distance_from_sun_au || 1.524,
    extra_facts: Array.isArray(d.extra_facts) && d.extra_facts.length ? d.extra_facts : [
      `Earth comm delay: ${d.earth_comm_delay_seconds || 780}s`,
      `Surface gravity: ${surface_gravity_g.toFixed(3)} g`,
      `Atmosphere: ${typeof d.atmosphere_composition === 'string' ? d.atmosphere_composition : 'CO2 / N2'}`
    ]
  };
}

const FALLBACK_DESTINATIONS = [
  {
    slug: "mars",
    name: "Mars - Habitat Cratère Jezero",
    body_type: "planet",
    orbits: "Sun",
    summary: "A cold, dusty desert world with the most Earth-like day of any other planet in the Solar System.",
    radius_km: 3389.5,
    gravity_ms2: 3.72,
    gravity_g: 0.38,
    temp_min_c: -140,
    temp_max_c: 20,
    temp_mean_c: -63,
    atmosphere_summary: "Thin, carbon-dioxide-dominated atmosphere.",
    atmosphere_composition: { "Carbon dioxide": 95.3, "Nitrogen": 2.7, "Argon": 1.6 },
    surface_pressure_kpa: 0.636,
    radiation_msv_per_day: 0.67,
    radiation_notes: "Surface measurement by Curiosity RAD instrument. Galactic cosmic rays present long-term mission cancer risk.",
    day_length_hours: 24.62,
    year_length_days: 687,
    distance_from_sun_au: 1.524,
    extra_facts: ["A Martian day is called a sol (24h 39m).", "Olympus Mons is the largest volcano in the Solar System."],
    comm_delay_min_s: 180,
    comm_delay_max_s: 1320,
    one_way_trip_days: 210,
  },
  {
    slug: "moon",
    name: "Lune - Cratère Shackleton (Base Artemis)",
    body_type: "moon",
    orbits: "Earth",
    summary: "Earth's only natural satellite and the primary proving ground for deep-space human exploration under NASA Artemis.",
    radius_km: 1737.4,
    gravity_ms2: 1.62,
    gravity_g: 0.166,
    temp_min_c: -173,
    temp_max_c: 127,
    temp_mean_c: -20,
    atmosphere_summary: "Trace exosphere. Complete vacuum exposure requires pressurized EVA suits.",
    atmosphere_composition: {},
    surface_pressure_kpa: 0.000000001,
    radiation_msv_per_day: 1.37,
    radiation_notes: "Measured on surface by Chang'e-4. No magnetic shield.",
    day_length_hours: 708.7,
    distance_from_sun_au: 1.0,
    extra_facts: ["Permanently shadowed craters at south pole contain water ice deposits.", "One-way communication delay is only 1.3 seconds."],
    comm_delay_min_s: 1.2,
    comm_delay_max_s: 1.4,
    one_way_trip_days: 3,
  },
  {
    slug: "europa",
    name: "Europa - Sous-sol Glaciaire",
    body_type: "moon",
    orbits: "Jupiter",
    summary: "An icy moon of Jupiter harboring a vast global subsurface ocean with twice the volume of Earth's oceans combined.",
    radius_km: 1560.8,
    gravity_ms2: 1.315,
    gravity_g: 0.134,
    temp_min_c: -220,
    temp_max_c: -130,
    temp_mean_c: -160,
    atmosphere_summary: "Tenuous oxygen atmosphere generated by radiolysis of surface water ice.",
    atmosphere_composition: { "Oxygen": 100 },
    surface_pressure_kpa: 0.0000001,
    radiation_msv_per_day: 5400,
    radiation_notes: "Caught in Jupiter's lethal inner radiation belt. Severe radiation shielding is mandatory.",
    day_length_hours: 85.2,
    distance_from_sun_au: 5.2,
    extra_facts: ["Surface ice crust is 15-25 km thick.", "Subsurface water ocean could support extremophile microbial life."],
    comm_delay_min_s: 1980,
    comm_delay_max_s: 3120,
    one_way_trip_days: 1050,
  }
].map((x, i) => normalizeDestination(x, i));

export default function Destinations() {
  const [list, setList] = useState(FALLBACK_DESTINATIONS);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    axios
      .get(`${API}/destinations/`)
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          const clean = res.data.map((item, i) => normalizeDestination(item, i));
          setList(clean);
        }
      })
      .catch(() => {
        // Fallback already loaded
      });
  }, []);

  const d = list[idx] || FALLBACK_DESTINATIONS[0];
  const go = (step) => setIdx((i) => (i + step + list.length) % list.length);

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
            {comp.map(([gas, pct]) => {
              const numPct = typeof pct === 'number' ? pct : parseFloat(pct) || 100;
              return (
                <div className="comp" key={gas}>
                  <span className="mono">{gas}</span>
                  <div className="track"><i style={{ width: `${Math.min(numPct, 100)}%` }} /></div>
                  <span className="mono">{numPct}%</span>
                </div>
              );
            })}
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
            <button key={x.slug || i} className={i === idx ? "on" : ""} onClick={() => setIdx(i)}>
              <span className="mono">{pad(i + 1)}</span>
              {x.name}
            </button>
          ))}
        </nav>
      </main>
    </div>
  );
}
