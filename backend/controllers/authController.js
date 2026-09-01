import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';
import College from '../models/College.js';
import { generateToken } from '../utils/generateToken.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/emailService.js';

const publicUser = (user) => {
  const effectiveDisplayName = (user.displayName && user.displayName.trim())
    ? user.displayName.trim()
    : ((user.officialName && user.officialName.trim()) ? user.officialName.trim() : user.name);

  return {
    id: user._id,
    name: effectiveDisplayName,
    displayName: user.displayName || '',
    officialName: user.officialName || user.name || '',
    effectiveDisplayName,
    email: user.email,
    collegeId: user.collegeId || null,
    university: user.university || '',
    registrationNumber: user.registrationNumber || '',
    degree: user.degree || '',
    branch: user.branch || '',
    section: user.section || '',
    batch: user.batch || '',
    semester: user.semester || 1,
    profileImageUrl: user.profileImageUrl || '',
    profileImagePublicId: user.profileImagePublicId || '',
    notificationPreferences: user.notificationPreferences || { email: true, push: true },
    isVerified: user.isVerified || false,
    currentStreak: user.currentStreak || 0,
    longestStreak: user.longestStreak || 0,
    lastActiveDate: user.lastActiveDate || '',
  };
};

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export async function register(req, res) {
  let { name, email, password, collegeId, university, degree, branch, batch, semester } = req.body;
  if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
  email = email.trim().toLowerCase();
  if (password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.isVerified) {
      return res.status(409).json({ success: false, message: 'An account with that email already exists' });
    } else {

      await User.deleteOne({ _id: existing._id });
    }
  }

  let validCollegeId = null;
  if (collegeId && typeof collegeId === 'string' && mongoose.Types.ObjectId.isValid(collegeId.trim())) {
    const collegeExists = await College.findOne({ _id: collegeId.trim(), isActive: true });
    if (collegeExists) {
      validCollegeId = collegeExists._id;
    }
  }

  const user = new User({
    name: name.trim(),
    email,
    password,
    collegeId: validCollegeId,
    university: university ? university.trim() : '',
    degree: degree ? degree.trim() : '',
    branch: branch ? branch.trim() : '',
    batch: batch ? batch.trim() : '',
    semester: Number(semester) || 1
  });

  const otp = generateOTP();
  user.otp = await bcrypt.hash(otp, 10);
  user.otpExpires = new Date(Date.now() + 15 * 60 * 1000);
  user.isVerified = false;

  await user.save();

  try {
    await sendVerificationEmail({ email: user.email, name: user.name, otp });
  } catch (error) {
    console.error('[AuthController] Registration email dispatch failed:', error);
    await User.deleteOne({ _id: user._id }).catch(err => console.error('[AuthController] Failed to cleanup user record:', err.message));
    return res.status(500).json({ success: false, message: 'We couldn\'t send the verification email. Please try again shortly.' });
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
  let { email, purpose = 'registration' } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
  email = email.trim().toLowerCase();

  const user = await User.findOne({ email }).select('+otpExpires +resetPasswordExpires');
  if (!user) {
    if (purpose === 'password_reset') {
      return res.json({ success: true, message: 'If an account exists, a reset code was sent' });
    }
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (purpose === 'registration') {
    if (user.isVerified) return res.status(400).json({ success: false, message: 'Account is already verified' });

    if (user.otpExpires && user.otpExpires > new Date(Date.now() + 14 * 60 * 1000)) {
      return res.status(429).json({ success: false, message: 'Please wait before requesting a new OTP' });
    }

    const otp = generateOTP();
    user.otp = await bcrypt.hash(otp, 10);
    user.otpExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    try {
      await sendVerificationEmail({ email: user.email, name: user.name, otp });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message || 'Unable to send verification email' });
    }

    return res.json({ success: true, message: 'A new verification code has been sent' });
  } else if (purpose === 'password_reset') {
    if (user.resetPasswordExpires && user.resetPasswordExpires > new Date(Date.now() + 14 * 60 * 1000)) {
      return res.status(429).json({ success: false, message: 'Please wait before requesting a new OTP' });
    }

    const otp = generateOTP();
    user.resetPasswordOtp = await bcrypt.hash(otp, 10);
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    try {
      await sendPasswordResetEmail({ email: user.email, name: user.name, otp });
    } catch (error) {
      console.error('[AuthController] Failed to send password reset email:', error.message);
      return res.status(500).json({ success: false, message: error.message || 'Unable to send password reset email' });
    }

    return res.json({ success: true, message: 'If an account exists, a reset code was sent' });
  } else {
    return res.status(400).json({ success: false, message: 'Invalid purpose' });
  }
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
  user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
  await user.save();

  try {
    await sendPasswordResetEmail(user.email, otp);
  } catch (error) {
    console.error('[AuthController] Failed to send password reset email:', error.message);
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
  const {
    name,
    displayName,
    collegeId,
    university,
    registrationNumber,
    degree,
    branch,
    section,
    batch,
    semester,
    profileImageUrl,
    profileImagePublicId
  } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  if (displayName !== undefined) {
    if (typeof displayName === 'string') {
      const trimmed = displayName.trim();
      if (trimmed.length > 60) {
        return res.status(400).json({ success: false, message: 'Display Name cannot exceed 60 characters.' });
      }
      user.displayName = trimmed;
    }
  }

  if (name !== undefined) {
    if (typeof name === 'string' && name.trim()) {
      user.name = name.trim();
    } else {
      return res.status(400).json({ success: false, message: 'Name cannot be empty' });
    }
  }

  if (collegeId !== undefined) {
    if (collegeId === null || (typeof collegeId === 'string' && collegeId.trim() === '')) {
      user.collegeId = null;
    } else if (typeof collegeId === 'string' && collegeId.trim()) {
      const trimmedId = collegeId.trim();
      if (!mongoose.Types.ObjectId.isValid(trimmedId)) {
        return res.status(400).json({ success: false, message: 'Invalid college selection.' });
      }
      const collegeExists = await College.findOne({ _id: trimmedId, isActive: true });
      if (!collegeExists) {
        return res.status(400).json({ success: false, message: 'Selected college was not found.' });
      }
      user.collegeId = collegeExists._id;
    } else {
      return res.status(400).json({ success: false, message: 'Invalid college selection.' });
    }
  }

  if (university !== undefined) {
    user.university = typeof university === 'string' ? university.trim() : '';
  }

  if (registrationNumber !== undefined) {
    user.registrationNumber = typeof registrationNumber === 'string' ? registrationNumber.trim() : '';
  }

  if (degree !== undefined) {
    user.degree = typeof degree === 'string' ? degree.trim() : '';
  }

  if (branch !== undefined) {
    user.branch = typeof branch === 'string' ? branch.trim() : '';
  }

  if (section !== undefined) {
    user.section = typeof section === 'string' ? section.trim() : '';
  }

  if (batch !== undefined) {
    user.batch = typeof batch === 'string' ? batch.trim() : '';
  }

  if (semester !== undefined) {
    const sem = Number(semester);
    if (!isNaN(sem) && sem >= 1 && sem <= 12) {
      user.semester = sem;
    } else {
      return res.status(400).json({ success: false, message: 'Semester must be between 1 and 12' });
    }
  }

  if (profileImageUrl !== undefined) {
    user.profileImageUrl = typeof profileImageUrl === 'string' ? profileImageUrl.trim() : '';
  }

  if (profileImagePublicId !== undefined) {
    user.profileImagePublicId = typeof profileImagePublicId === 'string' ? profileImagePublicId.trim() : '';
  }

  await user.save();
  res.json({ success: true, data: publicUser(user) });
}

export function logout(_req, res) {
  res.json({ success: true, data: null });
}

function formatDateYYYYMMDD(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getYesterdayYYYYMMDD(todayStr) {
  const [y, m, d] = todayStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  dateObj.setDate(dateObj.getDate() - 1);
  return formatDateYYYYMMDD(dateObj);
}

export async function recordActivity(req, res) {
  try {
    const userId = req.user._id;
    const clientDate = req.body?.date;
    const isValidDateFormat = typeof clientDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(clientDate);
    const todayStr = isValidDateFormat ? clientDate : formatDateYYYYMMDD(new Date());

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const lastActive = user.lastActiveDate || '';

    if (lastActive === todayStr) {
      return res.json({
        success: true,
        data: {
          currentStreak: user.currentStreak || 1,
          longestStreak: user.longestStreak || user.currentStreak || 1,
          lastActiveDate: user.lastActiveDate,
          user: publicUser(user),
        },
      });
    }

    const yesterdayStr = getYesterdayYYYYMMDD(todayStr);

    let newStreak = 1;
    if (!lastActive) {

      newStreak = 1;
    } else if (lastActive === yesterdayStr) {

      newStreak = (user.currentStreak || 0) + 1;
    } else {

      newStreak = 1;
    }

    const newLongest = Math.max(user.longestStreak || 0, newStreak);

    user.currentStreak = newStreak;
    user.longestStreak = newLongest;
    user.lastActiveDate = todayStr;
    await user.save();

    res.json({
      success: true,
      data: {
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        lastActiveDate: user.lastActiveDate,
        user: publicUser(user),
      },
    });
  } catch (error) {
    console.error('[AuthController] Activity recording error:', error);
    res.status(500).json({ success: false, message: 'Failed to update activity status' });
  }
}