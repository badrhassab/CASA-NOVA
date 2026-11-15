import { useLiveQuery } from 'dexie-react-hooks';
import { db, type DailyCheckin } from './db';
import { BASELINE, computeScores, type Sensors } from '../lib/scoring';
import type { CheckInAnswers } from '../checkin/types';

export const getDays = (from: number, to: number) => db.dailyCheckins.where('day').between(from, to, true, true).toArray();
export const getWeek = (weekIndex: number) => db.dailyCheckins.where('weekIndex').equals(weekIndex).toArray();
export const getAllDays = () => db.dailyCheckins.orderBy('day').toArray();
export const useDays = (from: number, to: number) => useLiveQuery(() => getDays(from, to), [from, to], [] as DailyCheckin[]);
export const useWeek = (week: number) => useLiveQuery(() => getWeek(week), [week], [] as DailyCheckin[]);
export const useAllDays = () => useLiveQuery(getAllDays, [], [] as DailyCheckin[]);
export const useTopRecommendations = (weekIndex: number, n = 3) => useLiveQuery(() => getTopRecommendations(weekIndex, n), [weekIndex, n], [] as Array<{ action: string; days: number }>);

export async function getWeeklySummary() {
  const rows = await getAllDays();
  return [...new Set(rows.map(row => row.weekIndex))].map(weekIndex => {
    const days = rows.filter(row => row.weekIndex === weekIndex);
    const avg = (key: keyof DailyCheckin) => days.reduce((sum, row) => sum + Number(row[key]), 0) / days.length;
    return { weekIndex, days: days.length, bone: avg('scoreBone'), heart: avg('scoreHeart'), immune: avg('scoreImmune'), mind: avg('scoreMind'), overall: avg('scoreOverall'), minOverall: Math.min(...days.map(d => d.scoreOverall)), alerts: days.filter(d => d.status === 'orange' || d.status === 'red').length, hr: days.reduce((n,d)=>n+d.sensors.hr,0)/days.length, hrv: days.reduce((n,d)=>n+d.sensors.hrv,0)/days.length, sleepHours: days.reduce((n,d)=>n+d.sensors.sleepHours,0)/days.length, mood: days.reduce((n,d)=>n+d.answers.mood,0)/days.length };
  });
}
export async function compareWeeks(a:number,b:number) { const sums=await getWeeklySummary(); const left=sums.find(x=>x.weekIndex===a),right=sums.find(x=>x.weekIndex===b); return {left,right}; }
export async function getTopRecommendations(weekIndex:number,n=3) { const rows=await getWeek(weekIndex); const counts=new Map<string,number>(); rows.forEach(row=>{const scores={bone:row.scoreBone,heart:row.scoreHeart,immune:row.scoreImmune,mind:row.scoreMind}; (Object.keys(row.reasons) as Array<keyof typeof scores>).forEach(domain=>{const recommendation=row.reasons[domain]; if(scores[domain]<80 && recommendation.action!=='Keep current routine') counts.set(recommendation.action,(counts.get(recommendation.action)??0)+1);});}); return [...counts].sort((a,b)=>b[1]-a[1]).slice(0,n).map(([action,days])=>({action,days})); }
export async function saveCheckin(day:number,sensors:Sensors,answers:CheckInAnswers):Promise<DailyCheckin> { const score=computeScores(sensors,answers,BASELINE); const old=await db.dailyCheckins.get(day); const date=old?.date??new Date(Date.now()+day*86400000).toISOString().slice(0,10); const row:DailyCheckin={day,date,sensors,answers,scoreBone:score.bone.score,scoreHeart:score.heart.score,scoreImmune:score.immune.score,scoreMind:score.mind.score,scoreOverall:score.overall,status:score.status,reasons:{bone:score.bone,heart:score.heart,immune:score.immune,mind:score.mind},weekIndex:Math.floor(day/7),edited:true,updatedAt:Date.now()}; await db.dailyCheckins.put(row); return row; }
