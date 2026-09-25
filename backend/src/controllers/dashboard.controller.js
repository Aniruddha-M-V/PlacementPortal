const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Assessment = require('../models/Assessment');
const TrainingSession = require('../models/TrainingSession');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const Faculty = require('../models/Faculty');
const { sendSuccess } = require('../utils/apiResponse');
const { calcLiveStatus } = require('../services/notification.service');

// GET /api/dashboard/stats
const getDashboardStats = async (req, res) => {
  const [
    totalStudents,
    placementEligible,
    allSessions,
  ] = await Promise.all([
    Student.countDocuments({ isArchived: false }),
    Student.countDocuments({ isPlacementEligible: true, isArchived: false }),
    TrainingSession.find().select('startDate startTime endDate endTime status'),
  ]);

  const totalSessions = allSessions.length;
  const upcomingSessions = allSessions.filter((s) => {
    const liveStatus = calcLiveStatus(s.startDate, s.startTime, s.endDate, s.endTime, s.status);
    return liveStatus === 'upcoming' || liveStatus === 'ongoing';
  }).length;

  // Overall attendance percentage
  const attendanceAgg = await Attendance.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        attended: {
          $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] },
        },
      },
    },
  ]);
  const attendancePct = attendanceAgg.length > 0
    ? parseFloat(((attendanceAgg[0].attended / attendanceAgg[0].total) * 100).toFixed(1))
    : 0;

  // Average assessment score
  const scoreAgg = await Assessment.aggregate([
    { $group: { _id: null, avg: { $avg: '$percentage' } } },
  ]);
  const avgScore = scoreAgg.length > 0 ? parseFloat((scoreAgg[0].avg || 0).toFixed(1)) : 0;

  return sendSuccess(res, {
    totalStudents,
    placementEligible,
    upcomingSessions,
    totalSessions,
    overallAttendancePct: attendancePct,
    avgAssessmentScore: avgScore,
  });
};

// GET /api/dashboard/charts
const getDashboardCharts = async (req, res) => {
  // Attendance trend — last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const attendanceTrend = await Attendance.aggregate([
    { $match: { date: { $gte: sevenDaysAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        total: { $sum: 1 },
        present: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        date: '$_id', total: 1, present: 1,
        percentage: { $round: [{ $multiply: [{ $divide: ['$present', '$total'] }, 100] }, 1] },
        _id: 0,
      },
    },
  ]);

  // Assessment trend — by category
  const assessmentByCategory = await Assessment.aggregate([
    {
      $group: {
        _id: '$category',
        average: { $avg: '$percentage' },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        category: '$_id',
        average: { $round: ['$average', 1] },
        count: 1,
        _id: 0,
      },
    },
  ]);

  // Department-wise placement eligible
  const departmentEligibility = await Student.aggregate([
    { $match: { isArchived: false } },
    {
      $group: {
        _id: '$department',
        total: { $sum: 1 },
        eligible: { $sum: { $cond: ['$isPlacementEligible', 1, 0] } },
      },
    },
    { $project: { department: '$_id', total: 1, eligible: 1, _id: 0 } },
    { $sort: { total: -1 } },
  ]);

  return sendSuccess(res, { attendanceTrend, assessmentByCategory, departmentEligibility });
};

// GET /api/dashboard/recent
const getRecentActivity = async (req, res) => {
  const [allSessions, allActivities] = await Promise.all([
    TrainingSession.find()
      .sort({ startDate: 1 })
      .populate('faculty', 'name'),
    Activity.find()
      .sort({ startDate: 1 }),
  ]);

  const recentSessions = allSessions
    .filter((s) => {
      const status = calcLiveStatus(s.startDate, s.startTime, s.endDate, s.endTime, s.status);
      return status === 'upcoming' || status === 'ongoing';
    })
    .slice(0, 5);

  const upcomingActivities = allActivities
    .filter((a) => {
      const status = calcLiveStatus(a.startDate, a.startTime, a.endDate, a.endTime, a.status);
      return status === 'upcoming' || status === 'ongoing';
    })
    .slice(0, 5);

  return sendSuccess(res, { recentSessions, upcomingActivities });
};

// GET /api/dashboard/student — student-specific dashboard data
const getStudentDashboard = async (req, res) => {
  // Find the student record linked to this user
  const student = await Student.findOne({ userId: req.user._id });

  // Upcoming + ongoing sessions and activities (filtered by live status)
  const [allSessions, allActivities] = await Promise.all([
    TrainingSession.find()
      .sort({ startDate: 1 })
      .select('title category startDate startTime endDate endTime totalHours mode status'),
    Activity.find()
      .sort({ startDate: 1 })
      .select('title type startDate startTime endDate endTime duration mode status venue'),
  ]);

  const upcomingSessions = allSessions
    .filter((s) => {
      const status = calcLiveStatus(s.startDate, s.startTime, s.endDate, s.endTime, s.status);
      return status === 'upcoming' || status === 'ongoing';
    })
    .slice(0, 6);

  const upcomingActivities = allActivities
    .filter((a) => {
      const status = calcLiveStatus(a.startDate, a.startTime, a.endDate, a.endTime, a.status);
      return status === 'upcoming' || status === 'ongoing';
    })
    .slice(0, 6);

  // Recent notifications for this student
  const filter = {
    $or: [
      { 'recipients.user': req.user._id },
      { isGlobal: true },
      { targetRole: req.user.role },
      { targetRole: 'all' },
    ],
  };

  const rawNotifications = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .limit(5)
    .select('title message type isGlobal targetRole recipients createdAt');

  const notifications = rawNotifications.map((n) => {
    const obj = n.toObject();
    const entry = n.recipients.find(
      (r) => r.user && r.user.toString() === req.user._id.toString()
    );
    obj.isRead = entry ? Boolean(entry.isRead) : false;
    return obj;
  });

  // Student-specific data (if student record exists)
  let attendanceSummary = null;
  let eligibility = null;
  let recentAssessments = [];

  if (student) {
    const attendanceRecords = await Attendance.find({ student: student._id });
    const totalSessions = attendanceRecords.length;
    const presentCount = attendanceRecords.filter((a) => a.status === 'present' || a.status === 'late').length;
    attendanceSummary = {
      totalSessions,
      presentCount,
      attendancePercent: totalSessions > 0
        ? parseFloat(((presentCount / totalSessions) * 100).toFixed(1))
        : null,
    };

    eligibility = {
      isEligible: student.isPlacementEligible,
      placementStatus: student.placementStatus,
      reasons: student.eligibilityReasons,
    };

    recentAssessments = await Assessment.find({ student: student._id })
      .sort({ date: -1 }).limit(5)
      .select('title category percentage date');
  }

  return sendSuccess(res, {
    student: student ? {
      name: student.name,
      rollNumber: student.rollNumber,
      batch: student.batch,
      department: student.department,
      semester: student.semester,
      cgpa: student.cgpa,
    } : null,
    upcomingSessions,
    upcomingActivities,
    notifications,
    attendanceSummary,
    eligibility,
    recentAssessments,
  });
};

// GET /api/dashboard/faculty — faculty-specific dashboard stats
const getFacultyDashboard = async (req, res) => {
  // Resolve this faculty user's Faculty profile
  const facultyDoc = await Faculty.findOne({ userId: req.user._id })
    .populate('userId', 'name email')
    .lean();

  // Fetch sessions assigned to this faculty
  const filter = facultyDoc ? { faculty: facultyDoc._id } : { _id: null };
  const allAssignedSessions = await TrainingSession.find(filter)
    .select('title category startDate startTime endDate endTime status venue mode totalHours')
    .sort({ startDate: 1 })
    .lean();

  // Compute live status for each session
  const withStatus = allAssignedSessions.map((s) => ({
    ...s,
    liveStatus: calcLiveStatus(s.startDate, s.startTime, s.endDate, s.endTime, s.status),
  }));

  const upcoming  = withStatus.filter((s) => s.liveStatus === 'upcoming');
  const ongoing   = withStatus.filter((s) => s.liveStatus === 'ongoing');
  const completed = withStatus.filter((s) => s.liveStatus === 'completed');

  // Recent attendance records marked by this faculty
  const recentAttendance = await Attendance.find({ markedBy: req.user._id })
    .populate('session', 'title category')
    .populate('student', 'name rollNumber')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  // Recent assessments (all faculty can view)
  const recentAssessments = await Assessment.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .select('title type date percentage')
    .lean();

  // Unread notifications for this user
  const notifications = await Notification.find({
    $or: [{ targetUsers: req.user._id }, { targetUsers: { $size: 0 } }],
    readBy: { $not: { $elemMatch: { $eq: req.user._id } } },
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  return sendSuccess(res, {
    faculty: facultyDoc ? {
      name: facultyDoc.name,
      email: facultyDoc.email,
      department: facultyDoc.department,
      designation: facultyDoc.designation,
    } : { name: req.user.name, email: req.user.email },
    sessionStats: {
      total:    allAssignedSessions.length,
      upcoming: upcoming.length,
      ongoing:  ongoing.length,
      completed: completed.length,
    },
    upcomingSessions:  upcoming.slice(0, 5),
    ongoingSessions:   ongoing,
    recentAttendance,
    recentAssessments,
    notifications,
  });
};

module.exports = { getDashboardStats, getDashboardCharts, getRecentActivity, getStudentDashboard, getFacultyDashboard };
