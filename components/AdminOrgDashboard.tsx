// Workforce dashboard for one organization (optionally one unit subtree).
// Every number is computed server-side (org_build_dashboard in
// backend/logic/org.php) from the same scoring the members see themselves.
//
// Chart color follows the data's job (validated with the dataviz palette
// validator against this app's card surfaces):
//   ordinal tiers (funnel, competency bands)  one-hue blue ramp, 4 steps
//   magnitude (unit heatmap)                  one-hue blue ramp, 7 steps
//   above/below the norm (cognitive T)        diverging blue <-> red
// Every mark has a hover/focus tooltip with its exact value.

import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, AlertTriangle, CalendarClock, CheckCircle2, Clock, Info, RefreshCw, Target, UserCheck, UserPlus, Users,
} from 'lucide-react';
import { toPersianNum } from '../utils';
import type { OrgDashboardData } from '../types';
import { getOrgDashboard } from '../services/apiService';
import { Card, EmptyState, ErrorBlock, LoadingBlock, Meter, StatTile, Tip, errorText, faDate, faRelative, inputClass } from './AdminUi';
import type { WorkspaceProps } from './AdminOrgWorkspace';

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

// Ordinal ramp (light: steps 250/400/550/700 on white; dark: 500/400/300/150 on slate-800).
const ORDINAL = [
  'bg-[#86b6ef] dark:bg-[#256abf]',
  'bg-[#3987e5] dark:bg-[#3987e5]',
  'bg-[#1c5cab] dark:bg-[#6da7ec]',
  'bg-[#0d366b] dark:bg-[#b7d3f6]',
];

// Sequential heatmap ramp, low -> high. Dark mode steps lighter as values rise.
const HEAT = [
  'bg-[#cde2fb] text-slate-900 dark:bg-[#104281] dark:text-white',
  'bg-[#9ec5f4] text-slate-900 dark:bg-[#184f95] dark:text-white',
  'bg-[#6da7ec] text-slate-900 dark:bg-[#256abf] dark:text-white',
  'bg-[#3987e5] text-white dark:bg-[#3987e5] dark:text-white',
  'bg-[#256abf] text-white dark:bg-[#5598e7] dark:text-slate-900',
  'bg-[#184f95] text-white dark:bg-[#86b6ef] dark:text-slate-900',
  'bg-[#0d366b] text-white dark:bg-[#b7d3f6] dark:text-slate-900',
];
const heatIndex = (v: number) => Math.max(0, Math.min(6, Math.round((v - 25) / 10)));

const BUCKETS: { key: 'develop' | 'average' | 'good' | 'strong'; label: string }[] = [
  { key: 'develop', label: 'نیازمند توسعه (<۴۰)' },
  { key: 'average', label: 'متوسط (۴۰–۵۹)' },
  { key: 'good', label: 'خوب (۶۰–۷۴)' },
  { key: 'strong', label: 'قوی (≥۷۵)' },
];

const COMPETENCY_SHORT: Record<string, string> = {
  problemSolving: 'حل مسئله',
  decisionMaking: 'تصمیم‌گیری',
  strategicThinking: 'استراتژیک',
  learningAgility: 'یادگیری',
  attentionControl: 'تمرکز',
  stressResilience: 'زیر فشار',
  collaboration: 'همکاری',
};

const TRAITS: Record<string, string> = {
  Openness: 'گشودگی به تجربه',
  Conscientiousness: 'وظیفه‌شناسی',
  Extraversion: 'برون‌گرایی',
  Agreeableness: 'توافق‌پذیری',
  Neuroticism: 'ثبات هیجانی',
};

const AdminOrgDashboard: React.FC<WorkspaceProps> = ({ ws }) => {
  const orgId = ws.organization.id;
  const [unitId, setUnitId] = useState<number | null>(null);
  const [data, setData] = useState<OrgDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getOrgDashboard(orgId, unitId)
      .then(setData)
      .catch(e => setError(errorText(e)))
      .finally(() => setLoading(false));
  }, [orgId, unitId]);
  useEffect(load, [load]);

  if (error) return <ErrorBlock message={error} onRetry={load} />;
  if (!data) return <LoadingBlock />;

  const h = data.headcount;
  const pipeline = h.invited + h.active;
  const c = data.completion;

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="flex items-center gap-2 flex-1 max-w-md">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">واحد:</span>
          <select className={inputClass} value={unitId ?? ''} onChange={e => setUnitId(e.target.value ? Number(e.target.value) : null)}>
            <option value="">{ws.scopeUnitIds ? 'همه واحدهای در دسترس' : 'کل سازمان'}</option>
            {ws.units.map(u => <option key={u.id} value={u.id}>{'  '.repeat(u.depth)}{u.name}</option>)}
          </select>
        </label>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>به‌روزرسانی: {faDate(data.generatedAt.replace('T', ' ').slice(0, 19), true)}</span>
          <button onClick={load} disabled={loading} aria-label="به‌روزرسانی" className="p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 text-slate-500 disabled:opacity-50">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {h.total === 0 ? (
        <Card>
          <EmptyState
            icon={<Users size={24} />}
            title="هنوز کسی در این بخش نیست"
            text="از بخش «افراد» کارکنان را تک‌به‌تک یا با فایل CSV اضافه کنید. پس از پیوستن و انجام آزمون‌ها، این داشبورد پر می‌شود."
            action={<Link to={`/admin/orgs/${ws.organization.id}/people`} className="px-4 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700">رفتن به افراد</Link>}
          />
        </Card>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
            <StatTile label="نیروی تعریف‌شده" value={toPersianNum(pipeline)} icon={<Users size={18} />}
              hint={h.inactive + h.left > 0 ? `${toPersianNum(h.inactive)} غیرفعال · ${toPersianNum(h.left)} انصراف` : 'دعوت‌شده و فعال'} />
            <StatTile label="پیوسته به سامانه" value={`${toPersianNum(pct(h.active, pipeline))}٪`} icon={<UserCheck size={18} />}
              hint={`${toPersianNum(h.active)} از ${toPersianNum(pipeline)} نفر`} />
            <StatTile label="تکمیل آزمون‌های الزامی" value={`${toPersianNum(c.avgPct)}٪`} icon={<Target size={18} />}
              hint={`میانگین افراد فعال · ${toPersianNum(c.requiredCount)} آزمون الزامی`} />
            <StatTile label="شاخص کلی شایستگی" value={data.overallMean !== null ? toPersianNum(data.overallMean) : '—'} icon={<Activity size={18} />}
              hint="از ۱۰۰ · فقط افراد با شواهد کافی" />
            <StatTile
              label="مهلت ارزیابی"
              tone={c.overdue > 0 ? 'warn' : 'default'}
              icon={<CalendarClock size={18} />}
              value={c.dueDate ? (c.daysLeft !== null && c.daysLeft >= 0 ? `${toPersianNum(c.daysLeft)} روز` : 'گذشته') : '—'}
              hint={c.dueDate ? (c.overdue > 0 ? `${toPersianNum(c.overdue)} نفر هنوز کامل نکرده‌اند` : faDate(c.dueDate)) : 'تعیین نشده'}
            />
          </div>

          <div className="grid lg:grid-cols-5 gap-5">
            <Funnel data={data} className="lg:col-span-2" />
            <CompetencyDistribution data={data} className="lg:col-span-3" />
          </div>

          <UnitHeatmap data={data} />

          <div className="grid lg:grid-cols-2 gap-5">
            <AssessmentCompletion data={data} />
            <CognitiveProfile data={data} />
          </div>

          <div className="grid lg:grid-cols-3 gap-5">
            <BigFiveCard data={data} />
            <FollowUp data={data} orgId={orgId} />
            <RecentActivity data={data} orgId={orgId} />
          </div>

          <p className="flex items-start gap-2 text-[11px] text-slate-400 leading-relaxed">
            <Info size={14} className="shrink-0 mt-0.5" />
            این گزارش برای برنامه‌ریزی توسعه و آموزش است، نه قضاوت استخدامی درباره یک فرد. نمره‌های شایستگی فقط برای افرادی محاسبه می‌شود که شواهد کافی (حداقل نیمی از منابع هر شایستگی) دارند و نتایج فقط تا زمانی دیده می‌شوند که فرد عضو فعال سازمان است.
          </p>
        </>
      )}
    </div>
  );
};

const Legend: React.FC<{ items: { cls: string; label: string }[] }> = ({ items }) => (
  <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-4">
    {items.map(i => (
      <span key={i.label} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
        <span className={`w-3 h-3 rounded ${i.cls}`} /> {i.label}
      </span>
    ))}
  </div>
);

const Funnel: React.FC<{ data: OrgDashboardData; className?: string }> = ({ data, className }) => {
  const f = data.funnel;
  const stages = [
    { label: 'دعوت‌شده', value: f.invited },
    { label: 'پیوسته', value: f.joined },
    { label: 'شروع آزمون', value: f.started },
    { label: 'تکمیل الزامی‌ها', value: f.completed },
  ];
  return (
    <Card title="قیف مشارکت" subtitle="از دعوت تا تکمیل همه آزمون‌های الزامی" className={className}>
      <div className="space-y-3">
        {stages.map((s, i) => {
          const share = pct(s.value, f.invited);
          return (
            <div key={s.label}>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-600 dark:text-slate-300">{s.label}</span>
                <span className="text-slate-900 dark:text-white tabular-nums">{toPersianNum(s.value)} <span className="text-slate-400 font-medium">({toPersianNum(share)}٪)</span></span>
              </div>
              <div className="h-6 rounded-lg bg-slate-100 dark:bg-slate-700/60 overflow-hidden">
                <Tip block className="h-full" content={`${s.label}: ${toPersianNum(s.value)} نفر — ${toPersianNum(share)}٪ دعوت‌شدگان`}>
                  <span className={`block h-full rounded-lg ${ORDINAL[i]}`} style={{ width: `${share}%`, minWidth: s.value > 0 ? 4 : 0 }} />
                </Tip>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

const CompetencyDistribution: React.FC<{ data: OrgDashboardData; className?: string }> = ({ data, className }) => (
  <Card title="توزیع شایستگی‌ها" subtitle="سهم افراد در هر سطح؛ عدد کنار هر ردیف میانگین است." className={className}>
    <Legend items={BUCKETS.map((b, i) => ({ cls: ORDINAL[i], label: b.label }))} />
    <div className="space-y-3">
      {data.competencies.map(c => (
        <div key={c.key} className="grid grid-cols-[7rem_1fr_3.5rem] items-center gap-3">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate" title={c.title}>{c.title}</span>
          {c.n === 0 ? (
            <span className="text-[11px] text-slate-400">هنوز شواهد کافی نیست</span>
          ) : (
            <div className="flex h-5 gap-[2px]">
              {BUCKETS.map((b, i) => {
                const v = c.buckets[b.key];
                if (v === 0) return null;
                return (
                  <span key={b.key} className="h-full" style={{ width: `${(v / c.n) * 100}%` }}>
                    <Tip block className="h-full" content={`${c.title} — ${b.label}: ${toPersianNum(v)} نفر (${toPersianNum(pct(v, c.n))}٪)`}>
                      <span className={`block h-full w-full rounded ${ORDINAL[i]}`} />
                    </Tip>
                  </span>
                );
              })}
            </div>
          )}
          <span className="text-xs font-black text-slate-900 dark:text-white tabular-nums text-left">
            {c.mean !== null ? toPersianNum(c.mean) : '—'}
            <span className="block text-[10px] font-bold text-slate-400">n={toPersianNum(c.n)}</span>
          </span>
        </div>
      ))}
    </div>
  </Card>
);

const UnitHeatmap: React.FC<{ data: OrgDashboardData }> = ({ data }) => {
  const keys = data.competencies.map(c => c.key);
  if (data.units.length === 0) {
    return (
      <Card title="مقایسه واحدها">
        <EmptyState icon={<Users size={22} />} title="واحدی تعریف نشده" text="با تعریف واحدها (یا ستون «واحد» در فایل ورود گروهی) می‌توانید واحدها را با هم مقایسه کنید." />
      </Card>
    );
  }
  return (
    <Card title="مقایسه واحدها" subtitle="اعداد هر واحد شامل زیرواحدهای آن است. رنگ تیره‌تر = میانگین بالاتر؛ خانه خالی یعنی هنوز کسی در آن واحد شواهد کافی ندارد.">
      <div className="flex items-center gap-2 mb-4 text-[11px] font-bold text-slate-500 dark:text-slate-400" >
        <span>پایین</span>
        <div className="flex gap-[2px]" dir="ltr">
          {HEAT.map((cls, i) => <span key={i} className={`w-6 h-3 first:rounded-l last:rounded-r ${cls}`} />)}
        </div>
        <span>بالا</span>
      </div>
      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-xs min-w-[820px] border-separate border-spacing-[2px]">
          <thead>
            <tr className="text-slate-500 dark:text-slate-400">
              <th className="text-right font-bold p-2">واحد</th>
              <th className="font-bold p-2">نفرات</th>
              <th className="font-bold p-2">پیوسته</th>
              <th className="font-bold p-2 w-28">تکمیل</th>
              {keys.map(k => <th key={k} className="font-bold p-2">{COMPETENCY_SHORT[k] ?? k}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.units.map(u => (
              <tr key={u.id}>
                <td className="p-2 font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap" style={{ paddingRight: `${8 + u.depth * 14}px` }} title={u.path}>
                  {u.depth > 0 && <span className="text-slate-300 dark:text-slate-600 ml-1">└</span>}{u.name}
                </td>
                <td className="p-2 text-center tabular-nums">{toPersianNum(u.headcount)}</td>
                <td className="p-2 text-center tabular-nums">{toPersianNum(u.active)}</td>
                <td className="p-2">
                  <Tip block content={`میانگین تکمیل: ${toPersianNum(u.completionPct)}٪`}>
                    <div className="w-full">
                      <Meter value={u.completionPct} />
                      <div className="text-[10px] text-slate-400 mt-0.5 tabular-nums">{toPersianNum(u.completionPct)}٪</div>
                    </div>
                  </Tip>
                </td>
                {keys.map(k => {
                  const cell = u.competencies[k];
                  if (!cell || cell.mean === null) return <td key={k} className="p-2 text-center text-slate-300 dark:text-slate-600 bg-slate-50 dark:bg-slate-700/30 rounded-md">—</td>;
                  return (
                    <td key={k} className={`p-0 text-center rounded-md ${HEAT[heatIndex(cell.mean)]}`}>
                      <Tip block content={`${u.name} · ${COMPETENCY_SHORT[k] ?? k}: میانگین ${toPersianNum(cell.mean)} (n=${toPersianNum(cell.n)})`}>
                        <span className="block w-full py-2 font-black tabular-nums">{toPersianNum(cell.mean)}</span>
                      </Tip>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

const AssessmentCompletion: React.FC<{ data: OrgDashboardData }> = ({ data }) => {
  const rows = [...data.assessments].sort((a, b) => Number(b.required) - Number(a.required));
  return (
    <Card title="پیشرفت هر آزمون" subtitle="تعداد افراد فعالی که هر آزمون را انجام داده‌اند.">
      <div className="space-y-2.5">
        {rows.map(a => {
          const share = pct(a.done, a.of);
          return (
            <div key={a.view} className={`grid grid-cols-[1fr_7rem_4rem] items-center gap-3 ${a.required ? '' : 'opacity-60'}`}>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate">
                <span className="font-mono text-[10px] text-slate-400 ml-1.5" dir="ltr">{a.code}</span>{a.title}
                {!a.required && <span className="text-[10px] text-slate-400 mr-1">(اختیاری)</span>}
              </span>
              <Tip block content={`${a.title}: ${toPersianNum(a.done)} از ${toPersianNum(a.of)} نفر`}><Meter value={share} className="w-full" /></Tip>
              <span className="text-xs font-bold tabular-nums text-left text-slate-900 dark:text-white">{toPersianNum(a.done)}/{toPersianNum(a.of)}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

const CognitiveProfile: React.FC<{ data: OrgDashboardData }> = ({ data }) => (
  <Card title="نیمرخ شناختی" subtitle="میانگین T-Score افرادی که هر آزمون را داده‌اند؛ ۵۰ = میانگین هنجار (نرم‌ها تا کالیبراسیون با داده واقعی آزمایشی‌اند).">
    <Legend items={[{ cls: 'bg-[#2a78d6] dark:bg-[#3987e5]', label: 'بالاتر از میانگین' }, { cls: 'bg-[#e34948] dark:bg-[#e66767]', label: 'پایین‌تر از میانگین' }]} />
    <div className="space-y-2">
      {data.cognitive.map(t => (
        <div key={t.key} className="grid grid-cols-[8rem_1fr_3rem] items-center gap-3">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate" title={t.title}>{t.title}</span>
          {t.meanT === null ? (
            <span className="text-[11px] text-slate-400">بدون داده</span>
          ) : (
            <div className="relative h-4" dir="ltr">
              <div className="absolute inset-y-0 left-1/2 w-px bg-slate-300 dark:bg-slate-600" />
              {(() => {
                const delta = Math.max(-30, Math.min(30, t.meanT - 50));
                const w = (Math.abs(delta) / 30) * 50;
                const pos = delta >= 0;
                return (
                  <Tip block content={`${t.title}: T=${toPersianNum(t.meanT)} (n=${toPersianNum(t.n)})`} className="h-full">
                    <span
                      className={`absolute inset-y-0 ${pos ? 'bg-[#2a78d6] dark:bg-[#3987e5] rounded-r-md' : 'bg-[#e34948] dark:bg-[#e66767] rounded-l-md'}`}
                      style={pos ? { left: '50%', width: `${Math.max(w, 1)}%` } : { right: '50%', width: `${Math.max(w, 1)}%` }}
                    />
                  </Tip>
                );
              })()}
            </div>
          )}
          <span className="text-xs font-black tabular-nums text-left text-slate-900 dark:text-white">{t.meanT !== null ? toPersianNum(t.meanT) : ''}</span>
        </div>
      ))}
      <div className="grid grid-cols-[8rem_1fr_3rem] gap-3 text-[10px] text-slate-400 font-bold">
        <span />
        <div className="flex justify-between" dir="ltr"><span>{toPersianNum(20)}</span><span>{toPersianNum(50)}</span><span>{toPersianNum(80)}</span></div>
        <span />
      </div>
    </div>
  </Card>
);

const BigFiveCard: React.FC<{ data: OrgDashboardData }> = ({ data }) => (
  <Card title="نیمرخ شخصیتی تیم" subtitle={`میانگین پنج عامل (از ۱۰۰) · n=${toPersianNum(data.bigFive.n)}${data.bigFive.invalidExcluded ? ` · ${toPersianNum(data.bigFive.invalidExcluded)} پاسخ نامعتبر کنار گذاشته شد` : ''}`}>
    {data.bigFive.n === 0 ? (
      <p className="text-sm text-slate-400">هنوز کسی آزمون شخصیت را انجام نداده است.</p>
    ) : (
      <div className="space-y-3">
        {Object.entries(TRAITS).map(([k, label]) => {
          const v = data.bigFive.traits[k];
          return (
            <div key={k}>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-600 dark:text-slate-300">{label}</span>
                <span className="tabular-nums text-slate-900 dark:text-white">{v !== null && v !== undefined ? toPersianNum(v) : '—'}</span>
              </div>
              <Tip block content={`${label}: ${v !== null && v !== undefined ? toPersianNum(v) : '—'}`}><Meter value={v ?? 0} className="w-full" /></Tip>
            </div>
          );
        })}
      </div>
    )}
  </Card>
);

const FollowUp: React.FC<{ data: OrgDashboardData; orgId: number }> = ({ data, orgId }) => {
  const f = data.followUp;
  const item = (p: { id: number; fullName: string; unitPath: string | null; since: string | null }, icon: React.ReactNode) => (
    <li key={p.id}>
      <Link to={`/admin/orgs/${orgId}/people/${p.id}`} className="flex items-center gap-2 py-1.5 text-xs hover:text-indigo-600 dark:hover:text-indigo-400">
        {icon}
        <span className="font-bold text-slate-700 dark:text-slate-200 truncate">{p.fullName}</span>
        <span className="text-slate-400 truncate">{p.unitPath ?? ''}</span>
        <span className="mr-auto text-slate-400 shrink-0">{faRelative(p.since)}</span>
      </Link>
    </li>
  );
  return (
    <Card title="نیازمند پیگیری" subtitle="بیش از یک هفته بدون اقدام">
      {f.notJoinedCount + f.noProgressCount === 0 ? (
        <p className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-bold"><CheckCircle2 size={16} /> مورد عقب‌افتاده‌ای نیست.</p>
      ) : (
        <div className="space-y-4">
          {f.notJoinedCount > 0 && (
            <div>
              <h4 className="text-xs font-black text-amber-600 dark:text-amber-400 mb-1">دعوت را نپذیرفته‌اند ({toPersianNum(f.notJoinedCount)})</h4>
              <ul>{f.notJoined.map(p => item(p, <UserPlus size={14} className="text-amber-500 shrink-0" />))}</ul>
            </div>
          )}
          {f.noProgressCount > 0 && (
            <div>
              <h4 className="text-xs font-black text-amber-600 dark:text-amber-400 mb-1">پیوسته‌اند ولی آزمونی نداده‌اند ({toPersianNum(f.noProgressCount)})</h4>
              <ul>{f.noProgress.map(p => item(p, <AlertTriangle size={14} className="text-amber-500 shrink-0" />))}</ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

const RecentActivity: React.FC<{ data: OrgDashboardData; orgId: number }> = ({ data, orgId }) => (
  <Card title="فعالیت‌های اخیر">
    {data.recent.length === 0 ? (
      <p className="text-sm text-slate-400">هنوز آزمونی ثبت نشده است.</p>
    ) : (
      <ul className="space-y-1">
        {data.recent.map((r, i) => (
          <li key={i}>
            <Link to={`/admin/orgs/${orgId}/people/${r.memberId}`} className="flex items-center gap-2 py-1.5 text-xs hover:text-indigo-600 dark:hover:text-indigo-400">
              <Clock size={14} className="text-slate-400 shrink-0" />
              <span className="font-bold text-slate-700 dark:text-slate-200 truncate">{r.fullName}</span>
              <span className="text-slate-500 truncate">{r.title}</span>
              <span className="mr-auto text-slate-400 shrink-0">{faRelative(r.at)}</span>
            </Link>
          </li>
        ))}
      </ul>
    )}
  </Card>
);

export default AdminOrgDashboard;
