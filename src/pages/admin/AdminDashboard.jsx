import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import api from '../../api/client';
import {
  Users,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Building2,
  FileText,
  ArrowRight,
  ShieldAlert,
  BarChart2,
  RefreshCw
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export const AdminDashboard = () => {
  const { applications, setActiveTab, setSelectedAppIdForDetail, currentUser } = useApp();

  const [statsData, setStatsData] = useState({
    totalApplications: applications.length || 3,
    pendingReview: 1,
    approved: 1,
    actionRequired: 0,
    rejected: 1,
    averageAiScore: 86.0,
    schemeBreakdown: [
      { scheme: 'IGNOAPS + TN Top-Up', count: 12 },
      { scheme: 'Destitute OAP', count: 8 },
      { scheme: 'Widow Pension', count: 6 },
      { scheme: 'Annapurna Food', count: 4 },
      { scheme: 'Differently Abled', count: 3 }
    ]
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/admin/stats');
        setStatsData(res.data);
      } catch (err) {
        console.error('Failed to load admin stats:', err);
      }
    };
    fetchStats();
  }, [applications]);

  const statusPieData = [
    { name: 'Approved', value: statsData.approved || 1, color: '#10b981' },
    { name: 'Pending Review', value: statsData.pendingReview || 1, color: '#3b82f6' },
    { name: 'Action Required', value: statsData.actionRequired || 0, color: '#f59e0b' },
    { name: 'Rejected', value: statsData.rejected || 1, color: '#ef4444' }
  ].filter(d => d.value > 0);

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-fadeIn pb-12 font-sans text-left">
      <AdminSidebar />

      <main className="flex-1 min-w-0 space-y-6">
        
        {/* Executive Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="bg-indigo-500/20 text-indigo-300 text-xs font-bold px-3 py-1 rounded-full border border-indigo-400/30">
              Department Governance Workstation
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Officer: <strong>{currentUser?.fullName || 'Thiru. S. Arumugam, Tahsildar'}</strong>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Administrative Review & Social Welfare Dashboard
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl">
            Real-time management of senior pension screening workloads, document OCR consistency audits, and official determinations.
          </p>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase">Total Dossiers</span>
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">
              {statsData.totalApplications}
            </div>
            <div className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Live synchronization
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase">Pending Audit</span>
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-blue-700">
              {statsData.pendingReview}
            </div>
            <div className="text-[11px] font-medium text-slate-500">Queued for Officer Decision</div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase">Approved Sanctions</span>
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700">
              {statsData.approved}
            </div>
            <div className="text-[11px] font-semibold text-emerald-600">DBT payment activated</div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-bold uppercase">Average AI Score</span>
              <ShieldAlert className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-purple-700">
              {statsData.averageAiScore} <span className="text-xs text-slate-400 font-bold">/ 100</span>
            </div>
            <div className="text-[11px] font-semibold text-purple-600">Decision support average</div>
          </div>
        </div>

        {/* Visual Charts Row (Recharts) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Chart 1: Scheme Distribution Bar Chart */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900">
                Application Distribution by Welfare Scheme
              </h2>
              <span className="text-[11px] text-slate-400 font-bold">Dossier Volume</span>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statsData.schemeBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <XAxis dataKey="scheme" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Status Breakdown Donut/Pie Chart */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900">
                Application Status Breakdown
              </h2>
              <span className="text-[11px] text-slate-400 font-bold">Decisions</span>
            </div>

            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Workload Table Snapshot */}
        <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Pending Review Applications</h2>
              <p className="text-xs text-slate-500">Live applications awaiting administrative determination</p>
            </div>
            <button
              onClick={() => setActiveTab('admin-queue')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition"
            >
              <span>View Complete Queue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <th className="p-3 rounded-l-xl">App ID</th>
                  <th className="p-3">Applicant Name</th>
                  <th className="p-3">Scheme</th>
                  <th className="p-3">AI Score</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {applications.slice(0, 5).map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-mono font-bold text-slate-900">{app.id}</td>
                    <td className="p-3 font-bold text-slate-800">{app.personalInfo?.fullName || app.applicantName}</td>
                    <td className="p-3 text-slate-600 truncate max-w-xs">{app.schemeName}</td>
                    <td className="p-3">
                      <span className="font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                        {app.aiScore}/100
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                        app.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                        app.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                        app.status === 'ACTION REQUIRED' ? 'bg-amber-100 text-amber-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          setSelectedAppIdForDetail(app.id);
                          setActiveTab('admin-detail');
                        }}
                        className="bg-blue-900 hover:bg-blue-800 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition inline-flex items-center gap-1"
                      >
                        <span>Audit</span>
                        <ArrowRight className="w-3 h-3" />
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

