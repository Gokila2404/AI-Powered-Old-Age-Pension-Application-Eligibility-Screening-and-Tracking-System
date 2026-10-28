import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import api from '../../api/client';
import {
  GitBranch,
  Plus,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowRight,
  RefreshCw,
  Edit2
} from 'lucide-react';

export const AdminRuleManagement = () => {
  const [rules, setRules] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    schemeId: 'IGNOAPS-TN',
    minAge: 60,
    maxIncome: 72000,
    residenceRequired: 'Tamil Nadu',
    benefitConflictsAllowed: false,
    requiredDocuments: ['Age Proof / Aadhaar', 'Income Certificate', 'Bank Passbook'],
    isActive: true
  });

  const fetchRules = async () => {
    setLoading(true);
    try {
      const [rulesRes, schemesRes] = await Promise.all([
        api.get('/admin/rules'),
        api.get('/schemes')
      ]);
      setRules(rulesRes.data);
      setSchemes(schemesRes.data);
    } catch (err) {
      console.error('Failed to load rules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleCreateRule = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/admin/rules', formData);
      setShowModal(false);
      fetchRules();
      alert('New eligibility rule version published successfully.');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to publish rule version.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-fadeIn pb-12 font-sans text-left">
      <AdminSidebar />

      <main className="w-full space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="bg-indigo-500/20 text-indigo-300 text-xs font-bold px-3 py-1 rounded-full border border-indigo-400/30">
              Rule Engine Governance
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Eligibility Rules & Versioning Management
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl">
              Control automated decision-tree screening thresholds, age minimums, income ceilings, and document prerequisites.
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="px-5 py-3 bg-blue-900 hover:bg-blue-800 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Rule Version</span>
          </button>
        </div>

        {/* Rules Table / Cards */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-bold bg-white rounded-3xl border border-slate-200">
            Loading rule configurations...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {rules.map((rule) => {
              const matchedScheme = schemes.find(s => s.id === rule.schemeId);
              return (
                <div key={rule.ruleId} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black font-mono bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-200">
                          {rule.ruleId}
                        </span>
                        <span className="bg-slate-100 text-slate-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                          v{rule.version}
                        </span>
                      </div>
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${rule.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                        {rule.isActive ? 'ACTIVE IN PRODUCTION' : 'SUPERSEDED'}
                      </span>
                    </div>

                    <h3 className="font-black text-slate-900 text-base">
                      {matchedScheme ? matchedScheme.nameEn : rule.schemeId}
                    </h3>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-slate-700">
                      <div>â€¢ Minimum Age: <strong>{rule.minAge}+ Years</strong></div>
                      <div>â€¢ Income Ceiling: <strong>â‚¹{rule.maxIncome.toLocaleString()}/yr</strong></div>
                      <div>â€¢ Residence: <strong>{rule.residenceRequired}</strong></div>
                      <div>â€¢ Dual Benefits: <strong>{rule.benefitConflictsAllowed ? 'Allowed' : 'Prohibited'}</strong></div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[10px] uppercase font-black text-slate-400">Mandatory Verification Documents:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {rule.requiredDocuments.map((doc, idx) => (
                          <span key={idx} className="bg-slate-100 text-slate-700 text-[11px] font-bold px-2 py-0.5 rounded-md border border-slate-200">
                            {doc}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Updated By: <strong>{rule.updatedBy || 'System Admin'}</strong></span>
                    <span>Created: <strong>{new Date(rule.createdAt).toLocaleDateString()}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Rule Version Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-2xl space-y-5 animate-scaleUp">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-black text-slate-900">Publish New Rule Version</h2>
                </div>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 font-black text-lg">
                  Ã—
                </button>
              </div>

              <form onSubmit={handleCreateRule} className="space-y-4 text-xs font-bold text-slate-700">
                <div className="space-y-1">
                  <label>Select Target Scheme</label>
                  <select
                    value={formData.schemeId}
                    onChange={(e) => setFormData({ ...formData, schemeId: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    {schemes.map(s => (
                      <option key={s.id} value={s.id}>{s.nameEn} ({s.id})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label>Minimum Age Requirement</label>
                    <input
                      type="number"
                      value={formData.minAge}
                      onChange={(e) => setFormData({ ...formData, minAge: parseInt(e.target.value, 10) })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <label>Maximum Annual Income (â‚¹)</label>
                    <input
                      type="number"
                      value={formData.maxIncome}
                      onChange={(e) => setFormData({ ...formData, maxIncome: parseInt(e.target.value, 10) })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label>Required Residence Jurisdiction</label>
                  <input
                    type="text"
                    value={formData.residenceRequired}
                    onChange={(e) => setFormData({ ...formData, residenceRequired: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={formData.benefitConflictsAllowed}
                    onChange={(e) => setFormData({ ...formData, benefitConflictsAllowed: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Allow concurrent dual pension benefits</span>
                </label>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white font-extrabold rounded-xl shadow-md"
                  >
                    {submitting ? 'Publishing...' : 'Deploy Version'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

