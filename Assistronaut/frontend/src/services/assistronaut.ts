import axios from 'axios';
import { AstronautContext, ChatMessage, ChatResponse } from '../types/assistronaut';

const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ASSISTRONAUT_API_URL) ||
  'http://localhost:8000/api/assistronaut';

export const SAMPLE_ASTRONAUT_CONTEXT: AstronautContext = {
  id: 'AST-001',
  name: 'Commander Alex Rivera',
  age: 35,
  data_source: 'offline_sample',
  mission: {
    name: 'ARES-01',
    destination: 'Mars',
    phase: 'Interplanetary transit',
    mission_day: 126,
    planned_duration_days: 900,
    gravity_exposure: 'Microgravity during transit',
  },
  medical_profile: {
    known_conditions: [],
    allergies: [],
    baseline_bone_assessment: 'Pre-flight DXA baseline logged at launch',
  },
  health_data: {
    latest_bone_scan: 'Mission Day 90 (36 days ago)',
    exercise_adherence: '85% adherence to daily resistance cycle',
    immune_biomarkers: 'Salivary cortisol & sIgA logged on Mission Day 60',
    last_physical: 'Mission Day 100',
    reported_symptoms: [],
  },
};

/**
 * Send a message to Assistronaut.
 * If astronautId or astronautContext is passed, Assistronaut will personalize the response.
 * If neither is passed, Django will automatically query Supabase for the current astronaut.
 */
export const sendMessage = async (
  message: string,
  conversationHistory: ChatMessage[] = [],
  conversationId: string | null = null,
  astronautContext: AstronautContext | null = null,
  astronautId?: string
): Promise<ChatResponse> => {
  const payload: Record<string, any> = {
    message,
    conversation_history: conversationHistory.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    conversation_id: conversationId,
  };

  if (astronautContext) {
    payload.astronaut_context = astronautContext;
  } else if (astronautId) {
    payload.astronaut_id = astronautId;
  }

  const response = await axios.post<ChatResponse>(`${API_BASE_URL}/chat/`, payload);
  return response.data;
};

export const fetchAstronautContext = async (astronautId?: string): Promise<AstronautContext> => {
  const response = await axios.get<AstronautContext>(`${API_BASE_URL}/context/`, {
    params: astronautId ? { astronaut_id: astronautId } : undefined,
  });
  return response.data;
};

export const checkHealth = async (): Promise<{ status: string; service: string }> => {
  const response = await axios.get(`${API_BASE_URL}/health/`);
  return response.data;
};
