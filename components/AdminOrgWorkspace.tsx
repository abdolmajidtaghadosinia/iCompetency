// One organization's workspace: header, tabs and sub-routes.
//   ''              workforce dashboard
//   people          member table, add / import / export
//   people/:id      member report
//   units           unit tree (admins edit, managers read)
//   settings        required assessments, due date, audit log (admins)

import React, { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowRight, BarChart3, Building2, Network, Settings, Users } from 'lucide-react';
import { toPersianNum } from '../utils';
import type { OrgWorkspace } from '../types';
import { getOrgWorkspace } from '../services/apiService';
import { ErrorBlock, LoadingBlock, Meter, RoleBadge, errorText } from './AdminUi';
import AdminOrgDashboard from './AdminOrgDashboard';
import AdminMembers from './AdminMembers';
import AdminMemberReport from './AdminMemberReport';
import AdminUnits from './AdminUnits';
import AdminOrgSettings from './AdminOrgSettings';
import type { Notify } from './AdminPanel';

export interface WorkspaceProps {
  ws: OrgWorkspace;
  reload: () => void;
  notify: Notify;
  canManage: boolean;
}

const AdminOrgWorkspace: React.FC<{ notify: Notify; canSwitch: boolean }> = ({ notify, canSwitch }) => {
  const { orgId: orgIdParam } = useParams();
  const orgId = Number(orgIdParam);
  const [ws, setWs] = useState<OrgWorkspace | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    getOrgWorkspace(orgId).then(setWs).catch(e => setError(errorText(e)));
  }, [orgId]);
  useEffect(() => { setWs(null); load(); }, [load]);

  if (!Number.isFinite(orgId)) return <Navigate to="/admin" replace />;
  if (error) return <ErrorBlock message={error} onRetry={load} />;
  if (!ws) return <LoadingBlock />;

  const canManage = ws.role === 'super' || ws.role === 'admin';
  const props: WorkspaceProps = { ws, reload: load, notify, canManage };
  const org = ws.organization;
  const seatPct = ws.seats.limit ? (ws.seats.used / ws.seats.limit) * 100 : 0;

  // Absolute paths: this component renders under a splat route, where
  // react-router v7 resolves relative links against the full URL, so a
  // relative "units" tab clicked from people/5 would lead to people/5/units.
  const base = `/admin/orgs/${orgId}`;
  const tabs = [
    { to: base, label: 'نمای کلی', icon: BarChart3, end: true, show: true },
    { to: `${base}/people`, label: 'افراد', icon: Users, end: false, show: true },
    { to: `${base}/units`, label: 'واحدها', icon: Network, end: false, show: true },
    { to: `${base}/settings`, label: 'تنظیمات', icon: Settings, end: false, show: canManage },
  ].filter(t => t.show);

  return (
    <div className="space-y-5 animate-fade-in-up">
      <header className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-soft dark:shadow-none p-5 md:p-6">
        {canSwitch && (
          <Link to="/admin" className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 mb-3">
            <ArrowRight size={14} /> همه سازمان‌ها
          </Link>
        )}
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
              <Building2 size={24} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white truncate">{org.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <RoleBadge role={ws.role} />
                {org.industry && <span className="text-xs text-slate-400">{org.industry}</span>}
                {org.status === 'suspended' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                    <AlertTriangle size={12} /> معلق
                  </span>
                )}
                {ws.scopeUnitIds && <span className="text-[11px] font-bold text-slate-500">دسترسی محدود به واحد شما</span>}
              </div>
            </div>
          </div>
          <div className="md:w-60">
            <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
              <span>ظرفیت سازمان</span>
              <span className="tabular-nums">{toPersianNum(ws.seats.used)}{ws.seats.limit ? ` از ${toPersianNum(ws.seats.limit)}` : ' نفر (نامحدود)'}</span>
            </div>
            {ws.seats.limit ? <Meter value={seatPct} label="ظرفیت مصرف‌شده" /> : null}
          </div>
        </div>
        <nav className="flex gap-1 mt-5 -mb-1 overflow-x-auto" aria-label="بخش‌های سازمان">
          {tabs.map(t => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) => `inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
                isActive ? 'bg-indigo-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <t.icon size={16} /> {t.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <Routes>
        <Route index element={<AdminOrgDashboard {...props} />} />
        <Route path="people" element={<AdminMembers {...props} />} />
        <Route path="people/:memberId" element={<AdminMemberReport {...props} />} />
        <Route path="units" element={<AdminUnits {...props} />} />
        {canManage && <Route path="settings" element={<AdminOrgSettings {...props} />} />}
        <Route path="*" element={<Navigate to={base} replace />} />
      </Routes>
    </div>
  );
};

export default AdminOrgWorkspace;
