import Dexie, { Table } from 'dexie';
import { DailyRecord, DayAnalysis } from '../types';
import { MOCK_DAILY_RECORDS } from '../data/mockData';
import { analyzeAstronautTelemetry } from '../engine/anomalyEngine';
import type { CheckInDraft, CheckInEntry } from '../checkin/types';

export interface AstronautProfile {
  id: string;
  name: string;
  callsign: string;
  role: string;
  mission: string;
  currentDay: number;
}

export class AstroGuardDB extends Dexie {
  dailyRecords!: Table<DailyRecord, number>; // keyed by day
  dayAnalyses!: Table<DayAnalysis, number>; // keyed by day
  profile!: Table<AstronautProfile, string>;
  checkins!: Table<CheckInEntry, string>; // keyed by YYYY-MM-DD
  drafts!: Table<CheckInDraft, string>; // keyed by YYYY-MM-DD

  constructor() {
    super('AstroGuardDB');
    this.version(1).stores({
      dailyRecords: 'day, hr, hrv, sleepHours, mood, reactionMs',
      dayAnalyses: 'day, overall',
      profile: 'id',
    });
    this.version(2).stores({
      dailyRecords: 'day, hr, hrv, sleepHours, mood, reactionMs',
      dayAnalyses: 'day, overall',
      profile: 'id',
      checkins: 'date',
      drafts: 'date',
    });
    this.version(3).stores({
      dailyRecords: 'day, hr, hrv, sleepHours, mood, reactionMs',
      dayAnalyses: 'day, overall', profile: 'id', checkins: 'date', drafts: 'date',
    });
  }
}

export const db = new AstroGuardDB();

/**
 * Initializes the database with baseline telemetry and analysis if empty
 */
export async function initDatabase(): Promise<void> {
  const { seedDatabase } = await import('../data/seed');
  await seedDatabase();
  const count = await db.dailyRecords.count();
  if (count === 0) {
    console.log('[AstroGuard DB] Initializing local offline mission database...');
    await db.dailyRecords.bulkAdd(MOCK_DAILY_RECORDS);
    const analyses = analyzeAstronautTelemetry(MOCK_DAILY_RECORDS);
    await db.dayAnalyses.bulkAdd(analyses);

    await db.profile.put({
      id: 'primary-astronaut',
      name: 'Dr. Alex Mercer',
      callsign: 'Ares-Lead',
      role: 'Mission Commander & Bio-Specialist',
      mission: 'Ares IV - Mars Surface Exploration',
      currentDay: 180
    });
    console.log('[AstroGuard DB] Database successfully populated offline.');
  }
}
