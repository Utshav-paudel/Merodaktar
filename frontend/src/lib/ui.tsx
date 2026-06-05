import React from 'react';

/* ============================================================
   MeroDaktar shared UI primitives (Health-Tech Gradient theme)
   Import from components as:  import { Button, Card, ... } from '../lib/ui';
   ============================================================ */

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/* ---------- Button ---------- */
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/70 disabled:cursor-not-allowed disabled:opacity-50';

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-brand text-white shadow-glow-sm hover:shadow-glow hover:brightness-110 active:scale-[0.98]',
  secondary:
    'border border-white/10 bg-white/[0.05] text-slate-100 backdrop-blur-xl hover:border-white/20 hover:bg-white/10',
  ghost: 'text-slate-300 hover:bg-white/5 hover:text-white',
  danger: 'bg-rose-500/90 text-white hover:bg-rose-500 focus-visible:ring-rose-400/70',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth,
  className,
  children,
  disabled,
  ...props
}) => (
  <button
    className={cn(
      buttonBase,
      buttonVariants[variant],
      buttonSizes[size],
      fullWidth && 'w-full',
      className
    )}
    disabled={disabled || loading}
    {...props}
  >
    {loading && <Spinner className="h-4 w-4" />}
    {!loading && leftIcon}
    {children}
    {!loading && rightIcon}
  </button>
);

/* ---------- Icon button ---------- */
export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
}
export const IconButton: React.FC<IconButtonProps> = ({ label, className, children, ...props }) => (
  <button
    aria-label={label}
    title={label}
    className={cn(
      'inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/70',
      className
    )}
    {...props}
  >
    {children}
  </button>
);

/* ---------- Card ---------- */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  as?: React.ElementType;
}
export const Card: React.FC<CardProps> = ({ hover, as, className, children, ...props }) => {
  const Comp = as || 'div';
  return (
    <Comp
      className={cn(
        'rounded-2xl border border-white/10 bg-white/[0.04] shadow-glass backdrop-blur-xl',
        hover &&
          'cursor-pointer transition duration-300 hover:-translate-y-0.5 hover:border-brand-400/40 hover:bg-white/[0.06] hover:shadow-glow-sm',
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  );
};

/* ---------- Inputs ---------- */
const fieldClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 transition placeholder:text-slate-500 focus:border-brand-400/60 focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-brand-500/20';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(fieldClass, className)} {...props} />
  )
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(fieldClass, 'resize-none', className)} {...props} />
));
Textarea.displayName = 'Textarea';

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(fieldClass, 'appearance-none bg-ink-800 [&>option]:bg-ink-800', className)}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = 'Select';

export interface FieldProps {
  label?: string;
  htmlFor?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}
export const Field: React.FC<FieldProps> = ({ label, htmlFor, hint, required, className, children }) => (
  <div className={cn('space-y-1.5', className)}>
    {label && (
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-300">
        {label}
        {required && <span className="ml-0.5 text-brand-400">*</span>}
      </label>
    )}
    {children}
    {hint && <p className="text-xs text-slate-500">{hint}</p>}
  </div>
);

/* ---------- Badge ---------- */
export type BadgeTone = 'brand' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate' | 'blue';
const badgeTones: Record<BadgeTone, string> = {
  brand: 'bg-brand-500/15 text-brand-200 ring-brand-400/30',
  cyan: 'bg-accent-500/15 text-accent-200 ring-accent-400/30',
  emerald: 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/30',
  amber: 'bg-amber-500/15 text-amber-200 ring-amber-400/30',
  rose: 'bg-rose-500/15 text-rose-200 ring-rose-400/30',
  slate: 'bg-white/10 text-slate-300 ring-white/15',
  blue: 'bg-sky-500/15 text-sky-200 ring-sky-400/30',
};
export const Badge: React.FC<{ tone?: BadgeTone; className?: string; children: React.ReactNode }> = ({
  tone = 'slate',
  className,
  children,
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
      badgeTones[tone],
      className
    )}
  >
    {children}
  </span>
);

/* ---------- Spinner ---------- */
export const Spinner: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={cn('animate-spin text-current', className || 'h-5 w-5')}
    viewBox="0 0 24 24"
    fill="none"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-90"
      fill="currentColor"
      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
    />
  </svg>
);

/* ---------- Avatar ---------- */
export const Avatar: React.FC<{ name?: string; src?: string; className?: string }> = ({
  name,
  src,
  className,
}) => {
  const initials = (name || '?')
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return src ? (
    <img
      src={src}
      alt={name || 'avatar'}
      className={cn('rounded-full object-cover ring-2 ring-white/10', className || 'h-10 w-10')}
    />
  ) : (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-gradient-brand text-sm font-bold text-white ring-2 ring-white/10',
        className || 'h-10 w-10'
      )}
    >
      {initials}
    </span>
  );
};

/* ---------- Stat card ---------- */
export const StatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  tone?: BadgeTone;
  sub?: React.ReactNode;
}> = ({ label, value, icon, tone = 'brand', sub }) => (
  <Card className="p-5">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-slate-400">{label}</p>
        <p className="mt-2 font-display text-3xl font-bold text-white">{value}</p>
        {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
      </div>
      {icon && (
        <span
          className={cn(
            'inline-flex h-11 w-11 items-center justify-center rounded-xl ring-1 ring-inset',
            badgeTones[tone]
          )}
        >
          {icon}
        </span>
      )}
    </div>
  </Card>
);

/* ---------- Page header ---------- */
export const PageHeader: React.FC<{
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ title, subtitle, actions, icon }) => (
  <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-center gap-3">
      {icon && (
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-brand text-white shadow-glow-sm">
          {icon}
        </span>
      )}
      <div>
        <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

/* ---------- Empty state ---------- */
export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-14 text-center">
    {icon && (
      <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-brand-300">
        {icon}
      </span>
    )}
    <p className="font-display text-lg font-semibold text-white">{title}</p>
    {description && <p className="mt-1 max-w-sm text-sm text-slate-400">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);
