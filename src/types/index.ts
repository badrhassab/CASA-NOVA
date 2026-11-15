export type Status = 'green' | 'yellow' | 'orange' | 'red';

export interface DailyRecord {
  day: number;
  hr: number;
  hrv: number;
  sleepHours: number;
  mood: number; /*1-10*/
  reactionMs: number;
  weight: number;
  exerciseMin: number;
  radiationMSv: number;
}

export type HealthDomain = 'bone' | 'heart' | 'immune' | 'mind';

export interface DomainStatus {
  domain: HealthDomain;
  status: Status;
  score: number; /*0-100*/
  why: string;
  action: string;
}

export interface DayAnalysis {
  day: number;
  overall: Status;
  domains: DomainStatus[];
}
