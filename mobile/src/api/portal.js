import client from './client';

export const connectPortal = async (payload) => {
  const res = await client.post('/portal/connect', payload);
  return res.data;
};

export const getPortalStatus = async () => {
  const res = await client.get('/portal/status');
  return res.data.data;
};

export const syncPortalData = async () => {
  const res = await client.post('/portal/sync');
  return res.data;
};

export const getAcademicCalendar = async () => {
  const res = await client.get('/portal/calendar');
  return res.data.data;
};

export const disconnectPortal = async () => {
  const res = await client.delete('/portal/disconnect');
  return res.data;
};
