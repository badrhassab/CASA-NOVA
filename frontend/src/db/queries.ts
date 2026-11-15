import { useLiveQuery } from 'dexie-react-hooks';
import { db, type DailyCheckin } from './db';
import { BASELINE, computeScores, type Sensors } from '../lib/scoring';
import type { CheckInAnswers } from '../checkin/types';

export const weekOf = (day: number): number => Math.floor(day / 7);

export const getDays = (from: number, to: number) => db.dailyCheckins.where('day').between(from, to, true, true).toArray();
export async function getWeek(weekIndex: number): Promise<DailyCheckin[]> {
  return (await getAllDays()).filter(row => weekOf(row.day) === weekIndex);
}
export async function getAllDays(): Promise<DailyCheckin[]> {
  const rows = await db.dailyCheckins.toArray();
  return rows
    .map(row => ({ ...row, weekIndex: weekOf(row.day) }))
    .sort((left, right) => left.day - right.day);
}
export const useDays = (from: number, to: number) => useLiveQuery(() => getDays(from, to), [from, to], [] as DailyCheckin[]);
export const useWeek = (week: number) => useLiveQuery(() => getWeek(week), [week], [] as DailyCheckin[]);
export const useAllDays = () => useLiveQuery(getAllDays, [], [] as DailyCheckin[]);
export const useTopRecommendations = (weekIndex: number, n = 3) => useLiveQuery(() => getTopRecommendations(weekIndex, n), [weekIndex, n], [] as Array<{ action: string; days: number }>);

export async function getWeeklySummary() {
  const rows = await getAllDays();
  return [...new Set(rows.map(row => weekOf(row.day)))].sort((a,b)=>a-b).map(weekIndex => {
    const days = rows.filter(row => weekOf(row.day) === weekIndex).sort((a,b)=>a.day-b.day);
    const avg = (key: keyof DailyCheckin) => days.reduce((sum, row) => sum + Number(row[key]), 0) / days.length;
    return { weekIndex, days: days.length, bone: avg('scoreBone'), heart: avg('scoreHeart'), immune: avg('scoreImmune'), mind: avg('scoreMind'), overall: avg('scoreOverall'), minOverall: Math.min(...days.map(d => d.scoreOverall)), alerts: days.filter(d => d.status === 'orange' || d.status === 'red').length, hr: days.reduce((n,d)=>n+d.sensors.hr,0)/days.length, hrv: days.reduce((n,d)=>n+d.sensors.hrv,0)/days.length, sleepHours: days.reduce((n,d)=>n+d.sensors.sleepHours,0)/days.length, mood: days.reduce((n,d)=>n+d.answers.mood,0)/days.length };
  });
}
export async function compareWeeks(a:number,b:number) { const sums=await getWeeklySummary(); const left=sums.find(x=>x.weekIndex===a),right=sums.find(x=>x.weekIndex===b); return {left,right}; }
export async function getTopRecommendations(weekIndex:number,n=3) { const rows=await getWeek(weekIndex); const counts=new Map<string,number>(); rows.forEach(row=>{const scores={bone:row.scoreBone,heart:row.scoreHeart,immune:row.scoreImmune,mind:row.scoreMind}; (Object.keys(row.reasons) as Array<keyof typeof scores>).forEach(domain=>{const recommendation=row.reasons[domain]; if(scores[domain]<80 && recommendation.action!=='Keep current routine') counts.set(recommendation.action,(counts.get(recommendation.action)??0)+1);});}); return [...counts].sort((a,b)=>b[1]-a[1]).slice(0,n).map(([action,days])=>({action,days})); }
export async function addOrUpdateDay(day: number, sensors: Sensors, answers: CheckInAnswers): Promise<number> {
  const score = computeScores(sensors, answers, BASELINE);
  const existing = await db.dailyCheckins.get(day);
  let date = existing?.date;
  if (!date) {
    const previous = await db.dailyCheckins.get(day - 1);
    if (!previous) throw new Error(`Cannot add day ${day}: previous day ${day - 1} does not exist.`);
    const nextDate = new Date(`${previous.date}T00:00:00Z`);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    date = nextDate.toISOString().slice(0, 10);
  }
  await db.dailyCheckins.put({
    day, date, sensors, answers,
    scoreBone: score.bone.score, scoreHeart: score.heart.score,
    scoreImmune: score.immune.score, scoreMind: score.mind.score,
    scoreOverall: score.overall, status: score.status,
    reasons: { bone: score.bone, heart: score.heart, immune: score.immune, mind: score.mind },
    weekIndex: weekOf(day), edited: true, updatedAt: Date.now(),
  });
  return db.dailyCheckins.count();
}

function seededNoise(day: number, salt: number): number {
  let value = (day * 0x45d9f3b + salt * 0x9e3779b9) | 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296 - 0.5;
}

export async function addNextDay(): Promise<number> {
  const rows = await getAllDays();
  const previous = rows[rows.length - 1];
  if (!previous) throw new Error('Cannot add a day before the first check-in exists.');
  const day = previous.day + 1;
  const sensors: Sensors = {
    ...previous.sensors,
    hr: Math.max(40, Math.round(previous.sensors.hr - 2 + seededNoise(day, 1) * 2)),
    hrv: Math.min(90, Math.round(previous.sensors.hrv + 4 + seededNoise(day, 2) * 2)),
    sleepHours: Math.min(12, Math.round((previous.sensors.sleepHours + 0.3 + seededNoise(day, 3) * 0.2) * 10) / 10),
    temperature: Math.round((previous.sensors.temperature + seededNoise(day, 4) * 0.1) * 10) / 10,
  };
  const answers: CheckInAnswers = {
    ...previous.answers,
    ...sensors,
    mood: Math.min(10, previous.answers.mood + 1),
    stress: Math.max(1, previous.answers.stress - 1),
    sleepQuality: Math.min(10, previous.answers.sleepQuality + 1),
    morningFatigue: Math.max(1, previous.answers.morningFatigue - 1),
    immuneSymptoms: ['None'],
    solarParticleEvent: 'no',
    blurredVision: 'no',
    dizziness: 'no',
    headache: 'none',
    facePuffiness: 'none',
    reactionMs: Math.max(150, (previous.answers.reactionMs ?? BASELINE.reactionMs) - 10),
    notes: '',
  };
  await addOrUpdateDay(day, sensors, answers);
  return day;
}
