/**
 * Create or update the platform admin user (admin@gmail.com).
 * Usage: npm run create-admin
 * Optional env: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

import User from '../models/User.js';
import UserSettings from '../models/UserSettings.js';

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@gmail.com').toLowerCase().trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Platform Admin';

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ Set MONGODB_URI in backend/.env');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB');

  let user = await User.findOne({ email: ADMIN_EMAIL });

  if (user) {
    user.role = 'admin';
    user.isApproved = true;
    user.isActive = true;
    user.name = ADMIN_NAME;
    if (ADMIN_PASSWORD) {
      user.password = ADMIN_PASSWORD;
    }
    let settings = user.userSettingsId
      ? await UserSettings.findById(user.userSettingsId)
      : null;
    if (!settings) {
      settings = await UserSettings.create({ ownerType: 'admin', numberOfComplexes: 0 });
      user.userSettingsId = settings._id;
    } else {
      settings.ownerType = 'admin';
      await settings.save();
    }
    await user.save();
    console.log(`✅ Updated existing admin: ${ADMIN_EMAIL}`);
  } else {
    const settings = await UserSettings.create({ ownerType: 'admin', numberOfComplexes: 0 });
    user = await User.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: 'admin',
      isApproved: true,
      isActive: true,
      userSettingsId: settings._id,
    });
    console.log(`✅ Created admin: ${ADMIN_EMAIL}`);
  }

  console.log(`   Role: admin | Approved: yes | Can manage all units (Zimmers)`);
  console.log(`   Password: ${ADMIN_PASSWORD} (change after first login)`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
