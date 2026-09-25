// Shared building blocks for the organization admin panel (Admin*.tsx).
// Visual language follows the dashboard: white / slate-800 cards, rounded-3xl,
// indigo accents, every surface with its dark: counterpart.

import React, { useEffect, useState } from 'react';
import { Check, Copy, Loader2, X } from 'lucide-react';
import { toPersianNum } from '../utils';
import type { OrgMemberStatus, OrgRole } from '../types';

// Server timestamps are "YYYY-MM-DD HH:MM:SS"; dates are shown in the Persian
// (Jalali) calendar, which is what HR teams in Iran work with.
export const parseServerDate = (s: string | null | undefined): Date | null => {
  if (!s) return null;
  const d = new Date(s.length === 10 ? `${s}T00:00:00` : s.replace(' ', 'T'));
  return isNaN(d.getTime()) ? null : d;
};

export const faDate = (s: string | null | undefined, withTime = false): string => {
  const d = parseServerDate(s);
  if (!d) return '—';
  try {
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', withTime
      ? { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
      : { year: 'numeric', month: 'long', day: 'numeric' }).format(d);
  } catch {
    return toPersianNum(s ?? '');
  }
};

export const faRelative = (s: string | null | undefined): string => {
  const d = parseServerDate(s);
  if (!d) return '—';
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return 'امروز';
  if (days === 1) return 'دیروز';
  if (days < 30) return `${toPersianNum(days)} روز پیش`;
  if (days < 365) return `${toPersianNum(Math.floor(days / 30))} ماه پیش`;
  return faDate(s);
};

export const ROLE_LABELS: Record<OrgRole | 'super', string> = {
  member: 'کارمند',
  manager: 'مدیر واحد',
  admin: 'مدیر سازمان',
  super: 'مدیر سامانه',
};

export const STATUS_LABELS: Record<OrgMemberStatus, string> = {
  invited: 'دعوت‌شده',
  active: 'فعال',
  inactive: 'غیرفعال',
  left: 'انصراف داده',
};

const STATUS_CLASSES: Record<OrgMemberStatus, string> = {
  invited: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30',
  inactive: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700/60 dark:text-slate-300 dark:border-slate-600',
  left: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30',
};

export const StatusBadge: React.FC<{ status: OrgMemberStatus }> = ({ status }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-bold whitespace-nowrap ${STATUS_CLASSES[status]}`}>
    {STATUS_LABELS[status]}
  </span>
);

export const RoleBadge: React.FC<{ role: OrgRole | 'super' }> = ({ role }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${
    role === 'member' ? 'text-slate-500 dark:text-slate-400' : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
  }`}>
    {ROLE_LABELS[role]}
  </span>
);

export const Card: React.FC<{ title?: React.ReactNode; action?: React.ReactNode; className?: string; children: React.ReactNode; subtitle?: React.ReactNode }> = ({ title, action, className = '', children, subtitle }) => (
  <section className={`bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-soft dark:shadow-none p-5 md:p-6 ${className}`}>
    {(title || action) && (
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          {title && <h3 className="font-black text-slate-900 dark:text-white text-base">{title}</h3>}
          {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    )}
    {children}
  </section>
);

export const StatTile: React.FC<{ label: string; value: React.ReactNode; hint?: React.ReactNode; icon?: React.ReactNode; tone?: 'default' | 'warn' }> = ({ label, value, hint, icon, tone = 'default' }) => (
  <div className={`rounded-3xl border p-4 md:p-5 ${tone === 'warn'
    ? 'bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30'
    : 'bg-white border-slate-100 dark:bg-slate-800 dark:border-slate-700 shadow-soft dark:shadow-none'}`}>
    <div className="flex items-center justify-between gap-2 mb-2">
      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</span>
      {icon && <span className="text-slate-400 dark:text-slate-500">{icon}</span>}
    </div>
    <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tabular-nums">{value}</div>
    {hint && <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1">{hint}</div>}
  </div>
);

// Single-hue meter (validated: #2a78d6 light / #3987e5 dark, >= 3:1 on the card).
export const Meter: React.FC<{ value: number; className?: string; label?: string }> = ({ value, className = '', label }) => (
  <div className={`h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden ${className}`} role="meter" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
    <div className="h-full rounded-full bg-[#2a78d6] dark:bg-[#3987e5] transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
  </div>
);

// Hover/focus tooltip: every data mark in the admin charts carries its exact
// value here, so nothing is read off a bar length alone.
export const Tip: React.FC<{ content: React.ReactNode; children: React.ReactNode; className?: string; block?: boolean }> = ({ content, children, className = '', block }) => (
  <span className={`relative group/tip ${block ? 'flex w-full' : 'inline-flex'} ${className}`} tabIndex={0}>
    {children}
    <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30 hidden group-hover/tip:block group-focus/tip:block whitespace-nowrap rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[11px] font-bold px-3 py-1.5 shadow-xl">
      {content}
    </span>
  </span>
);

export const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; wide?: boolean; footer?: React.ReactNode }> = ({ title, onClose, children, wide, footer }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/50 backdrop-blur-sm flex p-4 overflow-y-auto animate-fade-in" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`m-auto w-full ${wide ? 'max-w-4xl' : 'max-w-lg'} bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 animate-scale-in`}
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 p-5 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-black text-lg text-slate-900 dark:text-white">{title}</h3>
          <button onClick={onClose} aria-label="بستن" className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="p-5 pt-0 flex flex-wrap gap-3 justify-end">{footer}</div>}
      </div>
    </div>
  );
};

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; loading?: boolean; icon?: React.ReactNode }> = ({ variant = 'primary', loading, icon, children, className = '', disabled, ...rest }) => {
  const styles = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 dark:shadow-none',
    secondary: 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700',
    danger: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-500/30 hover:bg-red-100 dark:hover:bg-red-500/20',
    ghost: 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
  }[variant];
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${styles} ${className}`}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
      {children}
    </button>
  );
};

export const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode; required?: boolean }> = ({ label, hint, children, required }) => (
  <label className="block">
    <span className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
      {label}{required && <span className="text-red-500 mr-0.5">*</span>}
    </span>
    {children}
    {hint && <span className="block text-[11px] text-slate-400 mt-1 leading-relaxed">{hint}</span>}
  </label>
);

export const inputClass = 'w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 placeholder:text-slate-400';

export const CopyButton: React.FC<{ text: string; label?: string }> = ({ text, label = 'کپی' }) => {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setDone(true);
    setTimeout(() => setDone(false), 1500);
  };
  return (
    <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors shrink-0">
      {done ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
      {done ? 'کپی شد' : label}
    </button>
  );
};

export const InviteLinkBox: React.FC<{ link: string; expiresAt?: string; emailed?: boolean }> = ({ link, expiresAt, emailed }) => (
  <div className="rounded-2xl border border-indigo-100 dark:border-indigo-500/30 bg-indigo-50/60 dark:bg-indigo-500/10 p-3">
    <div className="flex items-center gap-2">
      <code className="flex-1 min-w-0 truncate text-xs text-indigo-900 dark:text-indigo-200 font-mono" dir="ltr">{link}</code>
      <CopyButton text={link} />
    </div>
    <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80 mt-2 leading-relaxed">
      {emailed ? 'ایمیل دعوت ارسال شد. ' : ''}
      این لینک یک‌بار مصرف است{expiresAt ? ` و تا ${faDate(expiresAt)} اعتبار دارد` : ''}. فقط همین حالا نمایش داده می‌شود؛ آن را از طریق ایمیل یا پیام‌رسان سازمانی برای فرد بفرستید.
    </p>
  </div>
);

export const EmptyState: React.FC<{ icon: React.ReactNode; title: string; text?: string; action?: React.ReactNode }> = ({ icon, title, text, action }) => (
  <div className="text-center py-10 px-4">
    <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-400 flex items-center justify-center mb-3">{icon}</div>
    <h4 className="font-black text-slate-800 dark:text-white mb-1">{title}</h4>
    {text && <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">{text}</p>}
    {action && <div className="mt-4 flex justify-center">{action}</div>}
  </div>
);

export const LoadingBlock: React.FC<{ label?: string }> = ({ label = 'در حال بارگذاری...' }) => (
  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
    <Loader2 className="animate-spin mb-3" size={32} />
    <span className="text-sm font-bold">{label}</span>
  </div>
);

export const ErrorBlock: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div className="rounded-3xl border border-red-100 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-6 text-center">
    <p className="text-sm font-bold text-red-700 dark:text-red-300 mb-3">{message}</p>
    {onRetry && <Button variant="secondary" onClick={onRetry}>تلاش دوباره</Button>}
  </div>
);

export const errorText = (e: unknown, fallback = 'عملیات ناموفق بود.') => (e instanceof Error ? e.message : fallback);
