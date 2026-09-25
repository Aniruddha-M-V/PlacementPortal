/**
 * PRODUCTION ONE-TIME CLEANUP SCRIPT
 * ====================================
 * Removes ALL demo/test data. Preserves Admin users.
 * Run ONCE manually: node src/scripts/prod-cleanup.js
 * NEVER runs automatically.
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../../..", ".env") });
const mongoose = require("mongoose");
const readline = require("readline");

const User           = require("../models/User");
const Student        = require("../models/Student");
const Faculty        = require("../models/Faculty");
const TrainingSession = require("../models/TrainingSession");
const Attendance     = require("../models/Attendance");
const Assessment     = require("../models/Assessment");
const Activity       = require("../models/Activity");
const Resume         = require("../models/Resume");
const Notification   = require("../models/Notification");
const AcademicConfig = require("../models/AcademicConfig");

const ask = (q) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(q, (a) => { rl.close(); resolve(a.trim()); });
  });

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error("MONGODB_URI not set."); process.exit(1); }

  await mongoose.connect(uri);
  const dbName = mongoose.connection.db.databaseName;

  console.log("\n======================================================");
  console.log("  PRODUCTION DATABASE CLEANUP — ONE-TIME SCRIPT");
  console.log("======================================================");
  console.log("  DB:", dbName);
  console.log("\n  WILL DELETE: students, faculty, sessions, attendance,");
  console.log("  assessments, activities, resumes, notifications,");
  console.log("  academicConfigs, non-admin users.");
  console.log("  WILL PRESERVE: all admin (role=admin) accounts.\n");

  const admins = await User.find({ role: "admin" }).select("name email");
  console.log("  Admins to be preserved:", admins.length);
  admins.forEach((a) => console.log("    ->", a.email));

  const confirm = await ask('\n  Type "DELETE ALL DEMO DATA" to confirm: ');
  if (confirm !== "DELETE ALL DEMO DATA") {
    console.log("\n  Cancelled. Nothing deleted.");
    await mongoose.disconnect(); process.exit(0);
  }

  console.log("\n  Cleaning...");
  const r = {};
  r.attendance     = (await Attendance.deleteMany({})).deletedCount;
  r.assessments    = (await Assessment.deleteMany({})).deletedCount;
  r.sessions       = (await TrainingSession.deleteMany({})).deletedCount;
  r.resumes        = (await Resume.deleteMany({})).deletedCount;
  r.activities     = (await Activity.deleteMany({})).deletedCount;
  r.notifications  = (await Notification.deleteMany({})).deletedCount;
  r.students       = (await Student.deleteMany({})).deletedCount;
  r.faculty        = (await Faculty.deleteMany({})).deletedCount;
  r.academicConfig = (await AcademicConfig.deleteMany({})).deletedCount;
  r.nonAdminUsers  = (await User.deleteMany({ role: { $ne: "admin" } })).deletedCount;

  console.log("\n  Deleted:");
  Object.entries(r).forEach(([k, v]) => console.log("   ", k, ":", v));

  const remaining = await User.find({ role: "admin" }).select("email role");
  console.log("\n  Admin accounts remaining:", remaining.length);
  remaining.forEach((a) => console.log("    ->", a.email, "| role:", a.role));
  console.log("\n  Done. Database is clean and ready for production.\n");
  await mongoose.disconnect();
}

main().catch((e) => { console.error("Error:", e.message); mongoose.disconnect(); process.exit(1); });
