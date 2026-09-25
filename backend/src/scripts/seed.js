require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const { ROLES } = require('../config/constants');

const seed = async () => {
  try {
    await connectDB();

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@placementportal.com';

    const existing = await User.findOne({ email: adminEmail });
    if (existing) {
      console.log(`ℹ️  Admin user already exists: ${adminEmail}`);
      process.exit(0);
    }

    const admin = await User.create({
      name: process.env.ADMIN_NAME || 'Admin User',
      email: adminEmail,
      password: process.env.ADMIN_PASSWORD || 'Admin@123456',
      role: ROLES.ADMIN,
      isActive: true,
    });

    console.log('✅ Admin user created successfully:');
    console.log(`   Name  : ${admin.name}`);
    console.log(`   Email : ${admin.email}`);
    console.log(`   Role  : ${admin.role}`);
    console.log(`\n   Login at /login with your .env credentials`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    process.exit(1);
  }
};

seed();
