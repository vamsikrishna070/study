import client from './client';

export const getReminders = async () => {
  const response = await client.get('/reminders');
  return response.data;
};

export const createReminder = async (reminderData) => {
  const response = await client.post('/reminders', reminderData);
  return response.data;
};

export const updateReminder = async (id, reminderData) => {
  const response = await client.patch(`/reminders/${id}`, reminderData);
  return response.data;
};

export const deleteReminder = async (id) => {
  const response = await client.delete(`/reminders/${id}`);
  return response.data;
};
