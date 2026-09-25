import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';

/**
 * Format a date string to "Jan 15, 2025"
 */
export const formatDate = (date) => {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? parseISO(date) : new Date(date);
    return isValid(d) ? format(d, 'MMM d, yyyy') : '—';
  } catch {
    return '—';
  }
};

/**
 * Format a date string to "Jan 15, 2025 at 10:30 AM"
 */
export const formatDateTime = (date) => {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? parseISO(date) : new Date(date);
    return isValid(d) ? format(d, 'MMM d, yyyy, h:mm a') : '—';
  } catch {
    return '—';
  }
};

/**
 * Format date to input[type=date] value "2025-01-15"
 */
export const formatDateInput = (date) => {
  if (!date) return '';
  try {
    const d = typeof date === 'string' ? parseISO(date) : new Date(date);
    return isValid(d) ? format(d, 'yyyy-MM-dd') : '';
  } catch {
    return '';
  }
};

/**
 * "2 hours ago", "3 days ago" etc.
 */
export const timeAgo = (date) => {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? parseISO(date) : new Date(date);
    return isValid(d) ? formatDistanceToNow(d, { addSuffix: true }) : '—';
  } catch {
    return '—';
  }
};

/**
 * Format a number as a percentage string
 */
export const formatPercent = (value, decimals = 1) => {
  if (value === null || value === undefined) return '—';
  return `${Number(value).toFixed(decimals)}%`;
};

/**
 * Format file size in bytes to human-readable
 */
export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

/**
 * Format a number with commas (e.g. 1000 → "1,000")
 */
export const formatNumber = (num) => {
  if (num === null || num === undefined) return '0';
  return Number(num).toLocaleString();
};

/**
 * Capitalize first letter of each word
 */
export const titleCase = (str) => {
  if (!str) return '';
  return str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

/**
 * Get initials from a name (e.g. "John Doe" → "JD")
 */
export const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};
