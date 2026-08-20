import client from './client';

export const getTasks = async () => {
  const response = await client.get('/tasks');
  return response.data;
};

export const createTask = async (taskData) => {
  const response = await client.post('/tasks', taskData);
  return response.data;
};

export const updateTask = async (id, taskData) => {
  const response = await client.patch(`/tasks/${id}`, taskData);
  return response.data;
};

export const deleteTask = async (id) => {
  const response = await client.delete(`/tasks/${id}`);
  return response.data;
};
