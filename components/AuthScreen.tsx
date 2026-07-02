import React, { useState } from 'react';
import { Loader2, LogIn, UserPlus, ShieldCheck } from 'lucide-react';

interface Props {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string, name: string, role: string) => Promise<void>;
}

const AuthScreen: React.FC<Props> = ({ onLogin, onRegister }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('متقاضی ارزیابی');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') await onLogin(email.trim(), password);
      else await onRegister(email.trim(), password, name.trim() || 'کاربر آیکامپتنسی', role.trim() || 'متقاضی ارزیابی');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ورود ناموفق بود.');
    } finally {
      setLoading(false);
    }
  };

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

        <div className="grid grid-cols-2 gap-2 bg-black/20 p-1 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`py-3 rounded-xl text-sm font-black transition ${mode === 'login' ? 'bg-white text-slate-950' : 'text-slate-300 hover:text-white'}`}
          >
            ورود
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`py-3 rounded-xl text-sm font-black transition ${mode === 'register' ? 'bg-white text-slate-950' : 'text-slate-300 hover:text-white'}`}
          >
            ثبت‌نام
          </button>
        </div>

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

          <label className="block">
            <span className="text-xs font-bold text-slate-300">ایمیل</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-2xl bg-white/10 border border-white/10 px-4 py-3 outline-none focus:border-indigo-400 ltr:text-left"
              placeholder="you@example.com"
              dir="ltr"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-slate-300">رمز عبور</span>
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

          {error && <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>}

          <button
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-60 text-white font-black flex items-center justify-center gap-2 transition"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : mode === 'login' ? <LogIn size={20} /> : <UserPlus size={20} />}
            {mode === 'login' ? 'ورود به حساب' : 'ساخت حساب و شروع'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthScreen;
