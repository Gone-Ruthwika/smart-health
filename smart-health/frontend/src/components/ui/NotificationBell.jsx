import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';

const TYPE_ICONS = { appointment: '📅', queue: '⏱️', reminder: '⏰', cancellation: '❌', system: '🔔' };

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationBell() {
  const { notifications, unread, markAllRead, markRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleClick = (notif) => {
    markRead(notif.id);
    if (notif.appointment_id) navigate(`/appointments/${notif.appointment_id}`);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Notifications"
      >
        <span className="text-xl">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p className="text-3xl mb-2">🔔</p>
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0 ${
                    !n.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                  }`}
                >
                  <span className="text-xl mt-0.5">{TYPE_ICONS[n.type] || '🔔'}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!n.is_read ? 'font-semibold' : 'font-medium'} truncate`}>{n.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
