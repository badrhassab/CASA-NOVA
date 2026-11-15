import axios from 'axios';

const API_BASE_URL = import.meta.env?.VITE_ASSISTRONAUT_API_URL || 'http://localhost:8000/api/assistronaut';

// Sample astronaut profile matching mission specifications
export const SAMPLE_ASTRONAUT_CONTEXT = {
  id: 'AST-001',
  name: 'Commander Alex Rivera',
  age: 35,
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
 *
 * @param {string} message - The astronaut's query or symptom report
 * @param {Array} conversationHistory - Array of {role, content} objects
 * @param {string|null} conversationId - Conversation UUID
 * @param {Object|null} astronautContext - Custom astronaut profile (defaults to SAMPLE_ASTRONAUT_CONTEXT)
 * @returns {Promise<Object>} - Response payload
 */
export const sendMessage = async (
  message,
  conversationHistory = [],
  conversationId = null,
  astronautContext = null
) => {
  const response = await axios.post(`${API_BASE_URL}/chat/`, {
    message,
    astronaut_context: astronautContext || SAMPLE_ASTRONAUT_CONTEXT,
    conversation_history: conversationHistory,
    conversation_id: conversationId,
  });
  return response.data;
};

/**
 * Trigger knowledge base ingestion (admin utility).
 */
export const ingestKnowledgeBase = async () => {
  const response = await axios.post(`${API_BASE_URL}/ingest/`);
  return response.data;
};

/**
 * Check backend health status.
 */
export const checkHealth = async () => {
  const response = await axios.get(`${API_BASE_URL}/health/`);
  return response.data;
};
