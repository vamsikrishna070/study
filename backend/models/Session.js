import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  sessionHash: {
    type: String,
    required: true,
    index: true,
  },
  deviceName: {
    type: String,
    trim: true,
    default: 'Unknown Device',
  },
  deviceType: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet', 'unknown'],
    default: 'unknown',
  },
  platform: {
    type: String,
    enum: ['web', 'ios', 'android', 'desktop', 'unknown'],
    default: 'unknown',
  },
  browser: {
    type: String,
    trim: true,
    default: 'Unknown Browser',
  },
  os: {
    type: String,
    trim: true,
    default: 'Unknown OS',
  },
  ipAddress: {
    type: String,
    trim: true,
    default: '',
  },
  lastActiveAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true,
  },
  revokedAt: {
    type: Date,
    default: null,
    index: true,
  },
  revokedReason: {
    type: String,
    default: null,
  },
  isRevoked: {
    type: Boolean,
    default: false,
    index: true,
  },
}, { timestamps: true });

sessionSchema.index({ user: 1, isRevoked: 1, lastActiveAt: -1 });
sessionSchema.index({ sessionId: 1, user: 1 });

export default mongoose.model('Session', sessionSchema);
