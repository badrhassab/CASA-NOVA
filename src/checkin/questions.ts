import type { CheckInAnswers, QuestionField, SectionDef } from './types';
import {
  DEFAULT_MISSION_DAY,
  SENSOR_BASELINES,
  getSensorReading,
} from './sensors';

/** Mock flag — when true, SPE yes/no appears on Immune screen */
export const MOCK_SOLAR_EVENT_ALERT = true;

export const SECTION_LABELS = [
  'VITALS',
  'SLEEP',
  'BONE & MUSCLE',
  'HEART & FLUIDS',
  'IMMUNE',
  'MIND',
] as const;

export function createDefaultAnswers(missionDay = DEFAULT_MISSION_DAY): CheckInAnswers {
  const s = getSensorReading(missionDay);
  return {
    hr: s.hr,
    spo2: s.spo2,
    temperature: s.temperature,
    weight: s.weight,
    sleepHours: s.sleepHours,
    sleepQuality: 7,
    morningFatigue: 4,
    resistanceMin: s.resistanceMin,
    cardioMin: s.cardioMin,
    trainingSession: 'Done',
    jointPain: 0,
    painZones: [],
    facePuffiness: null,
    headache: null,
    blurredVision: null,
    dizziness: null,
    immuneSymptoms: [],
    radiationMSv: s.radiationMSv,
    solarParticleEvent: null,
    mood: 7,
    stress: 4,
    motivation: 7,
    socialContact: null,
    reactionMs: null,
    notes: '',
  };
}

/** Re-apply sensor values onto answers for fields not in manual override */
export function syncSensorAnswers(
  answers: CheckInAnswers,
  missionDay: number,
  manualFields: ReadonlySet<string>,
): CheckInAnswers {
  const s = getSensorReading(missionDay);
  const next = { ...answers };
  (Object.keys(s) as Array<keyof typeof s>).forEach((key) => {
    if (!manualFields.has(key)) {
      next[key] = s[key] as never;
    }
  });
  return next;
}

/** Flat typed config — QuestionRenderer reads these; sections group by `section` */
export const QUESTION_FIELDS: QuestionField[] = [
  // ── 01 VITALS (sensor confirmation) ──────────────────────────────────────
  {
    id: 'hr',
    section: 'vitals',
    label: 'Resting heart rate',
    helper: 'baseline: 62 bpm',
    type: 'sensor',
    auto: true,
    autoTag: 'AUTO · WEARABLE',
    baseline: SENSOR_BASELINES.hr,
    min: 40,
    max: 140,
    step: 1,
    unit: 'bpm',
    decimals: 0,
  },
  {
    id: 'spo2',
    section: 'vitals',
    label: 'SpO₂',
    helper: 'baseline: 98 %',
    type: 'sensor',
    auto: true,
    autoTag: 'AUTO · WEARABLE',
    baseline: SENSOR_BASELINES.spo2,
    min: 85,
    max: 100,
    step: 1,
    unit: '%',
    decimals: 0,
  },
  {
    id: 'temperature',
    section: 'vitals',
    label: 'Temperature',
    helper: 'baseline: 36.6 °C',
    type: 'sensor',
    auto: true,
    autoTag: 'AUTO · WEARABLE',
    baseline: SENSOR_BASELINES.temperature,
    min: 35,
    max: 40,
    step: 0.1,
    unit: '°C',
    decimals: 1,
  },
  {
    id: 'weight',
    section: 'vitals',
    label: 'Weight',
    helper: 'baseline: 74.5 kg',
    type: 'sensor',
    auto: true,
    autoTag: 'AUTO · WEARABLE',
    baseline: SENSOR_BASELINES.weight,
    min: 50,
    max: 120,
    step: 0.1,
    unit: 'kg',
    decimals: 1,
  },

  // ── 02 SLEEP ─────────────────────────────────────────────────────────────
  {
    id: 'sleepHours',
    section: 'sleep',
    label: 'Hours slept',
    helper: 'baseline: 7.5 h',
    type: 'sensor',
    auto: true,
    autoTag: 'AUTO · WEARABLE',
    baseline: SENSOR_BASELINES.sleepHours,
    min: 0,
    max: 12,
    step: 0.5,
    unit: 'h',
    decimals: 1,
  },
  {
    id: 'sleepQuality',
    section: 'sleep',
    label: 'Sleep quality',
    helper: '1 = restless · 10 = restorative',
    type: 'slider',
    min: 1,
    max: 10,
    step: 1,
  },
  {
    id: 'morningFatigue',
    section: 'sleep',
    label: 'Morning fatigue',
    helper: '1 = refreshed · 10 = exhausted',
    type: 'slider',
    min: 1,
    max: 10,
    step: 1,
  },

  // ── 03 BONE & MUSCLE ─────────────────────────────────────────────────────
  {
    id: 'trainingSession',
    section: 'bone',
    label: 'Training session',
    helper: 'ARED log minutes shown below',
    type: 'segmented',
    options: [
      { value: 'Done', label: 'Done' },
      { value: 'Partial', label: 'Partial' },
      { value: 'Skipped', label: 'Skipped' },
    ],
  },
  {
    id: 'resistanceMin',
    section: 'bone',
    label: 'Resistance minutes',
    helper: 'baseline: 45 min · ARED log',
    type: 'sensor',
    auto: true,
    autoTag: 'AUTO · ARED LOG',
    baseline: SENSOR_BASELINES.resistanceMin,
    min: 0,
    max: 120,
    step: 1,
    unit: 'min',
    decimals: 0,
  },
  {
    id: 'cardioMin',
    section: 'bone',
    label: 'Cardio minutes',
    helper: 'baseline: 30 min · ARED log',
    type: 'sensor',
    auto: true,
    autoTag: 'AUTO · ARED LOG',
    baseline: SENSOR_BASELINES.cardioMin,
    min: 0,
    max: 90,
    step: 1,
    unit: 'min',
    decimals: 0,
  },
  {
    id: 'jointPain',
    section: 'bone',
    label: 'Back / joint pain',
    helper: '0 = none · 10 = severe',
    type: 'slider',
    min: 0,
    max: 10,
    step: 1,
  },
  {
    id: 'painZones',
    section: 'bone',
    label: 'Where does it hurt?',
    helper: 'Tap zones · multiple allowed',
    type: 'bodyMap',
    showIf: (a) => a.jointPain > 0,
  },

  // ── 04 HEART & FLUIDS ────────────────────────────────────────────────────
  {
    id: 'facePuffiness',
    section: 'heart',
    label: 'Face puffiness',
    helper: 'Fluid shift indicator',
    type: 'segmented',
    options: [
      { value: 'none', label: 'None' },
      { value: 'mild', label: 'Mild' },
      { value: 'marked', label: 'Marked' },
    ],
  },
  {
    id: 'headache',
    section: 'heart',
    label: 'Headache',
    type: 'segmented',
    options: [
      { value: 'none', label: 'None' },
      { value: 'mild', label: 'Mild' },
      { value: 'severe', label: 'Severe' },
    ],
  },
  {
    id: 'blurredVision',
    section: 'heart',
    label: 'Blurred vision',
    helper: 'Report any change in near or far vision.',
    type: 'yesno',
  },
  {
    id: 'dizziness',
    section: 'heart',
    label: 'Dizziness',
    type: 'yesno',
  },

  // ── 05 IMMUNE & RADIATION ────────────────────────────────────────────────
  {
    id: 'immuneSymptoms',
    section: 'immune',
    label: 'Any of these today?',
    helper: 'Multi-select · None clears others',
    type: 'chips',
    options: [
      { value: 'fever', label: 'Fever' },
      { value: 'rash', label: 'Rash' },
      { value: 'cold_sore', label: 'Cold sore' },
      { value: 'slow_wound', label: 'Slow wound healing' },
      { value: 'nausea', label: 'Nausea' },
      { value: 'none', label: 'None' },
    ],
  },
  {
    id: 'radiationMSv',
    section: 'immune',
    label: 'Radiation today',
    helper: 'baseline: 0.42 mSv',
    type: 'sensor',
    auto: true,
    autoTag: 'AUTO · DOSIMETER',
    baseline: SENSOR_BASELINES.radiationMSv,
    min: 0,
    max: 5,
    step: 0.01,
    unit: 'mSv',
    decimals: 2,
  },
  {
    id: 'solarParticleEvent',
    section: 'immune',
    label: 'Exposed to a solar particle event?',
    helper: 'Storm shelter protocol may apply',
    type: 'yesno',
    showIf: () => MOCK_SOLAR_EVENT_ALERT,
  },

  // ── 06 MIND ──────────────────────────────────────────────────────────────
  {
    id: 'mood',
    section: 'mind',
    label: 'Mood',
    helper: '1 = low · 10 = high',
    type: 'slider',
    min: 1,
    max: 10,
    step: 1,
  },
  {
    id: 'stress',
    section: 'mind',
    label: 'Stress',
    helper: '1 = calm · 10 = overloaded',
    type: 'slider',
    min: 1,
    max: 10,
    step: 1,
  },
  {
    id: 'motivation',
    section: 'mind',
    label: 'Motivation',
    helper: '1 = depleted · 10 = driven',
    type: 'slider',
    min: 1,
    max: 10,
    step: 1,
  },
  {
    id: 'socialContact',
    section: 'mind',
    label: 'Social contact today',
    type: 'segmented',
    options: [
      { value: 'none', label: 'None' },
      { value: 'little', label: 'Little' },
      { value: 'normal', label: 'Normal' },
    ],
  },
  {
    id: 'reactionMs',
    section: 'mind',
    label: 'Reaction test',
    helper: 'Optional · 3 trials · ~20 s',
    type: 'reaction',
  },

  // ── FINAL NOTES ──────────────────────────────────────────────────────────
  {
    id: 'notes',
    section: 'notes',
    label: 'Anything else to note?',
    helper: 'Optional free text',
    type: 'textarea',
  },
];

const SECTION_ORDER: Array<Exclude<SectionDef['id'], 'notes'>> = [
  'vitals',
  'sleep',
  'bone',
  'heart',
  'immune',
  'mind',
];

export const SECTIONS: SectionDef[] = SECTION_ORDER.map((id, index) => ({
  id,
  index,
  label: SECTION_LABELS[index],
  fields: QUESTION_FIELDS.filter((f) => f.section === id),
}));

export const NOTES_FIELDS = QUESTION_FIELDS.filter((f) => f.section === 'notes');

export function estimateMinutesLeft(sectionIndex: number, total = 6): string {
  const remaining = Math.max(0, total - sectionIndex);
  const mins = Math.max(1, Math.ceil(remaining * 0.3));
  return `~${mins} MIN LEFT`;
}

export function formatSectionCounter(sectionIndex: number): string {
  const n = String(sectionIndex + 1).padStart(2, '0');
  return `SECTION ${n} / 06 · ${estimateMinutesLeft(sectionIndex)}`;
}
