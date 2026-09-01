import mongoose from 'mongoose';

const topicSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
  unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', default: null },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['not-started', 'in-progress', 'completed'], default: 'not-started' },
  completed: { type: Boolean, default: false },
  progress: { type: Number, min: 0, max: 100, default: 0 },
  importance: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
}, { timestamps: true });

export default mongoose.model('Topic', topicSchema);