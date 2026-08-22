import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/User.js';

const RENDER_BASE = 'https://study-o20l.onrender.com/api';

async function testLive() {
  console.log('Connecting to MongoDB Atlas to retrieve or prepare a verified test user...');
  await mongoose.connect(env.MONGODB_URI);

  const testEmail = 'render_live_test@example.com';
  let user = await User.findOne({ email: testEmail });
  if (!user) {
    user = new User({
      name: 'Live Render Test User',
      email: testEmail,
      password: 'password123',
      isVerified: true,
    });
    await user.save();
  }
  
  const token = jwt.sign({ userId: user._id }, env.JWT_SECRET, { expiresIn: '1d' });
  console.log(`Generated JWT token for user ${user._id}`);
  await mongoose.disconnect();

  console.log('\n=============================================');
  console.log('TESTING LIVE RENDER BACKEND');
  console.log('URL:', RENDER_BASE);
  console.log('=============================================\n');

  // Test 1: Fetch SRM College from Live Render API
  console.log('[STEP 1] Querying /colleges?search=SRM on Render...');
  const searchRes = await fetch(`${RENDER_BASE}/colleges?search=SRM`);
  const searchData = await searchRes.json();
  console.log('Search Status:', searchRes.status, 'Results:', searchData.data?.length);
  const selectedCollege = searchData.data?.[0];
  if (!selectedCollege) {
    throw new Error('Could not find SRM in Render colleges database');
  }
  console.log(`Selected College: ${selectedCollege.name} (ID: ${selectedCollege.id})`);

  // Helper for PATCH /auth/profile
  async function patchProfile(label, body) {
    console.log(`\n--> [${label}] Payload:`, JSON.stringify(body));
    const res = await fetch(`${RENDER_BASE}/auth/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    console.log(`Response HTTP Status: ${res.status}`);
    console.log(`Response Body:`, JSON.stringify(data, null, 2));
    return { status: res.status, data };
  }

  // Test Case A: Selected College
  const resA = await patchProfile('CASE A: Selected Seeded College', {
    collegeId: selectedCollege.id,
    university: selectedCollege.name,
    degree: 'B.Tech',
    branch: 'CSE',
    batch: '1st Year',
    semester: 1,
  });

  // Test Case B: Manual College
  const resB = await patchProfile('CASE B: Manual College', {
    collegeId: null,
    university: 'Stanford Institute of Technology',
    degree: 'B.Tech',
    branch: 'AI & DS',
    batch: '2nd Year',
    semester: 3,
  });

  // Test Case C: Clear College
  const resC = await patchProfile('CASE C: Clear College', {
    collegeId: null,
    university: '',
  });

  // Test Case D: Invalid College ID (Expect 400)
  const resD = await patchProfile('CASE D: Invalid College ID', {
    collegeId: 'invalid-hex-id',
    university: 'Test Univ',
  });

  console.log('\n=============================================');
  console.log('SUMMARY OF LIVE RENDER API RESULTS:');
  console.log('=============================================');
  console.log('Case A (Selected College):', resA.status === 200 && resA.data?.success ? 'PASS (200 OK)' : `FAIL (${resA.status})`);
  console.log('Case B (Manual College):  ', resB.status === 200 && resB.data?.success ? 'PASS (200 OK)' : `FAIL (${resB.status})`);
  console.log('Case C (Clear College):   ', resC.status === 200 && resC.data?.success ? 'PASS (200 OK)' : `FAIL (${resC.status})`);
  console.log('Case D (Invalid ID):      ', resD.status === 400 && !resD.data?.success ? 'PASS (400 Bad Request)' : `FAIL (${resD.status})`);

  if (resA.status === 200 && resB.status === 200 && resC.status === 200 && resD.status === 400) {
    console.log('\n>>> ALL LIVE RENDER ENDPOINTS ARE FULLY OPERATIONAL AND VERIFIED! <<<');
  } else {
    console.log('\n>>> Render might still be deploying. Wait and retry. <<<');
  }
}

testLive().catch((e) => {
  console.error('Live test error:', e);
});
