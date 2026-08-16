import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
  topic: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', default: null },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, default: '' },
  dueDate: { type: Date, required: true },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status: { type: String, enum: ['pending', 'in-progress', 'completed'], default: 'pending' },
  estimatedDuration: { type: Number, min: 1, default: 45 },
  completedAt: { type: Date, default: null },
}, { timestamps: true });

taskSchema.index({ user: 1, dueDate: 1, status: 1 });
export default mongoose.model('Task', taskSchema);