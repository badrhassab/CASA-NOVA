const TAGS = {
  radiation: { hazard: "Space radiation", nasa: "Radiation-induced cancers" },
  gravity:   { hazard: "Gravity fields", nasa: "Spaceflight-induced bone changes · Reduced fitness" },
  pressure:  { hazard: "Hostile/closed environments", nasa: "Decompression sickness · Hypoxia" },
  thermal:   { hazard: "Hostile/closed environments", nasa: "Injury from spacewalks" },
  circadian: { hazard: "Isolation & confinement", nasa: "Inadequate sleep and irregular schedules" },
  distance:  { hazard: "Distance from Earth", nasa: "Inadequate systems operations support" },
  isolation: { hazard: "Isolation & confinement", nasa: "Behavioral changes · Inadequate teamwork" },
};
const dur = (s) => (s < 60 ? `${fmt(s, 1)} s` : `${fmt(s / 60, 0)} min`);

export const CAREER_LIMIT_MSV = 600; // NASA career effective-dose limit (2022 standard)
export const LEVELS = ["Low", "Moderate", "High", "Extreme"];

const fmt = (v, n = 1) => Number(v).toLocaleString(undefined, { maximumFractionDigits: n });

function timeToLimit(msvPerDay) {
  const days = CAREER_LIMIT_MSV / msvPerDay;
  return days < 1 ? `${fmt(days * 24, 1)} hours` : `${fmt(days, 0)} days`;
}

export const ACTIONS = {
  radiation: [
    "Shelter in the most shielded module during solar particle events",
    "Log cumulative dose at every check-in",
    "Schedule EVAs around space-weather forecasts",
  ],
  gravity: [
    "Resistive + aerobic exercise about 2 h/day",
    "Track bone density and muscle mass at check-ins",
    "Plan a re-adaptation period before returning to Earth gravity",
  ],
  pressure: [
    "Stay in a pressurized habitat or suit at all times",
    "Run suit pressure and leak checks before every EVA",
    "Follow the prebreathe protocol for the suit pressure",
  ],
  thermal: [
    "Use active thermal control in suits and habitat",
    "Limit EVA duration at temperature extremes",
    "Check suit insulation and cooling status before each EVA",
  ],
  circadian: [
    "Keep a fixed 24 h crew clock with a scheduled light/dark cycle",
    "Fix sleep windows and track sleep quality daily",
    "Do not follow the local day length",
  ],
    distance: [
    "Train crew in autonomous medical procedures before departure",
    "Carry onboard diagnostics for store-and-forward telemedicine",
    "Stock food and medicine for the whole mission, since resupply is not possible",
  ],
  isolation: [
    "Schedule regular crew psychological check-ins",
    "Provide private time and small comforts, such as growing fresh plants",
    "Run teamwork and conflict-resolution training",
  ],
};

export function assess(d, days) {
  const out = [];
  const isStar = d.body_type === "star";

  // Radiation
  if (d.radiation_msv_per_day != null) {
    const total = d.radiation_msv_per_day * days;
    const pct = (total / CAREER_LIMIT_MSV) * 100;
    const level = pct < 10 ? 0 : pct < 50 ? 1 : pct < 100 ? 2 : 3;
    out.push({
      key: "radiation", label: "Radiation", level, pct,
      value: `${fmt(total, 0)} mSv`,
      detail: `${fmt(pct, 0)}% of the ${CAREER_LIMIT_MSV} mSv career limit over ${days} days. Limit reached in about ${timeToLimit(d.radiation_msv_per_day)}.`,
    });
  } else {
    out.push({
      key: "radiation", label: "Radiation",
      level: isStar ? 3 : null,
      value: isStar ? "Lethal" : "No data",
      detail: isStar ? "No survivable radiation environment." : "No surface measurement available. Plan using the notes below.",
    });
  }

  // Gravity
  const g = d.gravity_g;
  if (g != null) {
    const level = g < 0.2 ? 2 : g < 0.7 ? 1 : g <= 1.5 ? 0 : g <= 3 ? 2 : 3;
    out.push({
      key: "gravity", label: "Gravity (bone & muscle)", level, value: `${fmt(g, 2)} g`,
      detail: g < 0.7
        ? "Long-term effects of partial gravity are poorly understood. Expect bone and muscle loss without exercise."
        : g <= 1.5 ? "Close to Earth load. Low musculoskeletal risk." : "Heavy load on the heart and skeleton.",
    });
  }

  // Pressure
  const p = d.surface_pressure_kpa;
  {
    let level, detail, value;
    if (isStar) { level = 3; value = "No surface"; detail = "No solid surface or breathable environment."; }
    else if (p == null) { level = 2; value = "Vacuum"; detail = "Essentially no atmosphere. Suit or habitat is required, and decompression is the main risk."; }
    else if (p < 6.3) { level = 2; value = `${fmt(p, 2)} kPa`; detail = "Below the Armstrong limit (about 6.3 kPa), where body fluids boil. Pressure suit required."; }
    else if (p > 1000) { level = 3; value = `${fmt(p, 0)} kPa`; detail = "Crushing pressure, roughly 90 times Earth's."; }
    else if (p > 200) { level = 2; value = `${fmt(p, 0)} kPa`; detail = "Far above Earth pressure."; }
    else { level = 0; value = `${fmt(p, 0)} kPa`; detail = "Within a tolerable range."; }
    out.push({ key: "pressure", label: "Pressure & atmosphere", level, value, detail });
  }

  // Thermal
  const lo = d.temp_min_c ?? d.temp_mean_c;
  const hi = d.temp_max_c ?? d.temp_mean_c;
  if (lo != null && hi != null) {
    const level = hi > 200 || lo < -200 ? 3 : hi > 60 || lo < -80 ? 2 : hi > 40 || lo < -20 ? 1 : 0;
    out.push({
      key: "thermal", label: "Temperature", level,
      value: lo === hi ? `${fmt(lo, 0)}°C` : `${fmt(lo, 0)}° / ${fmt(hi, 0)}°C`,
      detail: level >= 2 ? "Beyond what suits and habitats handle passively. Active thermal control needed." : "Manageable with standard thermal control.",
    });
  }

  // Circadian
  if (d.day_length_hours != null) {
    const ratio = Math.abs(d.day_length_hours - 24) / 24;
    const level = ratio < 0.15 ? 0 : ratio < 0.5 ? 1 : 2;
    out.push({
      key: "circadian", label: "Sleep & circadian rhythm", level,
      value: `${fmt(d.day_length_hours, 1)} h day`,
      detail: level === 0 ? "Close to a 24 h day. Easy to keep a normal rhythm." : "Local day length is far from 24 h, so the body clock needs an artificial schedule.",
    });
  }

    // Distance from Earth
  if (d.comm_delay_max_s != null) {
    const lo = d.comm_delay_min_s ?? d.comm_delay_max_s, hi = d.comm_delay_max_s;
    const trip = d.one_way_trip_days;
    let level = hi <= 5 ? 0 : hi <= 300 ? 1 : hi <= 1800 ? 2 : 3;
    if (trip > 30) level = Math.max(level, 2);
    out.push({
      key: "distance", label: "Distance from Earth", level,
      value: lo === hi ? `${dur(hi)} one way` : `${dur(lo)}–${dur(hi)} one way`,
      detail: `Round-trip radio delay up to ${dur(hi * 2)}, so the crew can't wait for Earth to answer. ` +
        (trip > 30
          ? `Return takes about ${fmt(trip, 0)} days, so emergency evacuation is not an option.`
          : "A quick return to Earth is possible."),
    });
  }

  // Isolation & confinement
  {
    let level = days < 30 ? 0 : days < 180 ? 1 : days < 540 ? 2 : 3;
    if (d.one_way_trip_days > 30 && level >= 1) level = Math.min(3, level + 1);
    out.push({
      key: "isolation", label: "Isolation & confinement", level, value: `${days} days`,
      detail: level === 0
        ? "Short stay. Behavioral risk is low."
        : "Long isolation in a small crew raises the risk of mood changes, sleep problems and team conflict.",
    });
  }

  // Weightless transit bone loss (CSA: up to 1.5% bone mass per month)
  const gr = out.find((r) => r.key === "gravity");
  if (gr && d.one_way_trip_days > 30) {
    const loss = (d.one_way_trip_days / 30) * 1.5;
    gr.detail += ` Weightless transit (${fmt(d.one_way_trip_days, 0)} days one way) could cost up to about ${fmt(loss, 0)}% of bone mass without countermeasures. This is a straight-line extrapolation of the CSA monthly rate.`;
  }

  return out.map((r) => ({ ...r, ...TAGS[r.key] }));
}

export function verdict(risks) {
  const worst = Math.max(...risks.map((r) => (r.level ?? 0)));
  const text = ["GO", "GO WITH COUNTERMEASURES", "GO ONLY WITH MAJOR MITIGATION", "NO-GO"][worst];
  return { worst, text };
}