import React from 'react';
import Markdown from 'react-markdown';

/* ============================================================
   MeroDaktar shared UI primitives — Clinical Calm (light, medical)
   Import as:  import { Button, Card, ChatMarkdown, ... } from '../lib/ui';
   ============================================================ */

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/* ---------- Button ---------- */
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-50';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-gradient-brand text-white shadow-glow-sm hover:shadow-glow hover:brightness-[1.04] active:scale-[0.98]',
  secondary: 'border border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  danger: 'bg-rose-500 text-white hover:bg-rose-600 focus-visible:ring-rose-400/50',
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
    className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], fullWidth && 'w-full', className)}
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
      'inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
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
        'rounded-2xl border border-slate-200/80 bg-white shadow-soft',
        hover &&
          'cursor-pointer transition duration-300 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card',
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
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 transition placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(fieldClass, className)} {...props} />
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
  <select ref={ref} className={cn(fieldClass, 'appearance-none', className)} {...props}>
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
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-brand-600">*</span>}
      </label>
    )}
    {children}
    {hint && <p className="text-xs text-slate-400">{hint}</p>}
  </div>
);

/* ---------- Badge ---------- */
export type BadgeTone = 'brand' | 'emerald' | 'amber' | 'rose' | 'slate' | 'blue' | 'sky' | 'cyan';
const badgeTones: Record<BadgeTone, string> = {
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  rose: 'bg-rose-50 text-rose-700 ring-rose-200',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200',
  sky: 'bg-sky-50 text-sky-700 ring-sky-200',
  cyan: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
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
  <svg className={cn('animate-spin text-current', className || 'h-5 w-5')} viewBox="0 0 24 24" fill="none">
    <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

/* ---------- Avatar ---------- */
export const Avatar: React.FC<{ name?: string; src?: string; className?: string }> = ({ name, src, className }) => {
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
      className={cn('rounded-full object-cover ring-2 ring-white', className || 'h-10 w-10')}
    />
  ) : (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-gradient-brand text-sm font-bold text-white ring-2 ring-white',
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
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-2 font-display text-3xl font-bold text-slate-900">{value}</p>
        {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
      </div>
      {icon && (
        <span
          className={cn('inline-flex h-11 w-11 items-center justify-center rounded-xl ring-1 ring-inset', badgeTones[tone])}
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
        <h1 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
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
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-14 text-center">
    {icon && (
      <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        {icon}
      </span>
    )}
    <p className="font-display text-lg font-semibold text-slate-900">{title}</p>
    {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

/* ---------- Chat markdown ---------- */
/* Renders an AI message's markdown (bold, lists, paragraphs) instead of raw ** / * text. */
export const ChatMarkdown: React.FC<{ children: string; className?: string }> = ({ children, className }) => (
  <div className={cn('chat-md', className)}>
    <Markdown>{children}</Markdown>
  </div>
);
