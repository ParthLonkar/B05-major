/**
 * Login Page
 * Supports both user and admin login
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { authApi } from '../services/auth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useAppContext();
  const [mode, setMode] = useState<'user' | 'admin'>('user');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'admin') {
        const email = formData.email === 'admin' ? 'admin@complaints.com' : formData.email;
        const response = await authApi.login(email, formData.password);

        if (response.success && response.data) {
          setUser(response.data.user, response.data.token);
          navigate('/admin');
          return;
        }

        setError(response.error || 'Invalid admin credentials. Use admin@complaints.com / admin123');
      } else {
        if (!formData.name || !formData.email || !formData.password) {
          setError('Please fill all fields');
          return;
        }

        const response = await authApi.register(formData.name, formData.email, formData.password);
        if (response.success && response.data) {
          setUser(response.data.user, response.data.token);
          navigate('/home');
          return;
        }

        setError(response.error || 'Failed to sign in');
      }
    } catch (error) {
      console.error('Auth error:', error);
      setError('Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-md animate-in fade-in duration-500">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-blue-600 dark:text-blue-400 mb-2">
            Pothole Guard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Complaint Management Portal</p>
        </div>

        {/* Mode Switch */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={mode === 'user' ? 'primary' : 'outline'}
            fullWidth
            onClick={() => {
              setMode('user');
              setFormData({ name: '', email: '', password: '' });
              setError('');
            }}
          >
            User Login
          </Button>
          <Button
            variant={mode === 'admin' ? 'primary' : 'outline'}
            fullWidth
            onClick={() => {
              setMode('admin');
              setFormData({ name: '', email: '', password: '' });
              setError('');
            }}
          >
            Admin Login
          </Button>
        </div>

        {/* Form Card */}
        <Card className="p-8">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-4 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100 rounded-lg text-sm font-medium">
                {error}
              </div>
            )}

            {mode === 'user' ? (
              <>
                <Input
                  label="Full Name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your name"
                  required
                />
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email"
                  required
                />
              </>
            ) : (
              <>
                <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg text-sm">
                  <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Admin Demo Credentials:</p>
                  <p className="text-blue-800 dark:text-blue-200">Email: <code className="font-mono font-bold">admin@complaints.com</code></p>
                  <p className="text-blue-800 dark:text-blue-200">Password: <code className="font-mono font-bold">admin123</code></p>
                </div>
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="admin@complaints.com"
                  required
                />
              </>
            )}

            <Input
              label={mode === 'admin' ? 'Password' : 'Password (any value)'}
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter password"
              required
            />

            <Button type="submit" fullWidth loading={loading} variant="primary" size="lg">
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          {/* Demo Info */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
              🔒 This is a mock authentication system for demo purposes
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
