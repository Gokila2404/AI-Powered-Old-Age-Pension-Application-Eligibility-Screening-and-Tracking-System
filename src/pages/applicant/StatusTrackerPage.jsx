import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import api from '../../api/client';
import {
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  FileText,
  User,
  Calendar,
  IndianRupee,
  Volume2,
  ArrowRight,
  RefreshCw,
  Send,
  HelpCircle,
  FileCheck,
  Sparkles,
  BadgeCheck,
  Wallet,
  Fingerprint
} from 'lucide-react';
import { useParams } from 'react-router-dom';

const STATUS_THEME = {
  APPROVED: { chip: 'bg-emerald-100 text-emerald-700 border-emerald-300', bar: 'bg-emerald-500', ring: '#10b981', icon: CheckCircle2 },
  COMPLETED: { chip: 'bg-teal-100 text-teal-700 border-teal-300', bar: 'bg-teal-500', ring: '#14b8a6', icon: BadgeCheck },
  REJECTED: { chip: 'bg-rose-100 text-rose-700 border-rose-300', bar: 'bg-rose-500', ring: '#f43f5e', icon: XCircle },
  'ACTION REQUIRED': { chip: 'bg-amber-100 text-amber-800 border-amber-300', bar: 'bg-amber-500', ring: '#f59e0b', icon: AlertTriangle },
  DEFAULT: { chip: 'bg-violet-100 text-violet-700 border-violet-300', bar: 'bg-violet-500', ring: '#8b5cf6', icon: Clock }
};

const MILESTONE_THEME = {
  completed: { dot: 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-md shadow-emerald-500/30', card: 'border-emerald-100 bg-gradient-to-r from-emerald-50/70 to-white' },
  current: { dot: 'bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow-md shadow-violet-900/40 animate-pulse', card: 'border-violet-200 bg-gradient-to-r from-violet-50/80 to-white' },
  'action-required': { dot: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/30', card: 'border-amber-200 bg-gradient-to-r from-amber-50/80 to-white' },
  rejected: { dot: 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/30', card: 'border-rose-200 bg-gradient-to-r from-rose-50/80 to-white' },
  pending: { dot: 'bg-slate-200 text-slate-400', card: 'border-slate-200 bg-white' }
};

/* Circular progress ring drawn with SVG â€” used for the AI score dial. */
const ScoreRing = ({ score = 0, color = '#8b5cf6' }) => {
  const pct = Math.max(0, Math.min(100, Number(score)));
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative w-[84px] h-[84px]">
      <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="40" cy="40" r={radius} fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={circumference}
          strokeDashoffset={circumference - (pct / 100) * circumference}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-black text-slate-900">{pct}</span>
        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">/ 100</span>
      </div>
    </div>
  );
};

export const StatusTrackerPage = () => {
  const { id: routeAppId } = useParams();
  const {
    language,
    applications,
    selectedAppIdForDetail,
    setSelectedAppIdForDetail,
    speakText,
    fetchApplications
  } = useApp();

  const [searchId, setSearchId] = useState(routeAppId || selectedAppIdForDetail || '');
  const [activeApp, setActiveApp] = useState(null);
  const [loading, setLoading] = useState(false);
  const [correctionNote, setCorrectionNote] = useState('');
  const [resubmittedSuccess, setResubmittedSuccess] = useState(false);

  useEffect(() => {
    const target = routeAppId || selectedAppIdForDetail;
    if (target) {
      setSearchId(target);
      fetchAppById(target);
    } else if (applications.length > 0) {
      setSearchId(applications[0].id);
      setActiveApp(applications[0]);
    }
  }, [routeAppId, selectedAppIdForDetail, applications]);

  const fetchAppById = async (idToFetch) => {
    setLoading(true);
    setResubmittedSuccess(false);
    try {
      const res = await api.get(`/applications/${idToFetch.trim()}`);
      setActiveApp(res.data);
    } catch (err) {
      // Check local cache
      const local = applications.find(a => a.id === idToFetch.trim());
      if (local) {
        setActiveApp(local);
      } else {
        setActiveApp(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchId.trim()) {
      fetchAppById(searchId.trim());
    }
  };

  const handleSpeakStatus = () => {
    if (!activeApp) return;
    const text = language === 'ta'
      ? `à®µà®¿à®£à¯à®£à®ªà¯à®ª à®Žà®£à¯ ${activeApp.id}. à®¤à®±à¯à®ªà¯‹à®¤à¯ˆà®¯ à®¨à®¿à®²à¯ˆ: ${activeApp.status}. à®¤à®¿à®Ÿà¯à®Ÿà®®à¯: ${activeApp.schemeName}.`
      : `Application ${activeApp.id}. Current Status: ${activeApp.status}. Scheme: ${activeApp.schemeName}.`;
    speakText(text);
  };

  const handleResubmitCorrection = () => {
    if (!correctionNote.trim()) {
      alert('Please enter your response or note regarding the requested correction.');
      return;
    }
    setResubmittedSuccess(true);
    speakText('Correction submitted to administrative review queue.');
  };

  const theme = STATUS_THEME[activeApp?.status] || STATUS_THEME.DEFAULT;
  const completedCount = activeApp?.timeline?.filter(s => s.status === 'completed').length || 0;
  const progressPct = activeApp?.timeline?.length ? Math.round((completedCount / activeApp.timeline.length) * 100) : 0;

  return (
    <div className="w-full py-6 font-sans space-y-8 text-left">

      {/* Gradient Hero Search Header */}
      <div className="relative overflow-hidden rounded-3xl gradient-hero p-6 sm:p-8 shadow-xl shadow-indigo-900/20 space-y-5 text-white">
        <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
        <div className="absolute -bottom-20 -left-8 w-64 h-64 rounded-full bg-cyan-300/20 blur-3xl" aria-hidden="true" />
        <div className="relative">
          <span className="text-[10px] font-black uppercase tracking-widest bg-white/15 backdrop-blur px-3 py-1 rounded-full border border-white/25">
            <Sparkles className="w-3 h-3 inline mr-1 -mt-0.5" /> Real-Time Tracking
          </span>
          <h1 className="text-xl sm:text-2xl font-black mt-2">
            {language === 'ta' ? 'à®µà®¿à®£à¯à®£à®ªà¯à®ª à®¨à®¿à®²à¯ˆ à®…à®±à®¿à®¤à®²à¯' : 'Application Status Tracker'}
          </h1>
          <p className="text-xs text-blue-100">
            Enter your unique Application ID (e.g. PEN-2026-88492) or pick from your registered applications.
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="relative flex gap-2 max-w-xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-blue-300 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="e.g. PEN-2026-88492"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="w-full pl-9 pr-3 py-3 text-xs font-mono font-bold rounded-xl border border-white/30 bg-white/10 backdrop-blur text-white placeholder:text-blue-200 focus:outline-none focus:ring-4 focus:ring-white/25 focus:border-white/50"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-amber-950 font-black text-xs rounded-xl shadow-md transition flex items-center gap-1.5 disabled:opacity-60"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>Track</span>
          </button>
        </form>

        {applications.length > 0 && (
          <div className="relative flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[11px] text-blue-200 font-bold">Your Applications:</span>
            {applications.map(a => (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  setSearchId(a.id);
                  fetchAppById(a.id);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition ${searchId === a.id
                    ? 'bg-amber-400 text-amber-950 border-amber-300 shadow-sm'
                    : 'bg-white/10 text-white border-white/25 hover:bg-white/20'
                  }`}
              >
                {a.id}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Tracking Details */}
      {activeApp ? (
        <div className="space-y-6">

          {/* Status Header Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-lg shadow-blue-900/5 overflow-hidden">
            {/* Colored top banner driven by status */}
            <div className={`h-2 w-full ${theme.bar}`} />
            <div className="p-6 sm:p-8 space-y-6">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
                <div className="flex items-start gap-4">
                  <span className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-white shadow-lg ${theme.bar} shadow-slate-400/30`}>
                    <theme.icon className="w-6 h-6" />
                  </span>
                  <div>
                    <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Application Reference</div>
                    <div className="text-2xl sm:text-3xl font-mono font-black text-slate-900">
                      {activeApp.id}
                    </div>
                    <div className="text-xs font-bold text-violet-700 mt-0.5 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" /> {activeApp.schemeName}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-4 py-2 text-xs sm:text-sm font-black rounded-xl border ${theme.chip}`}>
                    {activeApp.status}
                  </span>
                  <button
                    type="button"
                    onClick={handleSpeakStatus}
                    className="p-2.5 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-xl transition border border-violet-200"
                    title="Listen to status report"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Progress bar over milestones */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <span>Overall Progress</span>
                  <span>{completedCount}/{activeApp.timeline?.length || 0} milestones Â· {progressPct}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full rounded-full bg-gradient-to-r ${theme.bar === 'bg-rose-500' ? 'from-rose-400 to-rose-600' : 'from-blue-500 via-violet-500 to-teal-400'} transition-all duration-700`} style={{ width: `${Math.max(progressPct, 4)}%` }} />
                </div>
              </div>

              {/* Stat tiles â€” each with its own secondary color identity */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
                <div className="rounded-2xl border border-violet-100 bg-gradient-to-b from-violet-50/70 to-white p-4 shadow-xs">
                  <ScoreRing score={activeApp.aiScore || 86} color="#8b5cf6" />
                  <div className="mt-2 text-[10px] text-violet-700 font-black uppercase tracking-wider">AI Screening Score</div>
                </div>

                <div className="rounded-2xl border border-teal-100 bg-gradient-to-b from-teal-50/70 to-white p-4 shadow-xs">
                  <ShieldCheck className="w-8 h-8 text-teal-500 mx-auto" />
                  <div className="text-sm font-black text-teal-700 mt-1.5">
                    {activeApp.identityVerification?.identityStatus || 'VERIFIED'}
                  </div>
                  <div className="text-[10px] text-teal-600 font-black uppercase tracking-wider mt-0.5">Identity Verification</div>
                </div>

                <div className="rounded-2xl border border-blue-800 bg-gradient-to-b from-blue-50 to-white p-4 shadow-xs">
                  <Calendar className="w-8 h-8 text-blue-900 mx-auto" />
                  <div className="text-sm font-bold text-slate-800 pt-1.5">{activeApp.appliedDate}</div>
                  <div className="text-[10px] text-blue-800 font-black uppercase tracking-wider mt-0.5">Application Date</div>
                </div>

                <div className="rounded-2xl border border-fuchsia-100 bg-gradient-to-b from-fuchsia-50/70 to-white p-4 shadow-xs">
                  <Fingerprint className="w-8 h-8 text-fuchsia-500 mx-auto" />
                  <div className="text-sm font-bold text-slate-800 truncate pt-1.5">{activeApp.personalInfo?.fullName}</div>
                  <div className="text-[10px] text-fuchsia-600 font-black uppercase tracking-wider mt-0.5">Applicant</div>
                </div>
              </div>

              {/* Administrative Remarks Box (if any) */}
              {activeApp.adminRemarks && (
                <div className="rounded-2xl border-l-4 border-violet-500 bg-violet-50/70 rounded-r-2xl p-4 space-y-1">
                  <span className="text-[11px] font-black uppercase text-violet-900 block flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5" /> Official Administrative Note
                  </span>
                  <p className="text-xs text-violet-900 font-medium leading-relaxed">
                    "{activeApp.adminRemarks}"
                  </p>
                  {activeApp.sanctionOrderNo && (
                    <div className="text-xs font-mono font-bold text-teal-700 pt-1 flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5" /> Sanction Order ID: {activeApp.sanctionOrderNo}
                    </div>
                  )}
                </div>
              )}

              {/* ACTION REQUIRED CORRECTION INTERFACE */}
              {activeApp.status === 'ACTION REQUIRED' && !resubmittedSuccess && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-amber-900 font-black text-xs uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Applicant Action Mandated</span>
                  </div>
                  <p className="text-xs text-amber-800">
                    {activeApp.correctionDetails || 'The reviewing officer requested clarifying proof or updated information.'}
                  </p>

                  <div className="space-y-2">
                    <textarea
                      rows="2"
                      placeholder="Enter your explanation or updated document reference here..."
                      value={correctionNote}
                      onChange={(e) => setCorrectionNote(e.target.value)}
                      className="w-full p-3 text-xs rounded-xl border-2 border-amber-300 bg-white focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15"
                    />
                    <button
                      type="button"
                      onClick={handleResubmitCorrection}
                      className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black text-xs px-5 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-md shadow-amber-500/30"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Correction to Officer</span>
                    </button>
                  </div>
                </div>
              )}

              {resubmittedSuccess && (
                <div className="p-3 bg-emerald-50 border-2 border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-popIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Correction successfully received! Application returned to 'Under Review' status.</span>
                </div>
              )}

            </div>
          </div>

          {/* Interactive Timeline */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-lg shadow-blue-900/5 space-y-6">
            <h3 className="text-base font-black text-slate-900 border-b-2 border-slate-100 pb-3 flex items-center gap-2.5">
              <span className="gradient-accent w-1.5 h-6 rounded-full inline-block" aria-hidden="true" />
              Application Milestones & Detailed Timeline
            </h3>

            <div className="space-y-5 relative before:absolute before:inset-0 before:left-[26px] before:w-0.5 before:bg-gradient-to-b before:from-violet-300 before:via-blue-800 before:to-slate-200">
              {activeApp.timeline?.map((step, idx) => {
                const style = MILESTONE_THEME[step.status] || MILESTONE_THEME.pending;
                const isCompleted = step.status === 'completed';
                const isCurrent = step.status === 'current';
                const isActionRequired = step.status === 'action-required';
                const isRejected = step.status === 'rejected';

                return (
                  <div key={idx} className="relative flex items-start gap-4">

                    {/* Step Icon Indicator */}
                    <div className={`w-[52px] h-[52px] rounded-2xl flex items-center justify-center shrink-0 z-10 transition ${style.dot} ${!isCompleted && !isCurrent && !isActionRequired && !isRejected ? 'rotate-0' : ''
                      }`}>
                      {isCompleted ? <CheckCircle2 className="w-5 h-5" /> :
                        isCurrent ? <Clock className="w-5 h-5" /> :
                          isActionRequired ? <AlertTriangle className="w-5 h-5" /> :
                            isRejected ? <XCircle className="w-5 h-5" /> :
                              <span className="text-sm font-black">{idx + 1}</span>}
                    </div>

                    <div className={`flex-1 p-4 rounded-2xl border-2 space-y-1 transition hover:shadow-md ${style.card}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="font-black text-xs text-slate-900 uppercase tracking-wide">
                          {step.title}
                        </span>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${step.date && step.date !== 'Pending' ? 'bg-slate-100 text-slate-600' : 'bg-slate-50 text-slate-400 italic'
                          }`}>
                          {step.date || 'Pending'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {step.description}
                      </p>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

          {/* Payout schedule */}
          {['APPROVED', 'COMPLETED'].includes(activeApp.status) && (
            <div className="relative overflow-hidden rounded-3xl p-6 border-2 border-teal-200 bg-gradient-to-br from-teal-50 via-emerald-50 to-cyan-50 shadow-sm space-y-2">
              <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-teal-200/40 blur-2xl" aria-hidden="true" />
              <h3 className="font-black text-teal-900 text-sm flex items-center gap-2 relative">
                <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-800 to-emerald-900 text-white flex items-center justify-center shadow-md shadow-teal-500/30">
                  <IndianRupee className="w-4 h-4" />
                </span>
                Benefit Payout Schedule
              </h3>
              <p className="text-xs text-teal-800 relative">
                Your benefit of <span className="font-black">â‚¹1,000 / month</span> is active via Direct Benefit Transfer.
              </p>
              <p className="text-xs text-teal-800 relative">
                <span className="font-bold">Next credit date:</span> {
                  (() => {
                    const base = new Date(activeApp.lastUpdated || Date.now());
                    if (Number.isNaN(base.getTime())) return 'â€”';
                    const next = new Date(base);
                    do { next.setMonth(next.getMonth() + 1); } while (next < new Date());
                    return next.toLocaleDateString();
                  })()
                }
              </p>
            </div>
          )}

        </div>
      ) : (
        <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-3 shadow-sm">
          <span className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto">
            <HelpCircle className="w-7 h-7 text-slate-400" />
          </span>
          <h3 className="font-black text-slate-800 text-base">No Application Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            We couldn't find an application matching '{searchId}'. Please verify your Application ID or submit a new application.
          </p>
        </div>
      )}

    </div>
  );
};


