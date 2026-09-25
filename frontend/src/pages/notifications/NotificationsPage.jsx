import { useState, useEffect } from 'react';
import { Bell, CheckCheck, Info, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { notificationsApi } from '../../api/notifications.api';

const TYPE_CONFIG = {
  info: { icon: Info, color: 'text-primary-600', bg: 'bg-primary-50' },
  success: { icon: CheckCircle2, color: 'text-success-600', bg: 'bg-success-50' },
  warning: { icon: AlertTriangle, color: 'text-accent-500', bg: 'bg-accent-50' },
  danger: { icon: AlertCircle, color: 'text-danger-500', bg: 'bg-danger-50' },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await notificationsApi.getAll({ limit: 50 });
      // API returns { notifications: [...], unreadCount: N } inside res.data.data
      const payload = res.data.data;
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.notifications)
          ? payload.notifications
          : [];
      setNotifications(list);
    } catch (err) {
      // Non-fatal — show empty state instead of crashing
      console.error('Notifications load error:', err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications(n => n.map(x => ({ ...x, isRead: true })));
      window.dispatchEvent(new CustomEvent('notifications-updated'));
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error('Could not mark all as read');
    }
  };

  const markRead = async (id) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications(n => n.map(x => x._id === id ? { ...x, isRead: true } : x));
      window.dispatchEvent(new CustomEvent('notifications-updated'));
    } catch {
      // Silent — non-critical
    }
  };

  // Safe: notifications is always an array here
  const unread = notifications.filter(n => !n.isRead).length;

  return (
    <div className="page-content py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text">Notifications</h1>
          <p className="text-sm text-text-muted">{unread} unread</p>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="btn btn-outline btn-sm">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      <div className="space-y-2">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card-padded animate-pulse flex gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-100 rounded w-1/2" />
                <div className="h-3 bg-slate-100 rounded w-3/4" />
              </div>
            </div>
          ))
          : notifications.length === 0
            ? (
              <div className="empty-state py-16">
                <Bell className="w-12 h-12 text-slate-200 mb-3" />
                <p className="text-text-muted text-sm">No notifications yet</p>
              </div>
            )
            : notifications.map(n => {
              const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
              const Icon = cfg.icon;
              return (
                <div
                  key={n._id}
                  onClick={() => !n.isRead && markRead(n._id)}
                  className={`card p-4 flex items-start gap-4 cursor-pointer hover:bg-slate-50 transition-colors ${!n.isRead ? 'border-l-4 border-l-primary-500' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-full ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${n.isRead ? 'text-text-secondary' : 'font-medium text-text'}`}>{n.title}</p>
                    <p className="text-xs text-text-muted mt-0.5">{n.message}</p>
                    <p className="text-xs text-text-muted mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                  {!n.isRead && (
                    <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-1.5" />
                  )}
                </div>
              );
            })}
      </div>
    </div>
  );
}
