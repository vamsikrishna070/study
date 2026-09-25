import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  if (!env.MONGODB_URI) {
    console.error('ERROR: MONGODB_URI is not defined in the environment variables.');
    process.exit(1);
  }
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    console.log('MongoDB Atlas connected securely');
    return mongoose.connection;
  } catch (error) {
    console.error('Failed to connect to MongoDB Atlas:', error.message);
    process.exit(1);
  }
}