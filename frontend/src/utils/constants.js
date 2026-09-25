// Application-wide frontend constants

export const ROLES = {
  ADMIN: 'admin',
  FACULTY: 'faculty',
  STUDENT: 'student',
};

export const ASSESSMENT_CATEGORIES = [
  { value: 'aptitude', label: 'Aptitude' },
  { value: 'technical', label: 'Technical' },
  { value: 'coding', label: 'Coding' },
  { value: 'resume', label: 'Resume' },
  { value: 'mock_interview', label: 'Mock Interview' },
  { value: 'soft_skills', label: 'Soft Skills' },
];

export const ATTENDANCE_STATUSES = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'late', label: 'Late' },
  { value: 'excused', label: 'Excused' },
];

export const SESSION_STATUSES = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const ACTIVITY_TYPES = [
  { value: 'workshop', label: 'Workshop' },
  { value: 'seminar', label: 'Seminar' },
  { value: 'hackathon', label: 'Hackathon' },
  { value: 'webinar', label: 'Webinar' },
  { value: 'other', label: 'Other' },
];

export const RESUME_STATUSES = [
  { value: 'pending', label: 'Pending Review' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export const PLACEMENT_STATUSES = [
  { value: 'not_placed', label: 'Not Placed' },
  { value: 'placed', label: 'Placed' },
  { value: 'opted_out', label: 'Opted Out' },
];

export const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

export const SESSION_MODES = [
  { value: 'online', label: 'Online' },
  { value: 'offline', label: 'Offline' },
  { value: 'hybrid', label: 'Hybrid' },
];

export const DAYS_OF_WEEK = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
];

// Status badge color map
export const STATUS_COLORS = {
  // Attendance
  present: 'success',
  absent: 'danger',
  late: 'warning',
  excused: 'secondary',
  // Session / Activity
  upcoming: 'primary',
  ongoing: 'secondary',
  completed: 'success',
  cancelled: 'danger',
  // Resume
  pending: 'warning',
  reviewed: 'primary',
  approved: 'success',
  rejected: 'danger',
  // Placement
  not_placed: 'muted',
  placed: 'success',
  opted_out: 'secondary',
};
