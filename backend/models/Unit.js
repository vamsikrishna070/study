import mongoose from 'mongoose';

const unitSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  order: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model('Unit', unitSchema);