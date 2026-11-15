import { DailyRecord } from '../types';

/**
 * Deterministic pseudo-random number generator for reproducible telemetry
 */
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Generates 180 days of realistic astronaut biometric telemetry
 * Contains hidden physiological drifts:
 * - Days 1-89: Stable homeostatic baseline
 * - Day 90+: HRV declining, HR rising (early autonomic / cardiovascular deconditioning)
 * - Day 100+: Reaction time rising (neuromuscular / cognitive fatigue onset)
 * - Day 110+: Sleep duration & Mood score declining (circadian disruption / cumulative mission stress)
 */
export function generateMockDailyRecords(): DailyRecord[] {
  const records: DailyRecord[] = [];

  for (let day = 1; day <= 180; day++) {
    const noise1 = (pseudoRandom(day * 13) - 0.5) * 2;
    const noise2 = (pseudoRandom(day * 29) - 0.5) * 2;
    const noise3 = (pseudoRandom(day * 47) - 0.5) * 2;
    const noise4 = (pseudoRandom(day * 71) - 0.5) * 2;

    // Baseline HR ~62 bpm
    let hr = 62 + noise1 * 2.5;
    if (day > 90) {
      const delta = day - 90;
      hr += Math.min(18, delta * 0.22); // Reaches ~78 bpm
    }

    // Baseline HRV ~68 ms
    let hrv = 68 + noise2 * 3.5;
    if (day > 90) {
      const delta = day - 90;
      hrv -= Math.min(32, delta * 0.38); // Drops to ~36 ms
    }

    // Baseline Reaction Time ~240 ms
    let reactionMs = 240 + noise3 * 12;
    if (day > 100) {
      const delta = day - 100;
      reactionMs += Math.min(75, delta * 0.95); // Climbs to ~315 ms
    }

    // Baseline Sleep ~7.5 hours
    let sleepHours = 7.5 + noise4 * 0.35;
    if (day > 110) {
      const delta = day - 110;
      sleepHours -= Math.min(2.1, delta * 0.032); // Drops to ~5.4 hrs
    }

    // Baseline Mood ~8.5 (1-10)
    let mood = 8.5 + noise1 * 0.4;
    if (day > 110) {
      const delta = day - 110;
      mood -= Math.min(3.5, delta * 0.05); // Drops to ~5.0
    }

    // Microgravity gradual bone/muscle mass shift: baseline 74.5 kg
    const weight = 74.5 - (day * 0.012) + noise2 * 0.15;

    // Daily countermeasure exercise protocol target ~120 min
    let exerciseMin = 120 + noise3 * 8;
    if (day > 120 && mood < 6.5) {
      exerciseMin -= 15 + noise4 * 5; // Slight reduction in stamina/compliance
    }

    // Space radiation background dose (~0.42 mSv/day average, slight GCR variations)
    let radiationMSv = 0.42 + (pseudoRandom(day * 83) - 0.5) * 0.08;
    // Occasional minor solar particle event (SPE) elevation around day 135
    if (day >= 134 && day <= 137) {
      radiationMSv += 0.85;
    }

    records.push({
      day,
      hr: Math.round(hr * 10) / 10,
      hrv: Math.round(hrv * 10) / 10,
      sleepHours: Math.round(sleepHours * 10) / 10,
      mood: Math.max(1, Math.min(10, Math.round(mood * 10) / 10)),
      reactionMs: Math.round(reactionMs),
      weight: Math.round(weight * 10) / 10,
      exerciseMin: Math.max(30, Math.round(exerciseMin)),
      radiationMSv: Math.round(radiationMSv * 100) / 100
    });
  }

  return records;
}

export const MOCK_DAILY_RECORDS = generateMockDailyRecords();
