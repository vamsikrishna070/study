import { Router } from 'express';
import authRoutes from './authRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import examRoutes from './examRoutes.js';
import noteRoutes from './noteRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import progressRoutes from './progressRoutes.js';
import recordingRoutes from './recordingRoutes.js';
import reminderRoutes from './reminderRoutes.js';
import resourceRoutes from './resourceRoutes.js';
import studySessionRoutes from './studySessionRoutes.js';
import subjectRoutes from './subjectRoutes.js';
import taskRoutes from './taskRoutes.js';
import topicRoutes from './topicRoutes.js';
import unitRoutes from './unitRoutes.js';
import importantPointRoutes from './importantPointRoutes.js';
import searchRoutes from './searchRoutes.js';
import uploadRoutes from './uploadRoutes.js';

import mongoose from 'mongoose';

const router = Router();
router.get('/health', (_req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';
  res.json({ 
    success: true, 
    api: 'ok',
    database: dbStatus,
    message: 'StudyArena API is running'
  });
});
router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/subjects', subjectRoutes);
router.use('/units', unitRoutes);
router.use('/topics', topicRoutes);
router.use('/notes', noteRoutes);
router.use('/tasks', taskRoutes);
router.use('/exams', examRoutes);
router.use('/resources', resourceRoutes);
router.use('/recordings', recordingRoutes);
router.use('/reminders', reminderRoutes);
router.use('/study-sessions', studySessionRoutes);
router.use('/progress', progressRoutes);
router.use('/notifications', notificationRoutes);
router.use('/important-points', importantPointRoutes);
router.use('/search', searchRoutes);
router.use('/upload', uploadRoutes);
export default router;