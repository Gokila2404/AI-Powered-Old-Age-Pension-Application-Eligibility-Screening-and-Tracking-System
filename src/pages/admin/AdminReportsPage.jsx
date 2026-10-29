import React from 'react';
import { useApp } from '../../context/AppContext';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { Download, FileSpreadsheet, ShieldCheck, BarChart2, AlertCircle, FileText } from 'lucide-react';

export const AdminReportsPage = () => {
  const { applications, schemes } = useApp();

  const [searchName, setSearchName] = React.useState('');
  const [filterScheme, setFilterScheme] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('');

  // Derive unique scheme names and statuses for dropdowns
  const uniqueSchemes = React.useMemo(
    () => [...new Set(applications.map((a) => a.schemeName).filter(Boolean))].sort(),
    [applications]
  );
  const uniqueStatuses = React.useMemo(
    () => [...new Set(applications.map((a) => a.status).filter(Boolean))].sort(),
    [applications]
  );

  // Filtered applications
  const filteredApplications = React.useMemo(() => {
    return applications.filter((app) => {
      const nameMatch =
        !searchName ||
        (app.applicantName || '').toLowerCase().includes(searchName.toLowerCase());
      const schemeMatch = !filterScheme || app.schemeName === filterScheme;
      const statusMatch = !filterStatus || app.status === filterStatus;
      return nameMatch && schemeMatch && statusMatch;
    });
  }, [applications, searchName, filterScheme, filterStatus]);

  // ── CSV helpers ──────────────────────────────────────────────
  const csvHeaders = [
    'Application ID',
    'Applicant Name',
    'Age',
    'Gender',
    'District',
    'Scheme',
    'AI Score',
    'AI Flags',
    'Status',
    'Submitted At',
  ];

  const appToRow = (app) => [
    `"${app.id || ''}"`,
    `"${app.applicantName || ''}"`,
    app.applicantAge || '',
    `"${app.gender || ''}"`,
    `"${app.district || ''}"`,
    `"${app.schemeName || ''}"`,
    app.aiScore ?? '',
    `"${(app.aiFlags || []).join('; ')}"`,
    `"${app.status || ''}"`,
    `"${app.submittedAt || ''}"`,
  ];

  const downloadCSV = (rows, filename) => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [csvHeaders.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportAllCSV = () => {
    const rows = applications.map(appToRow);
    downloadCSV(rows, `Pension_Seva_All_Records_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleExportFilteredCSV = () => {
    const rows = filteredApplications.map(appToRow);
    downloadCSV(rows, `Pension_Seva_Filtered_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleExportSingleCSV = (app) => {
    const rows = [appToRow(app)];
    downloadCSV(rows, `Pension_Seva_${app.id || 'record'}_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // ── Audit JSON ──────────────────────────────────────────────
  const handleExportAuditJSON = () => {
    const auditDossier = {
      platform: 'Pension Seva Academic Prototype',
      disclaimer:
        'Academic Prototype — Not an Official Government Portal. Demonstration Data Only.',
      generatedAt: new Date().toISOString(),
      recordCount: applications.length,
      schemesCount: schemes.length,
      applications: applications,
    };

    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(auditDossier, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `Pension_Seva_Audit_Dossier_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-fadeIn pb-12 font-sans">
      <AdminSidebar />

      <main className="flex-1 min-w-0 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-bold rounded-lg border border-amber-500/30 mb-2">
              <AlertCircle className="w-3.5 h-3.5" />
              Academic Prototype Simulation Analytics
            </div>
            <h1 className="text-2xl font-extrabold">Audit Reports &amp; Analytical Intelligence</h1>
            <p className="text-xs text-slate-300">
              Generate reproducible audit trails, AI score compliance records, and simulated district disbursement totals.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportFilteredCSV}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4" /> Download Filtered CSV
            </button>

            <button
              onClick={handleExportAllCSV}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4" /> Download All CSV
            </button>

            <button
              onClick={handleExportAuditJSON}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-blue-900/30 transition flex items-center gap-1.5 border border-blue-400/30"
            >
              <Download className="w-4 h-4" /> Download Audit JSON
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
              Updated Live • {applications.length} Queue Records
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
              <div className="text-xs font-bold text-slate-500">Region 1 (Madurai &amp; South)</div>
              <div className="text-xl font-black text-slate-900">₹4.82 Lakhs / mo</div>
              <div className="text-[11px] text-emerald-600 font-semibold">482 Active Demo Beneficiaries</div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
              <div className="text-xs font-bold text-slate-500">Region 2 (Kongu &amp; West)</div>
              <div className="text-xl font-black text-slate-900">₹3.15 Lakhs / mo</div>
              <div className="text-[11px] text-emerald-600 font-semibold">315 Active Demo Beneficiaries</div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
              <div className="text-xs font-bold text-slate-500">Region 3 (North &amp; Central)</div>
              <div className="text-xl font-black text-slate-900">₹2.40 Lakhs / mo</div>
              <div className="text-[11px] text-emerald-600 font-semibold">240 Active Demo Beneficiaries</div>
            </div>
          </div>
        </div>

        {/* Search / Filter Bar */}
        <div className="bg-white rounded-3xl p-5 shadow-md border border-slate-200">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
                Search by Name
              </label>
              <input
                type="text"
                placeholder="e.g. Lakshmi"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50"
              />
            </div>

            <div className="min-w-[170px]">
              <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
                Scheme
              </label>
              <select
                value={filterScheme}
                onChange={(e) => setFilterScheme(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50"
              >
                <option value="">All Schemes</option>
                {uniqueSchemes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-[150px]">
              <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wide">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-slate-50"
              >
                <option value="">All Statuses</option>
                {uniqueStatuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs font-semibold text-slate-400 self-end pb-2">
              {filteredApplications.length} of {applications.length} records
            </div>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-200 space-y-4">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Recent Administrative Audit Trail
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                  <th className="p-3">Application ID</th>
                  <th className="p-3">Applicant</th>
                  <th className="p-3">Scheme</th>
                  <th className="p-3">AI Score</th>
                  <th className="p-3">Current Status</th>
                  <th className="p-3">Sanction Reference</th>
                  <th className="p-3 text-center">Export</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50">
                    <td className="p-3 font-extrabold text-slate-900">{app.id}</td>
                    <td className="p-3 font-bold text-slate-800">{app.applicantName}</td>
                    <td className="p-3 text-slate-600">{app.schemeName}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          app.aiScore >= 80
                            ? 'bg-emerald-100 text-emerald-800'
                            : app.aiScore >= 50
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {app.aiScore}/100
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-slate-800">{app.status}</span>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-500">
                      {app.sanctionOrderNo || 'Pending Decision'}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleExportSingleCSV(app)}
                        title="Download this application as CSV"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-indigo-700 transition"
                      >
                        <Download className="w-4 h-4" />
                      </button>
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
