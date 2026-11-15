import type { DayAnalysis, Status } from '../types';

export type SectionId =
  | 'vitals'
  | 'sleep'
  | 'bone'
  | 'heart'
  | 'immune'
  | 'mind'
  | 'notes';

export type FieldType =
  | 'sensor'
  | 'stepper'
  | 'slider'
  | 'segmented'
  | 'chips'
  | 'bodyMap'
  | 'yesno'
  | 'reaction'
  | 'textarea'
  | 'readonly';

export type BodyZone =
  | 'head'
  | 'neck'
  | 'shoulders'
  | 'chest'
  | 'upperBack'
  | 'lowerBack'
  | 'hips'
  | 'knees'
  | 'ankles';

export type AnswerValue = string | number | string[] | null;

export interface CheckInAnswers {
  hr: number;
  spo2: number;
  temperature: number;
  weight: number;
  sleepHours: number;
  sleepQuality: number;
  morningFatigue: number;
  resistanceMin: number;
  cardioMin: number;
  trainingSession: 'Done' | 'Partial' | 'Skipped';
  jointPain: number;
  painZones: BodyZone[];
  facePuffiness: 'none' | 'mild' | 'marked' | null;
  headache: 'none' | 'mild' | 'severe' | null;
  blurredVision: 'yes' | 'no' | null;
  dizziness: 'yes' | 'no' | null;
  immuneSymptoms: string[];
  radiationMSv: number;
  solarParticleEvent: 'yes' | 'no' | null;
  mood: number;
  stress: number;
  motivation: number;
  socialContact: 'none' | 'little' | 'normal' | null;
  reactionMs: number | null;
  notes: string;
}

export interface FieldOption {
  value: string;
  label: string;
}

export interface QuestionField {
  id: keyof CheckInAnswers;
  section: SectionId;
  label: string;
  helper?: string;
  type: FieldType;
  auto?: boolean;
  autoTag?: string;
  /** Sensor baseline used for delta display */
  baseline?: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  decimals?: number;
  options?: FieldOption[];
  showIf?: (answers: CheckInAnswers) => boolean;
}

export interface SectionDef {
  id: SectionId;
  index: number;
  label: string;
  fields: QuestionField[];
}

export interface TwinPreviewState {
  overall: Status | null;
  why: string;
  domains: Array<{ domain: import('../types').HealthDomain; status: Status; score: number; why: string; action: string } | null>;
}

export interface CheckInEntry {
  date: string;
  answers: CheckInAnswers;
  analysis: DayAnalysis;
  savedAt: number;
}

export interface CheckInDraft {
  date: string;
  answers: CheckInAnswers;
  sectionIndex: number;
  phase: WizardPhase;
  /** Field ids currently in manual override mode */
  manualFields?: Array<keyof CheckInAnswers>;
  updatedAt: number;
}

export type WizardPhase = 'sections' | 'notes' | 'recap' | 'summary';
