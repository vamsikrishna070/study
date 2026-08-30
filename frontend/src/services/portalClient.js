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

export const getTodayAttendance = async () => {
  const res = await apiClient.get('/portal/attendance/today');
  return res.data.data;
};

export const markAttendanceCode = async (attendanceCode) => {
  const res = await apiClient.post('/portal/attendance/mark', { attendanceCode });
  return res.data;
};

export const getTimetableData = async () => {
  const res = await apiClient.get('/portal/timetable');
  return res.data.data;
};
