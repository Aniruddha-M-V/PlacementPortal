import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Search, Bell, User, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { getInitials } from '../../utils/formatters';

const Topbar = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  // Fetch unread notification count
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await api.get('/notifications/unread-count');
        setUnreadCount(res.data.data?.count || 0);
      } catch { /* silent */ }
    };
    fetchCount();

    const handleUpdate = () => fetchCount();
    window.addEventListener('notifications-updated', handleUpdate);
    const interval = setInterval(fetchCount, 30000);

    return () => {
      window.removeEventListener('notifications-updated', handleUpdate);
      clearInterval(interval);
    };
  }, [location.pathname]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(res.data.data);
        setSearchOpen(true);
      } catch { setSearchResults(null); }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const navigateTo = (path) => {
    navigate(path);
    setSearchQuery('');
    setSearchOpen(false);
    setSearchResults(null);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="h-topbar bg-surface border-b border-border flex items-center px-4 gap-4 flex-shrink-0 z-30">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden btn-ghost btn-icon"
        aria-label="Open navigation"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Search */}
      <div ref={searchRef} className="flex-1 max-w-md relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search students, sessions, assessments..."
            className="form-input pl-9 pr-9 py-2 text-sm bg-slate-50 border-slate-200 focus:bg-surface"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setSearchResults(null); setSearchOpen(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Search Dropdown */}
        {searchOpen && searchResults && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-dropdown z-50 overflow-hidden">
            {searchResults.totalResults === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-text-muted">No results found</div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {searchResults.results.students?.length > 0 && (
                  <div>
                    <div className="px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wide bg-slate-50">Students</div>
                    {searchResults.results.students.map((s) => (
                      <button
                        key={s._id}
                        onClick={() => navigateTo(`/students/${s._id}`)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left"
                      >
                        <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center text-xs font-medium text-primary-700">
                          {getInitials(s.name)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-text">{s.name}</div>
                          <div className="text-xs text-text-muted">{s.rollNumber} · {s.department}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {searchResults.results.sessions?.length > 0 && (
                  <div>
                    <div className="px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wide bg-slate-50">Sessions</div>
                    {searchResults.results.sessions.map((s) => (
                      <button
                        key={s._id}
                        onClick={() => navigateTo(`/sessions/${s._id}`)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left"
                      >
                        <div className="text-sm text-text">{s.title}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1 ml-auto">
        {/* Notifications */}
        <button
          onClick={() => navigate('/notifications')}
          className="btn-ghost btn-icon relative"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger-500 rounded-full" />
          )}
        </button>

        {/* Profile */}
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 ml-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Profile"
        >
          <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-xs font-semibold text-primary-700">
            {getInitials(user?.name)}
          </div>
          <span className="hidden sm:block text-sm font-medium text-text max-w-[120px] truncate">
            {user?.name?.split(' ')[0]}
          </span>
        </button>
      </div>
    </header>
  );
};

export default Topbar;
