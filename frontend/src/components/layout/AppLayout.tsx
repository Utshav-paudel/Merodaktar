import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  ChatBubbleLeftRightIcon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Avatar, cn } from '../../lib/ui';

type Role = 'patient' | 'doctor';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  end?: boolean;
}

const NAV: Record<Role, NavItem[]> = {
  patient: [
    { to: '/dashboard', label: 'Dashboard', icon: HomeIcon },
    { to: '/chat', label: 'AI Consultation', icon: ChatBubbleLeftRightIcon },
    { to: '/appointments', label: 'Appointments', icon: CalendarDaysIcon },
    { to: '/ehr', label: 'Health Records', icon: ClipboardDocumentListIcon },
  ],
  doctor: [{ to: '/doctor/dashboard', label: 'Dashboard', icon: HomeIcon }],
};

export interface AppLayoutProps {
  role?: Role;
  user?: { full_name?: string; name?: string; email?: string } | null;
  onLogout: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  /** Full-height content with no padding/scroll wrapper (used by the chat page). */
  fullBleed?: boolean;
  children: React.ReactNode;
}

const Brand: React.FC<{ role: Role }> = ({ role }) => (
  <div className="flex items-center gap-3 px-2">
    <img src="/mero-daktar-logo.png" alt="MeroDaktar" className="h-10 w-10 rounded-xl ring-1 ring-slate-200" />
    <div className="leading-tight">
      <p className="font-display text-lg font-bold tracking-tight">
        <span className="gradient-text">Mero</span>
        <span className="text-slate-900">Daktar</span>
      </p>
      <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400">
        {role === 'doctor' ? 'Doctor Portal' : 'Patient Portal'}
      </p>
    </div>
  </div>
);

const NavLinks: React.FC<{ role: Role; onNavigate?: () => void }> = ({ role, onNavigate }) => (
  <nav className="flex flex-col gap-1">
    {NAV[role].map(({ to, label, icon: Icon, end }) => (
      <NavLink
        key={to}
        to={to}
        end={end}
        onClick={onNavigate}
        className={({ isActive }) =>
          cn(
            'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
            isActive
              ? 'bg-gradient-brand text-white shadow-glow-sm'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
          )
        }
      >
        <Icon className="h-5 w-5 shrink-0" />
        {label}
      </NavLink>
    ))}
  </nav>
);

const UserCard: React.FC<{ user?: AppLayoutProps['user']; role: Role; onLogout: () => void }> = ({
  user,
  role,
  onLogout,
}) => {
  const name = user?.full_name || user?.name || (role === 'doctor' ? 'Doctor' : 'Patient');
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-3">
        <Avatar name={name} className="h-10 w-10" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
          {user?.email && <p className="truncate text-xs text-slate-400">{user.email}</p>}
        </div>
      </div>
      <button
        onClick={onLogout}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
      >
        <ArrowRightOnRectangleIcon className="h-4 w-4" />
        Sign out
      </button>
    </div>
  );
};

export const AppLayout: React.FC<AppLayoutProps> = ({
  role = 'patient',
  user,
  onLogout,
  title,
  subtitle,
  actions,
  fullBleed,
  children,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="app-bg min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col gap-6 border-r border-slate-200 bg-white/80 p-5 backdrop-blur-xl md:flex">
        <Brand role={role} />
        <div className="flex-1 overflow-y-auto pt-2">
          <NavLinks role={role} />
        </div>
        <UserCard user={user} role={role} onLogout={onLogout} />
      </aside>

      {/* Mobile slide-over */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col gap-6 border-r border-slate-200 bg-white p-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <Brand role={role} />
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close menu"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavLinks role={role} onNavigate={() => setOpen(false)} />
            </div>
            <UserCard user={user} role={role} onLogout={onLogout} />
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-h-screen flex-col md:pl-72">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/70 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-10">
          <button
            onClick={() => setOpen(true)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 md:hidden"
            aria-label="Open menu"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          <div className="min-w-0 flex-1">
            {title && <h1 className="truncate font-display text-lg font-bold text-slate-900">{title}</h1>}
            {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>

        {fullBleed ? (
          <main className="flex min-h-0 flex-1 flex-col">{children}</main>
        ) : (
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
            <div className="mx-auto w-full max-w-7xl animate-fade-in-up">{children}</div>
          </main>
        )}
      </div>
    </div>
  );
};

export default AppLayout;
