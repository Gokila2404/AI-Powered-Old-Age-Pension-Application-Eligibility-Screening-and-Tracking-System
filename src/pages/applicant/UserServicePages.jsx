import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, FileText, UploadCloud, Camera, Trash2, UserPlus, Save, X, User, MapPin, IndianRupee, Wallet, Clock, Award, ShieldCheck, Eye } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import api from '../../api/client';

const PageTitle = ({ title, description, back = '/dashboard', accent = 'from-blue-900 via-blue-950 to-indigo-950' }) => (
  <header className="mb-6 overflow-hidden rounded-3xl gradient-hero shadow-xl shadow-blue-950/30 text-white">
    <div className={`h-1.5 w-full bg-gradient-to-r ${accent}`} />
    <div className="p-5 sm:p-6">
      <Link to={back} className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-blue-100 border border-white/20 transition hover:bg-white/20 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" />Back</Link>
      <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">{title}</h1>
      {description && <p className="mt-1.5 text-sm text-blue-200">{description}</p>}
    </div>
  </header>
);

const Card = ({ children, accent = 'border-slate-200', tint = 'bg-white' }) => <section className={`rounded-2xl border ${accent} ${tint} p-5 shadow-sm`}>{children}</section>;
const formatDate = (value) => value ? new Date(value).toLocaleString() : 'â€”';

const STATUS_STYLES = {
  APPROVED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  COMPLETED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  REJECTED: 'bg-rose-50 text-rose-800 border-rose-200',
  'ACTION REQUIRED': 'bg-amber-50 text-amber-800 border-amber-200',
};
const statusPill = (status) => STATUS_STYLES[status] || 'bg-blue-50 text-blue-800 border-blue-200';

export const MyApplicationsPage = () => {
  const { applications, fetchApplications, showToast } = useApp();
  const [deletingId, setDeletingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleDelete = async (appId) => {
    setBusy(true);
    try {
      await api.delete(`/applications/${encodeURIComponent(appId)}`);
      showToast(`Application ${appId} has been withdrawn.`, 'success');
      setConfirmId(null);
      if (fetchApplications) await fetchApplications();
    } catch (error) {
      showToast(error.response?.data?.detail || 'Could not withdraw this application.', 'error');
    } finally {
      setBusy(false);
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1180px] py-3 font-sans text-left">
      <PageTitle title="My Applications" description="All applications you have registered â€” track, review, or withdraw them." />
      {applications.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {applications.map((app) => (
            <div key={app.id} className={`group relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${confirmId === app.id ? 'border-rose-300' : 'border-slate-200 hover:border-violet-200'}`}>
              <div className={`absolute inset-x-0 top-0 h-1.5 ${app.status === 'REJECTED' ? 'bg-gradient-to-r from-rose-400 to-orange-300' : ['APPROVED', 'COMPLETED'].includes(app.status) ? 'bg-gradient-to-r from-emerald-400 to-teal-300' : 'bg-gradient-to-r from-blue-400 to-violet-400'}`} />
              <div className="flex flex-wrap items-start justify-between gap-3 pt-1">
                <div>
                  <p className="font-mono text-base font-black text-slate-900">{app.id}</p>
                  <p className="mt-0.5 text-xs font-bold text-violet-700">{app.schemeName || 'Pension scheme'}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">Submitted {formatDate(app.appliedDate)}</p>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-black ${statusPill(app.status)}`}>{app.status}</span>
              </div>
              {app.aiScore != null && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${app.status === 'REJECTED' ? 'bg-rose-500' : 'bg-gradient-to-r from-blue-500 to-teal-400'}`} style={{ width: `${app.aiScore}%` }} />
                  </div>
                  <span className="text-[10px] font-black text-slate-500">AI {app.aiScore}/100</span>
                </div>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <Link className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-blue-900 via-blue-950 to-indigo-950 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5" to={`/applications/${encodeURIComponent(app.id)}`}>View details</Link>
                <Link className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-blue-800 hover:text-blue-900" to={`/track/${encodeURIComponent(app.id)}`}>Track</Link>
                {deletingId === app.id && confirmId === app.id ? (
                  <>
                    <button disabled={busy} onClick={() => handleDelete(app.id)} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-60">{busy ? 'Deletingâ€¦' : 'Confirm'}</button>
                    <button onClick={() => { setConfirmId(null); setDeletingId(null); }} className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-300">Cancel</button>
                  </>
                ) : (
                  <button onClick={() => { setDeletingId(app.id); setConfirmId(app.id); }} className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-800 hover:underline" title="Withdraw this application"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <div className="py-8 text-center">
            <FileText className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-2 text-sm text-slate-600">No applications yet.</p>
            <Link to="/application" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-900 via-blue-950 to-indigo-950 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-900/25">Start Application <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </Card>
      )}
    </div>
  );
};

const DetailGroup = ({ title, icon: Icon, fields, accent = 'blue' }) => {
  const themes = {
    blue: { borderBg: 'border-blue-100 bg-gradient-to-br from-blue-50/70 via-white to-white', head: 'text-blue-700 border-blue-100', chip: 'bg-blue-100/80 text-blue-700' },
    violet: { borderBg: 'border-violet-100 bg-gradient-to-br from-violet-50/70 via-white to-white', head: 'text-violet-700 border-violet-100', chip: 'bg-violet-100/80 text-violet-700' },
    emerald: { borderBg: 'border-emerald-100 bg-gradient-to-br from-emerald-50/70 via-white to-white', head: 'text-emerald-700 border-emerald-100', chip: 'bg-emerald-100/80 text-emerald-700' },
    amber: { borderBg: 'border-amber-100 bg-gradient-to-br from-amber-50/70 via-white to-white', head: 'text-amber-700 border-amber-100', chip: 'bg-amber-100/80 text-amber-700' },
    rose: { borderBg: 'border-rose-100 bg-gradient-to-br from-rose-50/70 via-white to-white', head: 'text-rose-700 border-rose-100', chip: 'bg-rose-100/80 text-rose-700' },
    cyan: { borderBg: 'border-blue-800 bg-gradient-to-br from-blue-50 via-white to-white', head: 'text-blue-900 border-blue-800', chip: 'bg-cyan-100/80 text-blue-900' },
  };
  const t = themes[accent] || themes.blue;
  return (
    <section className={`rounded-2xl border ${t.head.replace(/text-\S+/, '')} p-0 overflow-hidden shadow-sm`} style={{}}>
      <div className="rounded-2xl bg-white">
        <div className={`flex items-center gap-2 border-b px-5 py-3.5 ${t.head}`}>
          {Icon && <Icon className="h-4 w-4" />}
          <h2 className="text-xs font-black uppercase tracking-widest">{title}</h2>
          <span className={`ml-auto rounded-full px-2.5 py-0.5 text-[10px] font-black ${t.chip}`}>{fields.filter(([, v]) => v != null && String(v).trim() !== '').length} fields</span>
        </div>
        <dl className="grid gap-0 sm:grid-cols-2">
          {fields.map(([label, value], index) => (
            <div key={label} className={`flex flex-col gap-0.5 px-5 py-3 ${index % 2 === 0 ? 'sm:border-r' : ''} border-slate-100 border-b last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0`}>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
              <dd className="break-words text-sm font-bold text-slate-800">{value == null || String(value).trim() === '' ? <span className="font-medium text-slate-300">â€”</span> : value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
};

const TimelineInline = ({ timeline, status }) => (
  <ol className="relative ml-2 space-y-4 border-l-2 border-slate-200 pl-5">
    {(timeline || []).map((step, idx) => {
      const cls = step.status === 'completed' ? 'border-emerald-400 bg-emerald-400 shadow-md shadow-emerald-400/40'
        : step.status === 'current' ? 'border-violet-500 bg-gradient-to-br from-blue-500 to-violet-500 shadow-md shadow-violet-900/40 scale-125'
        : step.status === 'action-required' ? 'border-amber-400 bg-amber-400 shadow-md shadow-amber-400/40'
        : step.status === 'rejected' ? 'border-rose-500 bg-rose-500 shadow-md shadow-rose-500/40'
        : 'border-slate-300 bg-white';
      const textCls = step.status === 'pending' ? 'text-slate-400' : 'text-slate-900';
      return (
        <li key={idx} className="relative">
          <span className={`absolute -left-[27px] top-0.5 h-3.5 w-3.5 rounded-full border-2 ${cls}`} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={`text-sm font-bold ${textCls}`}>{step.title}</p>
            <span className={`text-[11px] font-semibold ${step.date && step.date !== 'Pending' ? 'text-slate-600' : 'text-slate-400'}`}>
              {step.date || 'Pending'}
            </span>
          </div>
          {step.description && <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{step.description}</p>}
        </li>
      );
    })}
  </ol>
);

const payoutSchedule = (application, schemes) => {
  const scheme = schemes.find((s) => s.id === application.schemeId);
  const payout = scheme ? (scheme.payoutEn || scheme.payoutTa || '') : '';
  const amountMatch = payout.match(/â‚¹\s?([\d,]+)/);
  const amount = amountMatch ? amountMatch[1].replace(/,/g, '') : null;
  return { scheme, payout, amount };
};

export const ApplicantApplicationDetailPage = () => {
  const { applicationId } = useParams();
  const { applications, schemes } = useApp();
  const [application, setApplication] = useState(() => applications.find((item) => item.id === applicationId) || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true);
    api.get(`/applications/${encodeURIComponent(applicationId)}`)
      .then(({ data }) => { if (active) { setApplication(data); setError(''); } })
      .catch((err) => { if (active) setError(err.response?.data?.detail || 'Could not load this application.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [applicationId]);

  if (loading) return <div className="mx-auto max-w-[1180px] py-8 text-sm text-slate-600">Loading applicationâ€¦</div>;
  if (error || !application) return <div className="mx-auto max-w-[1180px] py-3 font-sans"><PageTitle title="Application Details" /><Card><p className="text-sm text-rose-700">{error || 'Application not found.'}</p></Card></div>;
  const personal = application.personalInfo || {};
  const address = application.addressInfo || {};
  const income = application.incomeInfo || {};
  const benefits = application.existingBenefitsInfo || {};
  const { payout, amount } = payoutSchedule(application, schemes);
  const approved = ['APPROVED', 'COMPLETED'].includes(application.status);
  const rejected = application.status === 'REJECTED';
  const nextPayoutDate = approved ? (() => {
    const base = application.sanctionDate ? new Date(application.sanctionDate) : new Date(application.lastUpdated || Date.now());
    if (Number.isNaN(base.getTime())) return null;
    const next = new Date(base);
    do { next.setMonth(next.getMonth() + 1); } while (next < new Date());
    return next.toLocaleDateString();
  })() : null;
  const values = (obj) => Object.entries(obj).map(([key, val]) => [key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()), typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val ?? '')]);
  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-5 py-3 font-sans text-left">
      <PageTitle title="Application Details" description={`${application.id} Â· ${application.schemeName || 'Pension scheme'}`} back="/applications" accent="from-amber-400 via-blue-900 to-blue-950" />

      {/* Hero status banner */}
      <section className={`overflow-hidden rounded-3xl p-[1.5px] shadow-xl ${rejected ? 'bg-gradient-to-br from-rose-400 to-orange-300' : approved ? 'bg-gradient-to-br from-emerald-400 to-teal-300' : 'bg-gradient-to-br from-blue-400 to-violet-400'}`}>
        <div className="rounded-[calc(1.5rem-1px)] bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg ${rejected ? 'bg-gradient-to-br from-rose-500 to-orange-400 shadow-rose-500/30' : approved ? 'bg-gradient-to-br from-emerald-500 to-teal-400 shadow-emerald-500/30' : 'bg-gradient-to-br from-blue-500 to-violet-500 shadow-violet-900/30'}`}>
                {approved ? <ShieldCheck className="h-7 w-7" /> : rejected ? <X className="h-7 w-7" /> : <Clock className="h-7 w-7" />}
              </span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current status</p>
                <p className="mt-0.5 text-xl font-black text-slate-900">{application.status}</p>
                <p className="mt-0.5 text-xs text-slate-500">Submitted {formatDate(application.appliedDate)} Â· Updated {formatDate(application.lastUpdated)}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {application.aiScore != null && (
                <div className="relative grid h-20 w-20 place-items-center rounded-full" style={{ background: `conic-gradient(${rejected ? '#f43f5e' : '#10b981'} ${application.aiScore * 3.6}deg, #e2e8f0 0deg)` }}>
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-white shadow-inner">
                    <span className={`text-lg font-black ${rejected ? 'text-rose-600' : 'text-emerald-600'}`}>{application.aiScore}</span>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">AI score</span>
                  </div>
                </div>
              )}
              <Link to={`/track/${encodeURIComponent(application.id)}`} className="btn-primary">Track progress <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </div>
          {rejected && application.aiScreening?.reasons?.length > 0 && (
            <div className="mt-4 rounded-xl border-l-4 border-rose-400 bg-rose-50 p-3">
              <p className="text-xs font-black uppercase tracking-wide text-rose-900">Reasons for rejection</p>
              <ul className="mt-1 list-disc list-inside text-xs text-rose-800">{application.aiScreening.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </div>
          )}
          {(application.sanctionOrderNo || application.adminRemarks) && (
            <div className="mt-4 grid gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-700">
              {application.sanctionOrderNo && <p><span className="font-black uppercase tracking-wide text-slate-400">Sanction Order No</span> Â· <span className="font-bold text-slate-900">{application.sanctionOrderNo}</span></p>}
              {application.adminRemarks && <p><span className="font-black uppercase tracking-wide text-slate-400">Officer remarks</span> Â· {application.adminRemarks}</p>}
            </div>
          )}
        </div>
      </section>

      {/* Benefit payout schedule */}
      {payout && (
        <Card accent="border-emerald-200" tint="bg-gradient-to-br from-emerald-50 via-white to-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 text-white shadow-md shadow-emerald-500/30"><Wallet className="h-5 w-5" /></span>
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-emerald-700">Benefit Payout</h2>
                <span className="text-lg font-black text-slate-900">{payout}</span>
                {amount && <span className="ml-2 text-xs text-slate-500">credited monthly</span>}
              </div>
            </div>
            {approved && nextPayoutDate && (
              <p className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-xs">Next payout: <span className="text-emerald-700">{nextPayoutDate}</span></p>
            )}
            {!approved && <p className="text-xs text-slate-500">Payments begin after the sanction order is issued.</p>}
          </div>
        </Card>
      )}

      <DetailGroup title="Applicant Information" icon={User} fields={values(personal)} accent="blue" />
      <DetailGroup title="Address" icon={MapPin} fields={values(address)} accent="violet" />
      <DetailGroup title="Income" icon={IndianRupee} fields={values(income)} accent="emerald" />
      <DetailGroup title="Existing Benefits" icon={Award} fields={values(benefits)} accent="amber" />
      <DetailGroup title="Scheme and Assessment" icon={ShieldCheck} fields={[["Scheme", application.schemeName], ["Eligibility score", application.aiScore == null ? 'Pending' : `${application.aiScore}/100`], ["Submitted", formatDate(application.appliedDate)], ["Last updated", formatDate(application.lastUpdated)], ["Assessment notes", application.identityVerification?.details?.join('; ')]]} accent="cyan" />

      {/* Documents */}
      <Card accent="border-rose-100" tint="bg-gradient-to-br from-rose-50/60 via-white to-white">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-rose-700"><FileText className="h-4 w-4" /> Submitted Documents</h2>
        {application.uploadedDocs?.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {application.uploadedDocs.map((doc, index) => (
              <div key={doc.docId || index} className="group rounded-xl border border-rose-100 bg-white p-3.5 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-rose-100 to-orange-100 text-rose-600"><FileText className="h-4.5 w-4.5" /></span>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${doc.verificationStatus === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{doc.verificationStatus || doc.qualityStatus || 'Processing'}</span>
                </div>
                <p className="mt-2 truncate text-xs font-bold text-slate-800" title={doc.fileName || doc.originalName}>{doc.fileName || doc.originalName || doc.docType || 'Uploaded document'}</p>
                <p className="text-[10px] text-slate-400">{doc.docType || 'Document'}</p>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-slate-500">No document details are attached to this application record.</p>}
      </Card>

      {/* Inline progress timeline */}
      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-700"><Clock className="h-4 w-4 text-blue-600" /> Application Progress</h2>
          <Link to={`/track/${encodeURIComponent(application.id)}`} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100">Open full tracker <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>
        <TimelineInline timeline={application.timeline} status={application.status} />
      </Card>
    </div>
  );
};

export const DocumentsPage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const load = () => {
    setLoading(true);
    api.get('/documents/my-documents').then(({ data }) => setDocuments(Array.isArray(data) ? data : []))
      .catch((error) => setMessage(error.response?.data?.detail || 'Could not load your documents.'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);
  const openDocument = async (id) => {
    try {
      const { data } = await api.get(`/documents/${encodeURIComponent(id)}/preview`, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) { setMessage(error.response?.data?.detail || 'Could not open this document.'); }
  };
  const retryExtraction = async (id) => {
    try { await api.post(`/documents/${encodeURIComponent(id)}/extract`); setMessage('Document extraction has been restarted.'); load(); }
    catch (error) { setMessage(error.response?.data?.detail || 'Could not restart document extraction.'); }
  };
  return (
    <div className="mx-auto w-full max-w-[1180px] py-3 font-sans text-left">
      <PageTitle title="Documents" description="Review uploaded files and their OCR and verification status." />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-200 bg-gradient-to-r from-blue-100 via-blue-50 to-white p-4"><p className="text-sm font-medium text-blue-950">Upload or replace a document from your application.</p><Link to="/application" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-800 to-blue-950 px-4 py-2 text-sm font-bold text-white shadow-md shadow-sky-500/25 transition hover:-translate-y-0.5"><UploadCloud className="h-4 w-4" />Open Application</Link></div>
      {message && <p role="status" className="mb-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-xs">{message}</p>}
      {loading ? (
        <Card><p className="text-sm text-slate-500">Loading documentsâ€¦</p></Card>
      ) : documents.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc, index) => {
            const ocrOk = ['COMPLETED', 'PROCESSED', 'SUCCESS'].includes(String(doc.ocrStatus || doc.extractionStatus || '').toUpperCase());
            const verified = doc.verificationStatus === 'VERIFIED';
            const accents = [
              'from-rose-100 to-orange-100 text-rose-600 border-rose-200',
              'from-violet-100 to-fuchsia-100 text-violet-600 border-violet-200',
              'from-cyan-100 to-sky-100 text-blue-900 border-cyan-200',
              'from-amber-100 to-yellow-100 text-amber-700 border-amber-200',
              'from-teal-100 to-emerald-100 text-teal-700 border-teal-200',
            ][index % 5];
            return (
              <div key={doc.docId} className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-900/10">
                <div className="flex items-start justify-between gap-2">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-xl border bg-gradient-to-br ${accents}`}><FileText className="h-5 w-5" /></span>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${verified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{doc.verificationStatus || 'Pending'}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${ocrOk ? 'bg-sky-100 text-blue-900' : 'bg-slate-100 text-slate-500'}`}>OCR: {doc.ocrStatus || doc.extractionStatus || 'Processed'}</span>
                  </div>
                </div>
                <p className="mt-3 truncate text-sm font-black text-slate-900" title={doc.originalName || doc.fileName || doc.docId}>{doc.originalName || doc.fileName || doc.docId}</p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-violet-600">{doc.docType || 'Document'}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-slate-500">
                  <span className="rounded-md bg-slate-50 px-1.5 py-0.5">Uploaded {formatDate(doc.createdAt)}</span>
                  {doc.qualityStatus && <span className="rounded-md bg-slate-50 px-1.5 py-0.5">Quality: {doc.qualityStatus}</span>}
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
                  <button onClick={() => openDocument(doc.docId)} className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-blue-900 via-blue-950 to-indigo-950 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5"><Eye className="h-3.5 w-3.5" />View</button>
                  <button onClick={() => retryExtraction(doc.docId)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-violet-300 hover:text-violet-700">Retry OCR</button>
                  {doc.applicationId && <Link to={`/applications/${encodeURIComponent(doc.applicationId)}`} className="rounded-lg border border-blue-800 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-900 transition hover:bg-blue-100">Application</Link>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card><div className="py-8 text-center"><p className="text-sm text-slate-600">No uploaded documents are associated with your account yet.</p><button onClick={() => navigate('/application')} className="mt-3 rounded-xl bg-gradient-to-r from-blue-900 via-blue-950 to-indigo-950 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-900/25">Start an application to upload</button></div></Card>
      )}
      <p className="mt-3 text-xs text-slate-500">For audit integrity, original uploaded documents are retained. To submit a corrected file, upload it through the application flow.</p>
    </div>
  );
};

export const PensionHistoryPage = () => {
  const { applications } = useApp();
  return <div className="mx-auto w-full max-w-[1180px] py-3 font-sans text-left"><PageTitle title="Pension History" description="Your previous and current pension application records." /><Card>{applications.length ? <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-sm"><thead><tr className="border-b text-left text-xs uppercase text-slate-500"><th className="p-3">Application</th><th className="p-3">Scheme</th><th className="p-3">Submitted</th><th className="p-3">Assessment</th><th className="p-3">Status</th></tr></thead><tbody>{applications.map((app) => <tr key={app.id} className="border-b last:border-0"><td className="p-3"><Link className="font-semibold text-blue-700 hover:underline" to={`/applications/${encodeURIComponent(app.id)}`}>{app.id}</Link></td><td className="p-3">{app.schemeName || 'â€”'}</td><td className="p-3">{formatDate(app.appliedDate)}</td><td className="p-3">{app.aiScore == null ? 'Pending' : `${app.aiScore}/100`}</td><td className="p-3">{app.status}</td></tr>)}</tbody></table></div> : <p className="text-sm text-slate-600">Your application history will appear here after you apply.</p>}</Card></div>;
};

export const WelfareUpdatesPage = () => {
  const { systemUpdates } = useApp();
  return <div className="mx-auto w-full max-w-[1180px] py-3 font-sans text-left"><PageTitle title="Welfare Updates" description="Announcements published by the Pension Seva administration." />{systemUpdates.length ? <div className="space-y-3">{systemUpdates.map((item) => <Card key={item.id}><div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-800">{item.category || 'Welfare Update'}</span><time className="text-xs text-slate-500">{item.date}</time></div><h2 className="mt-3 text-base font-bold text-slate-900">{item.titleEn}</h2><p className="mt-1 text-sm leading-relaxed text-slate-700">{item.descEn}</p>{item.titleTa && <h3 className="mt-3 text-sm font-bold text-slate-800">{item.titleTa}</h3>}{item.descTa && <p className="mt-1 text-sm text-slate-600">{item.descTa}</p>}</Card>)}</div> : <Card><p className="text-sm text-slate-600">No welfare updates have been published yet.</p></Card>}</div>;
};

export const ProfilePage = () => {
  const { currentUser, acceptAuthenticatedSession } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const [form, setForm] = useState({
    fullName: '', mobile: '', dob: '', gender: '', maritalStatus: '',
    addressInfo: { doorNo: '', street: '', villageTown: '', district: '', state: 'Tamil Nadu', pinCode: '' },
    familyMembers: [],
  });
  const [photo, setPhoto] = useState(null); // data URL

  useEffect(() => {
    api.get('/users/me').then(({ data }) => {
      setForm({
        fullName: data.fullName || '', mobile: data.mobile || '',
        dob: data.dob ? String(data.dob).slice(0, 10) : '',
        gender: data.gender || '', maritalStatus: data.maritalStatus || '',
        addressInfo: {
          doorNo: data.addressInfo?.doorNo || '', street: data.addressInfo?.street || '',
          villageTown: data.addressInfo?.villageTown || '', district: data.addressInfo?.district || '',
          state: data.addressInfo?.state || 'Tamil Nadu', pinCode: data.addressInfo?.pinCode || '',
        },
        familyMembers: Array.isArray(data.familyMembers) ? data.familyMembers : [],
      });
      setPhoto(data.profilePhoto || null);
    }).catch(() => {});
  }, []);

  const handlePhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setSaveMessage('Photo must be under 2 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result);
    reader.readAsDataURL(file);
  };

  const updateField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const updateAddress = (key, value) => setForm((prev) => ({ ...prev, addressInfo: { ...prev.addressInfo, [key]: value } }));

  const addMember = () => setForm((prev) => ({ ...prev, familyMembers: [...prev.familyMembers, { name: '', relation: '', age: '', occupation: '' }] }));
  const updateMember = (index, key, value) => setForm((prev) => ({
    ...prev,
    familyMembers: prev.familyMembers.map((m, i) => i === index ? { ...m, [key]: value } : m),
  }));
  const removeMember = (index) => setForm((prev) => ({ ...prev, familyMembers: prev.familyMembers.filter((_, i) => i !== index) }));

  const saveProfile = async () => {
    setSaving(true); setSaveMessage('');
    try {
      const payload = {
        fullName: form.fullName,
        mobile: form.mobile,
        dob: form.dob || null,
        gender: form.gender || null,
        maritalStatus: form.maritalStatus || null,
        profilePhoto: photo,
        addressInfo: form.addressInfo,
        familyMembers: form.familyMembers.map((m) => ({ ...m, age: m.age ? parseInt(m.age, 10) : null })),
      };
      const { data } = await api.put('/users/me', payload);
      const token = sessionStorage.getItem('pension_seva_token');
      if (token && currentUser) {
        acceptAuthenticatedSession({ access_token: token, user: { ...currentUser, ...data } });
      }
      setSaveMessage('Profile saved successfully.');
    } catch (error) {
      setSaveMessage(error.response?.data?.detail || 'Could not save your profile.');
    } finally { setSaving(false); }
  };

  const submitEmail = async (event) => {
    event.preventDefault(); setMessage(''); setSaving(true);
    try { const { data } = await api.post('/auth/send-otp', { mobileOrEmail: email.trim().toLowerCase(), purpose: 'change-email' }); navigate('/verify-otp?purpose=change-email', { state: { verification: data } }); }
    catch (error) { setMessage(error.response?.data?.detail || 'Could not start email verification.'); }
    finally { setSaving(false); }
  };

  const inputCls = 'field-input min-h-11';
  const labelCls = 'mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600';
  const primaryButtonCls = 'btn-primary min-h-11 text-sm';
  const secondaryButtonCls = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border-2 border-violet-200 bg-violet-50 px-4 py-2 text-xs font-bold text-violet-700 transition hover:border-violet-300 hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100';

  return (
    <div className="mx-auto w-full max-w-[1180px] space-y-5 py-5 font-sans text-left">
      <PageTitle title="My Profile" description="Review and update your personal, contact, and family details." />

      {/* Photo + identity header */}
      <Card>
        <div className="relative -m-5 mb-5 overflow-hidden rounded-t-2xl gradient-hero p-6 sm:p-8">
          <div className="absolute -top-10 -right-8 w-44 h-44 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
          <div className="relative flex flex-wrap items-center gap-5">
          <div className="relative">
            {photo ? (
              <img src={photo} alt="Profile" className="h-24 w-24 rounded-full border-4 border-white/80 object-cover shadow-xl" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/80 bg-white/15 text-white shadow-xl backdrop-blur">
                <User className="h-10 w-10" />
              </div>
            )}
            <label className="absolute -bottom-1 -right-1 cursor-pointer rounded-full bg-amber-400 p-2.5 text-amber-950 shadow-lg transition hover:scale-110 hover:bg-amber-300 focus-within:ring-4 focus-within:ring-amber-200" title="Upload photo">
              <Camera className="h-4 w-4" />
              <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
            </label>
          </div>
          <div className="min-w-0 flex-1 text-white">
            <p className="text-xl font-black tracking-tight">{form.fullName || 'Your Name'}</p>
            <p className="mt-0.5 text-sm text-blue-100">{currentUser?.email || 'â€”'}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white border border-white/25">Applicant account</span>
              {photo && (
                <button onClick={() => setPhoto(null)} className="inline-flex items-center gap-1 rounded-full bg-rose-500/80 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-rose-500"><Trash2 className="h-3 w-3" /> Remove photo</button>
              )}
            </div>
            <p className="mt-2 text-[11px] text-blue-100">JPG or PNG, up to 2 MB.</p>
          </div>
        </div>
        </div>
      </Card>

      {/* Personal details */}
      <Card>
        <h2 className="mb-4 flex items-center gap-2 border-b-2 border-blue-100 pb-3 text-sm font-black uppercase tracking-widest text-blue-700"><User className="h-4 w-4" /> Personal Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className={labelCls}>Full name</label><input className={inputCls} value={form.fullName} onChange={(e) => updateField('fullName', e.target.value)} /></div>
          <div><label className={labelCls}>Mobile number</label><input className={inputCls} value={form.mobile} onChange={(e) => updateField('mobile', e.target.value)} /></div>
          <div><label className={labelCls}>Email (login)</label><input className={`${inputCls} bg-slate-100`} value={currentUser?.email || ''} readOnly /></div>
          <div><label className={labelCls}>Date of birth</label><input type="date" className={inputCls} value={form.dob} onChange={(e) => updateField('dob', e.target.value)} /></div>
          <div>
            <label className={labelCls}>Gender</label>
            <select className={inputCls} value={form.gender} onChange={(e) => updateField('gender', e.target.value)}>
              <option value="">Selectâ€¦</option><option>Male</option><option>Female</option><option>Other</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Marital status</label>
            <select className={inputCls} value={form.maritalStatus} onChange={(e) => updateField('maritalStatus', e.target.value)}>
              <option value="">Selectâ€¦</option>
              <option>Single</option><option>Married</option><option>Widowed</option><option>Divorced</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Address */}
      <Card>
        <h2 className="mb-4 flex items-center gap-2 border-b-2 border-violet-100 pb-3 text-sm font-black uppercase tracking-widest text-violet-700"><MapPin className="h-4 w-4" /> Address</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className={labelCls}>Door / house no.</label><input className={inputCls} value={form.addressInfo.doorNo} onChange={(e) => updateAddress('doorNo', e.target.value)} /></div>
          <div><label className={labelCls}>Street</label><input className={inputCls} value={form.addressInfo.street} onChange={(e) => updateAddress('street', e.target.value)} /></div>
          <div><label className={labelCls}>Village / town</label><input className={inputCls} value={form.addressInfo.villageTown} onChange={(e) => updateAddress('villageTown', e.target.value)} /></div>
          <div><label className={labelCls}>District</label><input className={inputCls} value={form.addressInfo.district} onChange={(e) => updateAddress('district', e.target.value)} /></div>
          <div><label className={labelCls}>State</label><input className={inputCls} value={form.addressInfo.state} onChange={(e) => updateAddress('state', e.target.value)} /></div>
          <div><label className={labelCls}>PIN code</label><input className={inputCls} value={form.addressInfo.pinCode} onChange={(e) => updateAddress('pinCode', e.target.value)} /></div>
        </div>
      </Card>

      {/* Family members */}
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b-2 border-teal-100 pb-3">
          <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-teal-700"><Award className="h-4 w-4" /> Family Members</h2>
          <button type="button" onClick={addMember} className={secondaryButtonCls}>
            <UserPlus className="h-4 w-4" /> Add member
          </button>
        </div>
        {form.familyMembers.length === 0 && <p className="text-sm text-slate-500">No family members added yet.</p>}
        <div className="space-y-3">
          {form.familyMembers.map((member, index) => (
            <div key={index} className="rounded-xl border border-teal-200 bg-gradient-to-r from-teal-50/60 to-white p-3 shadow-xs transition hover:border-teal-300 hover:shadow-sm">
              <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_.6fr_1.2fr_auto] items-end">
                <div><label className={labelCls}>Name</label><input className={inputCls} value={member.name} onChange={(e) => updateMember(index, 'name', e.target.value)} /></div>
                <div>
                  <label className={labelCls}>Relation</label>
                  <select className={inputCls} value={member.relation} onChange={(e) => updateMember(index, 'relation', e.target.value)}>
                    <option value="">Selectâ€¦</option>
                    <option>Spouse</option><option>Son</option><option>Daughter</option><option>Father</option><option>Mother</option><option>Brother</option><option>Sister</option><option>Other</option>
                  </select>
                </div>
                <div><label className={labelCls}>Age</label><input type="number" min="0" className={inputCls} value={member.age ?? ''} onChange={(e) => updateMember(index, 'age', e.target.value)} /></div>
                <div><label className={labelCls}>Occupation</label><input className={inputCls} value={member.occupation || ''} onChange={(e) => updateMember(index, 'occupation', e.target.value)} /></div>
                <button type="button" onClick={() => removeMember(index)} className="mb-0.5 rounded-lg p-2 text-rose-600 hover:bg-rose-50" title="Remove member" aria-label={`Remove family member ${index + 1}`}><X className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Save bar */}
      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg shadow-blue-900/10 backdrop-blur sm:p-4">
        <button type="button" onClick={saveProfile} disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-900 via-blue-950 to-indigo-950 px-6 py-2.5 text-sm font-black text-white shadow-md shadow-blue-900/25 transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0">
          <Save className="h-4 w-4" /> {saving ? 'Savingâ€¦' : 'Save profile'}
        </button>
        {saveMessage && <p role="status" className={`text-sm font-bold ${saveMessage.includes('success') ? 'text-emerald-700' : 'text-rose-700'}`}>{saveMessage}</p>}
      </div>

      {/* Change email */}
      <Card>
        <h2 className="mb-3 border-b-2 border-blue-800 pb-3 text-sm font-black uppercase tracking-widest text-blue-900">Change email address</h2>
        <form onSubmit={submitEmail} className="flex max-w-xl flex-col gap-2 sm:flex-row"><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="New email address" className="field-input min-h-11 flex-1" /><button disabled={saving} className="min-h-11 rounded-xl bg-gradient-to-r from-blue-800 to-blue-950 px-5 text-sm font-bold text-white shadow-md shadow-blue-700/25 transition hover:-translate-y-0.5 disabled:opacity-50">{saving ? 'Sendingâ€¦' : 'Verify new email'}</button></form>
        {message && <p role="alert" className="mt-2 text-sm text-rose-700">{message}</p>}
        <p className="mt-2 text-xs text-slate-500">Weâ€™ll send a verification code to the new email address.</p>
      </Card>
    </div>
  );
};

export const SettingsPage = () => {
  const { language, setLanguage, fontScale, setFontScale, highContrast, setHighContrast, simpleMode, setSimpleMode, speechSpeed, setSpeechSpeed, logout } = useApp();
  const Toggle = ({ label, checked, onChange }) => <label className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-0"><span className="text-sm font-medium text-slate-800">{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-blue-700" /></label>;
  return <div className="mx-auto w-full max-w-[1180px] space-y-4 py-3 font-sans text-left"><PageTitle title="Settings" description="Manage language, accessibility, and account preferences." /><Card><h2 className="mb-2 text-sm font-bold text-slate-900">Language</h2><div className="flex gap-2"><button onClick={() => setLanguage('en')} aria-pressed={language === 'en'} className={`rounded-lg border px-4 py-2 text-sm font-bold ${language === 'en' ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-300 text-slate-700'}`}>English</button><button onClick={() => setLanguage('ta')} aria-pressed={language === 'ta'} className={`rounded-lg border px-4 py-2 text-sm font-bold ${language === 'ta' ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-300 text-slate-700'}`}>à®¤à®®à®¿à®´à¯</button></div></Card><Card><h2 className="mb-1 text-sm font-bold text-slate-900">Accessibility</h2><Toggle label="Simple Mode" checked={simpleMode} onChange={setSimpleMode} /><Toggle label="High Contrast" checked={highContrast} onChange={setHighContrast} /><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 py-3"><span className="text-sm font-medium text-slate-800">Text size</span><select value={fontScale} onChange={(event) => setFontScale(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="normal">Normal</option><option value="large">Large</option><option value="xlarge">Extra large</option></select></div><div className="flex flex-wrap items-center justify-between gap-3 py-3"><span className="text-sm font-medium text-slate-800">Voice speed</span><select value={speechSpeed} onChange={(event) => setSpeechSpeed(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="slow">Slow</option><option value="normal">Normal</option><option value="fast">Fast</option></select></div></Card><Card><h2 className="mb-3 text-sm font-bold text-slate-900">Account</h2><button onClick={logout} className="rounded-lg border border-rose-200 px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-50">Sign out</button></Card></div>;
};


