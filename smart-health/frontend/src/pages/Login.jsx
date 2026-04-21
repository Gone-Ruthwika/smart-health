import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { getDefaultRouteForUser, getErrorMessage, isAdmin } from '../utils/helpers';
import Spinner from '../components/ui/Spinner';

const RECENT_USER_EMAILS_KEY = 'smarthealth_recent_user_emails';

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

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [recentEmails, setRecentEmails] = useState([]);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setRecentEmails(readRecentEmails(RECENT_USER_EMAILS_KEY));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      if (isAdmin(user)) {
        toast.error('Please use your admin portal to sign in.');
        navigate(getDefaultRouteForUser(user));
        return;
      }
      saveRecentEmail(RECENT_USER_EMAILS_KEY, form.email);
      setRecentEmails(readRecentEmails(RECENT_USER_EMAILS_KEY));
      toast.success(`Welcome back, ${user.name}!`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_35%),linear-gradient(180deg,#f7fbff_0%,#eef6ff_45%,#f8fafc_100%)] px-4 py-8 dark:bg-gray-950">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-sky-100 bg-white/90 shadow-[0_24px_80px_rgba(14,165,233,0.12)] backdrop-blur lg:grid-cols-[1.05fr_0.95fr] dark:border-sky-900/40 dark:bg-gray-900/90">
          <section className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-sky-600 via-cyan-600 to-teal-500 p-10 text-white">
            <div>
              <div className="inline-flex items-center gap-3 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold tracking-[0.2em] uppercase">
                <span className="text-xl">✚</span>
                SmartHealth
              </div>
              <h1 className="mt-8 max-w-md text-4xl font-bold leading-tight">Fast, familiar access to your health dashboard.</h1>
              <p className="mt-4 max-w-md text-sm text-sky-50/90">
                Continue appointments, track queue status, and manage your care with a cleaner sign-in flow.
              </p>
            </div>
            <div className="grid gap-3 text-sm">
              <div className="rounded-2xl bg-white/12 p-4">📅 Quick access to bookings and appointment history</div>
              <div className="rounded-2xl bg-white/12 p-4">🔔 Real-time status and queue updates after login</div>
              <div className="rounded-2xl bg-white/12 p-4">🔐 Use your browser&apos;s saved password suggestions securely</div>
            </div>
          </section>

          <section className="p-6 sm:p-8 md:p-10">
            <div className="mx-auto w-full max-w-md">
              <div className="text-center mb-8">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 text-2xl text-white shadow-lg lg:hidden">
                  ✚
                </div>
                <h2 className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">Welcome back</h2>
                <p className="mt-2 text-sm text-gray-500">Sign in to your SmartHealth account</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    className="input"
                    placeholder="you@example.com"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    inputMode="email"
                    list="recent-user-emails"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                  <datalist id="recent-user-emails">
                    {recentEmails.map((email) => (
                      <option key={email} value={email} />
                    ))}
                  </datalist>
                  {recentEmails.length > 0 && (
                    <p className="mt-1 text-xs text-gray-500">Previously used emails on this device will appear as suggestions.</p>
                  )}
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Password</label>
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="text-xs font-medium text-sky-600 hover:text-sky-700 dark:text-sky-300"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    required
                    className="input"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                  <p className="mt-1 text-xs text-gray-500">For safety, past passwords are not stored here. Your browser can suggest saved passwords securely.</p>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full flex justify-center items-center gap-2 py-3 text-sm font-semibold">
                  {loading ? <Spinner size="sm" /> : 'Sign In'}
                </button>

                <div className="text-right">
                  <Link to="/forgot-password" className="text-xs text-gray-400 hover:text-blue-600 transition-colors">
                    Forgot password?
                  </Link>
                </div>
              </form>

              <p className="mt-6 text-center text-sm text-gray-500">
                Don&apos;t have an account?{' '}
                <Link to="/signup" className="font-medium text-blue-600 hover:underline">Sign up free</Link>
              </p>

              <div className="mt-4 border-t border-gray-100 pt-4 text-center dark:border-gray-800">
                <Link to="/hospital-admin/login" className="text-xs text-gray-400 transition-colors hover:text-purple-600">
                  Admin Portal
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
