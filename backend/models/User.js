import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  password: { type: String, required: true, minlength: 6, select: false },
  university: { type: String, trim: true, default: '' },
  degree: { type: String, trim: true, default: '' },
  branch: { type: String, trim: true, default: '' },
  batch: { type: String, trim: true, default: '' },
  semester: { type: Number, min: 1, max: 12, default: 1 },
  notificationPreferences: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
  },
}, { timestamps: true });

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(value) {
  return bcrypt.compare(value, this.password);
};

export default mongoose.model('User', userSchema);