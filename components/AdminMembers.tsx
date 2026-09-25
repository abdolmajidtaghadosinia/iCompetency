// People table for one organization: search/filter/sort, add one person,
// bulk import (AdminImportDialog), CSV export, and per-row admin actions.
// Managers see the same table read-only, clipped to their unit subtree.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Download, FileUp, Link2, MoreHorizontal, Pencil, Power, Search, Trash2, UserPlus, Users,
} from 'lucide-react';
import { toPersianNum } from '../utils';
import type { OrgMemberStatus, OrgMemberSummary, OrgRole } from '../types';
import {
  createOrgMember, deleteOrgMember, inviteLink, listOrgMembers, reinviteOrgMember, updateOrgMember,
} from '../services/apiService';
import { downloadCsv } from '../utils/csv';
import {
  Button, Card, EmptyState, ErrorBlock, Field, InviteLinkBox, LoadingBlock, Meter, Modal, ROLE_LABELS, RoleBadge,
  STATUS_LABELS, StatusBadge, errorText, faDate, faRelative, inputClass,
} from './AdminUi';
import AdminImportDialog from './AdminImportDialog';
import type { WorkspaceProps } from './AdminOrgWorkspace';

const PAGE = 50;
type SortKey = 'name' | 'completion' | 'overall' | 'activity';

const AdminMembers: React.FC<WorkspaceProps> = ({ ws, reload, notify, canManage }) => {
  const navigate = useNavigate();
  const orgId = ws.organization.id;
  const [members, setMembers] = useState<OrgMemberSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [unit, setUnit] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [role, setRole] = useState<string>('');
  const [sort, setSort] = useState<SortKey>('name');
  const [page, setPage] = useState(0);
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editing, setEditing] = useState<OrgMemberSummary | null>(null);
  const [deleting, setDeleting] = useState<OrgMemberSummary | null>(null);
  const [invite, setInvite] = useState<{ name: string; token: string; expiresAt: string; emailed: boolean } | null>(null);
  const [menuFor, setMenuFor] = useState<number | null>(null);

  const load = useCallback(() => {
    setError(null);
    listOrgMembers(orgId).then(r => setMembers(r.members)).catch(e => setError(errorText(e)));
  }, [orgId]);
  useEffect(load, [load]);
  const refresh = () => { load(); reload(); };

  // Selecting a unit includes everything below it, like the dashboard.
  const unitScope = useMemo(() => {
    if (!unit) return null;
    if (unit === 'none') return 'none' as const;
    const root = Number(unit);
    const ids = new Set<number>([root]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const u of ws.units) if (u.parentId !== null && ids.has(u.parentId) && !ids.has(u.id)) { ids.add(u.id); grew = true; }
    }
    return ids;
  }, [unit, ws.units]);

  const filtered = useMemo(() => {
    if (!members) return [];
    const needle = q.trim().toLowerCase();
    const list = members.filter(m => {
      if (status && m.status !== status) return false;
      if (role && m.orgRole !== role) return false;
      if (unitScope === 'none' && m.unitId !== null) return false;
      if (unitScope instanceof Set && (m.unitId === null || !unitScope.has(m.unitId))) return false;
      if (needle && !`${m.fullName} ${m.email} ${m.employeeCode ?? ''} ${m.jobTitle ?? ''}`.toLowerCase().includes(needle)) return false;
      return true;
    });
    const byName = (a: OrgMemberSummary, b: OrgMemberSummary) => a.fullName.localeCompare(b.fullName, 'fa');
    const sorters: Record<SortKey, (a: OrgMemberSummary, b: OrgMemberSummary) => number> = {
      name: byName,
      completion: (a, b) => b.completionPct - a.completionPct || byName(a, b),
      overall: (a, b) => (b.overallScore ?? -1) - (a.overallScore ?? -1) || byName(a, b),
      activity: (a, b) => (b.lastActivityAt ?? '').localeCompare(a.lastActivityAt ?? '') || byName(a, b),
    };
    return list.sort(sorters[sort]);
  }, [members, q, status, role, unitScope, sort]);

  useEffect(() => setPage(0), [q, unit, status, role, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const visible = filtered.slice(page * PAGE, page * PAGE + PAGE);

  const exportCsv = () => {
    const compKeys = members?.find(m => Object.keys(m.competencies).length)?.competencies;
    const keys = compKeys ? Object.keys(compKeys) : [];
    downloadCsv(`${ws.organization.name}-افراد.csv`, [
      ['نام', 'ایمیل', 'کد پرسنلی', 'واحد', 'سمت', 'نقش', 'وضعیت', 'آزمون‌های الزامی انجام‌شده', 'درصد تکمیل', 'شاخص کلی', ...keys, 'تاریخ پیوستن', 'آخرین فعالیت'],
      ...filtered.map(m => [
        m.fullName, m.email, m.employeeCode, m.unitPath, m.jobTitle, ROLE_LABELS[m.orgRole], STATUS_LABELS[m.status],
        `${m.requiredDone}/${m.requiredTotal}`, m.completionPct, m.overallScore,
        ...keys.map(k => m.competencies[k] ?? ''),
        m.joinedAt, m.lastActivityAt,
      ]),
    ]);
  };

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setMenuFor(null);
    try {
      await fn();
      notify(ok, 'success');
      refresh();
    } catch (e) {
      notify(errorText(e), 'error');
    }
  };

  const newInvite = async (m: OrgMemberSummary) => {
    setMenuFor(null);
    try {
      const r = await reinviteOrgMember(orgId, m.id);
      setInvite({ name: m.fullName, ...r.invite });
      load();
    } catch (e) {
      notify(errorText(e), 'error');
    }
  };

  if (error) return <ErrorBlock message={error} onRetry={load} />;
  if (!members) return <LoadingBlock />;

  const counts = members.reduce<Record<string, number>>((acc, m) => { acc[m.status] = (acc[m.status] ?? 0) + 1; return acc; }, {});

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col xl:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className={`${inputClass} pr-9`} placeholder="جستجوی نام، ایمیل، کد پرسنلی یا سمت" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 xl:w-[36rem]">
            <select className={inputClass} value={unit} onChange={e => setUnit(e.target.value)} aria-label="واحد">
              <option value="">همه واحدها</option>
              {!ws.scopeUnitIds && <option value="none">بدون واحد</option>}
              {ws.units.map(u => <option key={u.id} value={u.id}>{'  '.repeat(u.depth)}{u.name}</option>)}
            </select>
            <select className={inputClass} value={status} onChange={e => setStatus(e.target.value)} aria-label="وضعیت">
              <option value="">همه وضعیت‌ها</option>
              {(Object.keys(STATUS_LABELS) as OrgMemberStatus[]).map(s => <option key={s} value={s}>{STATUS_LABELS[s]} ({toPersianNum(counts[s] ?? 0)})</option>)}
            </select>
            <select className={inputClass} value={role} onChange={e => setRole(e.target.value)} aria-label="نقش">
              <option value="">همه نقش‌ها</option>
              {(['member', 'manager', 'admin'] as OrgRole[]).map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            <select className={inputClass} value={sort} onChange={e => setSort(e.target.value as SortKey)} aria-label="مرتب‌سازی">
              <option value="name">مرتب: نام</option>
              <option value="completion">مرتب: پیشرفت</option>
              <option value="overall">مرتب: شاخص کلی</option>
              <option value="activity">مرتب: آخرین فعالیت</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-auto">{toPersianNum(filtered.length)} نفر</span>
          <Button variant="secondary" icon={<Download size={16} />} onClick={exportCsv} disabled={filtered.length === 0}>خروجی CSV</Button>
          {canManage && <Button variant="secondary" icon={<FileUp size={16} />} onClick={() => setImporting(true)}>ورود گروهی</Button>}
          {canManage && <Button icon={<UserPlus size={16} />} onClick={() => setAdding(true)}>افزودن فرد</Button>}
        </div>
      </Card>

      <Card className="!p-0 overflow-hidden">
        {members.length === 0 ? (
          <EmptyState
            icon={<Users size={24} />}
            title="هنوز کسی اضافه نشده"
            text="کارکنان را تک‌به‌تک اضافه کنید یا فهرست آن‌ها را با یک فایل CSV (خروجی اکسل) وارد کنید. برای هر نفر یک لینک دعوت ساخته می‌شود."
            action={canManage ? <div className="flex gap-2"><Button variant="secondary" icon={<FileUp size={16} />} onClick={() => setImporting(true)}>ورود گروهی</Button><Button icon={<UserPlus size={16} />} onClick={() => setAdding(true)}>افزودن فرد</Button></div> : undefined}
          />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Search size={24} />} title="نتیجه‌ای پیدا نشد" text="فیلترها یا عبارت جستجو را تغییر دهید." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-slate-50 dark:bg-slate-900/40">
                <tr className="text-right text-xs text-slate-500 dark:text-slate-400">
                  <th className="font-bold p-3">نام</th>
                  <th className="font-bold p-3">واحد / سمت</th>
                  <th className="font-bold p-3">نقش</th>
                  <th className="font-bold p-3">وضعیت</th>
                  <th className="font-bold p-3 w-40">آزمون‌های الزامی</th>
                  <th className="font-bold p-3">شاخص کلی</th>
                  <th className="font-bold p-3">آخرین فعالیت</th>
                  <th className="p-3 w-12" />
                </tr>
              </thead>
              <tbody>
                {visible.map(m => (
                  <tr key={m.id} className="border-t border-slate-100 dark:border-slate-700/60 hover:bg-slate-50/70 dark:hover:bg-slate-700/20">
                    <td className="p-3">
                      <button onClick={() => navigate(`/admin/orgs/${orgId}/people/${m.id}`)} className="text-right group">
                        <div className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{m.fullName}</div>
                        <div className="text-[11px] text-slate-400" dir="ltr">{m.email}</div>
                      </button>
                    </td>
                    <td className="p-3">
                      <div className="text-xs text-slate-700 dark:text-slate-200">{m.unitPath ?? <span className="text-slate-400">بدون واحد</span>}</div>
                      <div className="text-[11px] text-slate-400">{m.jobTitle ?? ''}{m.employeeCode ? ` · ${toPersianNum(m.employeeCode)}` : ''}</div>
                    </td>
                    <td className="p-3"><RoleBadge role={m.orgRole} /></td>
                    <td className="p-3">
                      <StatusBadge status={m.status} />
                      {m.status === 'invited' && m.inviteExpiresAt && new Date(m.inviteExpiresAt.replace(' ', 'T')) < new Date() && (
                        <div className="text-[10px] font-bold text-rose-500 mt-1">لینک منقضی شده</div>
                      )}
                    </td>
                    <td className="p-3">
                      {m.status === 'active' && m.orgRole !== 'admin' ? (
                        <div>
                          <div className="text-[11px] font-bold tabular-nums text-slate-600 dark:text-slate-300 mb-1">{toPersianNum(m.requiredDone)} از {toPersianNum(m.requiredTotal)}</div>
                          <Meter value={m.completionPct} label="پیشرفت آزمون‌های الزامی" />
                        </div>
                      ) : <span className="text-xs text-slate-400">—</span>}
                    </td>
                    <td className="p-3 font-black tabular-nums">{m.overallScore !== null ? toPersianNum(m.overallScore) : <span className="text-slate-400 font-normal">—</span>}</td>
                    <td className="p-3 text-xs text-slate-500">{m.status === 'active' ? faRelative(m.lastActivityAt) : m.status === 'invited' ? `دعوت ${faRelative(m.invitedAt)}` : '—'}</td>
                    <td className="p-3 relative">
                      <button onClick={() => setMenuFor(menuFor === m.id ? null : m.id)} aria-label={`عملیات ${m.fullName}`} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
                        <MoreHorizontal size={18} />
                      </button>
                      {menuFor === m.id && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={() => setMenuFor(null)} />
                          <div className="absolute left-3 top-12 z-30 w-52 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-xl p-1.5 text-sm">
                            <MenuItem icon={<ChevronLeft size={16} />} label="مشاهده گزارش" onClick={() => navigate(`/admin/orgs/${orgId}/people/${m.id}`)} />
                            {canManage && <MenuItem icon={<Pencil size={16} />} label="ویرایش" onClick={() => { setMenuFor(null); setEditing(m); }} />}
                            {canManage && m.status !== 'active' && <MenuItem icon={<Link2 size={16} />} label="لینک دعوت جدید" onClick={() => newInvite(m)} />}
                            {canManage && (m.status === 'inactive'
                              ? <MenuItem icon={<Power size={16} />} label="فعال‌سازی" onClick={() => act(() => updateOrgMember(orgId, m.id, { status: 'active' }), 'فعال شد.')} />
                              : (m.status === 'active' || m.status === 'invited') && <MenuItem icon={<Power size={16} />} label="غیرفعال کردن" onClick={() => act(() => updateOrgMember(orgId, m.id, { status: 'inactive' }), 'غیرفعال شد.')} />)}
                            {canManage && <MenuItem danger icon={<Trash2 size={16} />} label="حذف از سازمان" onClick={() => { setMenuFor(null); setDeleting(m); }} />}
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-center gap-3 p-3 border-t border-slate-100 dark:border-slate-700">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} aria-label="صفحه قبل" className="p-2 rounded-lg disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronRight size={18} /></button>
            <span className="text-xs font-bold tabular-nums">صفحه {toPersianNum(page + 1)} از {toPersianNum(pages)}</span>
            <button disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)} aria-label="صفحه بعد" className="p-2 rounded-lg disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronLeft size={18} /></button>
          </div>
        )}
      </Card>

      {adding && (
        <MemberFormModal
          ws={ws}
          onClose={() => setAdding(false)}
          onSaved={(res) => { setAdding(false); if (res) setInvite(res); notify('فرد اضافه شد.', 'success'); refresh(); }}
        />
      )}
      {editing && (
        <MemberFormModal ws={ws} member={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); notify('تغییرات ذخیره شد.', 'success'); refresh(); }} />
      )}
      {importing && <AdminImportDialog ws={ws} onClose={() => setImporting(false)} onImported={() => refresh()} />}
      {invite && (
        <Modal title={`لینک دعوت ${invite.name}`} onClose={() => setInvite(null)} footer={<Button onClick={() => setInvite(null)}>بستن</Button>}>
          <InviteLinkBox link={inviteLink(invite.token)} expiresAt={invite.expiresAt} emailed={invite.emailed} />
        </Modal>
      )}
      {deleting && (
        <Modal title="حذف از سازمان" onClose={() => setDeleting(null)} footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>انصراف</Button>
            <Button variant="danger" icon={<Trash2 size={16} />} onClick={() => { const m = deleting; setDeleting(null); act(() => deleteOrgMember(orgId, m.id), 'از سازمان حذف شد.'); }}>حذف</Button>
          </>
        }>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            «{deleting.fullName}» از سازمان حذف می‌شود و نتایجش دیگر در گزارش‌های سازمان دیده نمی‌شود. حساب کاربری و نتایج خود فرد باقی می‌ماند. اگر فقط می‌خواهید موقتاً کنار گذاشته شود، «غیرفعال کردن» را انتخاب کنید.
          </p>
        </Modal>
      )}
    </div>
  );
};

const MenuItem: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }> = ({ icon, label, onClick, danger }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-right font-bold transition-colors ${danger ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
    {icon} {label}
  </button>
);

const MemberFormModal: React.FC<{
  ws: WorkspaceProps['ws'];
  member?: OrgMemberSummary;
  onClose: () => void;
  onSaved: (invite?: { name: string; token: string; expiresAt: string; emailed: boolean }) => void;
}> = ({ ws, member, onClose, onSaved }) => {
  const [form, setForm] = useState({
    fullName: member?.fullName ?? '',
    email: member?.email ?? '',
    unitId: member?.unitId ? String(member.unitId) : '',
    jobTitle: member?.jobTitle ?? '',
    employeeCode: member?.employeeCode ?? '',
    orgRole: (member?.orgRole ?? 'member') as OrgRole,
    sendEmail: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      unitId: form.unitId ? Number(form.unitId) : null,
      jobTitle: form.jobTitle.trim() || null,
      employeeCode: form.employeeCode.trim() || null,
      orgRole: form.orgRole,
    };
    try {
      if (member) {
        await updateOrgMember(ws.organization.id, member.id, payload);
        onSaved();
      } else {
        const r = await createOrgMember(ws.organization.id, { ...payload, jobTitle: payload.jobTitle ?? undefined, employeeCode: payload.employeeCode ?? undefined, sendEmail: form.sendEmail });
        onSaved({ name: payload.fullName, ...r.invite });
      }
    } catch (err) {
      setError(errorText(err));
      setSaving(false);
    }
  };

  return (
    <Modal title={member ? `ویرایش ${member.fullName}` : 'افزودن فرد'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="نام و نام خانوادگی" required><input className={inputClass} value={form.fullName} onChange={set('fullName')} required autoFocus /></Field>
          <Field label="ایمیل" required hint={member?.status === 'active' ? 'ایمیل ثبت‌شده در سازمان؛ حساب کاربری فرد تغییر نمی‌کند.' : undefined}>
            <input className={inputClass} type="email" value={form.email} onChange={set('email')} required dir="ltr" />
          </Field>
        </div>
        <Field label="واحد">
          <select className={inputClass} value={form.unitId} onChange={set('unitId')}>
            <option value="">بدون واحد</option>
            {ws.units.map(u => <option key={u.id} value={u.id}>{'  '.repeat(u.depth)}{u.name}</option>)}
          </select>
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="سمت"><input className={inputClass} value={form.jobTitle} onChange={set('jobTitle')} /></Field>
          <Field label="کد پرسنلی"><input className={inputClass} value={form.employeeCode} onChange={set('employeeCode')} dir="ltr" /></Field>
        </div>
        <Field label="نقش" hint="مدیر واحد: مشاهده گزارش‌های واحد خود (فقط خواندنی). مدیر سازمان: مدیریت کامل؛ در آمار نیروی انسانی شمرده نمی‌شود.">
          <select className={inputClass} value={form.orgRole} onChange={set('orgRole')}>
            <option value="member">{ROLE_LABELS.member}</option>
            <option value="manager">{ROLE_LABELS.manager}</option>
            <option value="admin">{ROLE_LABELS.admin}</option>
          </select>
        </Field>
        {!member && (
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={form.sendEmail} onChange={set('sendEmail')} className="rounded" />
            ارسال ایمیل دعوت (در صورت پیکربندی ایمیل روی سرور)
          </label>
        )}
        {member && member.joinedAt && <p className="text-[11px] text-slate-400">پیوسته در {faDate(member.joinedAt)}</p>}
        {error && <p className="text-sm font-bold text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>انصراف</Button>
          <Button type="submit" loading={saving}>{member ? 'ذخیره' : 'افزودن و ساخت لینک دعوت'}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default AdminMembers;
