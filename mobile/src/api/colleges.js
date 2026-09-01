import apiClient from './client';

export async function getCollegeStates() {
  const response = await apiClient.get('/colleges/states');
  return response.data?.data || [];
}

export async function getColleges({ state = '', search = '', type = '', page = 1, limit = 20 } = {}) {
  const params = {};
  if (state && state.trim()) params.state = state.trim();
  if (search && search.trim()) params.search = search.trim();
  if (type && type.trim()) params.type = type.trim();
  if (page) params.page = page;
  if (limit) params.limit = limit;

  const response = await apiClient.get('/colleges', { params });
  return response.data || { success: false, data: [], pagination: {} };
}

export async function getCollegeById(id) {
  const response = await apiClient.get(`/colleges/${id}`);
  return response.data?.data || null;
}
