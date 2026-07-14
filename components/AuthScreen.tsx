import React, { useEffect, useState } from 'react';
import { Loader2, LogIn, UserPlus, ShieldCheck, KeyRound, MailQuestion, ArrowRight, CheckCircle2 } from 'lucide-react';

interface Props {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string, name: string, role: string) => Promise<void>;
  onForgotPassword: (email: string) => Promise<{ message: string; debugResetToken?: string }>;
  onResetPassword: (email: string, token: string, newPassword: string) => Promise<{ message: string }>;
}

type Mode = 'login' | 'register' | 'forgot' | 'reset';

const AuthScreen: React.FC<Props> = ({ onLogin, onRegister, onForgotPassword, onResetPassword }) => {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('متقاضی ارزیابی');
  const [resetToken, setResetToken] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  // Arriving from the reset email (…/?email=…&token=…) drops the user straight
  // into the reset form with both fields prefilled.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    const e = params.get('email');
    if (t && e) {
      setEmail(e);
      setResetToken(t);
      setMode('reset');
      setInfo('رمز عبور جدید خود را تعیین کنید.');
    }
  }, []);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    setInfo('');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await onLogin(email.trim(), password);
      } else if (mode === 'register') {
        await onRegister(email.trim(), password, name.trim() || 'کاربر آیکامپتنسی', role.trim() || 'متقاضی ارزیابی');
      } else if (mode === 'forgot') {
        const res = await onForgotPassword(email.trim());
        setMode('reset');
        if (res.debugResetToken) setResetToken(res.debugResetToken);
        setInfo(res.message + ' کد بازیابی داخل ایمیل را در فرم زیر وارد کنید.');
      } else {
        const res = await onResetPassword(email.trim(), resetToken.trim(), password);
        setMode('login');
        setPassword('');
        setResetToken('');
        setInfo(res.message + ' حالا با رمز جدید وارد شوید.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'عملیات ناموفق بود.');
    } finally {
      setLoading(false);
    }
  };

  const submitLabel =
    mode === 'login' ? 'ورود به حساب'
    : mode === 'register' ? 'ساخت حساب و شروع'
    : mode === 'forgot' ? 'ارسال لینک بازیابی'
    : 'ثبت رمز عبور جدید';
  const SubmitIcon =
    mode === 'login' ? LogIn
    : mode === 'register' ? UserPlus
    : mode === 'forgot' ? MailQuestion
    : KeyRound;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 font-sans" dir="rtl">
      <div className="w-full max-w-md bg-white/10 border border-white/10 rounded-3xl shadow-2xl p-6 md:p-8 backdrop-blur">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <ShieldCheck size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black">iCompetency</h1>
            <p className="text-xs text-slate-300 font-bold">ورود امن برای ذخیره پیشرفت روی سرور</p>
          </div>
        </div>

        {(mode === 'login' || mode === 'register') && (
          <div className="grid grid-cols-2 gap-2 bg-black/20 p-1 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`py-3 rounded-xl text-sm font-black transition ${mode === 'login' ? 'bg-white text-slate-950' : 'text-slate-300 hover:text-white'}`}
            >
              ورود
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`py-3 rounded-xl text-sm font-black transition ${mode === 'register' ? 'bg-white text-slate-950' : 'text-slate-300 hover:text-white'}`}
            >
              ثبت‌نام
            </button>
          </div>
        )}

        {(mode === 'forgot' || mode === 'reset') && (
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black flex items-center gap-2">
              <KeyRound size={18} className="text-indigo-400" />
              {mode === 'forgot' ? 'بازیابی رمز عبور' : 'تعیین رمز عبور جدید'}
            </h2>
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1 transition"
            >
              بازگشت به ورود <ArrowRight size={14} />
            </button>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          {mode === 'register' && (
            <>
              <label className="block">
                <span className="text-xs font-bold text-slate-300">نام</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2 w-full rounded-2xl bg-white/10 border border-white/10 px-4 py-3 outline-none focus:border-indigo-400"
                  placeholder="نام شما"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-300">نقش</span>
                <input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="mt-2 w-full rounded-2xl bg-white/10 border border-white/10 px-4 py-3 outline-none focus:border-indigo-400"
                  placeholder="متقاضی ارزیابی"
                />
              </label>
            </>
          )}

          {mode === 'forgot' && (
            <p className="text-sm text-slate-300 leading-relaxed">
              ایمیل حساب خود را وارد کنید. اگر حسابی با این ایمیل وجود داشته باشد، لینک و کد بازیابی برایتان ارسال می‌شود.
            </p>
          )}

          <label className="block">
            <span className="text-xs font-bold text-slate-300">ایمیل</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-2xl bg-white/10 border border-white/10 px-4 py-3 outline-none focus:border-indigo-400"
              placeholder="you@example.com"
              dir="ltr"
            />
          </label>

          {mode === 'reset' && (
            <label className="block">
              <span className="text-xs font-bold text-slate-300">کد بازیابی (از ایمیل)</span>
              <input
                required
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                className="mt-2 w-full rounded-2xl bg-white/10 border border-white/10 px-4 py-3 outline-none focus:border-indigo-400 font-mono text-sm"
                placeholder="کد داخل ایمیل بازیابی"
                dir="ltr"
              />
            </label>
          )}

          {mode !== 'forgot' && (
            <label className="block">
              <span className="text-xs font-bold text-slate-300">{mode === 'reset' ? 'رمز عبور جدید' : 'رمز عبور'}</span>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-2xl bg-white/10 border border-white/10 px-4 py-3 outline-none focus:border-indigo-400"
                placeholder="حداقل ۸ کاراکتر"
              />
            </label>
          )}

          {mode === 'login' && (
            <div className="text-left">
              <button
                type="button"
                onClick={() => switchMode('forgot')}
                className="text-xs font-bold text-indigo-300 hover:text-indigo-200 transition"
              >
                رمز عبور را فراموش کرده‌اید؟
              </button>
            </div>
          )}

          {info && (
            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100 flex items-start gap-2">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> <span>{info}</span>
            </div>
          )}
          {error && <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>}

          <button
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-60 text-white font-black flex items-center justify-center gap-2 transition"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <SubmitIcon size={20} />}
            {submitLabel}
          </button>

          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => switchMode('reset')}
              className="w-full text-center text-xs font-bold text-slate-400 hover:text-slate-200 transition"
            >
              کد بازیابی را دارم — تعیین رمز جدید
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default AuthScreen;
