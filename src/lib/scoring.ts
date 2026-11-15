import type { CheckInAnswers } from '../checkin/types';
import type { Status } from '../types';

export interface Sensors {
  hr: number;
  hrv: number;
  spo2: number;
  temperature: number;
  weight: number;
  sleepHours: number;
  resistanceMin: number;
  cardioMin: number;
  radiationMSv: number;
}

export interface Baseline extends Sensors {
  reactionMs: number;
  mood: number;
  stress: number;
  motivation: number;
  sleepQuality: number;
  morningFatigue: number;
}

export const BASELINE: Baseline = {
  hr: 62,
  hrv: 65,
  spo2: 98,
  temperature: 36.7,
  weight: 75,
  sleepHours: 7.5,
  resistanceMin: 40,
  cardioMin: 30,
  radiationMSv: 0.5,
  reactionMs: 250,
  mood: 8,
  stress: 3,
  motivation: 8,
  sleepQuality: 8,
  morningFatigue: 3,
};

export interface DomainResult {
  score: number;
  status: Status;
  why: string;
  action: string;
}

export interface ScoreResult {
  bone: DomainResult;
  heart: DomainResult;
  immune: DomainResult;
  mind: DomainResult;
  overall: number;
  status: Status;
  why: string;
}

export const STATUS_COLORS: Record<Status, string> = {
  green: '#10b981',
  yellow: '#f59e0b',
  orange: '#f97316',
  red: '#ef4444',
};

export function statusFromScore(score: number): Status {
  if (score >= 80) return 'green';
  if (score >= 65) return 'yellow';
  if (score >= 50) return 'orange';
  return 'red';
}

type Driver = { penalty: number; why: string; action: string };

function clampScore(score: number): number {
  return Math.round(Math.max(0, Math.min(100, score)));
}

function makeDomain(score: number, drivers: Driver[], fallback: string): DomainResult {
  const contributors = drivers
    .filter((driver) => driver.penalty > 0)
    .sort((left, right) => right.penalty - left.penalty);
  const roundedScore = clampScore(score);
  const why = contributors.length
    ? contributors.slice(0, 2).map((driver) => driver.why).join('; ')
    : 'Within your baseline';

  return {
    score: roundedScore,
    status: statusFromScore(roundedScore),
    why,
    action: contributors[0]?.action ?? fallback,
  };
}

export function computeScores(
  sensors: Sensors,
  answers: CheckInAnswers,
  baseline: Baseline = BASELINE,
): ScoreResult {
  const trainingPenalty = answers.trainingSession === 'Skipped'
    ? 18
    : answers.trainingSession === 'Partial' ? 8 : 0;
  const painPenalty = answers.jointPain * 2.5;
  const zonesPenalty = Math.min(9, answers.painZones.length * 1.5);
  const resistancePenalty = sensors.resistanceMin < baseline.resistanceMin * 0.75 ? 10 : 0;
  const weightLoss = baseline.weight - sensors.weight;
  const weightPenalty = weightLoss > 2 ? 8 : 0;
  const bone = makeDomain(100 - trainingPenalty - painPenalty - zonesPenalty - resistancePenalty - weightPenalty, [
    { penalty: trainingPenalty, why: `Training ${answers.trainingSession.toLowerCase()} (${sensors.resistanceMin} resistance min).`, action: 'Complete a light resistance block and log recovery.' },
    { penalty: painPenalty, why: `Joint pain ${answers.jointPain}/10.`, action: 'Reduce axial load and monitor the affected zones.' },
    { penalty: zonesPenalty, why: `${answers.painZones.length} pain zones reported.`, action: 'Track the affected zones and adjust training load.' },
    { penalty: resistancePenalty, why: `Resistance ${sensors.resistanceMin} min (baseline ${baseline.resistanceMin}).`, action: 'Complete a light resistance block if cleared.' },
    { penalty: weightPenalty, why: `Weight ${sensors.weight.toFixed(1)} kg (baseline ${baseline.weight}, -${weightLoss.toFixed(1)}).`, action: 'Review nutrition and track weight trend.' },
  ], 'Keep current routine');

  const hrPenalty = Math.min(25, Math.max(0, sensors.hr - baseline.hr - 6) * 1.6);
  const hrvPenalty = Math.min(25, Math.max(0, baseline.hrv - sensors.hrv) * 0.7);
  const spo2Penalty = sensors.spo2 < 95 ? 15 : 0;
  const puffinessPenalty = answers.facePuffiness === 'marked' ? 18 : answers.facePuffiness === 'mild' ? 8 : 0;
  const headachePenalty = answers.headache === 'severe' ? 15 : answers.headache === 'mild' ? 5 : 0;
  const visionPenalty = answers.blurredVision === 'yes' ? 20 : 0;
  const dizzinessPenalty = answers.dizziness === 'yes' ? 10 : 0;
  const heart = makeDomain(100 - hrPenalty - hrvPenalty - spo2Penalty - puffinessPenalty - headachePenalty - visionPenalty - dizzinessPenalty, [
    { penalty: hrPenalty, why: `Resting HR ${sensors.hr} bpm (baseline ${baseline.hr}, ${sensors.hr >= baseline.hr ? '+' : ''}${sensors.hr - baseline.hr}).`, action: 'Reduce workload and repeat vitals after rest.' },
    { penalty: hrvPenalty, why: `HRV ${sensors.hrv} ms (baseline ${baseline.hrv}, ${sensors.hrv - baseline.hrv}).`, action: 'Prioritize recovery and hydration; recheck tomorrow.' },
    { penalty: spo2Penalty, why: `SpO₂ ${sensors.spo2}% (baseline ${baseline.spo2}).`, action: 'Rest and repeat the oxygen reading.' },
    { penalty: puffinessPenalty, why: `Face puffiness: ${answers.facePuffiness}.`, action: 'Review fluid shift countermeasures and monitor symptoms.' },
    { penalty: headachePenalty, why: `Headache: ${answers.headache}.`, action: 'Rest and monitor headache severity.' },
    { penalty: visionPenalty, why: 'Blurred vision may signal spaceflight-associated neuro-ocular syndrome (SANS).', action: 'Record near and far vision changes and follow mission medical protocol.' },
    { penalty: dizzinessPenalty, why: `Dizziness reported (${answers.dizziness}).`, action: 'Sit or stand slowly and review fluid intake.' },
  ], 'Maintain hydration and aerobic countermeasures');

  const symptoms = answers.immuneSymptoms.filter((symptom) => symptom.toLowerCase() !== 'none');
  const temperaturePenalty = sensors.temperature > baseline.temperature + 0.5 ? 15 : 0;
  const symptomPenalty = symptoms.reduce((total, symptom) => total + (symptom.toLowerCase() === 'fever' ? 15 : 8), 0);
  const radiationPenalty = sensors.radiationMSv > 1 ? 10 : 0;
  const solarPenalty = answers.solarParticleEvent === 'yes' ? 8 : 0;
  const immune = makeDomain(100 - temperaturePenalty - symptomPenalty - radiationPenalty - solarPenalty, [
    { penalty: temperaturePenalty, why: `Temperature ${sensors.temperature.toFixed(1)} °C (baseline ${baseline.temperature}, +${(sensors.temperature-baseline.temperature).toFixed(1)}).`, action: 'Repeat temperature and monitor for other symptoms.' },
    ...symptoms.map((symptom): Driver => ({ penalty: symptom.toLowerCase() === 'fever' ? 15 : 8, why: `${symptom} reported.`, action: 'Monitor symptoms and repeat vitals in four hours.' })),
    { penalty: radiationPenalty, why: `Radiation ${sensors.radiationMSv.toFixed(2)} mSv (nominal ${baseline.radiationMSv}).`, action: 'Review dosimeter and shelter guidance.' },
    { penalty: solarPenalty, why: 'Solar particle event reported.', action: 'Follow shelter protocol and record dosimeter peak.' },
  ], 'Maintain supplements and shelter readiness');

  const socialPenalty = answers.socialContact === 'none' ? 12 : answers.socialContact === 'little' ? 5 : 0;
  const reactionPenalty = answers.reactionMs !== null && answers.reactionMs > baseline.reactionMs + 40 ? 8 : 0;
  const sleepPenalty = sensors.sleepHours < 5.5 ? 8 : 0;
  const mindBase = (answers.mood * 10 + (10 - answers.stress) * 10 + answers.motivation * 10 + answers.sleepQuality * 10) / 4;
  const mind = makeDomain(Math.max(20, mindBase) - socialPenalty - reactionPenalty - sleepPenalty, [
    { penalty: answers.mood < 6 ? 1 : 0, why: `Mood ${answers.mood}/10 (baseline ${baseline.mood}).`, action: 'Schedule a crew check-in and protect the rest window.' },
    { penalty: answers.sleepQuality < 6 ? 1 : 0, why: `Sleep quality ${answers.sleepQuality}/10 (baseline ${baseline.sleepQuality}).`, action: 'Protect the next sleep window and review sleep conditions.' },
    { penalty: answers.stress >= 7 ? 1 : 0, why: `Stress ${answers.stress}/10 (baseline ${baseline.stress}).`, action: 'Reduce noncritical workload and protect the rest window.' },
    { penalty: socialPenalty, why: `Social contact: ${answers.socialContact}.`, action: 'Schedule a brief crew or ground contact.' },
    { penalty: reactionPenalty, why: `Reaction time ${answers.reactionMs ?? 'not recorded'} ms (baseline ${baseline.reactionMs}).`, action: 'Pace cognitive tasks and protect sleep opportunity.' },
    { penalty: sleepPenalty, why: `Sleep ${sensors.sleepHours.toFixed(1)} h (baseline ${baseline.sleepHours}).`, action: 'Protect the next sleep window.' },
  ], 'Keep circadian lighting and journal routine');

  const overall = clampScore(bone.score * 0.25 + heart.score * 0.3 + immune.score * 0.2 + mind.score * 0.25);
  let status = statusFromScore(overall);
  if ([bone, heart, immune, mind].some((domain) => domain.status === 'red') && status !== 'red') {
    status = 'orange';
  }
  const worst = [bone, heart, immune, mind].sort((left, right) => left.score - right.score)[0];

  return { bone, heart, immune, mind, overall, status, why: `${worst.why} (${worst.score}/100).` };
}
