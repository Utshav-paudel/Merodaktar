import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  EnvelopeIcon,
  LockClosedIcon,
  UserIcon,
  PhoneIcon,
  AcademicCapIcon,
  IdentificationIcon,
  BriefcaseIcon,
  DocumentTextIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { Button, Card, Input, Textarea, Select, Field } from '../lib/ui';
import AuthLayout from './layout/AuthLayout';

interface DoctorLoginProps {
  onLogin: (token: string) => void;
}

const DoctorLogin: React.FC<DoctorLoginProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    specialization: '',
    license_number: '',
    years_of_experience: '',
    education: '',
    bio: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const specializations = [
    'General Practice',
    'Cardiology',
    'Dermatology',
    'Pediatrics',
    'Orthopedics',
    'Neurology',
    'Psychiatry',
    'Obstetrics & Gynecology',
    'ENT',
    'Ophthalmology',
    'Dentistry',
    'Other'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const response = await fetch('http://localhost:8000/api/v1/auth/login/doctor', {
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
          navigate('/doctor/dashboard');
        } else {
          setError('Invalid email or password');
        }
      } else {
        // Register
        const response = await fetch('http://localhost:8000/api/v1/auth/register/doctor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            years_of_experience: parseInt(formData.years_of_experience)
          }),
        });

        if (response.ok) {
          await response.json();
          // Note: Doctor needs verification before full access
          alert('Registration successful! Please wait for account verification.');
          setIsLogin(true);
        } else {
          const errorData = await response.json();
          setError(errorData.detail || 'Registration failed. Email might already exist.');
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout variant="doctor">
      <Card className="p-8 animate-fade-in-up">
        <div className="mb-7 text-center">
          <h2 className="font-display text-2xl font-bold text-white">
            {isLogin ? 'Doctor Sign In' : 'Register as Doctor'}
          </h2>
          <p className="mt-1.5 text-sm text-slate-400">
            {isLogin
              ? 'Access your professional healthcare dashboard.'
              : 'Join the MeroDaktar verified provider network.'}
          </p>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            <ExclamationCircleIcon className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Email" required>
            <div className="relative">
              <EnvelopeIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <Input
                type="email"
                placeholder="you@clinic.com"
                className="pl-11"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </Field>

          <Field label="Password" required>
            <div className="relative">
              <LockClosedIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <Input
                type="password"
                placeholder="••••••••"
                className="pl-11"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
          </Field>

          {!isLogin && (
            <>
              <Field label="Full Name" required>
                <div className="relative">
                  <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                  <Input
                    type="text"
                    placeholder="Dr. Jane Doe"
                    className="pl-11"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                  />
                </div>
              </Field>

              <Field label="Phone Number" required>
                <div className="relative">
                  <PhoneIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                  <Input
                    type="tel"
                    placeholder="+977 98XXXXXXXX"
                    className="pl-11"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
              </Field>

              <Field label="Specialization" required>
                <Select
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  required
                >
                  <option value="">Select Specialization</option>
                  {specializations.map(spec => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </Select>
              </Field>

              <Field label="Medical License Number" required>
                <div className="relative">
                  <IdentificationIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                  <Input
                    type="text"
                    placeholder="License No."
                    className="pl-11"
                    value={formData.license_number}
                    onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                    required
                  />
                </div>
              </Field>

              <Field label="Years of Experience" required>
                <div className="relative">
                  <BriefcaseIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                  <Input
                    type="number"
                    placeholder="e.g. 8"
                    className="pl-11"
                    value={formData.years_of_experience}
                    onChange={(e) => setFormData({ ...formData, years_of_experience: e.target.value })}
                    required
                    min="0"
                  />
                </div>
              </Field>

              <Field label="Education" required>
                <div className="relative">
                  <AcademicCapIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                  <Input
                    type="text"
                    placeholder="e.g., MBBS, MD"
                    className="pl-11"
                    value={formData.education}
                    onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                    required
                  />
                </div>
              </Field>

              <Field label="Brief Bio" hint="Optional — tell patients about your practice.">
                <div className="relative">
                  <DocumentTextIcon className="pointer-events-none absolute left-3.5 top-3.5 h-5 w-5 text-slate-500" />
                  <Textarea
                    placeholder="A short professional introduction…"
                    className="pl-11"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    rows={3}
                  />
                </div>
              </Field>
            </>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            rightIcon={!loading ? <ArrowRightIcon className="h-5 w-5" /> : undefined}
            disabled={loading}
          >
            {loading ? 'Processing…' : (isLogin ? 'Sign In' : 'Register')}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="font-semibold text-accent-300 transition hover:text-accent-200"
          >
            {isLogin ? 'Register' : 'Sign In'}
          </button>
        </p>

        <div className="mt-6 border-t border-white/10 pt-5 text-center">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Patient Portal
          </button>
        </div>
      </Card>
    </AuthLayout>
  );
};

export default DoctorLogin;
