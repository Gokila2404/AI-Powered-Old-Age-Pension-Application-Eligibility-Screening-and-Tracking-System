import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import api from '../../api/client';
import {
  ArrowRight, Bell, CheckCircle2, Clock3, FileCheck2, FilePlus2,
  FolderOpen, HeartHandshake, Search, ShieldCheck, Sparkles
} from 'lucide-react';

const quickActions = [
  { label: 'Check Eligibility', detail: 'Review your eligibility', to: '/eligibility', icon: Sparkles },
  { label: 'Start Application', detail: 'Apply for a pension', to: '/application', icon: FilePlus2 },
  { label: 'Upload Documents', detail: 'Manage submitted files', to: '/documents', icon: FolderOpen },
  { label: 'Track Application', detail: 'See the latest progress', to: '/track', icon: Search },
  { label: 'View Schemes', detail: 'Explore available support', to: '/schemes', icon: ShieldCheck },
  { label: 'Welfare Assist', detail: 'Get help and guidance', to: '/welfare-assist', icon: HeartHandshake },
];

const statusTone = (status = '') => {
  if (['APPROVED', 'COMPLETED'].includes(status)) return 'bg-emerald-100 text-emerald-800';
  if (status === 'REJECTED') return 'bg-rose-100 text-rose-800';
  if (status === 'ACTION REQUIRED') return 'bg-amber-100 text-amber-800';
  return 'bg-blue-100 text-blue-800';
};

export const UserDashboard = () => {
  const { currentUser, applications, schemes, notifications, language, aiAssessmentResult } = useApp();
  const [documents, setDocuments] = useState([]);
  const [documentsLoaded, setDocumentsLoaded] = useState(false);
  const currentApp = applications[0] || null;
  const unreadCount = notifications.filter((item) => !item.read).length;
  const latestNotifications = notifications.slice(0, 3);
  const latestScore = currentApp?.aiScore ?? aiAssessmentResult?.score;
  const firstName = currentUser?.fullName?.trim()?.split(/\s+/)[0] || 'Citizen';

  useEffect(() => {
    let active = true;
    api.get('/documents/my-documents')
      .then(({ data }) => { if (active) setDocuments(Array.isArray(data) ? data : []); })
      .catch(() => { if (active) setDocuments([]); })
      .finally(() => { if (active) setDocumentsLoaded(true); });
    return () => { active = false; };
  }, []);

  const verifiedDocuments = documents.filter((doc) => doc.verificationStatus === 'VERIFIED').length;
  const correctionDocuments = documents.filter((doc) => doc.verificationStatus === 'NEEDS_CORRECTION').length;

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-5 py-3 font-sans text-left">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Pension Seva · Citizen Dashboard</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Welcome, {firstName}</h1>
          <p className="mt-1 text-sm text-slate-600">Here’s what’s happening with your pension today.</p>
        </div>
        <p className="text-xs text-slate-500">{currentApp?.lastUpdated ? `Updated ${new Date(currentApp.lastUpdated).toLocaleString()}` : 'No application updates yet'}</p>
      </header>

      <section aria-label="Pension activity summary" className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800"><FileCheck2 className="h-4 w-4 text-blue-700" />Current Application</div>
            {currentApp && <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${statusTone(currentApp.status)}`}>{currentApp.status}</span>}
          </div>
          {currentApp ? (
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div><dt className="text-xs text-slate-500">Application ID</dt><dd className="mt-0.5 font-bold text-slate-900">{currentApp.id}</dd></div>
              <div><dt className="text-xs text-slate-500">Scheme</dt><dd className="mt-0.5 font-semibold text-slate-900">{currentApp.schemeName || '—'}</dd></div>
              <div><dt className="text-xs text-slate-500">Last updated</dt><dd className="mt-0.5 font-semibold text-slate-900">{currentApp.lastUpdated ? new Date(currentApp.lastUpdated).toLocaleDateString() : '—'}</dd></div>
            </dl>
          ) : <p className="mt-4 text-sm text-slate-600">You have not submitted an application yet.</p>}
          <Link to={currentApp ? `/applications/${encodeURIComponent(currentApp.id)}` : '/application'} className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-blue-700 hover:underline">
            {currentApp ? 'View Application' : 'Start Application'} <ArrowRight className="h-4 w-4" />
          </Link>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800"><Sparkles className="h-4 w-4 text-violet-700" />Eligibility Summary</div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{latestScore == null ? '—' : latestScore}</span>
            <span className="text-sm text-slate-500">{latestScore == null ? 'No assessment yet' : '/ 100'}</span>
            {latestScore != null && <span className={`ml-auto rounded-full px-2.5 py-1 text-[11px] font-bold ${latestScore >= 80 ? 'bg-emerald-100 text-emerald-800' : latestScore >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>{latestScore >= 80 ? 'Likely match' : latestScore >= 50 ? 'Needs review' : 'Screening not passed'}</span>}
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-slate-600">{currentApp?.identityVerification?.details?.[0] || (currentApp ? 'Preliminary screening based on your latest application.' : 'Complete an eligibility assessment to see your result.')}</p>
          <Link to="/eligibility" className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-blue-700 hover:underline">View Assessment <ArrowRight className="h-4 w-4" /></Link>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800"><FolderOpen className="h-4 w-4 text-indigo-700" />Documents</div>
          {documentsLoaded ? (
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <span><strong className="text-slate-900">{documents.length}</strong> <span className="text-slate-600">uploaded</span></span>
              <span><strong className="text-emerald-700">{verifiedDocuments}</strong> <span className="text-slate-600">verified</span></span>
              <span><strong className="text-amber-700">{correctionDocuments}</strong> <span className="text-slate-600">need correction</span></span>
            </div>
          ) : <p className="mt-4 text-sm text-slate-500">Loading document summary…</p>}
          <Link to="/documents" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-blue-700 hover:underline">Manage Documents <ArrowRight className="h-4 w-4" /></Link>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800"><Bell className="h-4 w-4 text-rose-700" />Notifications</div>
            <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-800">{unreadCount} unread</span>
          </div>
          <div className="mt-3 space-y-2">
            {latestNotifications.length ? latestNotifications.map((item) => (
              <div key={item.id} className="flex items-start gap-2 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                {item.read ? <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />}
                <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{language === 'ta' ? item.titleTa : item.titleEn}</p><p className="truncate text-xs text-slate-500">{item.date}</p></div>
              </div>
            )) : <p className="text-sm text-slate-500">No notifications yet.</p>}
          </div>
          <Link to="/notifications" className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-blue-700 hover:underline">View All <ArrowRight className="h-4 w-4" /></Link>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div><h2 className="text-base font-bold text-slate-900">Recommended Schemes</h2><p className="mt-0.5 text-xs text-slate-500">Explore support that may fit your needs.</p></div>
          <Link to="/schemes" className="shrink-0 text-sm font-bold text-blue-700 hover:underline">All Schemes</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {schemes.slice(0, 3).map((scheme) => (
            <Link key={scheme.id} to={`/schemes/${encodeURIComponent(scheme.id)}`} className="rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:bg-blue-50/30">
              <p className="text-sm font-bold text-slate-900">{scheme.nameEn}</p>
              <p className="mt-1 line-clamp-2 text-xs text-slate-600">{scheme.descriptionEn}</p>
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-blue-700">Scheme details <ArrowRight className="h-3.5 w-3.5" /></span>
            </Link>
          ))}
          {!schemes.length && <p className="text-sm text-slate-500">No schemes are available right now.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-bold text-slate-900">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map(({ label, detail, to, icon: Icon }) => (
            <Link key={to} to={to} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-300 hover:bg-blue-50/30">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Icon className="h-5 w-5" /></span>
              <span className="min-w-0"><span className="block text-sm font-bold text-slate-900">{label}</span><span className="mt-0.5 block text-xs text-slate-500">{detail}</span></span>
              <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-slate-400" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};
