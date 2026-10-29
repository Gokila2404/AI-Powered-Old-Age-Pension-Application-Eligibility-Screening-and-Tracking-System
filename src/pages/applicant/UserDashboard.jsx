import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import api from '../../api/client';
import {
  ArrowRight, Bell, CheckCircle2, Clock3, FileCheck2, FilePlus2,
  FolderOpen, HeartHandshake, Search, ShieldCheck, Sparkles,
  IndianRupee, Calendar, Download, Wallet
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

const MONTHLY_AMOUNT = 1000; // ₹1,000/mo for IGNOAPS

/**
 * Generate the last 6 months of simulated pension disbursement records
 * starting from the approved/lastUpdated date.
 */
const generatePaymentHistory = (approvedDateStr) => {
  const baseDate = approvedDateStr ? new Date(approvedDateStr) : new Date();
  const now = new Date();
  const records = [];

  for (let i = 0; i < 6; i++) {
    const payDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
    if (payDate > now) {
      records.push({
        month: payDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
        amount: MONTHLY_AMOUNT,
        mode: 'DBT',
        status: 'Pending',
      });
    } else {
      records.push({
        month: payDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
        amount: MONTHLY_AMOUNT,
        mode: 'DBT',
        status: 'Credited',
      });
    }
  }
  return records;
};

const downloadPaymentCSV = (records, applicationId) => {
  const header = 'Month,Amount (₹),Payment Mode,Status\n';
  const rows = records.map((r) => `${r.month},${r.amount},${r.mode},${r.status}`).join('\n');
  const totalRow = `\nTotal Disbursed,₹${records.filter((r) => r.status === 'Credited').reduce((s, r) => s + r.amount, 0)},,`;
  const blob = new Blob([header + rows + totalRow], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `pension_statement_${applicationId || 'export'}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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

  const isApproved = currentApp?.status === 'APPROVED';

  const paymentHistory = useMemo(() => {
    if (!isApproved) return [];
    return generatePaymentHistory(currentApp?.approvedDate || currentApp?.lastUpdated);
  }, [isApproved, currentApp?.approvedDate, currentApp?.lastUpdated]);

  const totalDisbursed = useMemo(
    () => paymentHistory.filter((r) => r.status === 'Credited').reduce((sum, r) => sum + r.amount, 0),
    [paymentHistory],
  );

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
          <p className="mt-1 text-sm text-slate-600">Here's what's happening with your pension today.</p>
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

      {/* ── Sanction Details (APPROVED only) ── */}
      {isApproved && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <Wallet className="h-4 w-4 text-emerald-700" />Sanction Details
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3 lg:grid-cols-5">
            <div>
              <dt className="text-xs text-slate-500">Sanction Order No.</dt>
              <dd className="mt-0.5 font-bold text-slate-900">{currentApp.sanctionOrderNo || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Approved Date</dt>
              <dd className="mt-0.5 font-semibold text-slate-900">
                {currentApp.approvedDate ? new Date(currentApp.approvedDate).toLocaleDateString() : currentApp.lastUpdated ? new Date(currentApp.lastUpdated).toLocaleDateString() : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Scheme</dt>
              <dd className="mt-0.5 font-semibold text-slate-900">{currentApp.schemeName || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Monthly Amount</dt>
              <dd className="mt-0.5 font-bold text-emerald-700">₹{MONTHLY_AMOUNT.toLocaleString('en-IN')}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Payment Mode</dt>
              <dd className="mt-0.5 font-semibold text-slate-900">Direct Benefit Transfer (DBT)</dd>
            </div>
          </dl>
        </section>
      )}

      {/* ── Pension Payment History (APPROVED only) ── */}
      {isApproved && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <IndianRupee className="h-4 w-4 text-emerald-700" />Pension Payment History
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                Total Disbursed: ₹{totalDisbursed.toLocaleString('en-IN')}
              </span>
              <button
                onClick={() => downloadPaymentCSV(paymentHistory, currentApp?.id)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
              >
                <Download className="h-3.5 w-3.5" />Download Payment Statement
              </button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-2.5"><Calendar className="mr-1 inline h-3.5 w-3.5" />Month</th>
                  <th className="px-4 py-2.5">Amount</th>
                  <th className="px-4 py-2.5">Payment Mode</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map((record, idx) => (
                  <tr key={record.month} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                    <td className="whitespace-nowrap px-4 py-2.5 font-semibold text-slate-800">{record.month}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-bold text-slate-900">₹{record.amount.toLocaleString('en-IN')}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{record.mode}</td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${record.status === 'Credited' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {record.status === 'Credited' ? <CheckCircle2 className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

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
