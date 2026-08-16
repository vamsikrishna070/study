import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  code: { type: String, required: true, trim: true, maxlength: 30 },
  credits: { type: Number, required: true, min: 1, max: 10 },
  faculty: { type: String, trim: true, default: '' },
  semester: { type: Number, min: 1, max: 12, default: 1 },
  description: { type: String, trim: true, default: '' },
  examDate: { type: Date, default: null },
  progress: { type: Number, min: 0, max: 100, default: 0 },
  targetGrade: { type: String, trim: true, default: '' },
  color: { type: String, default: '#d46c52' },
  syllabusFile: {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' },
    originalName: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    size: { type: Number, default: 0 },
  },
}, { timestamps: true });

subjectSchema.index({ user: 1, code: 1 }, { unique: true });
export default mongoose.model('Subject', subjectSchema);