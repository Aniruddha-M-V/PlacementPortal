const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const TrainingSession = require('../models/TrainingSession');
const Assessment = require('../models/Assessment');
const Activity = require('../models/Activity');
const { sendSuccess, sendBadRequest } = require('../utils/apiResponse');

// GET /api/search?q=&type=
const globalSearch = async (req, res) => {
  const { q, type } = req.query;
  if (!q || q.trim().length < 2) return sendBadRequest(res, 'Search query must be at least 2 characters');

  const query = q.trim();
  const regex = new RegExp(query, 'i');
  const limit = 8;

  const results = {};

  if (!type || type === 'students') {
    results.students = await Student.find({
      isArchived: false,
      $or: [{ name: regex }, { email: regex }, { rollNumber: regex }],
    }).select('name email rollNumber batch department').limit(limit);
  }

  if (!type || type === 'faculty') {
    results.faculty = await Faculty.find({
      $or: [{ name: regex }, { email: regex }],
    }).select('name email department designation').limit(limit);
  }

  if (!type || type === 'sessions') {
    results.sessions = await TrainingSession.find({
      $or: [{ title: regex }, { category: regex }],
    }).select('title category status startDate').limit(limit);
  }

  if (!type || type === 'assessments') {
    results.assessments = await Assessment.find({ title: regex })
      .select('title category date').limit(limit);
  }

  if (!type || type === 'activities') {
    results.activities = await Activity.find({
      $or: [{ title: regex }, { organizer: regex }],
    }).select('title type status startDate').limit(limit);
  }

  const totalResults = Object.values(results).reduce((sum, arr) => sum + (arr?.length || 0), 0);
  return sendSuccess(res, { results, totalResults, query });
};

module.exports = { globalSearch };
