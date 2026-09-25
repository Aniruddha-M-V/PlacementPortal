import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserCheck, BookOpen, CalendarCheck,
  ClipboardList, FileText, Activity, Award, BarChart3,
  Bell, Calendar, Settings, GraduationCap, LogOut, ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getInitials } from '../../utils/formatters';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/analytics', icon: BarChart3, label: 'Analytics', roles: ['admin', 'faculty'] },
    ],
  },
  {
    label: 'Management',
    items: [
      { to: '/students', icon: Users, label: 'Students', roles: ['admin', 'faculty'] },
      { to: '/faculty', icon: UserCheck, label: 'Faculty', roles: ['admin'] },
      { to: '/sessions', icon: BookOpen, label: 'Training Sessions' },
      { to: '/activities', icon: Activity, label: 'Activities & Workshops' },
    ],
  },
  {
    label: 'Tracking',
    items: [
      { to: '/attendance', icon: CalendarCheck, label: 'Attendance', roles: ['admin', 'faculty'] },
      { to: '/assessments', icon: ClipboardList, label: 'Assessments', roles: ['admin', 'faculty'] },
      { to: '/resume', icon: FileText, label: 'Resume Review', roles: ['admin', 'faculty'] },
      { to: '/eligibility', icon: Award, label: 'Eligibility', roles: ['admin', 'faculty'] },
    ],
  },
  {
    label: 'Other',
    items: [
      { to: '/notifications', icon: Bell, label: 'Notifications' },
      { to: '/calendar', icon: Calendar, label: 'Calendar' },
      { to: '/reports', icon: BarChart3, label: 'Reports', roles: ['admin', 'faculty'] },
      { to: '/settings', icon: Settings, label: 'Settings', roles: ['admin'] },
    ],
  },
];

// Student-specific nav (much simpler)
const STUDENT_NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/sessions', icon: BookOpen, label: 'Sessions' },
  { to: '/activities', icon: Activity, label: 'Activities' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/profile', icon: Users, label: 'My Profile' },
];

const Sidebar = ({ onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isStudent = user?.role === 'student';
  const navGroups = isStudent
    ? [{ label: 'Navigation', items: STUDENT_NAV }]
    : NAV_GROUPS;

  const isVisible = (item) => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border flex-shrink-0">
        <div className="p-1.5 bg-primary-100 rounded-lg">
          <GraduationCap className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <div className="text-sm font-bold text-text leading-tight">Placement Portal</div>
          <div className="text-xs text-text-muted capitalize">{user?.role}</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 no-scrollbar">
        {navGroups.map((group) => {
          const visible = group.items.filter(isVisible);
          if (visible.length === 0) return null;
          return (
            <div key={group.label} className="mb-4">
              <div className="section-title">{group.label}</div>
              {visible.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `sidebar-link ${isActive ? 'active' : ''}`
                  }
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="flex-shrink-0 p-3 border-t border-border">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer group"
          onClick={() => { navigate('/profile'); onClose?.(); }}>
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-xs font-semibold text-primary-700 flex-shrink-0">
            {user?.avatar
              ? <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
              : getInitials(user?.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-text truncate">{user?.name}</div>
            <div className="text-xs text-text-muted truncate">{user?.email}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="sidebar-link w-full mt-1 text-danger-600 hover:bg-danger-50 hover:text-danger-700"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
