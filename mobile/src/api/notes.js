import client from './client';

export const getNotes = async (subjectId) => {
  const params = subjectId ? { subjectId } : {};
  const response = await client.get('/notes', { params });
  return response.data;
};

export const createNote = async (noteData) => {
  const response = await client.post('/notes', noteData);
  return response.data;
};

export const updateNote = async (id, noteData) => {
  const response = await client.patch(`/notes/${id}`, noteData);
  return response.data;
};

export const deleteNote = async (id) => {
  const response = await client.delete(`/notes/${id}`);
  return response.data;
};
