import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
  topic: { type: String, default: '' },
  title: { type: String, required: true, trim: true },
  resourceType: { type: String, default: 'file' },
  url: { type: String, trim: true },
  fileData: {
    publicId: String,
    originalName: String,
    mimeType: String,
    size: Number,
    thumbnailUrl: String,
    duration: Number,
    metadata: mongoose.Schema.Types.Mixed
  },
  attachments: [{
    publicId: String,
    originalName: String,
    name: String,
    url: String,
    mimeType: String,
    type: { type: String },
    size: Number,
    thumbnailUrl: String,
    duration: Number,
    createdAt: { type: Date, default: Date.now },
    metadata: mongoose.Schema.Types.Mixed
  }],
  description: { type: String, default: '' },
  notes: { type: String, default: '' },
  rating: { type: Number, min: 0, max: 5, default: 0 },
  watched: { type: Boolean, default: false },
  tags: [{ type: String, trim: true }],
}, { timestamps: true });

export default mongoose.model('Resource', resourceSchema);