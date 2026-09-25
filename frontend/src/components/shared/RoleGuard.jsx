import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// ─── Full-screen spinner while auth is verifying ─────────────────────────────
const AuthLoadingScreen = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <svg className="w-8 h-8 text-primary-600 animate-spin" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span className="text-sm text-text-secondary">Loading...</span>
    </div>
  </div>
);

/**
 * Requires authentication to access the wrapped route.
 * Redirects to /login if not authenticated, preserving intended destination.
 */
export const RequireAuth = ({ children }) => {
  const { isAuthenticated, isInitialized } = useAuth();
  const location = useLocation();

  if (!isInitialized) return <AuthLoadingScreen />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

/**
 * Restricts access to specific roles.
 * Redirects to /unauthorized if the user's role is not in allowedRoles.
 */
export const RoleGuard = ({ children, allowedRoles = [] }) => {
  const { user, isInitialized } = useAuth();

  if (!isInitialized) return <AuthLoadingScreen />;

  if (!user || (allowedRoles.length > 0 && !allowedRoles.includes(user.role))) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

/**
 * Redirects authenticated users away from auth pages (login).
 */
export const PublicRoute = ({ children }) => {
  const { isAuthenticated, isInitialized } = useAuth();

  if (!isInitialized) return <AuthLoadingScreen />;

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};
