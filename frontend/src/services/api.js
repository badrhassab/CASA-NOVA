import axios from 'axios';

// Connexion au Backend Django
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Étape 1 : Missions, Destinations & Astronautes
export const getMissions = () => api.get('missions/');
export const getDestinations = () => api.get('destinations/');
export const getAstronauts = () => api.get('astronauts/');
export const getEclssTelemetry = () => api.get('eclss/');
export const getHealthBiometrics = (astronautId) => api.get(`biometrics/?astronaut_id=${astronautId}`);

export const loginAstronaut = (username, password) =>
  api.post('auth/login/', { username, password });

export const getAstronautMissions = (accessToken) =>
  api.get('my-missions/', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

// Étape 2 : Nutrition & Repas
export const getFoodInventory = (category = 'ALL') => api.get(`food/?category=${category}`);
export const getNutritionSummary = (astronautId) => api.get(`nutrition/summary/?astronaut_id=${astronautId}`);
export const logMeal = (astronautId, foodId, mealType = 'DINNER', portion = 1.0, waterMl = 250) =>
  api.post('meals/', {
    astronaut_id: astronautId,
    food_id: foodId,
    portion_size: portion,
    meal_type: mealType,
    water_consumed_ml: waterMl
  });

// Étape 3 : Administration
export const createAstronaut = (data) => api.post('astronauts/', data);
export const createMission = (data) => api.post('missions/', data);
export const createDestination = (data) => api.post('destinations/', data);

export default api;
