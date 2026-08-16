import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDB() {
  if (!env.MONGODB_URI) {
    console.error('ERROR: MONGODB_URI is not defined in the environment variables.');
    process.exit(1);
  }
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(env.MONGODB_URI);
    console.log('MongoDB Atlas connected securely');
  } catch (error) {
    console.error('Failed to connect to MongoDB Atlas:', error.message);
    process.exit(1);
  }
}