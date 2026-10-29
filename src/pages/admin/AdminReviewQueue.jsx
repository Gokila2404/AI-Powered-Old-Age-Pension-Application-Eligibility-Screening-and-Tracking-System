import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { Search, Ban, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';

export const AdminReviewQueue = () => {
  const { applications, setSelectedAppIdForDetail } = useApp();

  const [search, setSearch] = useState('');
  const [filterScore, setFilterScore] = useState('ALL');
  const [expandedRow, setExpandedRow] = useState(null);

  const filteredApps = applications.filter(a => {
    const applicantName = a.applicantName || a.personalInfo?.fullName || '';
    const district = a.district || a.addressInfo?.district || '';
    const matchesSearch = (a.id + ' ' + applicantName + ' ' + district).toLowerCase().includes(search.toLowerCase());
    const score = a.aiScore ?? 80;
    const matchesScore = filterScore === 'ALL' ||
      (filterScore === 'HIGH' && score >= 80) ||
      (filterScore === 'MEDIUM' && score >= 50 && score < 80) ||
      (filterScore === 'LOW' && score < 50);

    return matchesSearch && matchesScore;
  });

  const getRejectionReasons = (app) => {
    if (app.aiScreening?.decision === 'AI_REJECTED' || app.status === 'REJECTED') {
      const reasons = app.aiScreening?.reasons?.length ? app.aiScreening.reasons : (app.aiScreening?.documentExtractionNotes || []);
      return reasons.length ? reasons : ['AI screening score fell below the 50/100 acceptance threshold.'];
    }
    return [];
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-fadeIn pb-12 font-sans text-left">
      <AdminSidebar />

      <main className="flex-1 min-w-0 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold">Application Review Queue</h1>
            <p className="text-xs text-slate-300">Review new submissions and decisions, with AI score and district filters.</p>
          </div>
          <div className="bg-blue-500/20 border border-blue-400/30 px-3.5 py-1.5 rounded-xl text-xs text-cyan-300 font-bold">
            In Queue: {filteredApps.filter(a => a.status !== 'APPROVED' && a.status !== 'REJECTED').length} Â· Total: {filteredApps.length}
          </div>
        </div>

        {/* Filter Controls */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs font-bold">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 uppercase">AI Score Filter:</span>
            <button onClick={() => setFilterScore('ALL')} className={`px-3 py-1.5 rounded-xl transition ${filterScore === 'ALL' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>All</button>
            <button onClick={() => setFilterScore('HIGH')} className={`px-3 py-1.5 rounded-xl transition ${filterScore === 'HIGH' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>High (80+)</button>
            <button onClick={() => setFilterScore('MEDIUM')} className={`px-3 py-1.5 rounded-xl transition ${filterScore === 'MEDIUM' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>Medium (50-79)</button>
            <button onClick={() => setFilterScore('LOW')} className={`px-3 py-1.5 rounded-xl transition ${filterScore === 'LOW' ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>Auto-Rejected (&lt;50)</button>
          </div>

          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Applicant or ID..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs font-medium"
            />
          </div>
        </div>

        {/* Queue Table */}
        <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                  <th className="p-3">App ID</th>
                  <th className="p-3">Applicant</th>
                  <th className="p-3">Scheme</th>
                  <th className="p-3">Score</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredApps.map(app => {
                  const isRejected = app.status === 'REJECTED';
                  const reasons = getRejectionReasons(app);
                  const isExpanded = expandedRow === app.id;
                  return (
                    <React.Fragment key={app.id}>
                      <tr className={`hover:bg-blue-50/40 transition ${isRejected ? 'bg-rose-50/40' : ''}`}>
                        <td className="p-3 font-extrabold text-slate-900 font-mono">{app.id}</td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{app.applicantName || app.personalInfo?.fullName}</div>
                          <div className="text-[11px] text-slate-500">{app.addressInfo?.district || app.district || 'Tamil Nadu'}</div>
                        </td>
                        <td className="p-3">{app.schemeName}</td>
                        <td className="p-3">
                          <span className={`px-2.5 py-0.5 rounded-full font-extrabold text-[11px] ${
                            (app.aiScore ?? 80) >= 80 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                            (app.aiScore ?? 80) >= 50 ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                            'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}>
                            {app.aiScore ?? 80}/100
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                            app.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                            app.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                            app.status === 'ACTION REQUIRED' ? 'bg-amber-100 text-amber-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {app.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isRejected && reasons.length > 0 && (
                              <button
                                onClick={() => setExpandedRow(isExpanded ? null : app.id)}
                                className="text-rose-700 hover:text-rose-900 font-bold text-[11px] px-2 py-1.5 rounded-lg hover:bg-rose-100 transition flex items-center gap-1"
                                title="Show rejection reason"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                Reason
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                            )}
                            <Link
                              to={`/admin/applications/${app.id}`}
                              onClick={() => setSelectedAppIdForDetail(app.id)}
                              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs shadow-md shadow-blue-900/20 transition inline-flex items-center gap-1 border border-blue-400/30"
                            >
                              <span>Review</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && isRejected && (
                        <tr className="bg-rose-50">
                          <td colSpan={6} className="p-4">
                            <div className="bg-white rounded-xl p-4 border border-rose-200 space-y-2">
                              <div className="flex items-center gap-2 text-rose-900 font-extrabold text-xs uppercase tracking-wide">
                                <Ban className="w-4 h-4" /> Auto-Rejection Reason
                              </div>
                              <div className="text-[11px] text-slate-700">
                                AI screening score <strong>{app.aiScore}/100</strong> fell below the acceptance threshold of <strong>50/100</strong>.
                                {app.aiScreening?.documentQualityPenalty > 0 && (
                                  <> Document quality penalty applied: <strong>âˆ’{app.aiScreening.documentQualityPenalty} points</strong>.</>
                                )}
                              </div>
                              <ul className="list-disc list-inside text-[11px] text-slate-700 space-y-1">
                                {reasons.map((reason, i) => <li key={i}>{reason}</li>)}
                              </ul>
                              <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                                This application was rejected automatically by the AI screening engine and never entered the manual review queue.
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {filteredApps.length === 0 && (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-400 font-bold">No applications match this filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
};

