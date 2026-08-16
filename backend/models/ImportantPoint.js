import mongoose from 'mongoose';

const importantPointSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  topic: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', default: null },
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true },
  priority: { type: String, enum: ['medium', 'high', 'exam'], default: 'high' },
  tags: [{ type: String }],
}, { timestamps: true });

export default mongoose.model('ImportantPoint', importantPointSchema);