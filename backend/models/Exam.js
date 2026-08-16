import mongoose from 'mongoose';

const examSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  name: { type: String, required: true, trim: true },
  type: { type: String, trim: true, default: 'End semester' },
  date: { type: Date, required: true },
  time: { type: String, default: '' },
  venue: { type: String, default: '' },
  notes: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('Exam', examSchema);