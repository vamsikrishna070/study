import User from '../models/User.js';
import { generateToken } from '../utils/generateToken.js';

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
});

export async function register(req, res) {
  const { name, email, password, university, degree, branch, batch, semester } = req.body;
  if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
  if (password.length < 6) return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ success: false, message: 'An account with that email already exists' });
  const user = await User.create({ name, email, password, university, degree, branch, batch, semester });
  res.status(201).json({ success: true, data: { user: publicUser(user), token: generateToken(user._id) } });
}

export async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password || ''))) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }
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