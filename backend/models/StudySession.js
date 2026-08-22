import mongoose from 'mongoose';

const studySessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null, index: true },
  subjectName: { type: String, trim: true, default: '' },
  topic: { type: String, trim: true, default: '' },
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
  exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', default: null },
  sessionType: { type: String, enum: ['timer', 'manual'], default: 'timer' },
  status: { type: String, enum: ['active', 'paused', 'completed', 'cancelled'], default: 'completed' },
  startedAt: { type: Date, required: true },
  endedAt: { type: Date, default: null },
  pausedAt: { type: Date, default: null },
  totalPausedMs: { type: Number, default: 0 },
  durationMinutes: { type: Number, min: 0, default: 0 },
  productivity: { type: String, enum: ['productive', 'average', 'difficult', null], default: null },
  goal: { type: String, trim: true, default: '' },
  notes: { type: String, trim: true, default: '' },
}, { timestamps: true });

export default mongoose.model('StudySession', studySessionSchema);