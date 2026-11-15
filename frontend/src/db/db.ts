import Dexie, { type Table } from 'dexie';
import type { CheckInAnswers } from '../checkin/types';
import type { Sensors, ScoreResult } from '../lib/scoring';
import { BASELINE, computeScores } from '../lib/scoring';

export interface DailyCheckin {
  day: number; date: string; sensors: Sensors; answers: CheckInAnswers;
  scoreBone: number; scoreHeart: number; scoreImmune: number; scoreMind: number;
  scoreOverall: number; status: ScoreResult['status'];
  reasons: Record<'bone'|'heart'|'immune'|'mind', { why: string; action: string }>;
  weekIndex: number; edited: boolean; updatedAt: number;
}
export class AstroGuardDB extends Dexie {
  dailyCheckins!: Table<DailyCheckin, number>;
  constructor() {
    super('AstroGuardDB');
    this.version(5).stores({ dailyCheckins: 'day, weekIndex, date' });
  }
}
export const db = new AstroGuardDB();
export async function resetDatabase(): Promise<void> {
  await db.dailyCheckins.clear();
  const { seedDatabase } = await import('../data/seed');
  await seedDatabase();
}
export { BASELINE, computeScores };

export async function initDatabase(): Promise<void> {
  if (await db.dailyCheckins.count() === 0) {
    const { seedDatabase } = await import('../data/seed');
    await seedDatabase();
  }
  const [dayZero, dayOne] = await Promise.all([db.dailyCheckins.get(0), db.dailyCheckins.get(1)]);
  if (dayZero && dayOne && dayZero.date > dayOne.date) {
    const previousDate = new Date(`${dayOne.date}T00:00:00Z`);
    previousDate.setUTCDate(previousDate.getUTCDate() - 1);
    await db.dailyCheckins.update(0, { date: previousDate.toISOString().slice(0, 10) });
  }
}
