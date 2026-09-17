import client from './client';

export const connectPortal = async (srmUsernameOrPayload, maybePassword) => {
  let payload;
  if (typeof srmUsernameOrPayload === 'string') {
    payload = {
      srmUsername: srmUsernameOrPayload.trim().replace(/^["']+|["']+$/g, ''),
      srmPassword: maybePassword || '',
    };
  } else if (typeof srmUsernameOrPayload === 'object' && srmUsernameOrPayload !== null) {
    const rawUsername = srmUsernameOrPayload.srmUsername || srmUsernameOrPayload.registrationNumber || '';
    const rawPassword = srmUsernameOrPayload.srmPassword || srmUsernameOrPayload.password || '';
    payload = {
      srmUsername: typeof rawUsername === 'string' ? rawUsername.trim().replace(/^["']+|["']+$/g, '') : rawUsername,
      srmPassword: typeof rawPassword === 'string' ? rawPassword.trim().replace(/^["']+|["']+$/g, '') : rawPassword,
    };
  } else {
    payload = srmUsernameOrPayload;
  }
  const res = await client.post('/portal/connect', payload);
  return res.data;
};

export const getPortalStatus = async () => {
  const res = await client.get('/portal/status');
  return res.data.data || res.data;
};

export const verifyPortalSession = async () => {
  const res = await client.get('/portal/verify');
  return res.data.data || res.data;
};

export const syncPortalData = async () => {
  const res = await client.post('/portal/sync');
  return res.data;
};

export const getAcademicCalendar = async () => {
  const res = await client.get('/portal/calendar');
  return res.data.data || res.data;
};

export const disconnectPortal = async () => {
  const res = await client.delete('/portal/disconnect');
  return res.data;
};

export const getTodayAttendance = async () => {
  const res = await client.get('/portal/attendance/today');
  return res.data.data || res.data;
};

export const markAttendanceCode = async (attendanceCode) => {
  const res = await client.post('/portal/attendance/mark', { attendanceCode });
  return res.data;
};

export const getTimetableData = async () => {
  const res = await client.get('/portal/timetable');
  return res.data.data || res.data;
};

export const getAttendancePlanner = async () => {
  const res = await client.get('/portal/attendance/planner');
  return res.data.data || res.data;
};

