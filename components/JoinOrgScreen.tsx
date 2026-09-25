// Invite acceptance at /join?token=... (docs/organizations.md).
// Signed out: the person creates an account (or signs in) and accepts in one
// step. Signed in: a single confirmation. Either way, joining needs explicit
// consent, because the organization will see the person's results.

import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTriangle, Building2, CheckCircle2, Loader2, LogIn, ShieldCheck, UserPlus } from 'lucide-react';
import type { InviteInfo, UserProfile } from '../types';
import { AuthPayload, acceptInvite, login, lookupInvite, register } from '../services/apiService';

const ROLE_TEXT: Record<string, string> = { member: 'کارمند', manager: 'مدیر واحد', admin: 'مدیر سازمان' };

interface Props {
  // Signed-in mode
  user?: UserProfile;
  onJoined?: (profile: UserProfile, orgName: string) => void;
  onSkip?: () => void;
  // Signed-out mode
  onAuthenticated?: (payload: AuthPayload, joinedOrg: string | null) => Promise<void>;
}

const JoinOrgScreen: React.FC<Props> = ({ user, onJoined, onSkip, onAuthenticated }) => {
  const location = useLocation();
  const token = new URLSearchParams(location.search).get('token') ?? '';
  const signedIn = !!user;

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Signed up/in but the accept call failed: let them continue anyway.
  const [pendingPayload, setPendingPayload] = useState<AuthPayload | null>(null);

  useEffect(() => {
    if (!token) { setLookupError('لینک دعوت ناقص است.'); return; }
    lookupInvite(token)
      .then(i => { setInfo(i); setName(i.fullName); setEmail(i.email); })
      .catch(e => setLookupError(e instanceof Error ? e.message : 'لینک دعوت معتبر نیست.'));
  }, [token]);

  const acceptSignedIn = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await acceptInvite(token);
      onJoined?.(r.profile, r.orgName);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'پذیرش دعوت ناموفق بود.');
      setBusy(false);
    }
  };

  const submitSignedOut = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    let payload: AuthPayload;
    try {
      payload = mode === 'register'
        ? await register(email.trim(), password, name.trim(), info?.jobTitle || 'متقاضی ارزیابی')
        : await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ورود ناموفق بود.');
      setBusy(false);
      return;
    }
    try {
      const r = await acceptInvite(token);
      await onAuthenticated?.({ ...payload, profile: r.profile }, r.orgName);
    } catch (err) {
      setPendingPayload(payload);
      setError(`حساب شما آماده است، اما پیوستن به سازمان انجام نشد: ${err instanceof Error ? err.message : ''}`);
      setBusy(false);
    }
  };

  const unusable = info && (info.expired || !info.orgActive);

  const body = () => {
    if (lookupError) {
      return (
        <div className="text-center py-4">
          <AlertTriangle className="mx-auto mb-3 text-amber-400" size={36} />
          <p className="font-bold mb-2">{lookupError}</p>
          <p className="text-sm text-slate-300 leading-relaxed">اگر قبلاً با این لینک پیوسته‌اید، کافی است وارد حساب خود شوید. در غیر این صورت از مدیر منابع انسانی سازمان لینک جدید بخواهید.</p>
          <a href={signedIn ? '/dashboard' : '/'} className="inline-block mt-5 px-5 py-2.5 rounded-2xl bg-white text-slate-950 font-black text-sm">{signedIn ? 'رفتن به داشبورد' : 'ورود به حساب'}</a>
        </div>
      );
    }
    if (!info) return <div className="flex justify-center py-10"><Loader2 className="animate-spin" size={32} /></div>;

    return (
      <>
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0"><Building2 size={22} /></div>
            <div className="min-w-0">
              <div className="text-xs text-slate-300 font-bold">دعوت به ارزیابی شایستگی</div>
              <div className="text-lg font-black truncate">{info.orgName}</div>
            </div>
          </div>
          <p className="text-sm text-slate-300 mt-3 leading-relaxed">
            {info.fullName} عزیز، شما به عنوان «{ROLE_TEXT[info.orgRole] ?? info.orgRole}»
            {info.unitPath ? <> در واحد «{info.unitPath}»</> : null} دعوت شده‌اید.
          </p>
        </div>

        {unusable ? (
          <div className="text-center">
            <AlertTriangle className="mx-auto mb-3 text-amber-400" size={32} />
            <p className="font-bold">{info.expired ? 'مهلت این لینک دعوت تمام شده است.' : 'این سازمان در حال حاضر غیرفعال است.'}</p>
            <p className="text-sm text-slate-300 mt-2">از مدیر منابع انسانی سازمان لینک جدید بخواهید.</p>
          </div>
        ) : (
          <>
            <label className="flex items-start gap-3 text-sm text-slate-200 bg-white/5 border border-white/10 rounded-2xl p-4 mb-5 cursor-pointer leading-relaxed">
              <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1 rounded" />
              <span>
                موافقم نتایج آزمون‌هایم (شایستگی‌ها، نیمرخ شناختی و شخصیتی) با مدیران «{info.orgName}» به اشتراک گذاشته شود.
                <span className="block text-xs text-slate-400 mt-1">هر زمان بخواهید می‌توانید از داشبورد از سازمان خارج شوید؛ پس از آن نتایج شما برای سازمان نمایش داده نمی‌شود.</span>
              </span>
            </label>

            {signedIn ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-300">
                  با حساب <b dir="ltr">{user?.email}</b> می‌پیوندید.
                  {user?.email && user.email.toLowerCase() !== info.email.toLowerCase() && <> (این دعوت برای <span dir="ltr">{info.email}</span> صادر شده است.)</>}
                </p>
                <button onClick={acceptSignedIn} disabled={!consent || busy} className="w-full py-3.5 rounded-2xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 font-black flex items-center justify-center gap-2">
                  {busy ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />} پذیرش دعوت و پیوستن
                </button>
                <button onClick={onSkip} className="w-full py-2 text-xs font-bold text-slate-400 hover:text-white">فعلاً نه</button>
              </div>
            ) : pendingPayload ? (
              <button onClick={() => onAuthenticated?.(pendingPayload, null)} className="w-full py-3.5 rounded-2xl bg-white text-slate-950 font-black">ادامه به داشبورد</button>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 bg-black/20 p-1 rounded-2xl mb-4">
                  <button type="button" onClick={() => setMode('register')} className={`py-2.5 rounded-xl text-sm font-black transition ${mode === 'register' ? 'bg-white text-slate-950' : 'text-slate-300 hover:text-white'}`}>ساخت حساب</button>
                  <button type="button" onClick={() => setMode('login')} className={`py-2.5 rounded-xl text-sm font-black transition ${mode === 'login' ? 'bg-white text-slate-950' : 'text-slate-300 hover:text-white'}`}>حساب دارم</button>
                </div>
                <form onSubmit={submitSignedOut} className="space-y-3">
                  {mode === 'register' && (
                    <label className="block">
                      <span className="text-xs font-bold text-slate-300">نام و نام خانوادگی</span>
                      <input value={name} onChange={e => setName(e.target.value)} required className="mt-1.5 w-full rounded-2xl bg-white/10 border border-white/10 px-4 py-3 outline-none focus:border-indigo-400" />
                    </label>
                  )}
                  <label className="block">
                    <span className="text-xs font-bold text-slate-300">ایمیل</span>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required dir="ltr" autoComplete="email" className="mt-1.5 w-full rounded-2xl bg-white/10 border border-white/10 px-4 py-3 outline-none focus:border-indigo-400 text-left" />
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold text-slate-300">رمز عبور {mode === 'register' && '(حداقل ۸ کاراکتر)'}</span>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={mode === 'register' ? 8 : undefined} dir="ltr" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} className="mt-1.5 w-full rounded-2xl bg-white/10 border border-white/10 px-4 py-3 outline-none focus:border-indigo-400 text-left" />
                  </label>
                  <button type="submit" disabled={!consent || busy} className="w-full py-3.5 rounded-2xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 font-black flex items-center justify-center gap-2">
                    {busy ? <Loader2 className="animate-spin" size={18} /> : mode === 'register' ? <UserPlus size={18} /> : <LogIn size={18} />}
                    {mode === 'register' ? 'ساخت حساب و پیوستن' : 'ورود و پیوستن'}
                  </button>
                  {!consent && <p className="text-[11px] text-slate-400 text-center">برای ادامه، موافقت با اشتراک نتایج را تأیید کنید.</p>}
                </form>
              </>
            )}
          </>
        )}
        {error && <p className="mt-4 text-sm font-bold text-rose-300">{error}</p>}
      </>
    );
  };

  const card = (
    <div className="w-full max-w-md bg-white/10 border border-white/10 rounded-3xl shadow-2xl p-6 md:p-8 backdrop-blur text-white">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30"><ShieldCheck size={26} /></div>
        <div>
          <h1 className="text-2xl font-black">iCompetency</h1>
          <p className="text-xs text-slate-300 font-bold">پیوستن به سازمان</p>
        </div>
      </div>
      {body()}
    </div>
  );

  return signedIn ? (
    <div className="h-full overflow-y-auto bg-slate-950 flex items-center justify-center p-4 md:p-6">{card}</div>
  ) : (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans" dir="rtl">{card}</div>
  );
};

export default JoinOrgScreen;
