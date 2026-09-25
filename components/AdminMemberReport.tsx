// One member's report as the organization sees it. Results are only present
// while the membership is active (consent given, not withdrawn); the server
// returns report=null otherwise.

import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowRight, Briefcase, CheckCircle2, Circle, Clock, EyeOff, Info, Link2, ShieldAlert, ShieldCheck, UserPlus,
} from 'lucide-react';
import { toPersianNum } from '../utils';
import type { OrgMemberReport } from '../types';
import { getOrgMemberReport, inviteLink, reinviteOrgMember } from '../services/apiService';
import {
  Button, Card, ErrorBlock, InviteLinkBox, LoadingBlock, Meter, Modal, RoleBadge, StatusBadge, Tip, errorText, faDate, faRelative,
} from './AdminUi';
import type { WorkspaceProps } from './AdminOrgWorkspace';

const TRAITS: Record<string, string> = {
  Openness: 'گشودگی به تجربه',
  Conscientiousness: 'وظیفه‌شناسی',
  Extraversion: 'برون‌گرایی',
  Agreeableness: 'توافق‌پذیری',
  Neuroticism: 'ثبات هیجانی',
};

const METHOD_TITLES: Record<string, string> = { '5whys': 'ریشه‌یابی (۵ چرا)', swot: 'تحلیل SWOT', cynefin: 'چارچوب Cynefin', sjt: 'قضاوت موقعیتی' };

const LAYER_LABELS: Record<string, string> = { cognitive: 'شناختی', personality: 'شخصیتی', methodology: 'روش‌شناختی' };

const AdminMemberReport: React.FC<WorkspaceProps> = ({ ws, canManage, notify }) => {
  const { memberId } = useParams();
  const [data, setData] = useState<OrgMemberReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<{ token: string; expiresAt: string; emailed: boolean } | null>(null);
  const [openComp, setOpenComp] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    getOrgMemberReport(ws.organization.id, Number(memberId)).then(setData).catch(e => setError(errorText(e)));
  }, [ws.organization.id, memberId]);
  useEffect(load, [load]);

  const back = (
    <Link to={`/admin/orgs/${ws.organization.id}/people`} className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400">
      <ArrowRight size={14} /> بازگشت به فهرست افراد
    </Link>
  );

  if (error) return <div className="space-y-3">{back}<ErrorBlock message={error} onRetry={load} /></div>;
  if (!data) return <LoadingBlock />;

  const m = data.member;
  const r = data.report;

  const newInvite = async () => {
    try {
      const res = await reinviteOrgMember(ws.organization.id, m.id);
      setInvite(res.invite);
      load();
    } catch (e) {
      notify(errorText(e), 'error');
    }
  };

  return (
    <div className="space-y-5">
      {back}

      <Card>
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center text-xl font-black shrink-0">
            {m.fullName.trim().charAt(0) || '؟'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">{m.fullName}</h2>
              <StatusBadge status={m.status} />
              <RoleBadge role={m.orgRole} />
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap gap-x-4 gap-y-1">
              <span dir="ltr">{m.email}</span>
              {m.unitPath && <span>{m.unitPath}</span>}
              {m.jobTitle && <span>{m.jobTitle}</span>}
              {m.employeeCode && <span>کد پرسنلی {toPersianNum(m.employeeCode)}</span>}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap gap-x-4">
              {m.joinedAt && <span>پیوسته در {faDate(m.joinedAt)}</span>}
              {m.status === 'invited' && <span>دعوت‌شده {faRelative(m.invitedAt)}</span>}
              {m.lastActivityAt && <span>آخرین آزمون {faRelative(m.lastActivityAt)}</span>}
            </div>
          </div>
          {m.status === 'active' && m.orgRole !== 'admin' && (
            <div className="md:w-56">
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-500 dark:text-slate-400">آزمون‌های الزامی</span>
                <span className="tabular-nums text-slate-900 dark:text-white">{toPersianNum(m.requiredDone)} از {toPersianNum(m.requiredTotal)}</span>
              </div>
              <Meter value={m.completionPct} label="پیشرفت آزمون‌های الزامی" />
              {m.overallScore !== null && <div className="text-xs text-slate-500 mt-2">شاخص کلی شایستگی: <b className="text-slate-900 dark:text-white">{toPersianNum(m.overallScore)}</b></div>}
            </div>
          )}
          {canManage && m.status !== 'active' && (
            <Button variant="secondary" icon={<Link2 size={16} />} onClick={newInvite}>لینک دعوت جدید</Button>
          )}
        </div>
      </Card>

      {!r ? (
        <Card>
          <div className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
            {m.status === 'invited' ? <UserPlus size={20} className="text-amber-500 shrink-0" /> : <EyeOff size={20} className="text-slate-400 shrink-0" />}
            <p className="leading-relaxed">
              {m.status === 'invited' && 'این فرد هنوز دعوت را نپذیرفته است. پس از پیوستن و انجام آزمون‌ها، گزارش او اینجا نمایش داده می‌شود.'}
              {m.status === 'inactive' && 'عضویت این فرد غیرفعال است و نتایجش در گزارش‌های سازمان نمایش داده نمی‌شود.'}
              {m.status === 'left' && 'این فرد از سازمان انصراف داده و رضایت اشتراک نتایج را پس گرفته است؛ نتایج او دیگر برای سازمان قابل مشاهده نیست.'}
              {m.status === 'active' && m.orgRole === 'admin' && 'مدیران سازمان در آمار نیروی انسانی شمرده نمی‌شوند.'}
            </p>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid lg:grid-cols-3 gap-5">
            <Card title="آزمون‌ها" className="lg:col-span-1">
              <ul className="space-y-1.5">
                {r.assessments.map(a => (
                  <li key={a.view} className={`flex items-center gap-2 text-xs ${a.required ? '' : 'opacity-60'}`}>
                    {a.done ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> : <Circle size={16} className="text-slate-300 dark:text-slate-600 shrink-0" />}
                    <span className="font-mono text-[10px] text-slate-400 w-9 shrink-0" dir="ltr">{a.code}</span>
                    <span className={`font-bold ${a.done ? 'text-slate-800 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>{a.title}</span>
                    {!a.required && <span className="text-[10px] text-slate-400">(اختیاری)</span>}
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="شایستگی‌ها" subtitle="روی هر شایستگی بزنید تا منابع شواهد آن را ببینید." className="lg:col-span-2">
              <div className="space-y-3">
                {r.competencies.map(c => (
                  <div key={c.key}>
                    <button onClick={() => setOpenComp(openComp === c.key ? null : c.key)} className="w-full text-right">
                      <div className="flex items-center justify-between gap-2 text-xs font-bold mb-1">
                        <span className="text-slate-700 dark:text-slate-200">{c.title}</span>
                        <span className="tabular-nums">
                          {c.score === null ? <span className="text-slate-400">بدون شواهد</span>
                            : c.insufficient ? <span className="text-amber-600 dark:text-amber-400">{toPersianNum(c.score)} (شواهد ناکافی)</span>
                            : <span className="text-slate-900 dark:text-white">{toPersianNum(c.score)} · {c.label}</span>}
                        </span>
                      </div>
                      <Meter value={c.score ?? 0} className={c.insufficient ? 'opacity-40' : ''} label={c.title} />
                    </button>
                    {openComp === c.key && (
                      <div className="mt-2 rounded-2xl bg-slate-50 dark:bg-slate-900/40 p-3 space-y-1.5">
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">{c.description} — پوشش شواهد {toPersianNum(Math.round(c.coverage * 100))}٪</p>
                        {c.evidence.map((e, i) => (
                          <div key={i} className="flex items-center gap-2 text-[11px]">
                            <span className="w-16 shrink-0 text-slate-400">{LAYER_LABELS[e.layer]}</span>
                            <span className="flex-1 text-slate-600 dark:text-slate-300">{e.label}</span>
                            <span className="text-slate-400 tabular-nums">وزن {toPersianNum(Math.round(e.weight * 100))}٪</span>
                            <span className="w-10 text-left font-bold tabular-nums">{e.available && e.score !== null ? toPersianNum(e.score) : <span className="text-slate-300 dark:text-slate-600">—</span>}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-5">
            <Card title="آزمون‌های شناختی" subtitle="T-Score؛ ۵۰ = میانگین هنجار">
              <ul className="space-y-2">
                {r.cognitiveTests.map(t => (
                  <li key={t.key} className="flex items-center gap-2 text-xs">
                    <span className="flex-1 text-slate-600 dark:text-slate-300">{t.title}</span>
                    {t.tScore === null ? <span className="text-slate-400">انجام نشده</span> : (
                      <Tip content={t.label ?? ''}>
                        <span className={`font-black tabular-nums px-2 py-0.5 rounded-lg ${t.tScore >= 60 ? 'bg-blue-50 text-[#1c5cab] dark:bg-blue-500/10 dark:text-[#86b6ef]' : t.tScore < 40 ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}`}>
                          {toPersianNum(t.tScore)}
                        </span>
                      </Tip>
                    )}
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="نیمرخ شخصیتی" subtitle={r.bigFive ? undefined : 'آزمون شخصیت انجام نشده است.'}>
              {r.bigFive && (
                <>
                  {r.bigFive._validity && (
                    <div className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full mb-3 ${
                      r.bigFive._validity === 'valid' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                      : r.bigFive._validity === 'caution' ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'}`}>
                      {r.bigFive._validity === 'valid' ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}
                      کیفیت پاسخ‌دهی: {r.bigFive._validity === 'valid' ? 'معتبر' : r.bigFive._validity === 'caution' ? 'نیازمند احتیاط' : 'نامعتبر (در شایستگی‌ها لحاظ نمی‌شود)'}
                    </div>
                  )}
                  <div className="space-y-2.5">
                    {Object.entries(TRAITS).map(([k, label]) => {
                      const v = (r.bigFive as Record<string, unknown>)[k];
                      const n = typeof v === 'number' ? v : null;
                      return (
                        <div key={k}>
                          <div className="flex justify-between text-xs font-bold mb-1">
                            <span className="text-slate-600 dark:text-slate-300">{label}</span>
                            <span className="tabular-nums">{n !== null ? toPersianNum(n) : '—'}</span>
                          </div>
                          <Meter value={n ?? 0} label={label} />
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </Card>

            <Card title="تناسب شغلی (اکتشافی)" subtitle="تطبیق نیمرخ با الزامات خانواده‌های شغلی O*NET؛ برای گفت‌وگوی توسعه، نه تصمیم استخدام.">
              <ul className="space-y-2.5">
                {[...r.careerFit].filter(f => f.fitScore !== null).sort((a, b) => (b.fitScore ?? 0) - (a.fitScore ?? 0)).slice(0, 4).map(f => (
                  <li key={f.key}>
                    <div className="flex items-center justify-between text-xs font-bold mb-1">
                      <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200"><Briefcase size={13} className="text-slate-400" />{f.title}</span>
                      <span className="tabular-nums">{toPersianNum(f.fitScore ?? 0)}٪{f.insufficient && <span className="text-amber-600 dark:text-amber-400 font-medium"> (موقت)</span>}</span>
                    </div>
                    <Meter value={f.fitScore ?? 0} className={f.insufficient ? 'opacity-40' : ''} label={f.title} />
                  </li>
                ))}
                {r.careerFit.every(f => f.fitScore === null) && <li className="text-xs text-slate-400">هنوز داده کافی نیست.</li>}
              </ul>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <Card title="روش‌های حل مسئله">
              {Object.keys(r.methodology).length === 0 ? (
                <p className="text-xs text-slate-400">هنوز هیچ آزمون روش‌شناختی انجام نشده است.</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(r.methodology).map(([k, v]) => (
                    <div key={k}>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-slate-700 dark:text-slate-200">{METHOD_TITLES[k] ?? k}</span>
                        <span className="tabular-nums">{toPersianNum(v.score)}</span>
                      </div>
                      <Meter value={v.score} label={METHOD_TITLES[k] ?? k} />
                      {v.updatedAt && <div className="text-[10px] text-slate-400 mt-1">{faDate(v.updatedAt)}</div>}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="تاریخچه آزمون‌ها">
              {r.history.length === 0 ? <p className="text-xs text-slate-400">آزمونی ثبت نشده است.</p> : (
                <ul className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60">
                  {r.history.map((h, i) => (
                    <li key={i} className="flex items-center gap-2 py-2 text-xs">
                      <Clock size={13} className="text-slate-400 shrink-0" />
                      <span className="font-bold text-slate-700 dark:text-slate-200 flex-1">{h.title}</span>
                      <span className="text-slate-400">{faDate(h.at, true)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <p className="flex items-start gap-2 text-[11px] text-slate-400 leading-relaxed">
            <Info size={14} className="shrink-0 mt-0.5" />
            نتایج با رضایت فرد و فقط تا زمانی که عضو فعال سازمان است نمایش داده می‌شود. شایستگی‌ها با پوشش شواهد کمتر از ۵۰٪ «موقت» هستند و نباید مبنای تصمیم قرار گیرند.
          </p>
        </>
      )}

      {invite && (
        <Modal title={`لینک دعوت ${m.fullName}`} onClose={() => setInvite(null)} footer={<Button onClick={() => setInvite(null)}>بستن</Button>}>
          <InviteLinkBox link={inviteLink(invite.token)} expiresAt={invite.expiresAt} emailed={invite.emailed} />
        </Modal>
      )}
    </div>
  );
};

export default AdminMemberReport;
