import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';

const NotificationContext = createContext(null);

const TYPE_ICONS = {
  appointment: '📅',
  queue: '⏱️',
  reminder: '⏰',
  cancellation: '❌',
  system: '🔔',
};

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const socketRef = useRef(null);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications);
      setUnread(res.data.unread);
    } catch {}
  };

  useEffect(() => {
    if (!user) { setNotifications([]); setUnread(0); return; }

    fetchNotifications();

    // Connect socket and join personal room
    socketRef.current = io({ path: '/socket.io', transports: ['websocket', 'polling'] });
    socketRef.current.emit('user:join', user.id);

    socketRef.current.on('notification:new', (notif) => {
      setNotifications(prev => [notif, ...prev]);
      setUnread(prev => prev + 1);

      // Show toast alert
      const icon = TYPE_ICONS[notif.type] || '🔔';
      toast(
        (t) => (
          <div className="flex items-start gap-3 max-w-sm">
            <span className="text-2xl">{icon}</span>
            <div className="flex-1">
              <p className="font-semibold text-sm">{notif.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{notif.message}</p>
            </div>
            <button onClick={() => toast.dismiss(t.id)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
          </div>
        ),
        {
          duration: 6000,
          style: { padding: '12px', borderRadius: '12px', maxWidth: '400px' },
        }
      );
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [user?.id]);

  const markAllRead = async () => {
    await api.patch('/notifications/read-all');
    setUnread(0);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnread(prev => Math.max(0, prev - 1));
  };

  return (
    <NotificationContext.Provider value={{ notifications, unread, markAllRead, markRead, fetchNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
