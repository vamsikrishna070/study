import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  password: { type: String, required: true, minlength: 6, select: false },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', default: null, index: true },
  university: { type: String, trim: true, default: '' },
  registrationNumber: { type: String, trim: true, default: '' },
  degree: { type: String, trim: true, default: '' },
  branch: { type: String, trim: true, default: '' },
  section: { type: String, trim: true, default: '' },
  batch: { type: String, trim: true, default: '' },
  semester: { type: Number, min: 1, max: 12, default: 1 },
  profileImageUrl: { type: String, default: '' },
  profileImagePublicId: { type: String, default: '' },
  notificationPreferences: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
  },
  isVerified: { type: Boolean, default: false },
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  lastActiveDate: { type: String, default: '' },
  otp: { type: String, select: false },
  otpExpires: { type: Date, select: false },
  resetPasswordOtp: { type: String, select: false },
  resetPasswordExpires: { type: Date, select: false },
}, { timestamps: true });

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(value) {
  return bcrypt.compare(value, this.password);
};

export default mongoose.model('User', userSchema);