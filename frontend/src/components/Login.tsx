import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  EnvelopeIcon,
  LockClosedIcon,
  UserIcon,
  PhoneIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { Button, Card, Input, Select, Field } from '../lib/ui';
import AuthLayout from './layout/AuthLayout';

interface LoginProps {
  onLogin: (token: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    date_of_birth: '',
    gender: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isLogin) {
        const response = await fetch('http://localhost:8000/api/v1/auth/login/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password
          }),
        });

        if (response.ok) {
          const data = await response.json();
          onLogin(data.access_token);
          navigate('/dashboard');
        } else {
          setError('Invalid email or password');
        }
      } else {
        // Register
        const response = await fetch('http://localhost:8000/api/v1/auth/register/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (response.ok) {
          // Already returns token with registration
          const data = await response.json();
          onLogin(data.access_token);
          navigate('/dashboard');
        } else {
          setError('Registration failed. Email might already exist.');
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    }
  };

  return (
    <AuthLayout variant="patient">
      <Card className="animate-fade-in-up p-8">
        <div className="mb-7 text-center">
          <h2 className="font-display text-2xl font-bold tracking-tight text-white">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="mt-1.5 text-sm text-slate-400">
            {isLogin
              ? 'Sign in to continue to your care dashboard.'
              : 'Join MeroDaktar and start your health journey.'}
          </p>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 animate-fade-in">
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Email" htmlFor="email" required>
            <div className="relative">
              <EnvelopeIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="pl-11"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </Field>

          <Field label="Password" htmlFor="password" required>
            <div className="relative">
              <LockClosedIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="pl-11"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                maxLength={72}
                minLength={8}
                required
              />
            </div>
          </Field>

          {!isLogin && (
            <>
              <Field label="Full Name" htmlFor="full_name" required>
                <div className="relative">
                  <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="full_name"
                    type="text"
                    placeholder="Jane Doe"
                    className="pl-11"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>
              </Field>

              <Field label="Phone Number" htmlFor="phone" required>
                <div className="relative">
                  <PhoneIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+977 98XXXXXXXX"
                    className="pl-11"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
              </Field>

              <Field label="Date of Birth" htmlFor="date_of_birth" required>
                <div className="relative">
                  <CalendarDaysIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="date_of_birth"
                    type="date"
                    className="pl-11 [color-scheme:dark]"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    max={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
              </Field>

              <Field label="Gender" htmlFor="gender" required>
                <Select
                  id="gender"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </Select>
              </Field>
            </>
          )}

          <Button type="submit" variant="primary" size="lg" fullWidth rightIcon={<ArrowRightIcon className="h-5 w-5" />}>
            {isLogin ? 'Sign In' : 'Create account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="font-semibold text-brand-300 transition-colors hover:text-brand-200"
          >
            {isLogin ? 'Register' : 'Sign In'}
          </button>
        </p>

        <div className="mt-6 border-t border-white/10 pt-5 text-center">
          <a
            href="/doctor/login"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-300 transition-colors hover:text-accent-200"
          >
            Doctor Portal
            <ArrowRightIcon className="h-4 w-4" />
          </a>
        </div>
      </Card>
    </AuthLayout>
  );
};

export default Login;
