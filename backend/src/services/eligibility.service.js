const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Assessment = require('../models/Assessment');
const Resume = require('../models/Resume');
const { ELIGIBILITY_RULES } = require('../config/constants');

/**
 * Calculate placement eligibility for a single student.
 * Returns { isEligible, reasons, details }
 */
const calculateEligibility = async (studentId) => {
  const student = await Student.findById(studentId);
  if (!student) throw new Error('Student not found');

  const reasons = [];
  const details = {};

  // 1. Attendance >= 75%
  const attendanceRecords = await Attendance.find({ student: studentId });
  const totalClasses = attendanceRecords.length;
  const attended = attendanceRecords.filter((r) => ['present', 'late'].includes(r.status)).length;
  const attendancePct = totalClasses > 0 ? (attended / totalClasses) * 100 : 0;
  details.attendance = { total: totalClasses, attended, percentage: parseFloat(attendancePct.toFixed(2)) };

  if (attendancePct < ELIGIBILITY_RULES.MIN_ATTENDANCE_PERCENT) {
    reasons.push(`Attendance ${attendancePct.toFixed(1)}% is below required ${ELIGIBILITY_RULES.MIN_ATTENDANCE_PERCENT}%`);
  }

  // 2. Aptitude >= 60
  const aptitudeTests = await Assessment.find({ student: studentId, category: 'aptitude' }).sort({ date: -1 });
  const bestAptitude = aptitudeTests.length > 0 ? Math.max(...aptitudeTests.map((a) => a.percentage || 0)) : 0;
  details.aptitude = { attempts: aptitudeTests.length, best: bestAptitude };

  if (bestAptitude < ELIGIBILITY_RULES.MIN_APTITUDE_SCORE) {
    reasons.push(`Best aptitude score ${bestAptitude.toFixed(1)}% is below required ${ELIGIBILITY_RULES.MIN_APTITUDE_SCORE}%`);
  }

  // 3. Technical >= 60
  const techTests = await Assessment.find({ student: studentId, category: 'technical' }).sort({ date: -1 });
  const bestTechnical = techTests.length > 0 ? Math.max(...techTests.map((a) => a.percentage || 0)) : 0;
  details.technical = { attempts: techTests.length, best: bestTechnical };

  if (bestTechnical < ELIGIBILITY_RULES.MIN_TECHNICAL_SCORE) {
    reasons.push(`Best technical score ${bestTechnical.toFixed(1)}% is below required ${ELIGIBILITY_RULES.MIN_TECHNICAL_SCORE}%`);
  }

  // 4. Soft Skills >= 60
  const softTests = await Assessment.find({ student: studentId, category: 'soft_skills' }).sort({ date: -1 });
  const bestSoftSkills = softTests.length > 0 ? Math.max(...softTests.map((a) => a.percentage || 0)) : 0;
  details.softSkills = { attempts: softTests.length, best: bestSoftSkills };

  if (bestSoftSkills < ELIGIBILITY_RULES.MIN_SOFT_SKILLS_SCORE) {
    reasons.push(`Best soft skills score ${bestSoftSkills.toFixed(1)}% is below required ${ELIGIBILITY_RULES.MIN_SOFT_SKILLS_SCORE}%`);
  }

  // 5. Resume uploaded & approved (only enforced when RESUME_REQUIRED === true)
  const approvedResume = await Resume.findOne({ student: studentId, reviewStatus: 'approved', isLatest: true });
  details.resume = { uploaded: !!approvedResume, status: approvedResume?.reviewStatus || 'not uploaded' };

  if (ELIGIBILITY_RULES.RESUME_REQUIRED && !approvedResume) {
    reasons.push('No approved resume on file');
  }

  // 6. No active backlogs
  details.backlogs = student.backlogs;
  if (student.backlogs > 0) {
    reasons.push(`Student has ${student.backlogs} active backlog(s)`);
  }

  const isEligible = reasons.length === 0;
  return { isEligible, reasons, details };
};

/**
 * Recalculate and persist eligibility for a student
 */
const updateStudentEligibility = async (studentId) => {
  const result = await calculateEligibility(studentId);
  await Student.findByIdAndUpdate(studentId, {
    isPlacementEligible: result.isEligible,
    eligibilityReasons: result.reasons,
  });
  return result;
};

/**
 * Batch recalculate eligibility for all non-archived students
 */
const recalculateAll = async () => {
  const students = await Student.find({ isArchived: false }).select('_id');
  const results = await Promise.allSettled(
    students.map((s) => updateStudentEligibility(s._id))
  );

  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;
  return { total: students.length, succeeded, failed };
};

module.exports = { calculateEligibility, updateStudentEligibility, recalculateAll };
