import type { CheckInAnswers } from '../checkin/types';
import { BASELINE, computeScores, type Sensors } from '../lib/scoring';
import { db, type DailyCheckin } from '../db/db';

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRow(day: number, date: string, rng: () => number): DailyCheckin {
  const episode = day >= 16 && day <= 18;
  const weekTwo = day >= 7 && day <= 13;
  const sensors: Sensors = {
    hr: Math.round(BASELINE.hr + (episode ? 10 : weekTwo ? 4 + rng() * 4 : rng() * 2)),
    hrv: Math.round(BASELINE.hrv - (episode ? 20 : weekTwo ? 8 + rng() * 6 : rng() * 2)),
    spo2: 98,
    temperature: Number((BASELINE.temperature + (episode ? 0.6 + rng() * 0.3 : 0)).toFixed(1)),
    weight: BASELINE.weight,
    sleepHours: Number((episode ? 5 + rng() * 0.6 : weekTwo ? 6 + rng() * 0.8 : 7 + rng() * 0.4).toFixed(1)),
    resistanceMin: episode ? 30 : weekTwo ? 32 : 40,
    cardioMin: 30,
    radiationMSv: day === 17 ? 2.4 : 0.5,
  };
  const sleepQuality = episode ? 5 : weekTwo ? 6 + Math.floor(rng() * 2) : 8;
  const answers: CheckInAnswers = {
    ...sensors,
    sleepQuality,
    morningFatigue: 10 - sleepQuality,
    trainingSession: episode ? 'Partial' : 'Done',
    jointPain: 0,
    painZones: [],
    facePuffiness: weekTwo && day % 3 === 0 ? 'mild' : 'none',
    headache: episode ? 'mild' : 'none',
    blurredVision: day === 19 ? 'yes' : 'no',
    dizziness: 'no',
    immuneSymptoms: episode ? ['Fever', 'Cold sore', 'Nausea'] : ['None'],
    solarParticleEvent: day === 17 ? 'yes' : 'no',
    mood: episode ? 4 + (day % 2) : weekTwo ? 6 + (day % 2) : 8,
    stress: episode ? 7 + (day % 2) : 3,
    motivation: episode ? 5 : weekTwo ? 6 : 8,
    socialContact: episode ? 'little' : 'normal',
    reactionMs: episode ? 300 : 250,
    notes: episode ? 'Symptoms logged; monitoring and following mission protocol.' : '',
  };
  const score = computeScores(sensors, answers);
  return { day, date, sensors, answers, scoreBone: score.bone.score, scoreHeart: score.heart.score, scoreImmune: score.immune.score, scoreMind: score.mind.score, scoreOverall: score.overall, status: score.status, reasons: { bone: score.bone, heart: score.heart, immune: score.immune, mind: score.mind }, weekIndex: Math.floor(day / 7), edited: false, updatedAt: Date.now() };
}

export async function seedDatabase(): Promise<void> {
  if (await db.dailyCheckins.count()) return;
  const rng = mulberry32(0xA57A6A4D);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const rows = Array.from({ length: 21 }, (_, day) => {
    const date = new Date(yesterday);
    date.setDate(yesterday.getDate() - (20 - day));
    return makeRow(day, date.toISOString().slice(0, 10), rng);
  });
  await db.dailyCheckins.bulkPut(rows);
  if (import.meta.env.DEV) validateSeed(rows);
}

export function validateSeed(rows: DailyCheckin[]): void {
  if (!import.meta.env.DEV) return;
  if (rows.length !== 21) console.warn(`[seed] Expected 21 rows; got ${rows.length}.`);
  if (rows.some(row => Object.values(row).some(value => value === null || value === undefined))) console.warn('[seed] Missing fields found.');
  const means = [0, 1, 2].map(week => rows.filter(row => row.weekIndex === week).reduce((sum, row) => sum + row.scoreOverall, 0) / 7);
  if (!(means[0] > means[1] && means[1] > means[2])) console.warn(`[seed] Weekly averages are not descending: ${means.join(', ')}.`);
}
