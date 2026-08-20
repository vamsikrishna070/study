import client from './client';

export const getResources = async (subjectId) => {
  const params = subjectId ? { subjectId } : {};
  const response = await client.get('/resources', { params });
  return response.data;
};

export const createResource = async (resourceData) => {
  const response = await client.post('/resources', resourceData);
  return response.data;
};

export const updateResource = async (id, resourceData) => {
  const response = await client.patch(`/resources/${id}`, resourceData);
  return response.data;
};

export const deleteResource = async (id) => {
  const response = await client.delete(`/resources/${id}`);
  return response.data;
};
