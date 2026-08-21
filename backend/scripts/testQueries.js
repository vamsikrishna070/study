import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import College from '../models/College.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testQueries() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB for Query Testing...');

  // 1. Test SRM search
  const srmResults = await College.find({
    isActive: true,
    $or: [
      { name: /SRM/i },
      { shortName: /SRM/i },
      { normalizedName: /srm/i },
      { city: /SRM/i },
    ]
  }).select('_id name shortName type state city');
  console.log('\n--- 1. Search "SRM" Results: ---');
  console.log(srmResults);

  // 2. Test State filter "Andhra Pradesh"
  const apResults = await College.find({
    isActive: true,
    state: 'Andhra Pradesh'
  }).select('_id name shortName type state city').sort({ name: 1 });
  console.log(`\n--- 2. State "Andhra Pradesh" Count: ${apResults.length} ---`);
  apResults.forEach(c => console.log(`  • ${c.name} (${c.type}) - ${c.city}`));

  // 3. Test State + Search combined
  const apSrm = await College.find({
    isActive: true,
    state: 'Andhra Pradesh',
    $or: [
      { name: /SRM/i },
      { shortName: /SRM/i },
      { normalizedName: /srm/i },
    ]
  }).select('_id name shortName type state city');
  console.log('\n--- 3. State "Andhra Pradesh" + Search "SRM": ---');
  console.log(apSrm);

  // 4. Test distinct states
  const states = await College.distinct('state', { isActive: true });
  console.log(`\n--- 4. Total States & UTs: ${states.length} ---`);

  await mongoose.disconnect();
}

testQueries().then(() => console.log('Queries tested successfully.'));
