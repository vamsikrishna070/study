import apiClient from './apiClient.js';

export const connectPortal = async (payload) => {
  const res = await apiClient.post('/portal/connect', payload);
  return res.data;
};

export const getPortalStatus = async () => {
  const res = await apiClient.get('/portal/status');
  return res.data.data;
};

export const syncPortalData = async () => {
  const res = await apiClient.post('/portal/sync');
  return res.data;
};

export const getAcademicCalendar = async () => {
  const res = await apiClient.get('/portal/calendar');
  return res.data.data;
};

export const disconnectPortal = async () => {
  const res = await apiClient.delete('/portal/disconnect');
  return res.data;
};
