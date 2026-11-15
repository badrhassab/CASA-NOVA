export interface Mission {
  name: string;
  code?: string | null;
  destination: string;
  phase: string;
  mission_day?: number | null;
  planned_duration_days?: number | null;
  progress_percent?: number | string | null;
  gravity_exposure: string;
  surface_gravity_g?: number | string | null;
  atmosphere_composition?: string | null;
  radiation_environment_msv_yr?: number | string | null;
  earth_comm_delay_seconds?: number | null;
}

export interface MedicalProfile {
  known_conditions: string[];
  allergies: string[];
  baseline_bone_assessment?: string | null;
  notes?: string | null;
}

export interface HealthData {
  latest_bone_scan?: string | null;
  exercise_adherence?: string | null;
  immune_biomarkers?: string | null;
  last_physical?: string | null;
  reported_symptoms?: string[];
  radiation_accumulated_msv?: string | null;
  baseline_bone_density_tscore?: string | null;
  bone_density_loss_pct?: string | null;
  intracranial_pressure_est_mmhg?: string | null;
  optic_disc_edema_grade?: number | null;
  t_cell_activity_index?: number | string | null;
  viral_reactivation_flag?: boolean | null;
  vital_signs?: string | null;
  notes?: string | null;
  recorded_at?: string | null;
}

export interface EclssTelemetry {
  cabin_oxygen_pct?: number | string | null;
  cabin_pressure_kpa?: number | string | null;
  co2_scrub_pp_mmhg?: number | string | null;
  suit_oxygen_reserve_pct?: number | string | null;
  suit_battery_pct?: number | string | null;
  cabin_temp_c?: number | string | null;
  status_level?: string | null;
}

export interface AstronautContext {
  id: string;
  name: string;
  age?: number | null;
  callsign?: string | null;
  role?: string | null;
  blood_type?: string | null;
  data_source?: string;
  mission: Mission;
  medical_profile?: MedicalProfile;
  health_data?: HealthData;
  eclss?: EclssTelemetry;
}

export interface SourceReference {
  title: string;
  url: string;
  source: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  sources?: SourceReference[];
  suggested_followup?: string[];
  escalation_flag?: boolean;
  escalation_reason?: string | null;
}

export interface ChatResponse {
  response: string;
  intent: string;
  sources: SourceReference[];
  escalation_flag: boolean;
  escalation_reason?: string | null;
  suggested_followup: string[];
  conversation_id: string;
  data_source?: string;
}
