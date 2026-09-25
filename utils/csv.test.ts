import { describe, expect, it } from 'vitest';
import { mapImportTable, normalizePersian, normalizeRole, parseCsv, toCsv } from './csv';

describe('parseCsv', () => {
  it('parses quoted fields, doubled quotes and CRLF', () => {
    expect(parseCsv('a,b\r\n"x, y","he said ""hi"""\r\n')).toEqual([['a', 'b'], ['x, y', 'he said "hi"']]);
  });
  it('strips the BOM and skips blank lines', () => {
    expect(parseCsv('﻿name,email\n\nعلی,a@b.ir\n')).toEqual([['name', 'email'], ['علی', 'a@b.ir']]);
  });
  it('auto-detects semicolon and tab delimiters', () => {
    expect(parseCsv('a;b\n1;2')).toEqual([['a', 'b'], ['1', '2']]);
    expect(parseCsv('a\tb\n1\t2')).toEqual([['a', 'b'], ['1', '2']]);
  });
  it('keeps newlines inside quoted fields', () => {
    expect(parseCsv('a\n"line1\nline2"')).toEqual([['a'], ['line1\nline2']]);
  });
});

describe('normalizePersian', () => {
  it('maps Arabic Yeh/Kaf and Persian digits', () => {
    expect(normalizePersian(' علي  كريمي ۱۲۳ ')).toBe('علی کریمی 123');
  });
});

describe('mapImportTable', () => {
  it('maps Persian headers and normalizes values', () => {
    const m = mapImportTable([
      ['نام و نام خانوادگی', 'ایمیل', 'واحد', 'سمت', 'کد پرسنلی', 'نقش'],
      ['علي رضايي', 'Ali@Example.com', 'فني / نرم‌افزار', 'كارشناس', '۱۰۰۱', 'مدیر واحد'],
    ]);
    expect(m.missing).toEqual([]);
    expect(m.rows[0]).toEqual({ fullName: 'علی رضایی', email: 'ali@example.com', unit: 'فنی / نرم‌افزار', jobTitle: 'کارشناس', employeeCode: '1001', orgRole: 'manager' });
  });
  it('combines separate first and last name columns', () => {
    const m = mapImportTable([['نام', 'نام خانوادگی', 'Email'], ['سارا', 'احمدی', 's@x.ir']]);
    expect(m.rows[0].fullName).toBe('سارا احمدی');
    expect(m.missing).toEqual([]);
  });
  it('treats "نام" as the full name when there is no last-name column', () => {
    const m = mapImportTable([['نام', 'ایمیل'], ['سارا احمدی', 's@x.ir']]);
    expect(m.rows[0].fullName).toBe('سارا احمدی');
  });
  it('maps English headers and reports missing required columns', () => {
    expect(mapImportTable([['Full Name', 'E-mail', 'Department']]).missing).toEqual([]);
    expect(mapImportTable([['Department', 'Title']]).missing).toEqual(['fullName', 'email']);
  });
  it('ignores unknown columns', () => {
    const m = mapImportTable([['name', 'email', 'شماره تماس'], ['a', 'a@b.ir', '0912']]);
    expect(m.columns[2].field).toBeNull();
    expect(m.rows[0]).toEqual({ fullName: 'a', email: 'a@b.ir' });
  });
});

describe('normalizeRole', () => {
  it('maps Persian and English aliases, defaults to member, passes unknowns through', () => {
    expect(normalizeRole('کارمند')).toBe('member');
    expect(normalizeRole('Manager')).toBe('manager');
    expect(normalizeRole('مدیر منابع انسانی')).toBe('admin');
    expect(normalizeRole('')).toBe('member');
    expect(normalizeRole('ceo')).toBe('ceo');
  });
});

describe('toCsv', () => {
  it('adds a BOM, quotes separators and neutralizes formulas', () => {
    const out = toCsv([['a,b', '=SUM(A1)', 'ok', null]]);
    expect(out.startsWith('﻿')).toBe(true);
    expect(out.slice(1)).toBe('"a,b",\'=SUM(A1),ok,');
  });
});
