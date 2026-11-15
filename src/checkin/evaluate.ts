import type { DailyRecord, DayAnalysis, DomainStatus, Status } from '../types';
import type { CheckInAnswers, TwinPreviewState } from './types';

const BASELINE = {
  hr: 62,
  weight: 74.5,
  sleep: 7.5,
  mood: 8.5,
  reaction: 240,
  radiation: 0.42,
} as const;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function worst(a: Status, b: Status): Status {
  const rank: Record<Status, number> = { green: 1, yellow: 2, orange: 3, red: 4 };
  return rank[a] >= rank[b] ? a : b;
}

function exerciseMinutes(a: CheckInAnswers): number {
  return Math.max(0, (a.resistanceMin ?? 0) + (a.cardioMin ?? 0));
}

/** Map check-in answers onto DailyRecord fields used by the stub engine. */
export function answersToDailyRecord(a: CheckInAnswers, day = 180): DailyRecord {
  return {
    day,
    hr: a.hr,
    hrv: clamp(68 - (a.hr - BASELINE.hr) * 1.2 - a.stress * 0.8, 25, 90),
    sleepHours: a.sleepHours,
    mood: a.mood,
    reactionMs: a.reactionMs ?? BASELINE.reaction,
    weight: a.weight,
    exerciseMin: exerciseMinutes(a),
    radiationMSv: a.radiationMSv,
  };
}

function scoreBone(a: CheckInAnswers): DomainStatus {
  let score = 92;
  let status: Status = 'green';
  const reasons: string[] = [];
  const actions: string[] = [];

  const exMin = exerciseMinutes(a);
  if (exMin < 30) {
    score -= 18;
    status = worst(status, 'yellow');
    reasons.push(`ARED under-target (${exMin} min)`);
    actions.push('Complete prescribed resistance block tomorrow');
  } else if (exMin < 60) {
    score -= 10;
    status = worst(status, 'yellow');
    reasons.push(`Partial training compliance (${exMin} min)`);
    actions.push('Finish remaining cardio minutes if EVA allows');
  }

  if (a.jointPain >= 7) {
    score -= 16;
    status = worst(status, 'orange');
    reasons.push(`Elevated joint pain (${a.jointPain}/10)`);
    actions.push('Reduce axial load; log pain zones for flight surgeon');
  } else if (a.jointPain >= 3) {
    score -= 8;
    status = worst(status, 'yellow');
    reasons.push(`Mild musculoskeletal discomfort (${a.jointPain}/10)`);
    actions.push('Stretch protocol + monitor zones after ARED');
  }

  const weightLoss = BASELINE.weight - a.weight;
  if (weightLoss > 1.5) {
    score -= 10;
    status = worst(status, 'yellow');
    reasons.push(`Lean mass trend −${weightLoss.toFixed(1)} kg vs baseline`);
    actions.push('Increase protein by ~25 g');
  }

  if (a.painZones.length > 2) {
    score -= 6;
    status = worst(status, 'yellow');
    reasons.push(`Multi-site pain (${a.painZones.length} zones)`);
  }

  return {
    domain: 'bone',
    status,
    score: clamp(Math.round(score), 0, 100),
    why: reasons[0] ?? 'Musculoskeletal load and ARED compliance within targets.',
    action: actions[0] ?? 'Continue prescribed daily resistance and aerobic regimen.',
  };
}

function scoreHeart(a: CheckInAnswers): DomainStatus {
  let score = 94;
  let status: Status = 'green';
  const reasons: string[] = [];
  const actions: string[] = [];

  if (a.hr > BASELINE.hr + 12) {
    score -= 12;
    status = worst(status, 'yellow');
    reasons.push(`Resting HR elevated (${a.hr} bpm vs ${BASELINE.hr} baseline)`);
    actions.push('Hydration + short vagal breathing before sleep');
  }

  if (a.facePuffiness === 'marked') {
    score -= 14;
    status = worst(status, 'orange');
    reasons.push('Marked facial fluid shift');
    actions.push('Lower-body negative pressure check recommended');
  } else if (a.facePuffiness === 'mild') {
    score -= 6;
    status = worst(status, 'yellow');
    reasons.push('Mild facial puffiness');
  }

  if (a.headache === 'severe') {
    score -= 16;
    status = worst(status, 'orange');
    reasons.push('Severe headache');
    actions.push('CO₂ / ICP screen; rest eyes; report to medical');
  } else if (a.headache === 'mild') {
    score -= 7;
    status = worst(status, 'yellow');
    reasons.push('Mild headache');
  }

  if (a.blurredVision === 'yes') {
    score -= 18;
    status = worst(status, 'orange');
    reasons.push('Blurred vision reported');
    actions.push('Document near/far acuity change immediately');
  }

  if (a.dizziness === 'yes') {
    score -= 12;
    status = worst(status, 'yellow');
    reasons.push('Dizziness present');
    actions.push('Sit/stand slowly; check fluid intake');
  }

  return {
    domain: 'heart',
    status,
    score: clamp(Math.round(score), 0, 100),
    why: reasons[0] ?? 'Cardiovascular and fluid-shift signs aligned with baseline.',
    action: actions[0] ?? 'Maintain hydration and aerobic countermeasures.',
  };
}

function scoreImmune(a: CheckInAnswers): DomainStatus {
  let score = 96;
  let status: Status = 'green';
  const reasons: string[] = [];
  const actions: string[] = [];

  const symptoms = a.immuneSymptoms.filter((s) => s !== 'none');
  if (symptoms.length > 0) {
    score -= 8 * symptoms.length;
    status = worst(status, symptoms.length >= 2 ? 'orange' : 'yellow');
    reasons.push(`Symptoms: ${symptoms.join(', ')}`);
    actions.push('Monitor vitals q4h; isolate if febrile');
  }

  if (a.radiationMSv > 1.0) {
    score -= 14;
    status = worst(status, 'yellow');
    reasons.push(`Elevated dose (${a.radiationMSv.toFixed(2)} mSv)`);
    actions.push('Storm shelter readiness; antioxidant protocol');
  } else if (a.radiationMSv > 0.6) {
    score -= 6;
    status = worst(status, 'yellow');
    reasons.push(`Dose above nominal (${a.radiationMSv.toFixed(2)} mSv)`);
  }

  if (a.solarParticleEvent === 'yes') {
    score -= 20;
    status = worst(status, 'orange');
    reasons.push('Solar particle event exposure flagged');
    actions.push('Activate water-wall shelter; log dosimeter peak');
  }

  return {
    domain: 'immune',
    status,
    score: clamp(Math.round(score), 0, 100),
    why: reasons[0] ?? 'Radiation and immune markers within safe margins.',
    action: actions[0] ?? 'Maintain supplements and shelter readiness.',
  };
}

function scoreMind(a: CheckInAnswers): DomainStatus {
  let score = 94;
  let status: Status = 'green';
  const reasons: string[] = [];
  const actions: string[] = [];

  if (a.mood <= 4) {
    score -= 16;
    status = worst(status, 'orange');
    reasons.push(`Low mood (${a.mood}/10)`);
    actions.push('Schedule crew check-in; protect rest window');
  } else if (a.mood <= 6) {
    score -= 8;
    status = worst(status, 'yellow');
    reasons.push(`Mood below nominal (${a.mood}/10)`);
  }

  if (a.stress >= 8) {
    score -= 14;
    status = worst(status, 'orange');
    reasons.push(`High stress (${a.stress}/10)`);
    actions.push('Guided breathing + defer non-critical tasks');
  } else if (a.stress >= 6) {
    score -= 7;
    status = worst(status, 'yellow');
    reasons.push(`Elevated stress (${a.stress}/10)`);
  }

  if (a.motivation <= 4) {
    score -= 10;
    status = worst(status, 'yellow');
    reasons.push(`Low motivation (${a.motivation}/10)`);
  }

  if (a.socialContact === 'none') {
    score -= 8;
    status = worst(status, 'yellow');
    reasons.push('No social contact logged');
    actions.push('Brief family/ground link if bandwidth allows');
  }

  if (a.reactionMs != null && a.reactionMs > BASELINE.reaction + 40) {
    score -= 12;
    status = worst(status, 'yellow');
    reasons.push(`Slow reaction (+${a.reactionMs - BASELINE.reaction} ms)`);
    actions.push('Cognitive pacing; protect sleep opportunity');
  }

  if (a.sleepHours < BASELINE.sleep - 1.5 || a.morningFatigue >= 7) {
    score -= 8;
    status = worst(status, 'yellow');
    reasons.push(
      a.sleepHours < BASELINE.sleep - 1.5
        ? `Sleep deficit (${a.sleepHours} h)`
        : `High morning fatigue (${a.morningFatigue}/10)`,
    );
  }

  return {
    domain: 'mind',
    status,
    score: clamp(Math.round(score), 0, 100),
    why: reasons[0] ?? 'Mood, stress, and cognitive markers within nominal limits.',
    action: actions[0] ?? 'Keep circadian lighting and journal routine.',
  };
}

/**
 * Live twin preview. Domain rows stay null until that section has been visited.
 * sectionTouched: indices 0..5 for vitals..mind
 */
export function evaluateTwinPreview(
  answers: CheckInAnswers,
  sectionTouched: Set<number>,
): TwinPreviewState {
  const boneReady = sectionTouched.has(2);
  const heartReady = sectionTouched.has(3);
  const immuneReady = sectionTouched.has(4);
  const mindReady = sectionTouched.has(5);

  const domains: Array<DomainStatus | null> = [
    boneReady ? scoreBone(answers) : null,
    heartReady ? scoreHeart(answers) : null,
    immuneReady ? scoreImmune(answers) : null,
    mindReady ? scoreMind(answers) : null,
  ];

  const ready = domains.filter(Boolean) as DomainStatus[];
  if (ready.length === 0) {
    return {
      overall: null,
      why: 'Complete sections to update twin status.',
      domains,
    };
  }

  let overall: Status = 'green';
  for (const d of ready) overall = worst(overall, d.status);
  const worstDomain = ready.reduce((a, b) => (worst(a.status, b.status) === a.status ? a : b));

  return {
    overall,
    why: worstDomain.why,
    domains,
  };
}

export function buildDayAnalysis(answers: CheckInAnswers, day = 180): DayAnalysis {
  const domains: DomainStatus[] = [
    scoreBone(answers),
    scoreHeart(answers),
    scoreImmune(answers),
    scoreMind(answers),
  ];
  let overall: Status = 'green';
  for (const d of domains) overall = worst(overall, d.status);
  return { day, overall, domains };
}

export const STATUS_COLOR: Record<Status, string> = {
  green: 'var(--status-green)',
  yellow: 'var(--status-yellow)',
  orange: 'var(--status-orange)',
  red: 'var(--status-red)',
};

export const STATUS_LABEL: Record<Status, string> = {
  green: 'NOMINAL',
  yellow: 'WATCH',
  orange: 'ELEVATED',
  red: 'CRITICAL',
};
