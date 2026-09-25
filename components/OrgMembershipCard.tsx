// "Assigned by your organization" card on the member's dashboard: required
// assessments with progress, the due date, the next one to take, and a way to
// leave (withdraw consent). Admins/managers also get a link to the org panel.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, CalendarClock, CheckCircle2, Circle, LogOut, Play, Settings2 } from 'lucide-react';
import { toPersianNum } from '../utils';
import { AppView, OrgMembership, UserProfile } from '../types';
import { ASSESSMENTS, isAssessmentDone } from '../utils/assessmentInventory';
import { leaveOrganization } from '../services/apiService';
import { Button, Meter, Modal, faDate, parseServerDate } from './AdminUi';

interface Props {
  user: UserProfile;
  onNavigate?: (view: AppView) => void;
  onProfileUpdate?: (profile: UserProfile) => void;
}

const OrgMembershipCard: React.FC<Props> = ({ user, onNavigate, onProfileUpdate }) => {
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState<OrgMembership | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const memberships = user.organizations ?? [];
  if (memberships.length === 0) return null;

  const leave = async () => {
    if (!leaving) return;
    setBusy(true);
    setError(null);
    try {
      const r = await leaveOrganization(leaving.orgId);
      onProfileUpdate?.(r.profile);
      setLeaving(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خروج ناموفق بود.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 mb-6 animate-fade-in-up">
      {memberships.map(m => {
        const required = ASSESSMENTS.filter(a => m.requiredAssessments.includes(a.view));
        const done = required.filter(a => isAssessmentDone(a, user));
        const next = required.find(a => !isAssessmentDone(a, user));
        const pct = required.length ? Math.round((done.length / required.length) * 100) : 100;
        const due = parseServerDate(m.dueDate);
        const daysLeft = due ? Math.floor((due.getTime() + 86399000 - Date.now()) / 86400000) : null;
        const isOperator = m.orgRole === 'admin' || m.orgRole === 'manager';

        return (
          <section key={m.memberId} className="bg-white dark:bg-slate-800 rounded-3xl border border-indigo-100 dark:border-indigo-500/30 shadow-soft dark:shadow-none p-5 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0"><Building2 size={24} /></div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-indigo-500 dark:text-indigo-400">ارزیابی سازمانی</div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-white truncate">{m.orgName}</h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{[m.unitPath, m.jobTitle].filter(Boolean).join(' · ') || 'عضو سازمان'}</div>
                </div>
              </div>
              {m.orgRole !== 'admin' && (
                <div className="md:w-64">
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-500 dark:text-slate-400">آزمون‌های الزامی</span>
                    <span className="tabular-nums text-slate-900 dark:text-white">{toPersianNum(done.length)} از {toPersianNum(required.length)}</span>
                  </div>
                  <Meter value={pct} label="پیشرفت آزمون‌های الزامی سازمان" />
                  {due && (
                    <div className={`flex items-center gap-1.5 text-[11px] font-bold mt-2 ${daysLeft !== null && daysLeft < 0 && pct < 100 ? 'text-rose-600 dark:text-rose-400' : daysLeft !== null && daysLeft <= 7 && pct < 100 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
                      <CalendarClock size={13} />
                      مهلت: {faDate(m.dueDate)}
                      {pct < 100 && daysLeft !== null && (daysLeft >= 0 ? ` (${toPersianNum(daysLeft)} روز مانده)` : ' (گذشته)')}
                    </div>
                  )}
                </div>
              )}
            </div>

            {m.orgRole !== 'admin' && required.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4">
                {required.map(a => {
                  const ok = isAssessmentDone(a, user);
                  return (
                    <button
                      key={a.view}
                      onClick={() => !ok && onNavigate?.(a.view)}
                      disabled={ok}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-colors ${ok
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 cursor-default'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-500/50'}`}
                    >
                      {ok ? <CheckCircle2 size={13} /> : <Circle size={13} />} {a.title}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-4">
              {next && m.orgRole !== 'admin' && (
                <Button icon={<Play size={16} fill="currentColor" />} onClick={() => onNavigate?.(next.view)}>آزمون بعدی: {next.title}</Button>
              )}
              {!next && m.orgRole !== 'admin' && required.length > 0 && (
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400"><CheckCircle2 size={16} /> همه آزمون‌های الزامی را انجام داده‌اید.</span>
              )}
              {isOperator && (
                <Button variant="secondary" icon={<Settings2 size={16} />} onClick={() => navigate(`/admin/orgs/${m.orgId}`)}>پنل سازمان</Button>
              )}
              <button onClick={() => setLeaving(m)} className="mr-auto inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-rose-600 dark:hover:text-rose-400">
                <LogOut size={13} /> خروج از سازمان
              </button>
            </div>
          </section>
        );
      })}

      {leaving && (
        <Modal title={`خروج از «${leaving.orgName}»`} onClose={() => setLeaving(null)} footer={
          <>
            <Button variant="secondary" onClick={() => setLeaving(null)}>انصراف</Button>
            <Button variant="danger" icon={<LogOut size={16} />} loading={busy} onClick={leave}>خروج از سازمان</Button>
          </>
        }>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            با خروج، رضایت اشتراک نتایج را پس می‌گیرید و سازمان دیگر نتایج شما را نمی‌بیند. حساب و نتایج خودتان باقی می‌ماند. برای پیوستن دوباره به لینک دعوت جدید از سازمان نیاز دارید.
          </p>
          {error && <p className="text-sm font-bold text-red-600 dark:text-red-400 mt-3">{error}</p>}
        </Modal>
      )}
    </div>
  );
};

export default OrgMembershipCard;
