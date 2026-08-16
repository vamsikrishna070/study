import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, default: 'general' },
  title: { type: String, required: true },
  message: { type: String, default: '' },
  readAt: { type: Date, default: null },
  actionUrl: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);