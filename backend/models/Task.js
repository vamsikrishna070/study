import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
  topic: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', default: null },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, default: '' },
  dueDate: { type: Date, required: true },
  dueTime: { type: String, default: '' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status: { type: String, enum: ['pending', 'in_progress', 'in-progress', 'paused', 'completed'], default: 'pending' },
  scheduledStartAt: { type: Date, default: null },
  startedAt: { type: Date, default: null },
  lastStartedAt: { type: Date, default: null },
  stoppedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  reminderEnabled: { type: Boolean, default: false },
  reminderTime: { type: String, default: '' },
  reminderFrequency: { type: String, default: 'none' },
  pendingStartNotificationId: { type: String, default: '' },
  reminderNotificationId: { type: String, default: '' },
}, { timestamps: true });

taskSchema.index({ user: 1, dueDate: 1, status: 1 });
export default mongoose.model('Task', taskSchema);