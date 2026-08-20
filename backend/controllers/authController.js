import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { generateToken } from '../utils/generateToken.js';
import { sendEmail } from '../utils/sendEmail.js';

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  university: user.university,
  degree: user.degree,
  branch: user.branch,
  batch: user.batch,
  semester: user.semester,
  profileImageUrl: user.profileImageUrl,
  profileImagePublicId: user.profileImagePublicId,
  notificationPreferences: user.notificationPreferences,
  isVerified: user.isVerified,
});

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export async function register(req, res) {
  let { name, email, password, university, degree, branch, batch, semester } = req.body;
  if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
  email = email.trim().toLowerCase();
  if (password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
  
  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.isVerified) {
      return res.status(409).json({ success: false, message: 'An account with that email already exists' });
    } else {
      // Allow re-registering if not verified
      await User.deleteOne({ _id: existing._id });
    }
  }
  
  const user = new User({ name, email, password, university, degree, branch, batch, semester });
  
  const otp = generateOTP();
  user.otp = await bcrypt.hash(otp, 10);
  user.otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
  user.isVerified = false;

  await user.save();

  try {
    await sendEmail({
      to: user.email,
      subject: 'Verify your email - StudyArena',
      text: `Your verification code is: ${otp}. It expires in 15 minutes.`,
    });
  } catch (error) {
    await User.deleteOne({ _id: user._id });
    return res.status(500).json({ success: false, message: 'Failed to send verification email' });
  }

  res.status(201).json({ success: true, message: 'Verification email sent' });
}

export async function verifyEmail(req, res) {
  let { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP are required' });
  email = email.trim().toLowerCase();

  const user = await User.findOne({ email }).select('+otp +otpExpires');
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  if (user.isVerified) return res.status(400).json({ success: false, message: 'Account is already verified' });
  
  if (!user.otp || !user.otpExpires || user.otpExpires < new Date()) {
    return res.status(400).json({ success: false, message: 'OTP expired. Please request a new OTP.' });
  }

  const isValid = await bcrypt.compare(otp, user.otp);
  if (!isValid) return res.status(400).json({ success: false, message: 'Invalid OTP.' });

  user.isVerified = true;
  user.otp = undefined;
  user.otpExpires = undefined;
  await user.save();

  res.json({ success: true, data: { user: publicUser(user), token: generateToken(user._id) } });
}

export async function resendOtp(req, res) {
  let { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
  email = email.trim().toLowerCase();

  const user = await User.findOne({ email }).select('+otpExpires');
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  if (user.isVerified) return res.status(400).json({ success: false, message: 'Account is already verified' });

  // Cooldown check (60 seconds)
  // otpExpires was set to Date.now() + 15 mins. If it's > Date.now() + 14 mins, then < 1 min has passed.
  if (user.otpExpires && user.otpExpires > new Date(Date.now() + 14 * 60 * 1000)) {
    return res.status(429).json({ success: false, message: 'Please wait before requesting a new OTP' });
  }

  const otp = generateOTP();
  user.otp = await bcrypt.hash(otp, 10);
  user.otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
  await user.save();

  try {
    await sendEmail({
      to: user.email,
      subject: 'Verify your email - StudyArena',
      text: `Your verification code is: ${otp}. It expires in 15 minutes.`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to send verification email' });
  }

  res.json({ success: true, message: 'A new verification code has been sent' });
}

export async function login(req, res) {
  let { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required' });
  email = email.trim().toLowerCase();
  const user = await User.findOne({ email }).select('+password +isVerified');
  if (!user || !(await user.comparePassword(password || ''))) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }
  if (!user.isVerified) {
    return res.json({ success: false, message: 'Please verify your email before logging in', unverified: true });
  }
  res.json({ success: true, data: { user: publicUser(user), token: generateToken(user._id) } });
}

export async function forgotPassword(req, res) {
  let { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
  email = email.trim().toLowerCase();

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ success: false, message: 'This email is not registered. Please check the email address or create an account.' });
  }

  const otp = generateOTP();
  user.resetPasswordOtp = await bcrypt.hash(otp, 10);
  user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
  await user.save();

  try {
    await sendEmail({
      to: user.email,
      subject: 'Password Reset - StudyArena',
      text: `Your password reset code is: ${otp}. It expires in 15 minutes.`,
    });
  } catch (error) {
    // If it fails, log it, but we already said we return success anyway
    console.error('Failed to send password reset email:', error.message);
  }

  res.json({ success: true, message: 'If an account exists, a reset code was sent' });
}

export async function resetPassword(req, res) {
  let { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required' });
  if (newPassword.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
  email = email.trim().toLowerCase();

  const user = await User.findOne({ email }).select('+resetPasswordOtp +resetPasswordExpires');
  if (!user) return res.status(404).json({ success: false, message: 'Invalid request' });
  
  if (!user.resetPasswordOtp || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
    return res.status(400).json({ success: false, message: 'OTP expired. Please request a new OTP.' });
  }

  const isValid = await bcrypt.compare(otp, user.resetPasswordOtp);
  if (!isValid) return res.status(400).json({ success: false, message: 'Invalid OTP.' });

  user.password = newPassword;
  user.resetPasswordOtp = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({ success: true, data: { user: publicUser(user), token: generateToken(user._id) } });
}

export async function me(req, res) {
  res.json({ success: true, data: publicUser(req.user) });
}

export async function updateProfile(req, res) {
  const { name, university, degree, branch, batch, semester, profileImageUrl, profileImagePublicId } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  
  if (name) user.name = name;
  if (university !== undefined) user.university = university;
  if (degree !== undefined) user.degree = degree;
  if (branch !== undefined) user.branch = branch;
  if (batch !== undefined) user.batch = batch;
  if (semester !== undefined) user.semester = semester;
  if (profileImageUrl !== undefined) user.profileImageUrl = profileImageUrl;
  if (profileImagePublicId !== undefined) user.profileImagePublicId = profileImagePublicId;

  await user.save();
  res.json({ success: true, data: publicUser(user) });
}

export function logout(_req, res) {
  res.json({ success: true, data: null });
}