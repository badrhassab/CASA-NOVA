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
  drafts!: Table<{ date: string; answers: CheckInAnswers; sectionIndex: number; phase: string; updatedAt: number }, string>;
  constructor() {
    super('AstroGuardDB');
    this.version(4).stores({ dailyCheckins: 'day, weekIndex, date', drafts: 'date' });
  }
}
export const db = new AstroGuardDB();
export async function resetDatabase(): Promise<void> {
  await db.transaction('rw', db.dailyCheckins, db.drafts, async () => {
    await db.dailyCheckins.clear();
    await db.drafts.clear();
  });
  const { seedDatabase } = await import('../data/seed');
  await seedDatabase();
}
export { BASELINE, computeScores };
