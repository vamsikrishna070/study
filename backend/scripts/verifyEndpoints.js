import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import College from '../models/College.js';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function verifyAll() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('--- STARTING COLLEGE SYSTEM VERIFICATION ---');

  // Test 1: States count
  const states = await College.distinct('state', { isActive: true });
  console.log(`\n✓ [TEST 1] States & UTs returned: ${states.length} (Expected: 36)`);
  if (states.length !== 36) throw new Error(`States mismatch: got ${states.length}`);

  // Test 2: Search "SRM"
  const srmSearch = await College.find({
    isActive: true,
    $or: [{ name: /SRM/i }, { shortName: /SRM/i }]
  }).lean();
  console.log(`✓ [TEST 2] Search 'SRM' returned ${srmSearch.length} institutions`);
  srmSearch.forEach(c => console.log(`   - ${c.name} (${c.shortName}) in ${c.city}, ${c.state}`));

  // Test 3: Filter by State "Telangana"
  const tsColleges = await College.find({ isActive: true, state: 'Telangana' }).lean();
  console.log(`✓ [TEST 3] Filter State 'Telangana' returned ${tsColleges.length} institutions`);

  // Test 4: Filter by Type "Institute of National Importance"
  const iniColleges = await College.find({ isActive: true, type: 'Institute of National Importance' }).lean();
  console.log(`✓ [TEST 4] Filter Type 'Institute of National Importance' returned ${iniColleges.length} institutions`);

  // Test 5: Get single college by ID
  const singleCollege = await College.findOne({ shortName: 'SRM-AP' }).lean();
  console.log(`✓ [TEST 5] Single College By ID (${singleCollege._id}): ${singleCollege.name}`);

  // Test 6: Verify User model schema compatibility with collegeId + university fallback
  const testUser = new User({
    name: 'Test Student',
    email: `test_college_${Date.now()}@example.com`,
    password: 'Password123!',
    collegeId: singleCollege._id,
    university: singleCollege.name,
    degree: 'B.Tech',
    branch: 'CSE',
  });
  await testUser.save();
  console.log(`✓ [TEST 6] Saved test user with collegeId: ${testUser.collegeId} & university: "${testUser.university}"`);

  // Test 7: Update user profile with manual college (collegeId = null)
  testUser.collegeId = null;
  testUser.university = 'My Custom Engineering College';
  await testUser.save();
  console.log(`✓ [TEST 7] Saved test user with manual college: collegeId: ${testUser.collegeId} & university: "${testUser.university}"`);

  // Cleanup test user
  await User.deleteOne({ _id: testUser._id });
  console.log('✓ Cleaned up test user');

  await mongoose.disconnect();
  console.log('\nALL BACKEND VERIFICATION TESTS PASSED SUCCESSFULLY!');
}

verifyAll()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Verification failed:', err);
    process.exit(1);
  });
