import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { getErrorMessage, getDefaultRouteForUser, isAdmin, isHospitalAdmin, isMainAdmin } from '../utils/helpers';
import Spinner from '../components/ui/Spinner';

const RECENT_ADMIN_EMAILS_KEY = 'smarthealth_recent_admin_emails';

function readRecentEmails(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function saveRecentEmail(key, email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return;

  const next = [normalized, ...readRecentEmails(key).filter((item) => item !== normalized)].slice(0, 5);
  localStorage.setItem(key, JSON.stringify(next));
}

export default function AdminLogin({ portal = 'admin' }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [recentEmails, setRecentEmails] = useState([]);
  const [showPassword, setShowPassword] = useState(false);

  const expectsHospitalAdmin = portal === 'hospital';
  const expectsMainAdmin = portal === 'main';
  const heading = expectsHospitalAdmin ? 'Hospital Admin Sign In' : expectsMainAdmin ? 'Main Admin Sign In' : 'Admin Sign In';
  const helperText = expectsHospitalAdmin
    ? 'Restricted access for hospital operations teams'
    : expectsMainAdmin
    ? 'Restricted access for platform owners only'
    : 'Restricted access for authorized personnel only';

  useEffect(() => {
    setRecentEmails(readRecentEmails(RECENT_ADMIN_EMAILS_KEY));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      if (!isAdmin(user)) {
        toast.error('Access denied. Admin credentials required.');
        return;
      }
      if (expectsHospitalAdmin && !isHospitalAdmin(user)) {
        toast.error('This account is not a hospital admin.');
        navigate(getDefaultRouteForUser(user));
        return;
      }
      if (expectsMainAdmin && !isMainAdmin(user)) {
        toast.error('This account is not a main admin.');
        navigate(getDefaultRouteForUser(user));
        return;
      }
      saveRecentEmail(RECENT_ADMIN_EMAILS_KEY, form.email);
      setRecentEmails(readRecentEmails(RECENT_ADMIN_EMAILS_KEY));
      toast.success(`Welcome back, ${user.name}${isHospitalAdmin(user) ? ' - hospital access only' : ''}!`);
      navigate(getDefaultRouteForUser(user));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.22),_transparent_30%),linear-gradient(180deg,#111827_0%,#0f172a_50%,#111827_100%)] px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-purple-900/40 bg-gray-900/90 shadow-[0_24px_80px_rgba(88,28,135,0.35)] backdrop-blur lg:grid-cols-[1.05fr_0.95fr]">
          <section className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-purple-700 via-fuchsia-700 to-indigo-700 p-10 text-white">
            <div>
              <div className="inline-flex items-center gap-3 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold tracking-[0.2em] uppercase">
                <span className="text-xl">🛡</span>
                Admin Portal
              </div>
              <h1 className="mt-8 max-w-md text-4xl font-bold leading-tight">Secure control for hospitals, doctors, and live operations.</h1>
              <p className="mt-4 max-w-md text-sm text-purple-50/90">
                Access your hospital workflows with a cleaner admin sign-in experience and scoped operational control.
              </p>
            </div>
            <div className="grid gap-3 text-sm">
              <div className="rounded-2xl bg-white/12 p-4">🏥 Hospital admins manage their assigned hospitals only</div>
              <div className="rounded-2xl bg-white/12 p-4">👨‍⚕️ Doctor details and slots stay under hospital control</div>
              <div className="rounded-2xl bg-white/12 p-4">🔐 Use browser-saved passwords instead of storing old ones in the app</div>
            </div>
          </section>

          <section className="p-6 sm:p-8 md:p-10">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-fuchsia-600 text-2xl text-white shadow-lg lg:hidden">
                  🛡
                </div>
                <h2 className="mt-4 text-3xl font-bold text-white">{heading}</h2>
                <p className="mt-2 text-sm text-gray-400">{helperText}</p>
              </div>

              <div className="mb-6 flex items-center gap-2 rounded-xl border border-amber-800/60 bg-amber-950/30 px-4 py-3 text-xs text-amber-200">
                <span>⚠</span>
                Unauthorized access attempts are logged.
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-200">Admin Email</label>
                  <input
                    type="email"
                    id="admin-email"
                    name="email"
                    required
                    className="input"
                    placeholder="admin@hospital.com"
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    inputMode="email"
                    list="recent-admin-emails"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                  <datalist id="recent-admin-emails">
                    {recentEmails.map((email) => (
                      <option key={email} value={email} />
                    ))}
                  </datalist>
                  {recentEmails.length > 0 && (
                    <p className="mt-1 text-xs text-gray-400">Previously used admin emails on this device will appear as suggestions.</p>
                  )}
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-200">Password</label>
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="text-xs font-medium text-purple-300 hover:text-purple-200"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="admin-password"
                    name="password"
                    required
                    className="input"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                  <p className="mt-1 text-xs text-gray-400">For safety, old passwords are not stored in the app. Your browser can suggest saved passwords securely.</p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 py-3 text-sm font-semibold text-white transition-colors hover:from-purple-500 hover:to-fuchsia-500 flex items-center justify-center gap-2"
                >
                  {loading ? <Spinner size="sm" /> : expectsHospitalAdmin ? 'Sign In to Hospital Portal' : expectsMainAdmin ? 'Sign In to Main Admin Portal' : 'Sign In as Admin'}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-gray-400">
                Not an admin?{' '}
                <Link to="/login" className="text-blue-400 hover:underline">Go to user login</Link>
              </p>
              {!expectsMainAdmin && (
                <p className="mt-2 text-center text-xs text-gray-500">
                  Main admin? <Link to="/main-admin/login" className="text-fuchsia-300 hover:underline">Use main admin portal</Link>
                </p>
              )}
              {!expectsHospitalAdmin && (
                <p className="mt-2 text-center text-xs text-gray-500">
                  Hospital admin? <Link to="/hospital-admin/login" className="text-fuchsia-300 hover:underline">Use hospital admin portal</Link>
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
