// Bulk import: CSV file (or pasted text) -> column mapping preview -> server
// dry run with per-row results -> commit -> invite links (shown once, with a
// CSV download to hand them out). The server validates every row again.

import React, { useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, FileUp, Info, XCircle } from 'lucide-react';
import { toPersianNum } from '../utils';
import type { OrgImportResult } from '../types';
import { importOrgMembers, inviteLink } from '../services/apiService';
import { IMPORT_TEMPLATE, MappedImport, downloadCsv, mapImportTable, parseCsv } from '../utils/csv';
import { Button, Modal, errorText, faDate, inputClass } from './AdminUi';
import type { WorkspaceProps } from './AdminOrgWorkspace';

const FIELD_LABELS: Record<string, string> = {
  fullName: 'نام کامل', firstName: 'نام', lastName: 'نام خانوادگی', email: 'ایمیل', unit: 'واحد',
  jobTitle: 'سمت', employeeCode: 'کد پرسنلی', orgRole: 'نقش',
};

const STATUS_UI: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  created: { label: 'افزوده می‌شود', cls: 'text-emerald-700 dark:text-emerald-300', icon: <CheckCircle2 size={14} /> },
  updated: { label: 'به‌روز می‌شود', cls: 'text-blue-700 dark:text-blue-300', icon: <Info size={14} /> },
  skipped: { label: 'رد شد', cls: 'text-slate-500 dark:text-slate-400', icon: <Info size={14} /> },
  error: { label: 'خطا', cls: 'text-red-600 dark:text-red-400', icon: <XCircle size={14} /> },
};

const AdminImportDialog: React.FC<{ ws: WorkspaceProps['ws']; onClose: () => void; onImported: () => void }> = ({ ws, onClose, onImported }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [createUnits, setCreateUnits] = useState(true);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);
  const [preview, setPreview] = useState<OrgImportResult | null>(null);
  const [final, setFinal] = useState<OrgImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mapped: MappedImport | null = useMemo(() => (text.trim() ? mapImportTable(parseCsv(text)) : null), [text]);
  const seatsLeft = ws.seats.limit === null ? null : Math.max(0, ws.seats.limit - ws.seats.used);

  const onFile = (f: File | undefined) => {
    if (!f) return;
    setError(null);
    setPreview(null);
    const reader = new FileReader();
    reader.onload = () => { setText(String(reader.result ?? '')); setFileName(f.name); };
    reader.onerror = () => setError('خواندن فایل ناموفق بود.');
    reader.readAsText(f, 'utf-8');
  };

  const run = async (dryRun: boolean) => {
    if (!mapped) return;
    setBusy(true);
    setError(null);
    try {
      const r = await importOrgMembers(ws.organization.id, { rows: mapped.rows, dryRun, createUnits, updateExisting, sendEmail });
      if (dryRun) setPreview(r);
      else { setFinal(r); onImported(); }
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const downloadLinks = (r: OrgImportResult) => {
    const byEmail = new Map(mapped?.rows.map(row => [row.email, row]) ?? []);
    downloadCsv(`${ws.organization.name}-لینک-دعوت.csv`, [
      ['نام', 'ایمیل', 'واحد', 'لینک دعوت', 'اعتبار تا'],
      ...r.rows.filter(x => x.status === 'created' && x.inviteToken).map(x => [
        x.fullName, x.email, byEmail.get(x.email ?? '')?.unit ?? '', inviteLink(x.inviteToken as string), x.expiresAt ? faDate(x.expiresAt) : '',
      ]),
    ]);
  };

  // --- Final result -----------------------------------------------------------
  if (final) {
    const created = final.rows.filter(r => r.status === 'created');
    return (
      <Modal title="ورود گروهی انجام شد" onClose={onClose} wide footer={
        <>
          <Button variant="secondary" onClick={onClose}>بستن</Button>
          {created.length > 0 && <Button icon={<Download size={16} />} onClick={() => downloadLinks(final)}>دانلود لینک‌های دعوت (CSV)</Button>}
        </>
      }>
        <Summary result={final} />
        {created.length > 0 && (
          <div className="mt-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 p-3 text-xs text-amber-800 dark:text-amber-200 leading-relaxed flex gap-2">
            <AlertTriangle size={16} className="shrink-0" />
            لینک‌های دعوت فقط همین حالا قابل مشاهده‌اند. فایل لینک‌ها را دانلود کنید و از طریق ایمیل یا پیام‌رسان سازمانی برای هر نفر بفرستید. برای کسی که لینکش گم شد، از منوی همان فرد «لینک دعوت جدید» بسازید.
          </div>
        )}
        <ResultTable result={final} />
      </Modal>
    );
  }

  return (
    <Modal title="ورود گروهی افراد" onClose={onClose} wide>
      <div className="space-y-5">
        {/* Step 1: file */}
        <section>
          <h4 className="text-sm font-black text-slate-800 dark:text-white mb-2">۱. فایل CSV را انتخاب کنید</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
            در اکسل «Save As → CSV UTF-8» را انتخاب کنید. ستون‌های «نام و نام خانوادگی» و «ایمیل» الزامی‌اند؛ «واحد»، «سمت»، «کد پرسنلی» و «نقش» اختیاری‌اند.
            برای واحدهای تودرتو از «/» استفاده کنید، مثلاً «فناوری اطلاعات / نرم‌افزار». سرستون‌های انگلیسی هم پذیرفته می‌شوند.
          </p>
          <div className="flex flex-wrap gap-2">
            <input ref={fileRef} type="file" accept=".csv,.txt,text/csv" className="hidden" onChange={e => onFile(e.target.files?.[0])} />
            <Button variant="secondary" icon={<FileUp size={16} />} onClick={() => fileRef.current?.click()}>{fileName ? `فایل: ${fileName}` : 'انتخاب فایل'}</Button>
            <Button variant="ghost" icon={<FileSpreadsheet size={16} />} onClick={() => downloadCsv('نمونه-ورود-افراد.csv', IMPORT_TEMPLATE)}>دانلود فایل نمونه</Button>
          </div>
          <details className="mt-3">
            <summary className="text-xs font-bold text-slate-500 cursor-pointer">یا متن را اینجا بچسبانید</summary>
            <textarea className={`${inputClass} mt-2 min-h-[110px] font-mono text-xs`} dir="auto" value={text} onChange={e => { setText(e.target.value); setFileName(null); setPreview(null); }} placeholder={'نام و نام خانوادگی,ایمیل,واحد\nسارا احمدی,sara@example.com,فروش'} />
          </details>
        </section>

        {/* Step 2: mapping */}
        {mapped && (
          <section>
            <h4 className="text-sm font-black text-slate-800 dark:text-white mb-2">۲. ستون‌های شناسایی‌شده ({toPersianNum(mapped.rows.length)} ردیف)</h4>
            <div className="flex flex-wrap gap-2 mb-3">
              {mapped.columns.map((c, i) => (
                <span key={i} className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${c.field ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 line-through'}`}>
                  {c.header || '(بی‌نام)'}{c.field ? ` ← ${FIELD_LABELS[c.field]}` : ''}
                </span>
              ))}
            </div>
            {mapped.missing.length > 0 ? (
              <p className="text-sm font-bold text-red-600 dark:text-red-400">ستون الزامی پیدا نشد: {mapped.missing.map(m => FIELD_LABELS[m]).join('، ')}</p>
            ) : (
              <div className="grid sm:grid-cols-3 gap-3">
                <Toggle checked={createUnits} onChange={v => { setCreateUnits(v); setPreview(null); }} label="ساخت خودکار واحدهای جدید" hint="واحدهایی که هنوز تعریف نشده‌اند ساخته می‌شوند." />
                <Toggle checked={updateExisting} onChange={v => { setUpdateExisting(v); setPreview(null); }} label="به‌روزرسانی افراد موجود" hint="برای ایمیل‌های تکراری، نام/واحد/سمت/نقش به‌روز می‌شود." />
                <Toggle checked={sendEmail} onChange={v => { setSendEmail(v); setPreview(null); }} label="ارسال ایمیل دعوت" hint="فقط اگر ایمیل روی سرور پیکربندی شده باشد." />
              </div>
            )}
            {seatsLeft !== null && <p className="text-[11px] text-slate-500 mt-3">ظرفیت باقی‌مانده سازمان: {toPersianNum(seatsLeft)} نفر</p>}
          </section>
        )}

        {/* Step 3: dry run */}
        {preview && (
          <section>
            <h4 className="text-sm font-black text-slate-800 dark:text-white mb-2">۳. نتیجه بررسی (هنوز چیزی ثبت نشده)</h4>
            <Summary result={preview} />
            <ResultTable result={preview} />
          </section>
        )}

        {error && <p className="text-sm font-bold text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex flex-wrap gap-3 justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button variant="secondary" onClick={onClose}>انصراف</Button>
          <Button variant="secondary" loading={busy && !preview} disabled={!mapped || mapped.missing.length > 0 || mapped.rows.length === 0} onClick={() => run(true)}>بررسی بدون ثبت</Button>
          <Button loading={busy && !!preview} disabled={!preview || (preview.summary.created + preview.summary.updated) === 0} onClick={() => run(false)}>
            ثبت نهایی {preview ? `(${toPersianNum(preview.summary.created + preview.summary.updated)} نفر)` : ''}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string; hint: string }> = ({ checked, onChange, label, hint }) => (
  <label className={`flex gap-2 p-3 rounded-2xl border cursor-pointer transition-colors ${checked ? 'border-indigo-300 dark:border-indigo-500/50 bg-indigo-50/60 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-slate-700'}`}>
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="mt-0.5 rounded" />
    <span>
      <span className="block text-xs font-bold text-slate-800 dark:text-white">{label}</span>
      <span className="block text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">{hint}</span>
    </span>
  </label>
);

const Summary: React.FC<{ result: OrgImportResult }> = ({ result }) => {
  const s = result.summary;
  const past = !result.dryRun;
  const items = [
    { label: past ? 'افزوده شد' : 'افزوده می‌شود', value: s.created, cls: 'text-emerald-600 dark:text-emerald-400' },
    { label: past ? 'به‌روز شد' : 'به‌روز می‌شود', value: s.updated, cls: 'text-blue-600 dark:text-blue-400' },
    { label: 'رد شد (تکراری)', value: s.skipped, cls: 'text-slate-500' },
    { label: 'خطا', value: s.errors, cls: 'text-red-600 dark:text-red-400' },
  ];
  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {items.map(i => (
          <div key={i.label} className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-3 text-center">
            <div className={`text-xl font-black tabular-nums ${i.cls}`}>{toPersianNum(i.value)}</div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{i.label}</div>
          </div>
        ))}
      </div>
      {s.newUnits.length > 0 && (
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-3">
          <b>{past ? 'واحدهای ساخته‌شده' : 'واحدهای جدید'}:</b> {s.newUnits.join('، ')}
        </p>
      )}
    </div>
  );
};

const ResultTable: React.FC<{ result: OrgImportResult }> = ({ result }) => {
  // Problems first, so an admin fixing the file sees what to change.
  const rows = [...result.rows].sort((a, b) => Number(b.status === 'error') - Number(a.status === 'error'));
  return (
    <div className="mt-4 max-h-72 overflow-y-auto rounded-2xl border border-slate-100 dark:border-slate-700">
      <table className="w-full text-xs">
        <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
          <tr className="text-right text-slate-500">
            <th className="p-2 font-bold w-14">ردیف</th>
            <th className="p-2 font-bold">نام</th>
            <th className="p-2 font-bold">ایمیل</th>
            <th className="p-2 font-bold">نتیجه</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const ui = STATUS_UI[r.status];
            return (
              <tr key={r.row} className="border-t border-slate-100 dark:border-slate-700/60">
                <td className="p-2 tabular-nums text-slate-400">{toPersianNum(r.row)}</td>
                <td className="p-2 font-bold text-slate-700 dark:text-slate-200">{r.fullName || '—'}</td>
                <td className="p-2 text-slate-500" dir="ltr">{r.email || '—'}</td>
                <td className={`p-2 font-bold ${ui.cls}`}>
                  <span className="inline-flex items-center gap-1">{ui.icon} {result.dryRun ? ui.label : ({ created: 'افزوده شد', updated: 'به‌روز شد', skipped: 'رد شد', error: 'خطا' } as Record<string, string>)[r.status]}</span>
                  {r.message && <span className="block font-medium text-slate-500 dark:text-slate-400 mt-0.5">{r.message}</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default AdminImportDialog;
