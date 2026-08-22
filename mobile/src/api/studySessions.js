import apiClient from './client';

/**
 * Fetch list of study sessions with pagination and filters
 * @param {Object} params - { subjectId, sessionType, page, limit }
 */
export async function getStudySessions(params = {}) {
  const response = await apiClient.get('/study-sessions', { params });
  return response.data || { success: false, data: [], pagination: {} };
}

/**
 * Fetch calculated study analytics and streak metrics
 */
export async function getStudyStats() {
  const response = await apiClient.get('/study-sessions/stats');
  return response.data?.data || null;
}

/**
 * Create a new study session (active timer start or completed manual log)
 * @param {Object} sessionData
 */
export async function createStudySession(sessionData) {
  const response = await apiClient.post('/study-sessions', sessionData);
  return response.data?.data || response.data;
}

/**
 * Update an existing study session (pause, resume, complete, add reflection)
 * @param {string} id
 * @param {Object} sessionData
 */
export async function updateStudySession(id, sessionData) {
  const response = await apiClient.patch(`/study-sessions/${id}`, sessionData);
  return response.data?.data || response.data;
}

/**
 * Delete a study session
 * @param {string} id
 */
export async function deleteStudySession(id) {
  const response = await apiClient.delete(`/study-sessions/${id}`);
  return response.data;
}
