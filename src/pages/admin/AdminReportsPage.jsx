import React from 'react';
import { useApp } from '../../context/AppContext';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { Download, FileSpreadsheet, ShieldCheck, BarChart2, AlertCircle, FileText } from 'lucide-react';

export const AdminReportsPage = () => {
  const { applications, schemes } = useApp();

  const handleExportCSV = () => {
    // Generate CSV content from real application list
    const headers = ['Application ID', 'Applicant Name', 'Age', 'Gender', 'District', 'Scheme', 'AI Score', 'AI Flags', 'Status', 'Submitted At'];
    const rows = applications.map(app => [
      `"${app.id || ''}"`,
      `"${app.applicantName || ''}"`,
      app.applicantAge || '',
      `"${app.gender || ''}"`,
      `"${app.district || ''}"`,
      `"${app.schemeName || ''}"`,
      app.aiScore ?? '',
      `"${(app.aiFlags || []).join('; ')}"`,
      `"${app.status || ''}"`,
      `"${app.submittedAt || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Pension_Seva_Prototype_Audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportAuditJSON = () => {
    const auditDossier = {
      platform: "Pension Seva Academic Prototype",
      disclaimer: "Academic Prototype â€” Not an Official Government Portal. Demonstration Data Only.",
      generatedAt: new Date().toISOString(),
      recordCount: applications.length,
      schemesCount: schemes.length,
      applications: applications
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(auditDossier, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Pension_Seva_Audit_Dossier_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-fadeIn pb-12 font-sans">
      <AdminSidebar />

      <main className="w-full space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-bold rounded-lg border border-amber-500/30 mb-2">
              <AlertCircle className="w-3.5 h-3.5" />
              Academic Prototype Simulation Analytics
            </div>
            <h1 className="text-2xl font-extrabold">Audit Reports & Analytical Intelligence</h1>
            <p className="text-xs text-slate-300">
              Generate reproducible audit trails, AI score compliance records, and simulated district disbursement totals.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4" /> Export CSV Record
            </button>

            <button
              onClick={handleExportAuditJSON}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-blue-900/30 transition flex items-center gap-1.5 border border-blue-400/30"
            >
              <Download className="w-4 h-4" /> Export Audit Dossier
            </button>
          </div>
        </div>

        {/* District Summary Cards (Simulated Demo Data) */}
        <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-blue-600" />
              Simulated Regional Pension Flow (Demo Benchmarks)
            </h2>
            <span className="text-[11px] font-bold text-slate-400">
              Updated Live â€¢ {applications.length} Queue Records
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
              <div className="text-xs font-bold text-slate-500">Region 1 (Madurai & South)</div>
              <div className="text-xl font-black text-slate-900">â‚¹4.82 Lakhs / mo</div>
              <div className="text-[11px] text-emerald-600 font-semibold">482 Active Demo Beneficiaries</div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
              <div className="text-xs font-bold text-slate-500">Region 2 (Kongu & West)</div>
              <div className="text-xl font-black text-slate-900">â‚¹3.15 Lakhs / mo</div>
              <div className="text-[11px] text-emerald-600 font-semibold">315 Active Demo Beneficiaries</div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
              <div className="text-xs font-bold text-slate-500">Region 3 (North & Central)</div>
              <div className="text-xl font-black text-slate-900">â‚¹2.40 Lakhs / mo</div>
              <div className="text-[11px] text-emerald-600 font-semibold">240 Active Demo Beneficiaries</div>
            </div>
          </div>
        </div>

        {/* Audit Log Table Preview */}
        <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-200 space-y-4">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Recent Administrative Audit Trail
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                  <th className="p-3">Application ID</th>
                  <th className="p-3">Applicant</th>
                  <th className="p-3">Scheme</th>
                  <th className="p-3">AI Score</th>
                  <th className="p-3">Current Status</th>
                  <th className="p-3">Sanction Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50">
                    <td className="p-3 font-extrabold text-slate-900">{app.id}</td>
                    <td className="p-3 font-bold text-slate-800">{app.applicantName}</td>
                    <td className="p-3 text-slate-600">{app.schemeName}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        app.aiScore >= 80 ? 'bg-emerald-100 text-emerald-800' :
                        app.aiScore >= 50 ? 'bg-blue-100 text-blue-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {app.aiScore}/100
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-slate-800">{app.status}</span>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-500">
                      {app.sanctionOrderNo || 'Pending Decision'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

