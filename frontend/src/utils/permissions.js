import { ROLES } from './constants';

/**
 * Role-based permission map.
 * Each key is a route/feature, value is array of allowed roles.
 */
export const PERMISSIONS = {
  // Student management
  'students:view': [ROLES.ADMIN, ROLES.FACULTY],
  'students:create': [ROLES.ADMIN],
  'students:edit': [ROLES.ADMIN],
  'students:delete': [ROLES.ADMIN],
  'students:import': [ROLES.ADMIN],
  'students:archive': [ROLES.ADMIN],

  // Faculty management
  'faculty:view': [ROLES.ADMIN],
  'faculty:create': [ROLES.ADMIN],
  'faculty:edit': [ROLES.ADMIN],
  'faculty:delete': [ROLES.ADMIN],

  // Sessions
  'sessions:view': [ROLES.ADMIN, ROLES.FACULTY, ROLES.STUDENT],
  'sessions:create': [ROLES.ADMIN],
  'sessions:edit': [ROLES.ADMIN, ROLES.FACULTY],
  'sessions:delete': [ROLES.ADMIN],

  // Attendance
  'attendance:view': [ROLES.ADMIN, ROLES.FACULTY],
  'attendance:mark': [ROLES.ADMIN, ROLES.FACULTY],
  'attendance:edit': [ROLES.ADMIN, ROLES.FACULTY],

  // Assessments
  'assessments:view': [ROLES.ADMIN, ROLES.FACULTY],
  'assessments:create': [ROLES.ADMIN, ROLES.FACULTY],
  'assessments:edit': [ROLES.ADMIN, ROLES.FACULTY],
  'assessments:delete': [ROLES.ADMIN],

  // Resume
  'resume:upload': [ROLES.ADMIN, ROLES.STUDENT],
  'resume:review': [ROLES.ADMIN, ROLES.FACULTY],

  // Activities
  'activities:view': [ROLES.ADMIN, ROLES.FACULTY, ROLES.STUDENT],
  'activities:create': [ROLES.ADMIN],
  'activities:edit': [ROLES.ADMIN],

  // Reports
  'reports:view': [ROLES.ADMIN, ROLES.FACULTY],
  'reports:export': [ROLES.ADMIN],

  // Eligibility
  'eligibility:view': [ROLES.ADMIN, ROLES.FACULTY],
  'eligibility:recalculate': [ROLES.ADMIN],

  // Notifications
  'notifications:send': [ROLES.ADMIN],

  // Settings
  'settings:view': [ROLES.ADMIN],

  // Dashboard analytics
  'analytics:view': [ROLES.ADMIN, ROLES.FACULTY],
};

/**
 * Check if a user has permission for a given action
 * @param {Object} user - User object with role field
 * @param {string} permission - Permission key from PERMISSIONS map
 */
export const can = (user, permission) => {
  if (!user || !permission) return false;
  const allowed = PERMISSIONS[permission];
  if (!allowed) return false;
  return allowed.includes(user.role);
};
