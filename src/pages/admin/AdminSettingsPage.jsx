import React from 'react';
import { ShieldCheck, UserRound, Settings } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AdminSidebar } from '../../components/admin/AdminSidebar';

export const AdminSettingsPage = () => {
  const { currentUser } = useApp();

  return (
    <div className="flex flex-col lg:flex-row gap-6 font-sans">
      <AdminSidebar />
      <section className="flex-1 min-w-0 space-y-5">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-700"><Settings className="h-5 w-5" /></div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Administrator Settings</h1>
              <p className="mt-1 text-sm text-slate-600">Review your signed-in officer account and access level.</p>
            </div>
          </div>
        </header>
        <div className="grid gap-5 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800"><UserRound className="h-4 w-4 text-blue-600" /> Account</div>
            <dl className="space-y-3 text-sm">
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Name</dt><dd className="mt-1 font-semibold text-slate-900">{currentUser?.fullName || 'Administrator'}</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</dt><dd className="mt-1 break-all font-semibold text-slate-900">{currentUser?.email || '—'}</dd></div>
              <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Account ID</dt><dd className="mt-1 font-mono text-slate-700">{currentUser?.id || '—'}</dd></div>
            </dl>
          </article>
          <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-emerald-900"><ShieldCheck className="h-4 w-4" /> Access level</div>
            <p className="text-lg font-black text-emerald-950">{currentUser?.role === 'ADMIN' ? 'Authorized administrator' : 'Administrator access required'}</p>
            <p className="mt-2 text-sm text-emerald-800">Administrative actions are recorded in the audit log.</p>
          </article>
        </div>
      </section>
    </div>
  );
};
