import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { AlertCircle, Check } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    const result = await login(username, password);

    setLoading(false);

    if (result.success) {
      setSuccessMessage('Login successful! Redirecting...');
      setTimeout(() => navigate('/'), 1000);
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-b from-secondary via-white to-primary">
      <div className="w-full max-w-sm rounded-3xl bg-white/95 p-8 shadow-xl ring-1 ring-black/5 backdrop-blur">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-accent">JayDee POS</h1>
          <p className="mt-2 text-sm text-slate-500">Secure Login</p>
        </div>

        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              placeholder="Enter your username"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Enter your password"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-2xl bg-rose-50 p-4 border border-rose-200">
              <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 border border-emerald-200">
              <Check className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-700">{successMessage}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password.trim()}
            className="w-full rounded-2xl bg-accent px-4 py-3 text-white text-lg font-semibold shadow-lg transition hover:bg-purple-900 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-200 text-center text-xs text-slate-400">
          <p>Powered by Silent Strides Network LTD</p>
        </div>
      </div>
    </div>
  );
}
