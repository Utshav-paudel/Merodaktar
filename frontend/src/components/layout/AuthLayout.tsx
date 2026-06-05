import React from 'react';
import {
  SparklesIcon,
  MicrophoneIcon,
  ShieldCheckIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

export interface AuthLayoutProps {
  variant?: 'patient' | 'doctor';
  /** The form card. */
  children: React.ReactNode;
}

const FEATURES = [
  { icon: MicrophoneIcon, title: 'Voice-first AI assistant', desc: 'Describe symptoms by voice or text — get triage in seconds.' },
  { icon: CalendarDaysIcon, title: 'Book verified doctors', desc: 'Real-time availability and instant appointment booking.' },
  { icon: ShieldCheckIcon, title: 'Your records, secured', desc: 'JWT-secured EHR with a full medical history timeline.' },
];

export const AuthLayout: React.FC<AuthLayoutProps> = ({ variant = 'patient', children }) => (
  <div className="app-bg flex min-h-screen flex-col lg:flex-row">
    {/* Hero / branding panel */}
    <div className="relative hidden flex-1 overflow-hidden p-12 lg:flex lg:flex-col lg:justify-between">
      {/* floating orbs */}
      <div className="pointer-events-none absolute -left-16 top-24 h-72 w-72 rounded-full bg-brand-600/30 blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute bottom-10 right-10 h-80 w-80 rounded-full bg-accent-500/20 blur-3xl animate-float" />

      <div className="relative flex items-center gap-3">
        <img
          src="/mero-daktar-logo.png"
          alt="MeroDaktar"
          className="h-12 w-12 rounded-2xl ring-1 ring-white/10"
        />
        <span className="font-display text-2xl font-bold tracking-tight">
          <span className="gradient-text">Mero</span>
          <span className="text-white">Daktar</span>
        </span>
      </div>

      <div className="relative max-w-lg">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-brand-200 backdrop-blur-xl">
          <SparklesIcon className="h-4 w-4" />
          AI-powered telemedicine
        </div>
        <h1 className="font-display text-4xl font-bold leading-tight text-white text-balance xl:text-5xl">
          Your doctor,{' '}
          <span className="gradient-text">reimagined</span> with AI.
        </h1>
        <p className="mt-4 text-lg text-slate-400">
          Talk to an AI medical assistant by voice or text, book trusted doctors, and keep your
          entire health record in one calm, secure place.
        </p>

        <div className="mt-10 space-y-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-4">
              <span className="mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-brand-300">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-white">{title}</p>
                <p className="text-sm text-slate-400">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative flex items-center gap-6 text-sm text-slate-500">
        <span>
          <span className="font-display text-xl font-bold text-white">49</span> automated tests
        </span>
        <span className="h-4 w-px bg-white/10" />
        <span>
          <span className="font-display text-xl font-bold text-white">91%</span> coverage
        </span>
        <span className="h-4 w-px bg-white/10" />
        <span>
          <span className="font-display text-xl font-bold text-white">24/7</span> availability
        </span>
      </div>
    </div>

    {/* Form panel */}
    <div className="flex flex-1 items-center justify-center p-6 sm:p-10 lg:max-w-xl">
      <div className="w-full max-w-md animate-fade-in-up">
        {/* compact brand for mobile */}
        <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
          <img
            src="/mero-daktar-logo.png"
            alt="MeroDaktar"
            className="h-11 w-11 rounded-2xl ring-1 ring-white/10"
          />
          <span className="font-display text-2xl font-bold tracking-tight">
            <span className="gradient-text">Mero</span>
            <span className="text-white">Daktar</span>
          </span>
        </div>
        {variant === 'doctor' && (
          <div className="mb-4 flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-400/30 bg-accent-500/10 px-3 py-1 text-xs font-semibold text-accent-200">
              <ShieldCheckIcon className="h-4 w-4" />
              Doctor Portal
            </span>
          </div>
        )}
        {children}
      </div>
    </div>
  </div>
);

export default AuthLayout;
