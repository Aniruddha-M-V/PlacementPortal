// Application-wide constants

const ROLES = {
  ADMIN: 'admin',
  FACULTY: 'faculty',
  STUDENT: 'student',
};

const ASSESSMENT_CATEGORIES = {
  APTITUDE: 'aptitude',
  TECHNICAL: 'technical',
  CODING: 'coding',
  RESUME: 'resume',
  MOCK_INTERVIEW: 'mock_interview',
  SOFT_SKILLS: 'soft_skills',
};

const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LATE: 'late',
  EXCUSED: 'excused',
};

const SESSION_STATUS = {
  UPCOMING: 'upcoming',
  ONGOING: 'ongoing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

const ACTIVITY_TYPES = {
  WORKSHOP: 'workshop',
  SEMINAR: 'seminar',
  HACKATHON: 'hackathon',
  WEBINAR: 'webinar',
  OTHER: 'other',
};

const RESUME_STATUS = {
  PENDING: 'pending',
  REVIEWED: 'reviewed',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ALERT: 'alert',
};

// Placement eligibility thresholds
const ELIGIBILITY_RULES = {
  MIN_ATTENDANCE_PERCENT: 75,
  MIN_APTITUDE_SCORE: 60,
  MIN_TECHNICAL_SCORE: 60,
  MIN_SOFT_SKILLS_SCORE: 60,
  RESUME_REQUIRED: false,   // set to true to require an approved resume for eligibility
  NO_ACTIVE_BACKLOGS: true,
};

const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

module.exports = {
  ROLES,
  ASSESSMENT_CATEGORIES,
  ATTENDANCE_STATUS,
  SESSION_STATUS,
  ACTIVITY_TYPES,
  RESUME_STATUS,
  NOTIFICATION_TYPES,
  ELIGIBILITY_RULES,
  PAGINATION,
};
