// Organization admin panel (docs/organizations.md), mounted at /admin/*.
//   /admin                      platform admins: all organizations;
//                               org admins/managers: their organization(s)
//   /admin/orgs/:orgId/*        one organization's workspace
// Access is enforced by the server on every call; the UI only hides what the
// caller can't use.

import React, { useCallback, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { Building2, ChevronLeft, ShieldAlert } from 'lucide-react';
import { listMyOrganizations } from '../services/apiService';
import AdminOrgList from './AdminOrgList';
import AdminOrgWorkspace from './AdminOrgWorkspace';
import { Card, EmptyState, ErrorBlock, LoadingBlock, RoleBadge, errorText } from './AdminUi';

export type Notify = (message: string, type?: 'success' | 'error') => void;

interface MyOrg { id: number; name: string; status: string; role: string }

const AdminPanel: React.FC<{ notify: Notify }> = ({ notify }) => {
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState<MyOrg[] | null>(null);
  const [platformAdmin, setPlatformAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    listMyOrganizations()
      .then(r => { setOrgs(r.organizations); setPlatformAdmin(r.platformAdmin); })
      .catch(e => setError(errorText(e)));
  }, []);
  useEffect(load, [load]);

  const shell = (children: React.ReactNode) => (
    <div className="h-full overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50 p-4 md:p-8 pb-24 text-slate-800 dark:text-slate-100 custom-scrollbar">
      <div className="max-w-7xl mx-auto">{children}</div>
    </div>
  );

  if (error) return shell(<ErrorBlock message={error} onRetry={load} />);
  if (orgs === null) return shell(<LoadingBlock />);

  const home = platformAdmin
    ? <AdminOrgList notify={notify} onChanged={load} />
    : orgs.length === 1
      ? <Navigate to={`/admin/orgs/${orgs[0].id}`} replace />
      : orgs.length > 1
        ? (
          <Card title="انتخاب سازمان" subtitle="شما به بیش از یک سازمان دسترسی دارید.">
            <div className="grid gap-3 sm:grid-cols-2">
              {orgs.map(o => (
                <button key={o.id} onClick={() => navigate(`/admin/orgs/${o.id}`)} className="flex items-center gap-3 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-indigo-50/40 dark:hover:bg-indigo-500/5 text-right transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 flex items-center justify-center"><Building2 size={20} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-900 dark:text-white truncate">{o.name}</div>
                    <RoleBadge role={o.role as 'admin' | 'manager'} />
                  </div>
                  <ChevronLeft size={18} className="text-slate-400" />
                </button>
              ))}
            </div>
          </Card>
        )
        : (
          <Card>
            <EmptyState icon={<ShieldAlert size={24} />} title="دسترسی به پنل سازمان ندارید" text="این بخش برای مدیران سازمان‌ها و مدیران واحدهاست. اگر مدیر سازمان هستید، از مدیر سامانه بخواهید شما را دعوت کند." />
          </Card>
        );

  return shell(
    <Routes>
      <Route index element={home} />
      <Route path="orgs/:orgId/*" element={<AdminOrgWorkspace notify={notify} canSwitch={platformAdmin || orgs.length > 1} />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
};

export default AdminPanel;
