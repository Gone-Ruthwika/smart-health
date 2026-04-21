import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import Spinner from '../components/ui/Spinner';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1=email, 2=otp+newpass
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      toast.success('OTP sent to your email!');
      setStep(2);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (newPassword !== confirm) return toast.error('Passwords do not match');
    if (newPassword.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, otp, newPassword });
      toast.success('Password reset successfully! Please login.');
      navigate('/login');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-md">
        <div className="card">
          <div className="text-center mb-8">
            <span className="text-5xl">{step === 1 ? '🔑' : '🔐'}</span>
            <h1 className="text-2xl font-bold mt-3">
              {step === 1 ? 'Forgot Password' : 'Enter OTP'}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {step === 1
                ? 'Enter your email to receive a reset OTP'
                : `OTP sent to ${email}`}
            </p>
          </div>

          {step === 1 ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email Address</label>
                <input
                  type="email" required className="input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full flex justify-center items-center gap-2 py-3">
                {loading ? <Spinner size="sm" /> : '📧 Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">OTP Code</label>
                <input
                  type="text" required className="input text-center text-2xl font-bold tracking-widest"
                  placeholder="000000" maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                />
                <p className="text-xs text-gray-400 mt-1">Check your email for the 6-digit OTP</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">New Password</label>
                <input
                  type="password" required className="input"
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Confirm Password</label>
                <input
                  type="password" required className="input"
                  placeholder="Repeat new password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full flex justify-center items-center gap-2 py-3">
                {loading ? <Spinner size="sm" /> : '🔐 Reset Password'}
              </button>
              <button type="button" onClick={() => setStep(1)} className="w-full text-sm text-gray-500 hover:text-gray-700">
                ← Use different email
              </button>
            </form>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">
            Remember your password?{' '}
            <Link to="/login" className="text-blue-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
