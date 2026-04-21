import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';
import { useState, useEffect, useRef } from 'react';
import NotificationBell from '../ui/NotificationBell';
import { getAdminBasePath, isAdmin, isMainAdmin } from '../../utils/helpers';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { locationName, locating } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (dark) { document.documentElement.classList.add('dark'); localStorage.setItem('theme', 'dark'); }
    else { document.documentElement.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
  }, [dark]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => { logout(); navigate('/'); setDropdownOpen(false); };
  const closeAll = () => { setDropdownOpen(false); setOpen(false); };
  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const adminBasePath = getAdminBasePath(user);

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 backdrop-blur-sm bg-white/95 dark:bg-gray-900/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-blue-600">
            <span className="text-2xl">🏥</span>
            <span>SmartHealth</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1 text-sm font-medium">
            <Link to="/centers" className="px-3 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 transition-colors">
              Find Centers
            </Link>
            {user && !isAdmin(user) && (
              <Link to="/dashboard" className="px-3 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 transition-colors">
                Dashboard
              </Link>
            )}
            {isAdmin(user) && (
              <Link to={`${adminBasePath}/dashboard`} className="px-3 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 transition-colors">
                Admin Panel
              </Link>
            )}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-2">
            {(locationName || locating) && (
              <div className="hidden lg:flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full">
                <span>{locating ? '🔄' : '📍'}</span>
                <span className="max-w-[140px] truncate">{locating ? 'Detecting...' : locationName}</span>
              </div>
            )}
            <button onClick={() => setDark(!dark)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xl" title={dark ? 'Light mode' : 'Dark mode'}>
              {dark ? '☀️' : '🌙'}
            </button>

            {user ? (
              <>
                <NotificationBell />
                {/* Click-based dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className={`w-8 h-8 ${isAdmin(user) ? 'bg-purple-600' : 'bg-blue-600'} text-white rounded-full flex items-center justify-center text-xs font-bold`}>
                      {initials}
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{user.name.split(' ')[0]}</span>
                    <span className="text-gray-400 text-xs">{dropdownOpen ? '▴' : '▾'}</span>
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 top-12 w-52 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-800 py-1 z-50">
                      {/* User info header */}
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                        <p className="text-sm font-semibold truncate">{user.name}</p>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${isAdmin(user) ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {isAdmin(user) ? (isMainAdmin(user) ? '👑 Main Admin' : '🏥 Hospital Admin') : '👤 User'}
                        </span>
                      </div>

                      <Link to="/profile" onClick={closeAll} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        👤 My Profile
                      </Link>

                      {!isAdmin(user) && (
                        <>
                          <Link to="/dashboard" onClick={closeAll} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            📅 My Appointments
                          </Link>
                          <Link to="/history" onClick={closeAll} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            📋 Medical History
                          </Link>
                        </>
                      )}

                      {isAdmin(user) && (
                        <>
                          <Link to={`${adminBasePath}/dashboard`} onClick={closeAll} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-700 dark:text-purple-400 transition-colors font-medium">
                            ⚙️ Admin Dashboard
                          </Link>
                          <Link to={`${adminBasePath}/hospital-control`} onClick={closeAll} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            🏥 Hospital Control
                          </Link>
                          <Link to={`${adminBasePath}/appointments`} onClick={closeAll} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            📋 All Appointments
                          </Link>
                          <Link to={`${adminBasePath}/queue`} onClick={closeAll} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            📊 Queue Monitor
                          </Link>
                          {isMainAdmin(user) && (
                            <>
                              <Link to={`${adminBasePath}/system-control`} onClick={closeAll} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 transition-colors">
                                🗂️ System Control
                              </Link>
                              <Link to={`${adminBasePath}/users`} onClick={closeAll} className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                👥 User Management
                              </Link>
                            </>
                          )}
                        </>
                      )}

                      <hr className="my-1 border-gray-100 dark:border-gray-800" />
                      <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        🚪 Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors">Login</Link>
                <Link to="/signup" className="btn-primary text-sm py-2">Sign Up Free</Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            {user && <NotificationBell />}
            <button onClick={() => setDark(!dark)} className="p-2 text-xl">{dark ? '☀️' : '🌙'}</button>
            <button className="p-2 text-xl" onClick={() => setOpen(!open)}>{open ? '✕' : '☰'}</button>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden pb-4 flex flex-col gap-1 border-t border-gray-100 dark:border-gray-800 pt-3">
            <Link to="/centers" onClick={closeAll} className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-sm">Find Centers</Link>
            {user ? (
              <>
                {!isAdmin(user) && <Link to="/dashboard" onClick={closeAll} className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-sm">Dashboard</Link>}
                <Link to="/profile" onClick={closeAll} className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-sm">My Profile</Link>
                {isAdmin(user) && (
                  <>
                    <Link to={`${adminBasePath}/dashboard`} onClick={closeAll} className="px-3 py-2 rounded-lg hover:bg-purple-50 text-purple-700 text-sm font-medium">⚙️ Admin Dashboard</Link>
                    <Link to={`${adminBasePath}/hospital-control`} onClick={closeAll} className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-sm">🏥 Hospital Control</Link>
                    <Link to={`${adminBasePath}/queue`} onClick={closeAll} className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-sm">📊 Queue Monitor</Link>
                    {isMainAdmin(user) && (
                      <>
                        <Link to={`${adminBasePath}/system-control`} onClick={closeAll} className="px-3 py-2 rounded-lg hover:bg-emerald-50 text-emerald-700 text-sm">🗂️ System Control</Link>
                        <Link to={`${adminBasePath}/users`} onClick={closeAll} className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-sm">👥 Users</Link>
                      </>
                    )}
                  </>
                )}
                <button onClick={handleLogout} className="text-left px-3 py-2 rounded-lg text-red-500 hover:bg-red-50 text-sm">🚪 Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={closeAll} className="px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-sm">Login</Link>
                <Link to="/signup" onClick={closeAll} className="btn-primary text-sm text-center">Sign Up</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

