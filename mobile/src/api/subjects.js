import client from './client';

export const getSubjects = async () => {
  const response = await client.get('/subjects');
  return response.data;
};

export const createSubject = async (subjectData) => {
  const response = await client.post('/subjects', subjectData);
  return response.data;
};

export const updateSubject = async (id, subjectData) => {
  const response = await client.patch(`/subjects/${id}`, subjectData);
  return response.data;
};

export const deleteSubject = async (id) => {
  const response = await client.delete(`/subjects/${id}`);
  return response.data;
};
