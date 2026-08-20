import client from './client';

export const getExams = async () => {
  const response = await client.get('/exams');
  return response.data;
};

export const createExam = async (examData) => {
  const response = await client.post('/exams', examData);
  return response.data;
};

export const updateExam = async (id, examData) => {
  const response = await client.patch(`/exams/${id}`, examData);
  return response.data;
};

export const deleteExam = async (id) => {
  const response = await client.delete(`/exams/${id}`);
  return response.data;
};
