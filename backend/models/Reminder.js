import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  scheduleType: { type: String, enum: ['one-time', 'daily', 'weekly'], default: 'one-time' },
  category: { type: String, enum: ['study', 'exam', 'assignment', 'general'], default: 'general' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  remindAt: { type: Date, required: true },
  weekdays: [{ type: Number, min: 0, max: 6 }],
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit' },
  topic: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic' },
  lastFiredAt: { type: Date },
  timezone: { type: String, default: 'UTC' },
  enabled: { type: Boolean, default: true },
  notificationEnabled: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.Reminder || mongoose.model('Reminder', reminderSchema);