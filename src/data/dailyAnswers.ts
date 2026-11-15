/**
 * Seeded daily answers for every subjective question.
 * Uses mulberry32 PRNG keyed by mission day for reproducibility.
 * Probability distributions follow the hidden sensor drift:
 *   - Before day 90: mostly normal/healthy
 *   - Day 90-110: transitional
 *   - After day 110: mood drops, stress rises, sleep quality falls
 *   - After day 130: headache/blurred vision become more frequent
 */

import type { BodyZone, CheckInAnswers } from '../checkin/types';
import { getSensorReading } from '../checkin/sensors';

// ─── Mulberry32 PRNG ────────────────────────────────────────────────────────

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function pickIndex(rng: () => number, weights: number[], exclude: Set<number>): number {
  const adjusted = weights.map((w, i) => exclude.has(i) ? 0 : w);
  const total = adjusted.reduce((a, b) => a + b, 0);
  if (total <= 0) return -1;
  let r = rng() * total;
  for (let i = 0; i < adjusted.length; i++) {
    r -= adjusted[i];
    if (r <= 0) return i;
  }
  return adjusted.length - 1;
}

// ─── Main export ────────────────────────────────────────────────────────────

export function getDailyAnswers(day: number, seed?: number): CheckInAnswers {
  const rng = mulberry32(seed ?? (day * 2654435761));
  const sensors = getSensorReading(day);

  // Late-mission drift factor (0 before day 90, rises linearly after)
  const late = Math.max(0, day - 90);
  const lateNorm = Math.min(1, late / 90); // 0..1 by day 180

  // Sleep quality (1-10): drops after day 110
  const sleepBase = day > 110 ? 7 - (day - 110) * 0.025 : 7;
  // Correlate with sensor sleepHours: lower hours -> lower quality
  const sleepHourDelta = sensors.sleepHours - 7.5;
  const sleepQuality = clamp(
    Math.round(sleepBase + sleepHourDelta * 0.8 + (rng() - 0.5) * 1.5),
    1, 10,
  );

  // Morning fatigue (1-10): inverse of sleep quality + noise
  const morningFatigue = clamp(
    Math.round(11 - sleepQuality + (rng() - 0.5) * 2),
    1, 10,
  );

  // Joint pain (0-10): usually low, rises after day 120
  const jointBase = day > 120 ? 1 + (day - 120) * 0.02 : 0;
  const jointPain = clamp(
    Math.round(jointBase + rng() * 2.5 - 0.5),
    0, 10,
  );

  // Pain zones: if jointPain > 0, pick 1-2 zones
  const ALL_ZONES: BodyZone[] = [
    'head', 'neck', 'shoulders', 'chest', 'upperBack',
    'lowerBack', 'hips', 'knees', 'ankles',
  ];
  const painZones: BodyZone[] = [];
  if (jointPain > 0) {
    const zoneWeights = [0.05, 0.08, 0.12, 0.05, 0.15, 0.25, 0.1, 0.15, 0.05];
    const numZones = jointPain >= 5 ? 2 : 1;
    const used = new Set<number>();
    for (let z = 0; z < numZones; z++) {
      const idx = pickIndex(rng, zoneWeights, used);
      if (idx >= 0) {
        painZones.push(ALL_ZONES[idx]);
        used.add(idx);
      }
    }
  }

  // Face puffiness: "none" ~90% early, "mild" rises after day 90
  const facePuffiness = pick<'none' | 'mild' | 'marked'>(
    rng,
    ['none', 'mild', 'marked'],
    [90 - late * 0.5, 8 + late * 0.4, 2 + late * 0.1],
  );

  // Headache: rare early, more common after day 130
  const headacheWeight = day > 130 ? late * 0.3 : 0;
  const headache = pick<'none' | 'mild' | 'severe'>(
    rng,
    ['none', 'mild', 'severe'],
    [85 - headacheWeight, 12 + headacheWeight * 0.7, 3 + headacheWeight * 0.3],
  );

  // Blurred vision: very rare early, ~8% chance after day 140
  const blurChance = day > 140 ? 0.08 + (day - 140) * 0.001 : 0.02;
  const blurredVision: 'yes' | 'no' = rng() < blurChance ? 'yes' : 'no';

  // Dizziness: somewhat correlated with headache and low sleep
  const dizzyChance = headache !== 'none' ? 0.25 : (sleepQuality < 5 ? 0.15 : 0.05);
  const dizziness: 'yes' | 'no' = rng() < dizzyChance ? 'yes' : 'no';

  // Immune symptoms: usually none; rare chance of nausea or cold_sore
  const immuneSymptoms: string[] = [];
  const symptomChance = 0.05 + lateNorm * 0.08;
  if (rng() < symptomChance) {
    const symptomOptions = ['nausea', 'cold_sore', 'rash', 'slow_wound', 'fever'];
    const symptomWeights = [0.4, 0.25, 0.15, 0.1, 0.1];
    const idx = pickIndex(rng, symptomWeights, new Set());
    if (idx >= 0) immuneSymptoms.push(symptomOptions[idx]);
  }
  if (immuneSymptoms.length === 0) immuneSymptoms.push('none');

  // Solar particle event: follows sensor radiation spike (days 134-137)
  const solarParticleEvent: 'yes' | 'no' = (day >= 134 && day <= 137) ? 'yes' : 'no';

  // Mood (1-10): drops after day 110
  const moodBase = day > 110 ? 7.5 - (day - 110) * 0.03 : 7.5;
  const moodSleepEffect = sleepQuality < 5 ? -1 : 0;
  const mood = clamp(
    Math.round(moodBase + moodSleepEffect + (rng() - 0.5) * 2),
    1, 10,
  );

  // Stress (1-10): rises after day 110
  const stressBase = day > 110 ? 4 + (day - 110) * 0.03 : 3.5;
  const stress = clamp(
    Math.round(stressBase + (rng() - 0.5) * 2),
    1, 10,
  );

  // Motivation (1-10): correlated with mood
  const motivation = clamp(
    Math.round(mood - 0.5 + (rng() - 0.5) * 1.5),
    1, 10,
  );

  // Social contact: mostly "normal" or "little"
  const socialContact = pick<'none' | 'little' | 'normal'>(
    rng,
    ['none', 'little', 'normal'],
    [5 + lateNorm * 8, 30 + lateNorm * 10, 65 - lateNorm * 18],
  );

  return {
    hr: sensors.hr,
    spo2: sensors.spo2,
    temperature: sensors.temperature,
    weight: sensors.weight,
    sleepHours: sensors.sleepHours,
    resistanceMin: sensors.resistanceMin,
    cardioMin: sensors.cardioMin,
    trainingSession: sensors.resistanceMin >= 38 ? 'Done' : sensors.resistanceMin > 0 ? 'Partial' : 'Skipped',
    radiationMSv: sensors.radiationMSv,
    sleepQuality,
    morningFatigue,
    jointPain,
    painZones,
    facePuffiness,
    headache,
    blurredVision,
    dizziness,
    immuneSymptoms,
    solarParticleEvent,
    mood,
    stress,
    motivation,
    socialContact,
    reactionMs: null,
    notes: '',
  };
}

/** Which subjective fields getDailyAnswers pre-fills (excludes sensor + reaction + notes) */
export const PREFILLED_SUBJECTIVE_KEYS: ReadonlyArray<keyof CheckInAnswers> = [
  'sleepQuality', 'morningFatigue',
  'jointPain', 'painZones',
  'trainingSession',
  'facePuffiness', 'headache', 'blurredVision', 'dizziness',
  'immuneSymptoms', 'solarParticleEvent',
  'mood', 'stress', 'motivation', 'socialContact',
] as const;
