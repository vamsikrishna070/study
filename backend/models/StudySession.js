import mongoose from 'mongoose';

const studySessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
  topic: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', default: null },
  startedAt: { type: Date, required: true },
  endedAt: { type: Date, default: null },
  durationMinutes: { type: Number, min: 0, default: 0 },
  notes: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('StudySession', studySessionSchema);