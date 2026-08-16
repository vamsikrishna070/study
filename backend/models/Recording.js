import mongoose from 'mongoose';

const recordingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
  topic: { type: String, default: '' },
  title: { type: String, required: true, trim: true },
  audioUrl: { type: String, default: '' },
  audioData: { type: String, default: '' },
  duration: { type: Number, min: 0, default: 0 },
}, { timestamps: true });

export default mongoose.model('Recording', recordingSchema);