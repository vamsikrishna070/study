import apiClient from './client';

export async function getStudySessions(params = {}) {
  const response = await apiClient.get('/study-sessions', { params });
  return response.data || { success: false, data: [], pagination: {} };
}

export async function getStudyStats() {
  const response = await apiClient.get('/study-sessions/stats');
  return response.data?.data || null;
}

export async function createStudySession(sessionData) {
  const response = await apiClient.post('/study-sessions', sessionData);
  return response.data?.data || response.data;
}

export async function updateStudySession(id, sessionData) {
  const response = await apiClient.patch(`/study-sessions/${id}`, sessionData);
  return response.data?.data || response.data;
}

export async function deleteStudySession(id) {
  const response = await apiClient.delete(`/study-sessions/${id}`);
  return response.data;
}
