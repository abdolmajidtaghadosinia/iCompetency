// Platform admin home: every organization on the platform, with create /
// edit / suspend / delete. Organization admins never see this screen.

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Building2, ChevronLeft, Pencil, Plus, Trash2, Users, UserCheck } from 'lucide-react';
import { toPersianNum } from '../utils';
import type { OrgListItem } from '../types';
import {
  createOrganization, deleteOrganization, inviteLink, listAllOrganizations, updateOrganizationAsPlatform,
} from '../services/apiService';
import {
  Button, Card, EmptyState, ErrorBlock, Field, InviteLinkBox, LoadingBlock, Meter, Modal, StatTile, errorText, faDate, inputClass,
} from './AdminUi';
import type { Notify } from './AdminPanel';

type Totals = { organizations: number; users: number; members: number; assessments30d: number };

const AdminOrgList: React.FC<{ notify: Notify; onChanged: () => void }> = ({ notify, onChanged }) => {
  const navigate = useNavigate();
  const [data, setData] = useState<{ organizations: OrgListItem[]; totals: Totals } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<OrgListItem | null>(null);
  const [deleting, setDeleting] = useState<OrgListItem | null>(null);
  const [created, setCreated] = useState<{ orgId: number; name: string; invite: { email: string; token: string; expiresAt: string; emailed: boolean } | null } | null>(null);

  const load = useCallback(() => {
    setError(null);
    listAllOrganizations().then(setData).catch(e => setError(errorText(e)));
  }, []);
  useEffect(load, [load]);

  const refresh = () => { load(); onChanged(); };

  if (error) return <ErrorBlock message={error} onRetry={load} />;
  if (!data) return <LoadingBlock />;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-indigo-500 dark:text-indigo-400 mb-1">مدیریت سامانه</p>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">سازمان‌ها</h1>
        </div>
        <Button icon={<Plus size={18} />} onClick={() => setCreating(true)}>سازمان جدید</Button>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatTile label="سازمان‌ها" value={toPersianNum(data.totals.organizations)} icon={<Building2 size={18} />} />
        <StatTile label="کاربران ثبت‌نام‌شده" value={toPersianNum(data.totals.users)} icon={<Users size={18} />} />
        <StatTile label="اعضای فعال سازمانی" value={toPersianNum(data.totals.members)} icon={<UserCheck size={18} />} />
        <StatTile label="آزمون‌های ۳۰ روز اخیر" value={toPersianNum(data.totals.assessments30d)} icon={<Activity size={18} />} />
      </div>

      <Card title="فهرست سازمان‌ها" subtitle="ظرفیت = اعضای دعوت‌شده و فعال (مدیران سازمان ظرفیت مصرف نمی‌کنند).">
        {data.organizations.length === 0 ? (
          <EmptyState icon={<Building2 size={24} />} title="هنوز سازمانی تعریف نشده" text="اولین سازمان را بسازید و مدیر منابع انسانی آن را دعوت کنید." action={<Button icon={<Plus size={16} />} onClick={() => setCreating(true)}>سازمان جدید</Button>} />
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="text-right text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
                  <th className="font-bold p-2">سازمان</th>
                  <th className="font-bold p-2">وضعیت</th>
                  <th className="font-bold p-2">اعضای فعال</th>
                  <th className="font-bold p-2 w-44">ظرفیت</th>
                  <th className="font-bold p-2">مدیران</th>
                  <th className="font-bold p-2">مهلت ارزیابی</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {data.organizations.map(o => (
                  <tr key={o.id} className="border-b border-slate-50 dark:border-slate-700/60 hover:bg-slate-50/70 dark:hover:bg-slate-700/30">
                    <td className="p-2">
                      <button onClick={() => navigate(`/admin/orgs/${o.id}`)} className="text-right">
                        <div className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400">{o.name}</div>
                        <div className="text-[11px] text-slate-400">{o.industry || '—'} · ساخته‌شده {faDate(o.createdAt)}</div>
                      </button>
                    </td>
                    <td className="p-2">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${o.status === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'}`}>
                        {o.status === 'active' ? 'فعال' : 'معلق'}
                      </span>
                    </td>
                    <td className="p-2 tabular-nums">{toPersianNum(o.counts.active)} <span className="text-slate-400 text-xs">از {toPersianNum(o.counts.total)}</span></td>
                    <td className="p-2">
                      {o.seatLimit ? (
                        <div>
                          <div className="text-xs font-bold tabular-nums mb-1">{toPersianNum(o.counts.total)} از {toPersianNum(o.seatLimit)}</div>
                          <Meter value={(o.counts.total / o.seatLimit) * 100} label="ظرفیت مصرف‌شده" />
                        </div>
                      ) : <span className="text-xs text-slate-400">نامحدود</span>}
                    </td>
                    <td className="p-2 tabular-nums">{o.counts.admins > 0 ? toPersianNum(o.counts.admins) : <span className="text-xs font-bold text-amber-600 dark:text-amber-400">بدون مدیر فعال</span>}</td>
                    <td className="p-2 text-xs">{o.dueDate ? faDate(o.dueDate) : '—'}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => setEditing(o)} aria-label={`ویرایش ${o.name}`} className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"><Pencil size={16} /></button>
                        <button onClick={() => setDeleting(o)} aria-label={`حذف ${o.name}`} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"><Trash2 size={16} /></button>
                        <button onClick={() => navigate(`/admin/orgs/${o.id}`)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10">
                          ورود <ChevronLeft size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {creating && (
        <CreateOrgModal
          onClose={() => setCreating(false)}
          onCreated={(orgId, name, invite) => { setCreating(false); setCreated({ orgId, name, invite }); refresh(); notify('سازمان ساخته شد.', 'success'); }}
        />
      )}
      {created && (
        <Modal title={`سازمان «${created.name}» ساخته شد`} onClose={() => setCreated(null)} footer={
          <>
            <Button variant="secondary" onClick={() => setCreated(null)}>بستن</Button>
            <Button onClick={() => navigate(`/admin/orgs/${created.orgId}`)}>ورود به سازمان</Button>
          </>
        }>
          {created.invite ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                لینک دعوت مدیر سازمان (<span dir="ltr" className="font-mono">{created.invite.email}</span>) را برایش بفرستید. پس از ورود یا ثبت‌نام با این لینک، مدیریت سازمان در اختیار او قرار می‌گیرد.
              </p>
              <InviteLinkBox link={inviteLink(created.invite.token)} expiresAt={created.invite.expiresAt} emailed={created.invite.emailed} />
            </div>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-300">سازمان بدون مدیر ساخته شد. می‌توانید از بخش «افراد» یک مدیر سازمان اضافه کنید.</p>
          )}
        </Modal>
      )}
      {editing && <EditOrgModal org={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); notify('تغییرات ذخیره شد.', 'success'); }} />}
      {deleting && <DeleteOrgModal org={deleting} onClose={() => setDeleting(null)} onDeleted={() => { setDeleting(null); refresh(); notify('سازمان حذف شد.', 'success'); }} />}
    </div>
  );
};

const CreateOrgModal: React.FC<{ onClose: () => void; onCreated: (orgId: number, name: string, invite: { email: string; token: string; expiresAt: string; emailed: boolean } | null) => void }> = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({ name: '', industry: '', description: '', seatLimit: '', dueDate: '', adminName: '', adminEmail: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const r = await createOrganization({
        name: form.name.trim(),
        industry: form.industry.trim() || undefined,
        description: form.description.trim() || undefined,
        seatLimit: form.seatLimit ? Number(form.seatLimit) : null,
        dueDate: form.dueDate || null,
        adminEmail: form.adminEmail.trim() || undefined,
        adminName: form.adminName.trim() || undefined,
      });
      onCreated(r.organization.id, r.organization.name, r.adminInvite);
    } catch (err) {
      setError(errorText(err));
      setSaving(false);
    }
  };

  return (
    <Modal title="سازمان جدید" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="نام سازمان" required><input className={inputClass} value={form.name} onChange={set('name')} required maxLength={190} autoFocus /></Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="صنعت"><input className={inputClass} value={form.industry} onChange={set('industry')} maxLength={120} placeholder="مثلاً بانکداری" /></Field>
          <Field label="ظرفیت (تعداد نفرات)" hint="خالی = نامحدود"><input className={inputClass} type="number" min={1} value={form.seatLimit} onChange={set('seatLimit')} dir="ltr" /></Field>
        </div>
        <Field label="مهلت تکمیل ارزیابی" hint="اختیاری؛ بعداً در تنظیمات سازمان قابل تغییر است."><input className={inputClass} type="date" value={form.dueDate} onChange={set('dueDate')} dir="ltr" /></Field>
        <Field label="توضیحات"><textarea className={`${inputClass} min-h-[70px]`} value={form.description} onChange={set('description')} maxLength={1000} /></Field>
        <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-4 space-y-3">
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">مدیر سازمان (اختیاری) — یک لینک دعوت یک‌بارمصرف برای او ساخته می‌شود.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="نام مدیر"><input className={inputClass} value={form.adminName} onChange={set('adminName')} maxLength={190} /></Field>
            <Field label="ایمیل مدیر"><input className={inputClass} type="email" value={form.adminEmail} onChange={set('adminEmail')} dir="ltr" /></Field>
          </div>
        </div>
        {error && <p className="text-sm font-bold text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>انصراف</Button>
          <Button type="submit" loading={saving} disabled={!form.name.trim()}>ساخت سازمان</Button>
        </div>
      </form>
    </Modal>
  );
};

const EditOrgModal: React.FC<{ org: OrgListItem; onClose: () => void; onSaved: () => void }> = ({ org, onClose, onSaved }) => {
  const [form, setForm] = useState({ name: org.name, industry: org.industry ?? '', seatLimit: org.seatLimit ? String(org.seatLimit) : '', status: org.status });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateOrganizationAsPlatform(org.id, {
        name: form.name.trim(),
        industry: form.industry.trim() || null,
        seatLimit: form.seatLimit ? Number(form.seatLimit) : null,
        status: form.status,
      });
      onSaved();
    } catch (err) {
      setError(errorText(err));
      setSaving(false);
    }
  };

  return (
    <Modal title={`ویرایش ${org.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="نام سازمان" required><input className={inputClass} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="صنعت"><input className={inputClass} value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} /></Field>
          <Field label="ظرفیت" hint={`در حال استفاده: ${toPersianNum(org.counts.total)}`}><input className={inputClass} type="number" min={1} value={form.seatLimit} onChange={e => setForm(f => ({ ...f, seatLimit: e.target.value }))} dir="ltr" /></Field>
        </div>
        <Field label="وضعیت" hint="در حالت معلق، مدیران سازمان به پنل دسترسی ندارند و آزمون‌های الزامی برای کارکنان نمایش داده نمی‌شود.">
          <select className={inputClass} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as 'active' | 'suspended' }))}>
            <option value="active">فعال</option>
            <option value="suspended">معلق</option>
          </select>
        </Field>
        {error && <p className="text-sm font-bold text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>انصراف</Button>
          <Button type="submit" loading={saving}>ذخیره</Button>
        </div>
      </form>
    </Modal>
  );
};

const DeleteOrgModal: React.FC<{ org: OrgListItem; onClose: () => void; onDeleted: () => void }> = ({ org, onClose, onDeleted }) => {
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await deleteOrganization(org.id, confirm);
      onDeleted();
    } catch (err) {
      setError(errorText(err));
      setSaving(false);
    }
  };
  return (
    <Modal title="حذف سازمان" onClose={onClose} footer={
      <>
        <Button variant="secondary" onClick={onClose}>انصراف</Button>
        <Button variant="danger" icon={<Trash2 size={16} />} loading={saving} disabled={confirm !== org.name} onClick={submit}>حذف برای همیشه</Button>
      </>
    }>
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          واحدها، عضویت‌ها و گزارش فعالیت سازمان «{org.name}» حذف می‌شوند. حساب کاربری افراد و نتایج آزمون‌هایشان باقی می‌ماند. این کار قابل بازگشت نیست؛ اگر فقط می‌خواهید دسترسی را قطع کنید، سازمان را «معلق» کنید.
        </p>
        <Field label={`برای تأیید، نام سازمان را بنویسید: ${org.name}`}>
          <input className={inputClass} value={confirm} onChange={e => setConfirm(e.target.value)} />
        </Field>
        {error && <p className="text-sm font-bold text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </Modal>
  );
};

export default AdminOrgList;
