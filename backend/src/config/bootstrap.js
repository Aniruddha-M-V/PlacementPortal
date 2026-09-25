const User = require('../models/User');
const AcademicConfig = require('../models/AcademicConfig');
const { ROLES } = require('../config/constants');

/**
 * Runs once after DB connection.
 * Creates a default admin account if the users collection is empty.
 * No public registration endpoint is ever exposed — only admins
 * can create Faculty and Student accounts through the API.
 */
const bootstrap = async () => {
  try {
    const count = await User.countDocuments();

    if (count > 0) {
      // Users already exist — nothing to do
      return;
    }

    const email    = process.env.ADMIN_EMAIL    || 'admin@placementportal.com';
    const password = process.env.ADMIN_PASSWORD || 'Admin@123456';
    const name     = process.env.ADMIN_NAME     || 'Admin User';

    // Password is hashed automatically by the User pre-save hook
    await User.create({
      name,
      email,
      password,
      role: ROLES.ADMIN,
      isActive: true,
    });

    console.log('');
    console.log('┌─────────────────────────────────────────────┐');
    console.log('│  🎉  Default Admin Account Created           │');
    console.log('│                                              │');
    console.log(`│  Email   : ${email.padEnd(33)}│`);
    console.log(`│  Password: ${password.padEnd(33)}│`);
    console.log('│                                              │');
    console.log('│  ⚠  Change this password after first login! │');
    console.log('└─────────────────────────────────────────────┘');
    console.log('');
  } catch (err) {
    // Non-fatal — log and continue. Server still starts.
    console.error('⚠️  Bootstrap warning:', err.message);
  }

  // ── Seed default MCA department ─────────────────────────────────────────
  try {
    const deptCount = await AcademicConfig.countDocuments({ type: 'department' });
    if (deptCount === 0) {
      await AcademicConfig.create({ type: 'department', name: 'MCA', isActive: true });
      console.log('📚  Default department "MCA" created.');
    }
  } catch (err) {
    console.error('⚠️  AcademicConfig seed warning:', err.message);
  }
};

module.exports = bootstrap;
