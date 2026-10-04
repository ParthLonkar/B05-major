/**
 * Premium Login Page — glass card, sliding tab switcher, password toggle
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { authApi } from '../services/auth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const EyeIcon = ({ open }: { open: boolean }) => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    {open ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    )}
  </svg>
);

const PersonIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const MailIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const LockIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useAppContext();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const switchMode = (m: 'login' | 'register') => {
    setMode(m);
    setFormData({ name: '', email: '', password: '' });
    setError('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const email = formData.email.trim().toLowerCase();
    const name = formData.name.trim();
    const password = formData.password;

    try {
      if (!email || !password) {
        setError('Email and password are required.');
        return;
      }

      const isAdminAttempt = email === 'admin@complaints.com';

      let response;
      if (isAdminAttempt) {
        response = await authApi.login(email, password);
      } else if (mode === 'register') {
        if (!name) {
          setError('Please enter your full name to create an account.');
          return;
        }
        response = await authApi.register(name, email, password);
      } else {
        response = await authApi.login(email, password);

        if (!response.success && !isAdminAttempt) {
          if (!name) {
            setError(response.error || 'Invalid login credentials.');
            return;
          }

          response = await authApi.register(name, email, password);
        }
      }

      if (response.success && response.data) {
        const { user, token } = response.data;
        setUser(user, token);

        if (user.role === 'admin') {
          window.location.assign('/admin.html#/');
        } else {
          navigate('/report', { replace: true });
        }
        return;
      }

      setError(response.error || 'Authentication failed. Please try again.');
    } catch {
      setError('Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToPublicMap = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    setUser(null);
    navigate('/landing', { replace: true });
    if (window.location.pathname !== '/landing') {
      window.location.assign('/landing');
    }
  };

  return (
    <div
      className="min-h-full relative flex flex-col items-center justify-center px-5 py-8 overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #080d1a 0%, #0a0f1e 60%, #06091a 100%)' }}
    >
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute w-64 h-64 rounded-full animate-orb1"
          style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.2) 0%, transparent 70%)', top: '-40px', right: '-30px', filter: 'blur(60px)' }} />
        <div className="absolute w-56 h-56 rounded-full animate-orb2"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)', bottom: '60px', left: '-30px', filter: 'blur(60px)' }} />
      </div>

      <div className="relative z-10 w-full max-w-sm animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="mx-auto mb-4 h-16 w-16 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(14,165,233,0.2), rgba(124,58,237,0.15))',
              border: '1px solid rgba(14,165,233,0.3)',
              boxShadow: '0 0 30px rgba(14,165,233,0.2)',
            }}
          >
            <svg className="h-8 w-8 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M12 2L2 19.5h20L12 2z" /><path d="M12 9v5" /><circle cx="12" cy="17" r="0.5" fill="currentColor" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-white">Pothole Guard</h1>
          <p className="text-sm text-slate-500 mt-1">Complaint Management Portal</p>
        </div>

        {/* Mode tab switcher */}
        <div
          className="relative flex rounded-2xl p-1 mb-5"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {/* Sliding pill */}
          <div
            className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
              boxShadow: '0 4px 12px rgba(14,165,233,0.35)',
              left: mode === 'login' ? '4px' : 'calc(50%)',
            }}
          />
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`relative z-10 flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                mode === m ? 'text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {m === 'login' ? '🔐 Login' : '📝 Create Account'}
            </button>
          ))}
        </div>

        {/* Form card */}
        <div
          className="rounded-2xl p-5"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Error message */}
          {error && (
            <div
              className="mb-4 flex items-start gap-2.5 rounded-xl p-3 text-sm animate-shake"
              style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: '#fb7185' }}
            >
              <svg className="h-4 w-4 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {mode === 'register' && (
              <Input
                label="Full Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter your name"
                required
                icon={<PersonIcon />}
              />
            )}

            {mode === 'login' && (
              <div
                className="rounded-xl p-3 text-xs animate-fade-up"
                style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.15)' }}
              >
                <p className="font-bold text-blue-300 mb-1">Admin access</p>
                <p className="text-slate-400">Email: <code className="text-blue-300 font-mono">admin@complaints.com</code></p>
                <p className="text-slate-400">Password: <code className="text-blue-300 font-mono">admin123</code></p>
              </div>
            )}

            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="you@example.com"
              required
              icon={<MailIcon />}
            />

            <Input
              label="Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter password"
              required
              icon={<LockIcon />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  <EyeIcon open={showPassword} />
                </button>
              }
            />

            <Button type="submit" fullWidth loading={loading} variant="primary" size="lg" className="mt-2">
              {loading ? 'Verifying...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-center text-[10px] text-slate-600">
              🔒 Verified against the complaint portal account database
            </p>
          </div>
        </div>

        {/* Back link */}
        <button
          type="button"
          onClick={handleBackToPublicMap}
          className="mt-4 w-full text-center text-xs text-slate-600 hover:text-slate-400 transition-colors py-2"
        >
          ← Back to public map
        </button>
      </div>
    </div>
  );
};
