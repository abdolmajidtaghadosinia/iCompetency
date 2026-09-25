// CSV import/export for the organization admin panel (docs/organizations.md).
//
// HR files come out of Excel in many shapes: UTF-8 with a BOM, comma, semicolon
// or tab separated, Persian or English headers, Arabic "ي/ك" instead of Persian
// "ی/ک", Persian digits in codes. Everything here normalizes those so an import
// matches existing units and people reliably. Parsing is client-side; the
// server re-validates every row.

import type { OrgImportRow, OrgRole } from '../types';

/** Arabic Yeh/Kaf -> Persian, Persian/Arabic digits -> ASCII, trim. */
export const normalizePersian = (s: string): string =>
  s
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/\s+/g, ' ')
    .trim();

const detectDelimiter = (text: string): string => {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  let inQuotes = false;
  const counts: Record<string, number> = { ',': 0, ';': 0, '\t': 0 };
  for (const ch of firstLine) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && ch in counts) counts[ch]++;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][1] > 0
    ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
    : ',';
};

/** RFC 4180-style parser (quoted fields, doubled quotes, CRLF), delimiter auto-detected. */
export const parseCsv = (input: string): string[][] => {
  const text = input.replace(/^﻿/, '');
  const delim = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      row.push(field); field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      rows.push(row); row = [];
    } else field += ch;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== ''));
};

// Spreadsheet apps execute cells starting with these as formulas (CSV injection).
const FORMULA_START = /^[=+\-@\t\r]/;

export const toCsv = (rows: (string | number | null | undefined)[][]): string => {
  const cell = (v: string | number | null | undefined) => {
    let s = v === null || v === undefined ? '' : String(v);
    if (FORMULA_START.test(s)) s = "'" + s;
    return /[",\n\r;\t]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // BOM so Excel opens Persian text as UTF-8.
  return '﻿' + rows.map(r => r.map(cell).join(',')).join('\r\n');
};

export const downloadCsv = (filename: string, rows: (string | number | null | undefined)[][]) => {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

type Field = keyof OrgImportRow | 'firstName' | 'lastName';

const HEADER_ALIASES: Record<Field, string[]> = {
  fullName: ['fullname', 'full name', 'name', 'نام و نام خانوادگی', 'نام کامل', 'نام‌ونام‌خانوادگی', 'نام و نام‌خانوادگی'],
  firstName: ['first name', 'firstname', 'نام'],
  lastName: ['last name', 'lastname', 'surname', 'نام خانوادگی', 'نام‌خانوادگی', 'فامیلی'],
  email: ['email', 'e-mail', 'mail', 'ایمیل', 'پست الکترونیک', 'پست الکترونیکی', 'رایانامه'],
  unit: ['unit', 'department', 'dept', 'team', 'واحد', 'واحد سازمانی', 'دپارتمان', 'بخش', 'تیم'],
  jobTitle: ['job title', 'jobtitle', 'title', 'position', 'role title', 'سمت', 'عنوان شغلی', 'شغل', 'پست سازمانی'],
  employeeCode: ['employee code', 'employeecode', 'employee id', 'personnel code', 'code', 'کد پرسنلی', 'شماره پرسنلی', 'کد کارمندی', 'کد'],
  orgRole: ['role', 'org role', 'access', 'نقش', 'سطح دسترسی', 'دسترسی'],
};

const ROLE_ALIASES: Record<OrgRole, string[]> = {
  member: ['member', 'employee', 'عضو', 'کارمند', 'کارشناس', 'پرسنل'],
  manager: ['manager', 'مدیر', 'مدیر واحد', 'سرپرست', 'مدیر میانی'],
  admin: ['admin', 'hr', 'ادمین', 'مدیر سازمان', 'مدیر منابع انسانی', 'منابع انسانی'],
};

const headerKey = (h: string) => normalizePersian(h).toLowerCase().replace(/[_\-]/g, ' ').replace(/‌/g, ' ').replace(/\s+/g, ' ').trim();

export const normalizeRole = (raw: string): OrgRole | string => {
  const v = headerKey(raw);
  if (v === '') return 'member';
  for (const [role, aliases] of Object.entries(ROLE_ALIASES) as [OrgRole, string[]][]) {
    if (aliases.some(a => headerKey(a) === v)) return role;
  }
  return raw.trim(); // unknown: the server rejects it with a per-row message
};

export interface MappedImport {
  rows: OrgImportRow[];
  /** Which recognized field each file column feeds (null = ignored). */
  columns: { header: string; field: Field | null }[];
  missing: ('fullName' | 'email')[];
}

/** Map a parsed CSV (first row = headers) onto import rows. */
export const mapImportTable = (table: string[][]): MappedImport => {
  if (table.length === 0) return { rows: [], columns: [], missing: ['fullName', 'email'] };
  const headers = table[0];
  const used = new Set<Field>();
  const columns = headers.map(h => {
    const k = headerKey(h);
    // "نام" alone is a first name only when a separate last-name column exists.
    const hasLast = headers.some(o => HEADER_ALIASES.lastName.some(a => headerKey(a) === headerKey(o)));
    const order: Field[] = hasLast
      ? ['firstName', 'lastName', 'fullName', 'email', 'unit', 'jobTitle', 'employeeCode', 'orgRole']
      : ['fullName', 'lastName', 'email', 'unit', 'jobTitle', 'employeeCode', 'orgRole'];
    for (const f of order) {
      if (!used.has(f) && HEADER_ALIASES[f].some(a => headerKey(a) === k)) { used.add(f); return { header: h, field: f }; }
    }
    if (!hasLast && !used.has('fullName') && HEADER_ALIASES.firstName.some(a => headerKey(a) === k)) {
      used.add('fullName');
      return { header: h, field: 'fullName' as Field };
    }
    return { header: h, field: null as Field | null };
  });

  const missing: ('fullName' | 'email')[] = [];
  if (!used.has('fullName') && !used.has('firstName')) missing.push('fullName');
  if (!used.has('email')) missing.push('email');

  const rows = table.slice(1).map(cells => {
    const get = (f: Field) => {
      const idx = columns.findIndex(c => c.field === f);
      return idx >= 0 ? normalizePersian(cells[idx] ?? '') : '';
    };
    const fullName = get('fullName') || [get('firstName'), get('lastName')].filter(Boolean).join(' ');
    const row: OrgImportRow = { fullName, email: get('email').toLowerCase() };
    const unit = get('unit');
    const jobTitle = get('jobTitle');
    const employeeCode = get('employeeCode');
    const role = get('orgRole');
    if (unit) row.unit = unit;
    if (jobTitle) row.jobTitle = jobTitle;
    if (employeeCode) row.employeeCode = employeeCode;
    if (role) row.orgRole = normalizeRole(role) as OrgRole;
    return row;
  });
  return { rows, columns, missing };
};

export const IMPORT_TEMPLATE: string[][] = [
  ['نام و نام خانوادگی', 'ایمیل', 'واحد', 'سمت', 'کد پرسنلی', 'نقش'],
  ['سارا احمدی', 'sara@example.com', 'فناوری اطلاعات / نرم‌افزار', 'برنامه‌نویس ارشد', '1001', 'کارمند'],
  ['رضا کریمی', 'reza@example.com', 'فروش', 'مدیر فروش', '1002', 'مدیر واحد'],
];
