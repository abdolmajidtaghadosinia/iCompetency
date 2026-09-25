// Unit tree: add root units and sub-units, rename, move, delete. Deleting a
// unit moves its sub-units and people up one level (the server does this in
// one transaction), so nobody is silently orphaned. Managers see it read-only.

import React, { useMemo, useState } from 'react';
import { CornerDownLeft, FolderTree, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { toPersianNum } from '../utils';
import type { OrgUnit } from '../types';
import { createOrgUnit, deleteOrgUnit, updateOrgUnit } from '../services/apiService';
import { Button, Card, EmptyState, Field, Modal, errorText, inputClass } from './AdminUi';
import type { WorkspaceProps } from './AdminOrgWorkspace';

type Editing = { mode: 'create'; parentId: number | null } | { mode: 'edit'; unit: OrgUnit };

const AdminUnits: React.FC<WorkspaceProps> = ({ ws, reload, notify, canManage }) => {
  const [editing, setEditing] = useState<Editing | null>(null);
  const [deleting, setDeleting] = useState<OrgUnit | null>(null);
  const [busy, setBusy] = useState(false);

  // Depth-first order so children render under their parent.
  const ordered = useMemo(() => {
    const byParent = new Map<number | null, OrgUnit[]>();
    const ids = new Set(ws.units.map(u => u.id));
    for (const u of ws.units) {
      // A manager's scope root has a parent outside the scope: treat it as a root.
      const p = u.parentId !== null && ids.has(u.parentId) ? u.parentId : null;
      byParent.set(p, [...(byParent.get(p) ?? []), u]);
    }
    const out: { unit: OrgUnit; level: number }[] = [];
    const walk = (parent: number | null, level: number) => {
      for (const u of (byParent.get(parent) ?? []).sort((a, b) => a.name.localeCompare(b.name, 'fa'))) {
        out.push({ unit: u, level });
        walk(u.id, level + 1);
      }
    };
    walk(null, 0);
    return out;
  }, [ws.units]);

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await deleteOrgUnit(ws.organization.id, deleting.id);
      notify('واحد حذف شد.', 'success');
      setDeleting(null);
      reload();
    } catch (e) {
      notify(errorText(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      title="ساختار سازمانی"
      subtitle={canManage ? 'واحدها و زیرواحدها را تعریف کنید. آمار هر واحد در داشبورد شامل زیرواحدهای آن است.' : 'نمای فقط‌خواندنی واحدهای در دسترس شما.'}
      action={canManage && <Button icon={<Plus size={16} />} onClick={() => setEditing({ mode: 'create', parentId: null })}>واحد جدید</Button>}
    >
      {ordered.length === 0 ? (
        <EmptyState
          icon={<FolderTree size={24} />}
          title="هنوز واحدی تعریف نشده"
          text="واحدها را اینجا بسازید یا هنگام ورود گروهی افراد، ستون «واحد» را پر کنید تا خودکار ساخته شوند."
          action={canManage ? <Button icon={<Plus size={16} />} onClick={() => setEditing({ mode: 'create', parentId: null })}>واحد جدید</Button> : undefined}
        />
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700/60">
          {ordered.map(({ unit, level }) => (
            <li key={unit.id} className="flex items-center gap-2 py-2.5 group" style={{ paddingRight: `${level * 22}px` }}>
              {level > 0 && <CornerDownLeft size={14} className="text-slate-300 dark:text-slate-600 shrink-0 -scale-x-100" />}
              <FolderTree size={16} className="text-indigo-500 shrink-0" />
              <span className="font-bold text-sm text-slate-800 dark:text-slate-100">{unit.name}</span>
              {unit.code && <span className="text-[11px] text-slate-400 font-mono" dir="ltr">{unit.code}</span>}
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mr-2"><Users size={12} /> {toPersianNum(unit.memberCount)}</span>
              {canManage && (
                <div className="mr-auto flex items-center gap-1 opacity-70 group-hover:opacity-100 focus-within:opacity-100">
                  <button onClick={() => setEditing({ mode: 'create', parentId: unit.id })} className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-bold text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10">
                    <Plus size={14} /> زیرواحد
                  </button>
                  <button onClick={() => setEditing({ mode: 'edit', unit })} aria-label={`ویرایش ${unit.name}`} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"><Pencil size={15} /></button>
                  <button onClick={() => setDeleting(unit)} aria-label={`حذف ${unit.name}`} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"><Trash2 size={15} /></button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {editing && <UnitModal ws={ws} editing={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); notify('ذخیره شد.', 'success'); reload(); }} />}
      {deleting && (
        <Modal title={`حذف واحد «${deleting.name}»`} onClose={() => setDeleting(null)} footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>انصراف</Button>
            <Button variant="danger" icon={<Trash2 size={16} />} loading={busy} onClick={remove}>حذف واحد</Button>
          </>
        }>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            زیرواحدها و {toPersianNum(deleting.memberCount)} نفرِ این واحد به {deleting.parentId ? 'واحد بالاتر' : '«بدون واحد»'} منتقل می‌شوند. هیچ فردی از سازمان حذف نمی‌شود.
            {!deleting.parentId && ' مدیران این واحد به «کارمند» تبدیل می‌شوند، چون مدیر واحد بدون واحد به کل سازمان دسترسی دارد.'}
          </p>
        </Modal>
      )}
    </Card>
  );
};

const UnitModal: React.FC<{ ws: WorkspaceProps['ws']; editing: Editing; onClose: () => void; onSaved: () => void }> = ({ ws, editing, onClose, onSaved }) => {
  const unit = editing.mode === 'edit' ? editing.unit : null;
  const [name, setName] = useState(unit?.name ?? '');
  const [code, setCode] = useState(unit?.code ?? '');
  const [parentId, setParentId] = useState<string>(
    editing.mode === 'create' ? (editing.parentId ? String(editing.parentId) : '') : (unit?.parentId ? String(unit.parentId) : ''),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A unit can't move under itself or its own descendants (server checks too).
  const blocked = useMemo(() => {
    if (!unit) return new Set<number>();
    const out = new Set<number>([unit.id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const u of ws.units) if (u.parentId !== null && out.has(u.parentId) && !out.has(u.id)) { out.add(u.id); grew = true; }
    }
    return out;
  }, [unit, ws.units]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const pid = parentId ? Number(parentId) : null;
      if (unit) await updateOrgUnit(ws.organization.id, unit.id, { name: name.trim(), code: code.trim() || null, parentId: pid });
      else await createOrgUnit(ws.organization.id, { name: name.trim(), code: code.trim() || undefined, parentId: pid });
      onSaved();
    } catch (err) {
      setError(errorText(err));
      setSaving(false);
    }
  };

  return (
    <Modal title={unit ? `ویرایش ${unit.name}` : 'واحد جدید'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="نام واحد" required><input className={inputClass} value={name} onChange={e => setName(e.target.value)} required maxLength={190} autoFocus /></Field>
        <Field label="واحد بالاتر">
          <select className={inputClass} value={parentId} onChange={e => setParentId(e.target.value)}>
            <option value="">— سطح اول سازمان —</option>
            {ws.units.filter(u => !blocked.has(u.id)).map(u => <option key={u.id} value={u.id}>{'  '.repeat(u.depth)}{u.name}</option>)}
          </select>
        </Field>
        <Field label="کد واحد" hint="اختیاری، مثلاً کد مرکز هزینه"><input className={inputClass} value={code} onChange={e => setCode(e.target.value)} maxLength={60} dir="ltr" /></Field>
        {error && <p className="text-sm font-bold text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>انصراف</Button>
          <Button type="submit" loading={saving} disabled={!name.trim()}>ذخیره</Button>
        </div>
      </form>
    </Modal>
  );
};

export default AdminUnits;
