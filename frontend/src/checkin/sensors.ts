/** Deterministic pseudo-random in [0, 1) seeded by mission day + salt */
function seeded(day: number, salt: number): number {
  const x = Math.sin(day * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function round(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

export const SENSOR_BASELINES = {
  hr: 62,
  spo2: 98,
  temperature: 36.7,
  weight: 75,
  sleepHours: 7,
  resistanceMin: 40,
  cardioMin: 30,
  radiationMSv: 0.5,
} as const;

export type SensorFieldId = keyof typeof SENSOR_BASELINES;

export interface SensorReading {
  hr: number;
  spo2: number;
  temperature: number;
  weight: number;
  sleepHours: number;
  resistanceMin: number;
  cardioMin: number;
  radiationMSv: number;
}

/**
 * Deterministic wearable / instrument snapshot for a mission day.
 * Same day → same values (no flicker on reload).
 */
export function getSensorReading(missionDay: number): SensorReading {
  const d = Math.max(1, Math.floor(missionDay));

  // Mild late-mission drift mirrors mock telemetry trends
  const late = Math.max(0, d - 90);

  const hr = round(62 + seeded(d, 1) * 5 + Math.min(10, late * 0.08), 0);
  const spo2 = round(98 - seeded(d, 2) * 1.5 - (late > 40 ? 0.5 : 0), 0);
  const temperature = round(36.5 + seeded(d, 3) * 0.4, 1);
  const weight = round(74.5 - d * 0.012 + (seeded(d, 4) - 0.5) * 0.3, 1);
  const sleepHours = round(
    Math.max(4, 7.5 - (d > 110 ? (d - 110) * 0.02 : 0) + (seeded(d, 5) - 0.5) * 0.8),
    1,
  );
  const resistanceMin = Math.round(40 + seeded(d, 6) * 15);
  const cardioMin = Math.round(25 + seeded(d, 7) * 12);
  let radiationMSv = round(0.42 + (seeded(d, 8) - 0.5) * 0.1, 2);
  if (d >= 134 && d <= 137) radiationMSv = round(radiationMSv + 0.85, 2);

  return {
    hr: Math.max(40, Math.min(140, hr)),
    spo2: Math.max(90, Math.min(100, spo2)),
    temperature: Math.max(35, Math.min(40, temperature)),
    weight: Math.max(50, Math.min(120, weight)),
    sleepHours: Math.max(0, Math.min(12, sleepHours)),
    resistanceMin: Math.max(0, Math.min(120, resistanceMin)),
    cardioMin: Math.max(0, Math.min(90, cardioMin)),
    radiationMSv: Math.max(0, radiationMSv),
  };
}

/** True when deviation warrants orange delta styling */
export function isLargeDeviation(id: SensorFieldId, value: number): boolean {
  const b = SENSOR_BASELINES[id];
  switch (id) {
    case 'hr':
      return value - b > 8;
    case 'spo2':
      return value < 95;
    case 'temperature':
      return value - b > 0.5;
    case 'weight':
      return Math.abs(value - b) > 2;
    case 'sleepHours':
      return value < 5.5;
    case 'resistanceMin':
      return value < b - 15;
    case 'cardioMin':
      return value < b - 10;
    case 'radiationMSv':
      return value > 1.0;
    default:
      return false;
  }
}

export function formatDelta(value: number, baseline: number, decimals: number): string {
  const delta = round(value - baseline, decimals);
  const sign = delta > 0 ? '+' : '';
  const text =
    decimals > 0 ? `${sign}${delta.toFixed(decimals)}` : `${sign}${delta}`;
  return `${text} vs baseline`;
}

export function formatSensorValue(value: number, decimals: number): string {
  return decimals > 0 ? value.toFixed(decimals) : String(Math.round(value));
}

export const DEFAULT_MISSION_DAY = 180;
