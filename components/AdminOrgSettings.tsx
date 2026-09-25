// Organization settings (org admins): profile, the assessment program
// (which assessments are required and by when), and the audit log.

import React, { useEffect, useState } from 'react';
import { History, Save } from 'lucide-react';
import { toPersianNum } from '../utils';
import type { OrgAuditEntry } from '../types';
import { getOrgAudit, updateOrgSettings } from '../services/apiService';
import { Button, Card, Field, LoadingBlock, errorText, faDate, inputClass } from './AdminUi';
import type { WorkspaceProps } from './AdminOrgWorkspace';

const CATEGORY_LABELS: Record<string, string> = { cognitive: 'شناختی', methodology: 'روش‌شناختی', personality: 'شخصیتی' };

const ACTION_LABELS: Record<string, string> = {
  'org.create': 'ساخت سازمان',
  'org.update': 'ویرایش سازمان (مدیر سامانه)',
  'settings.update': 'ویرایش تنظیمات',
  'unit.create': 'ساخت واحد',
  'unit.update': 'ویرایش واحد',
  'unit.delete': 'حذف واحد',
  'member.create': 'افزودن فرد',
  'member.update': 'ویرایش فرد',
  'member.delete': 'حذف فرد',
  'member.import': 'ورود گروهی',
  'member.invite': 'لینک دعوت جدید',
  'member.join': 'پیوستن به سازمان',
  'member.leave': 'انصراف از سازمان',
};

const AdminOrgSettings: React.FC<WorkspaceProps> = ({ ws, reload, notify }) => {
  const org = ws.organization;
  const [profile, setProfile] = useState({ name: org.name, industry: org.industry ?? '', description: org.description ?? '' });
  const [required, setRequired] = useState<string[]>(org.requiredAssessments);
  const [dueDate, setDueDate] = useState(org.dueDate ?? '');
  const [saving, setSaving] = useState<'profile' | 'program' | null>(null);
  const [audit, setAudit] = useState<OrgAuditEntry[] | null>(null);

  useEffect(() => {
    getOrgAudit(org.id).then(r => setAudit(r.entries)).catch(() => setAudit([]));
  }, [org.id]);

  const save = async (which: 'profile' | 'program') => {
    setSaving(which);
    try {
      if (which === 'profile') {
        await updateOrgSettings(org.id, { name: profile.name.trim(), industry: profile.industry.trim() || null, description: profile.description.trim() || null });
      } else {
        await updateOrgSettings(org.id, { requiredAssessments: required, dueDate: dueDate || null });
      }
      notify('تنظیمات ذخیره شد.', 'success');
      reload();
      getOrgAudit(org.id).then(r => setAudit(r.entries)).catch(() => {});
    } catch (e) {
      notify(errorText(e), 'error');
    } finally {
      setSaving(null);
    }
  };

  const toggle = (view: string) => setRequired(r => (r.includes(view) ? r.filter(v => v !== view) : [...r, view]));
  const groups = ['cognitive', 'methodology', 'personality'].map(cat => ({ cat, items: ws.catalog.filter(c => c.category === cat) }));

  return (
    <div className="grid lg:grid-cols-5 gap-5">
      <div className="lg:col-span-3 space-y-5">
        <Card title="برنامه ارزیابی" subtitle="آزمون‌هایی که کارکنان باید انجام دهند. پیشرفت افراد و داشبورد بر همین اساس محاسبه می‌شود و به هر فرد در داشبوردش نمایش داده می‌شود.">
          <div className="flex gap-2 mb-4">
            <button onClick={() => setRequired(ws.catalog.map(c => c.view))} className="text-xs font-bold text-indigo-600 dark:text-indigo-300 hover:underline">انتخاب همه</button>
            <span className="text-slate-300">·</span>
            <button onClick={() => setRequired([])} className="text-xs font-bold text-slate-500 hover:underline">هیچ‌کدام</button>
            <span className="text-xs text-slate-400 mr-auto">{toPersianNum(required.length)} از {toPersianNum(ws.catalog.length)} آزمون</span>
          </div>
          <div className="space-y-4">
            {groups.map(g => (
              <div key={g.cat}>
                <h4 className="text-xs font-black text-slate-500 dark:text-slate-400 mb-2">{CATEGORY_LABELS[g.cat]}</h4>
                <div className="grid sm:grid-cols-2 gap-2">
                  {g.items.map(c => {
                    const on = required.includes(c.view);
                    return (
                      <label key={c.view} className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors ${on ? 'border-indigo-300 dark:border-indigo-500/50 bg-indigo-50/60 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-slate-700'}`}>
                        <input type="checkbox" checked={on} onChange={() => toggle(c.view)} className="rounded" />
                        <span className="font-mono text-[10px] text-slate-400 w-9" dir="ltr">{c.code}</span>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{c.title}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 grid sm:grid-cols-2 gap-4 items-end">
            <Field label="مهلت تکمیل" hint={dueDate ? `معادل ${faDate(dueDate)}` : 'بدون مهلت'}>
              <input className={inputClass} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} dir="ltr" />
            </Field>
            <div className="flex gap-2 justify-end">
              {dueDate && <Button variant="ghost" onClick={() => setDueDate('')}>حذف مهلت</Button>}
              <Button icon={<Save size={16} />} loading={saving === 'program'} disabled={required.length === 0} onClick={() => save('program')}>ذخیره برنامه</Button>
            </div>
          </div>
          {required.length === 0 && <p className="text-xs font-bold text-red-600 dark:text-red-400 mt-2">حداقل یک آزمون الزامی انتخاب کنید.</p>}
        </Card>

        <Card title="مشخصات سازمان">
          <div className="space-y-4">
            <Field label="نام سازمان" required><input className={inputClass} value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} /></Field>
            <Field label="صنعت"><input className={inputClass} value={profile.industry} onChange={e => setProfile(p => ({ ...p, industry: e.target.value }))} /></Field>
            <Field label="توضیحات"><textarea className={`${inputClass} min-h-[80px]`} value={profile.description} onChange={e => setProfile(p => ({ ...p, description: e.target.value }))} /></Field>
            <div className="flex justify-end">
              <Button icon={<Save size={16} />} loading={saving === 'profile'} disabled={!profile.name.trim()} onClick={() => save('profile')}>ذخیره مشخصات</Button>
            </div>
            <p className="text-[11px] text-slate-400">ظرفیت و وضعیت سازمان را فقط مدیر سامانه تغییر می‌دهد.</p>
          </div>
        </Card>
      </div>

      <Card title="گزارش فعالیت" subtitle="تغییرات اخیر در سازمان" className="lg:col-span-2 self-start">
        {!audit ? <LoadingBlock /> : audit.length === 0 ? <p className="text-sm text-slate-400">موردی ثبت نشده است.</p> : (
          <ul className="space-y-3 max-h-[36rem] overflow-y-auto">
            {audit.map(a => (
              <li key={a.id} className="flex gap-3 text-xs">
                <History size={14} className="text-slate-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="font-bold text-slate-700 dark:text-slate-200">
                    {ACTION_LABELS[a.action] ?? a.action}
                    {a.target && <span className="font-medium text-slate-500" dir="auto"> — {a.target}</span>}
                  </div>
                  {a.action === 'member.import' && a.details && (
                    <div className="text-slate-500">{toPersianNum(Number(a.details.created ?? 0))} افزوده، {toPersianNum(Number(a.details.updated ?? 0))} به‌روز، {toPersianNum(Number(a.details.errors ?? 0))} خطا</div>
                  )}
                  <div className="text-slate-400">{a.actorName ?? 'سیستم'} · {faDate(a.at, true)}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default AdminOrgSettings;
