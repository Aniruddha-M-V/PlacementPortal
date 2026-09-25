import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppShell from './components/layout/AppShell';

// Auth
import LoginPage from './pages/auth/LoginPage';

// Pages
import Dashboard from './pages/Dashboard';
import StudentsPage from './pages/students/StudentsPage';
import StudentDetail from './pages/students/StudentDetail';
import FacultyPage from './pages/faculty/FacultyPage';
import SessionsPage from './pages/sessions/SessionsPage';
import SessionDetail from './pages/sessions/SessionDetail';
import AttendancePage from './pages/attendance/AttendancePage';
import AssessmentsPage from './pages/assessments/AssessmentsPage';
import ActivitiesPage from './pages/activities/ActivitiesPage';
import ActivityDetail from './pages/activities/ActivityDetail';
import ResumePage from './pages/resume/ResumePage';
import EligibilityPage from './pages/eligibility/EligibilityPage';
import ReportsPage from './pages/reports/ReportsPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import CalendarPage from './pages/calendar/CalendarPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import ProfilePage from './pages/profile/ProfilePage';
import SettingsPage from './pages/settings/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';

// ─── Route Guards ──────────────────────────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isInitialized } = useAuth();
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-text-muted">Loading...</p>
        </div>
      </div>
    );
  }
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, isInitialized } = useAuth();
  if (!isInitialized) return null;
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

// ─── App ───────────────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

      {/* Protected — wrapped in AppShell (sidebar + topbar) */}
      <Route path="/" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="students/:id" element={<StudentDetail />} />
        <Route path="faculty" element={<FacultyPage />} />
        <Route path="sessions" element={<SessionsPage />} />
        <Route path="sessions/:id" element={<SessionDetail />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="assessments" element={<AssessmentsPage />} />
        <Route path="activities" element={<ActivitiesPage />} />
        <Route path="activities/:id" element={<ActivityDetail />} />
        <Route path="resume" element={<ResumePage />} />
        <Route path="eligibility" element={<EligibilityPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#1E293B',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              fontSize: '14px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.08)',
            },
            success: { iconTheme: { primary: '#22C55E', secondary: '#fff' } },
            error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
