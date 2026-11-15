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

// Étape 2 : Nutrition & Repas — identity comes only from the signed session token.
const withAstronautSession = (accessToken, nutritionDate) => ({
  headers: {
    Authorization: `Bearer ${accessToken}`,
    ...(nutritionDate ? { 'X-Nutrition-Date': nutritionDate } : {}),
  },
});

export const getFoodInventory = (category = 'ALL', accessToken, nutritionDate) =>
  api.get(`nutrition/catalog/?category=${encodeURIComponent(category)}`, withAstronautSession(accessToken, nutritionDate));
export const getNutritionSummary = (accessToken, nutritionDate) =>
  api.get('nutrition/summary/', withAstronautSession(accessToken, nutritionDate));
export const getNutritionRecommendations = (accessToken, nutritionDate) =>
  api.get('nutrition/recommendations/', withAstronautSession(accessToken, nutritionDate));
export const getNutritionDayAnalysis = (accessToken, nutritionDate) =>
  api.get('nutrition/me/day-analysis/', withAstronautSession(accessToken, nutritionDate));
export const logMeal = (foodId, mealType = 'DINNER', portion = 1.0, waterMl = 0, accessToken, nutritionDate) =>
  api.post('nutrition/meals/', {
    food_id: foodId,
    portion_size: portion,
    meal_type: mealType,
    water_consumed_ml: waterMl
  }, withAstronautSession(accessToken, nutritionDate));
export const cancelMeal = (mealId, accessToken) =>
  api.delete(`nutrition/meals/${encodeURIComponent(mealId)}/`, withAstronautSession(accessToken));
export const logHydration = (amountMl, accessToken, nutritionDate) =>
  api.post('nutrition/hydration/', { amount_ml: amountMl }, withAstronautSession(accessToken, nutritionDate));
export const requestNutritionReview = (nutrient, message, accessToken) =>
  api.post('nutrition/reviews/', { nutrient, message }, withAstronautSession(accessToken));

// Étape 3 : Administration
export const createAstronaut = (data) => api.post('astronauts/', data);
export const createMission = (data) => api.post('missions/', data);
export const createDestination = (data) => api.post('destinations/', data);

export default api;
