import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://neuro-sync.onrender.com';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

export const getReadiness = async () => {
  const response = await api.get('/readiness');
  return response.data;
};

export const predictADHD = async (data) => {
  const response = await api.post('/predict', data);
  return response.data;
};

export const getRecommendations = async (data) => {
  const response = await api.post('/recommend', data);
  return response.data;
};

export const getCopilotBrief = async (data) => {
  const response = await api.post('/copilot/brief', data);
  return response.data;
};

export default api;
