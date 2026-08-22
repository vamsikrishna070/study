import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    default: null,
  },
  customSubject: { type: String, trim: true, default: '' },
  unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', default: null },
  topic: { type: String, trim: true, default: '' },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  content: { type: String, default: '', trim: true },
  tags: [{ type: String, trim: true }],
  priority: { type: String, enum: ['low', 'medium', 'high', 'exam'], default: 'medium' },
  attachments: [{
    type: { type: String, default: 'file' }, // 'file', 'recording', 'link', 'youtube', 'image', 'document', 'audio', 'video'
    url: String,
    publicId: String,
    originalName: String,
    mimeType: String,
    size: Number,
    thumbnailUrl: String,
    duration: Number,
    metadata: mongoose.Schema.Types.Mixed
  }]
}, { timestamps: true });

noteSchema.index({ user: 1, title: 'text', content: 'text', tags: 'text', customSubject: 'text' });
export default mongoose.model('Note', noteSchema);