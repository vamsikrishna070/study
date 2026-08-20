import client from './client';

export const getProgress = async () => {
  const response = await client.get('/progress');
  return response.data;
};
