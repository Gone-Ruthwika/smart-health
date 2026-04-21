import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../utils/helpers';
import Spinner from '../components/ui/Spinner';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await signup(form);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-md">
        <div className="card">
          <div className="text-center mb-8">
            <span className="text-4xl">🏥</span>
            <h1 className="text-2xl font-bold mt-2">Create account</h1>
            <p className="text-gray-500 text-sm mt-1">Start managing your health appointments</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { key: 'name', label: 'Full Name', type: 'text', placeholder: 'John Doe' },
              { key: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
              { key: 'phone', label: 'Phone (optional)', type: 'tel', placeholder: '+91 9876543210' },
              { key: 'password', label: 'Password', type: 'password', placeholder: 'Min 6 characters' },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-1">{label}</label>
                <input
                  type={type} className="input" placeholder={placeholder}
                  required={key !== 'phone'}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </div>
            ))}
            <button type="submit" disabled={loading} className="btn-primary w-full flex justify-center items-center gap-2">
              {loading ? <Spinner size="sm" /> : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
