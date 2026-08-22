import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import College from '../models/College.js';
import { updateProfile } from '../controllers/authController.js';
import dotenv from 'dotenv';
dotenv.config();

function mockResponse() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

async function runTests() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.');

  try {
    // Clean up or find test user
    const testEmail = 'profile_audit_test@example.com';
    await User.deleteOne({ email: testEmail });

    const singleCollege = await College.findOne({ isActive: true });
    if (!singleCollege) throw new Error('No active college found in DB');
    console.log(`Found active college: ${singleCollege.name} (${singleCollege._id})`);

    const user = new User({
      name: 'Audit Test User',
      email: testEmail,
      password: 'password123',
      isVerified: true,
    });
    await user.save();
    console.log(`Created test user: ${user._id}`);

    // TEST 1: Valid college selection
    {
      const req = {
        user: { _id: user._id },
        body: {
          collegeId: String(singleCollege._id),
          university: singleCollege.name,
          degree: 'B.Tech',
          branch: 'CSE',
          batch: '1st Year',
          semester: 2,
        },
      };
      const res = mockResponse();
      await updateProfile(req, res);
      console.log('\n[TEST 1] Valid College Selection:');
      console.log('Status:', res.statusCode, 'Success:', res.body?.success, 'CollegeId:', res.body?.data?.collegeId);
      if (res.statusCode !== 200 || !res.body?.data?.collegeId) throw new Error('Test 1 failed');
    }

    // TEST 2: Manual college selection (collegeId = null)
    {
      const req = {
        user: { _id: user._id },
        body: {
          collegeId: null,
          university: 'My Custom Engineering College',
        },
      };
      const res = mockResponse();
      await updateProfile(req, res);
      console.log('\n[TEST 2] Manual College Selection:');
      console.log('Status:', res.statusCode, 'Success:', res.body?.success, 'CollegeId:', res.body?.data?.collegeId, 'University:', res.body?.data?.university);
      if (res.statusCode !== 200 || res.body?.data?.collegeId !== null || res.body?.data?.university !== 'My Custom Engineering College') {
        throw new Error('Test 2 failed');
      }
    }

    // TEST 3: Clear college (collegeId = null, university = "")
    {
      const req = {
        user: { _id: user._id },
        body: {
          collegeId: null,
          university: '',
        },
      };
      const res = mockResponse();
      await updateProfile(req, res);
      console.log('\n[TEST 3] Clear College:');
      console.log('Status:', res.statusCode, 'Success:', res.body?.success, 'CollegeId:', res.body?.data?.collegeId, 'University:', res.body?.data?.university);
      if (res.statusCode !== 200 || res.body?.data?.collegeId !== null || res.body?.data?.university !== '') {
        throw new Error('Test 3 failed');
      }
    }

    // TEST 4: Empty string collegeId (should be converted to null safely)
    {
      const req = {
        user: { _id: user._id },
        body: {
          collegeId: '',
          university: 'Some Univ',
        },
      };
      const res = mockResponse();
      await updateProfile(req, res);
      console.log('\n[TEST 4] Empty String collegeId:');
      console.log('Status:', res.statusCode, 'Success:', res.body?.success, 'CollegeId:', res.body?.data?.collegeId);
      if (res.statusCode !== 200 || res.body?.data?.collegeId !== null) throw new Error('Test 4 failed');
    }

    // TEST 5: Existing user with only university (collegeId omitted / undefined)
    {
      // First assign a valid college
      user.collegeId = singleCollege._id;
      await user.save();

      const req = {
        user: { _id: user._id },
        body: {
          university: 'Only University Update',
        },
      };
      const res = mockResponse();
      await updateProfile(req, res);
      console.log('\n[TEST 5] Omitted collegeId (preserve existing):');
      console.log('Status:', res.statusCode, 'Success:', res.body?.success, 'CollegeId preserved:', res.body?.data?.collegeId);
      if (res.statusCode !== 200 || String(res.body?.data?.collegeId) !== String(singleCollege._id)) {
        throw new Error('Test 5 failed');
      }
    }

    // TEST 6: Invalid ObjectId format
    {
      const req = {
        user: { _id: user._id },
        body: {
          collegeId: 'invalid-non-hex-id',
          university: 'Test',
        },
      };
      const res = mockResponse();
      await updateProfile(req, res);
      console.log('\n[TEST 6] Invalid ObjectId:');
      console.log('Status:', res.statusCode, 'Message:', res.body?.message);
      if (res.statusCode !== 400 || res.body?.message !== 'Invalid college selection.') {
        throw new Error('Test 6 failed');
      }
    }

    // TEST 7: Non-existent college ObjectId
    {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const req = {
        user: { _id: user._id },
        body: {
          collegeId: nonExistentId,
          university: 'Test',
        },
      };
      const res = mockResponse();
      await updateProfile(req, res);
      console.log('\n[TEST 7] Non-existent College ID:');
      console.log('Status:', res.statusCode, 'Message:', res.body?.message);
      if (res.statusCode !== 400 || res.body?.message !== 'Selected college was not found.') {
        throw new Error('Test 7 failed');
      }
    }

    // Cleanup
    await User.deleteOne({ email: testEmail });
    console.log('\nAll 7 test suites passed seamlessly!');
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from DB.');
  }
}

runTests().catch((err) => {
  console.error('Audit test failed:', err);
  process.exit(1);
});
