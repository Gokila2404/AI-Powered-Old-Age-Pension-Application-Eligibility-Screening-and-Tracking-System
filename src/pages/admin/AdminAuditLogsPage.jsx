import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import api from '../../api/client';
import {
  History,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  FileText
} from 'lucide-react';

export const AdminAuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/audit-logs?limit=100');
      setLogs(res.data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(l => {
    const matchesSearch = (
      (l.adminName || '') + ' ' +
      (l.id || '') + ' ' +
      (l.entityId || '') + ' ' +
      (l.description || '')
    ).toLowerCase().includes(search.toLowerCase());

    const matchesAction = actionFilter === 'ALL' || (l.action && l.action.includes(actionFilter));
    return matchesSearch && matchesAction;
  });

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-fadeIn pb-12 font-sans text-left">
      <AdminSidebar />

      <main className="flex-1 min-w-0 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="bg-indigo-500/20 text-indigo-300 text-xs font-bold px-3 py-1 rounded-full border border-indigo-400/30">
              Immutable Governance Trail
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              System Audit & Compliance Logs
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl">
              Chronological log of administrative determinations, scheme alterations, rule modifications, and citizen data interactions.
            </p>
          </div>

          <button
            onClick={fetchLogs}
            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition"
            title="Refresh Logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs font-bold">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 uppercase">Action Filter:</span>
            <button
              onClick={() => setActionFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl transition ${actionFilter === 'ALL' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              All Actions
            </button>
            <button
              onClick={() => setActionFilter('APPROVE')}
              className={`px-3 py-1.5 rounded-xl transition ${actionFilter === 'APPROVE' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              Approvals
            </button>
            <button
              onClick={() => setActionFilter('CORRECTION')}
              className={`px-3 py-1.5 rounded-xl transition ${actionFilter === 'CORRECTION' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              Corrections
            </button>
            <button
              onClick={() => setActionFilter('RULE')}
              className={`px-3 py-1.5 rounded-xl transition ${actionFilter === 'RULE' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              Rule Changes
            </button>
          </div>

          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Officer, Entity ID, or Log ID..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Logs Table */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-bold bg-white rounded-3xl border border-slate-200">
            Loading system audit trail...
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px]">
                  <tr>
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Log ID</th>
                    <th className="p-4">Officer</th>
                    <th className="p-4">Action Event</th>
                    <th className="p-4">Target Entity</th>
                    <th className="p-4">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                        No audit records matched your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 font-medium">
                        <td className="p-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="p-4 font-mono font-bold text-slate-700 whitespace-nowrap">
                          {log.id}
                        </td>
                        <td className="p-4 font-bold text-slate-900 whitespace-nowrap">
                          {log.adminName}
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-black ${
                            log.action?.includes('APPROVE') ? 'bg-emerald-100 text-emerald-800' :
                            log.action?.includes('REJECT') ? 'bg-red-100 text-red-800' :
                            log.action?.includes('RULE') ? 'bg-indigo-100 text-indigo-800' :
                            log.action?.includes('SCHEME') ? 'bg-purple-100 text-purple-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-slate-600 whitespace-nowrap">
                          {log.entity}: <strong className="text-slate-900">{log.entityId}</strong>
                        </td>
                        <td className="p-4 text-slate-600 max-w-md">
                          {log.description}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};
