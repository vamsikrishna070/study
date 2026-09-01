import mongoose from 'mongoose';

const topicEntrySchema = new mongoose.Schema({
  topicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', default: null },
  topicName: { type: String, trim: true, default: '' },
  completed: { type: Boolean, default: false }
}, { _id: false });

const subjectEntrySchema = new mongoose.Schema({
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
  subjectName: { type: String, trim: true, default: '' },
  topics: [topicEntrySchema]
}, { _id: false });

const outsideTopicSchema = new mongoose.Schema({
  name: { type: String, trim: true, default: '' },
  completed: { type: Boolean, default: false }
}, { _id: false });

const outsideAreaSchema = new mongoose.Schema({
  area: { type: String, trim: true, default: '' },
  topics: [outsideTopicSchema]
}, { _id: false });

const studySessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null, index: true },
  subjectName: { type: String, trim: true, default: '' },
  topic: { type: String, trim: true, default: '' },
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
  exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', default: null },
  sessionType: { type: String, enum: ['timer', 'manual'], default: 'timer' },
  studyType: { type: String, enum: ['syllabus', 'revision', 'outside_syllabus'], default: 'syllabus' },
  status: { type: String, enum: ['active', 'paused', 'completed', 'cancelled'], default: 'completed' },
  startedAt: { type: Date, required: true },
  endedAt: { type: Date, default: null },
  pausedAt: { type: Date, default: null },
  totalPausedMs: { type: Number, default: 0 },
  durationMinutes: { type: Number, min: 0, default: 0 },
  productivity: { type: String, enum: ['productive', 'average', 'difficult', null], default: null },
  goal: { type: String, trim: true, default: '' },
  notes: { type: String, trim: true, default: '' },
  subjects: [subjectEntrySchema],
  outsideSyllabus: [outsideAreaSchema],
}, { timestamps: true });

export default mongoose.model('StudySession', studySessionSchema);