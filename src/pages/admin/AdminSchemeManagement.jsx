import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { Settings, Plus, CheckCircle2, Edit2, ShieldAlert } from 'lucide-react';

export const AdminSchemeManagement = () => {
  const { schemes, addScheme, updateScheme } = useApp();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingScheme, setEditingScheme] = useState(null); // scheme being edited
  const emptyScheme = {
    nameEn: '',
    nameTa: '',
    deptEn: 'Social Welfare Dept',
    deptTa: 'à®šà®®à¯‚à®• à®¨à®²à®¤à¯à®¤à¯à®±à¯ˆ',
    level: 'State Scheme',
    payoutEn: 'â‚¹1,000 / month',
    payoutTa: 'à®°à¯‚.1,000 / à®®à®¾à®¤à®®à¯',
    minAge: 60,
    maxIncome: 72000,
    bplRequired: true,
    freeRice: '4 kg / month',
    freeSaree: 'Twice a year',
    descriptionEn: '',
    descriptionTa: '',
    status: 'Active'
  };
  const [newScheme, setNewScheme] = useState(emptyScheme);

  const openEdit = (scheme) => {
    setEditingScheme(scheme);
    setNewScheme({
      nameEn: scheme.nameEn || '',
      nameTa: scheme.nameTa || '',
      deptEn: scheme.deptEn || 'Social Welfare Dept',
      deptTa: scheme.deptTa || 'à®šà®®à¯‚à®• à®¨à®²à®¤à¯à®¤à¯à®±à¯ˆ',
      level: scheme.level || 'State Scheme',
      payoutEn: scheme.payoutEn || '',
      payoutTa: scheme.payoutTa || '',
      minAge: scheme.minAge ?? 60,
      maxIncome: scheme.maxIncome ?? 72000,
      bplRequired: scheme.bplRequired ?? true,
      freeRice: scheme.freeRice || '',
      freeSaree: scheme.freeSaree || '',
      descriptionEn: scheme.descriptionEn || '',
      descriptionTa: scheme.descriptionTa || '',
      status: scheme.isActive === false ? 'Paused' : 'Active'
    });
    setShowAddModal(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      if (editingScheme) {
        await updateScheme(editingScheme.id, newScheme);
        alert('Scheme updated successfully and published to citizens.');
      } else {
        await addScheme(newScheme);
        alert('New scheme created successfully and published to citizens.');
      }
      setShowAddModal(false);
      setEditingScheme(null);
      setNewScheme(emptyScheme);
    } catch (err) {
      alert(err.response?.data?.detail || err.message || 'Could not save the scheme. Please try again.');
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-fadeIn pb-12 font-sans">
      <AdminSidebar />

      <main className="flex-1 min-w-0 space-y-6">
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold">Scheme Rules & Criteria Manager</h1>
            <p className="text-xs text-slate-300">Configure central & state scheme rules, age thresholds, and top-up fields.</p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-blue-900/30 transition flex items-center gap-1.5 border border-blue-400/30"
          >
            <Plus className="w-4 h-4" /> Add New Scheme Rule
          </button>
        </div>

        {/* Schemes Management Table */}
        <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-200 space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {schemes.map(s => (
              <div key={s.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-900">{s.nameEn}</span>
                    <span className="bg-blue-50 text-blue-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-blue-200/80">{s.level}</span>
                  </div>
                  <div className="text-xs text-slate-600 font-medium">
                    Min Age: <strong>{s.minAge}+ Yrs</strong> | Max Income: <strong>â‰¤ â‚¹{s.maxIncome.toLocaleString()}/yr</strong> | Payout: <strong className="text-emerald-700">{s.payoutEn}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEdit(s)}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl border border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100 transition flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await updateScheme(s.id, { status: s.isActive === false ? 'Active' : 'Paused' });
                      } catch (err) {
                        alert(err.response?.data?.detail || err.message || 'Could not update scheme status.');
                      }
                    }}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition ${
                      s.isActive !== false ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-200 text-slate-600 border-slate-300'
                    }`}
                  >
                    Status: {s.isActive !== false ? 'Active' : 'Paused'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add Scheme Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4 shadow-2xl animate-fadeIn">
              <h2 className="text-lg font-extrabold text-slate-900">{editingScheme ? 'Edit Scheme Rules' : 'Add New Senior Pension Scheme'}</h2>
              <form onSubmit={handleCreate} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold block mb-1">Scheme Name (English):</label>
                  <input
                    type="text"
                    required
                    value={newScheme.nameEn}
                    onChange={(e) => setNewScheme({ ...newScheme, nameEn: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Scheme Name (Tamil):</label>
                  <input
                    type="text"
                    required
                    value={newScheme.nameTa}
                    onChange={(e) => setNewScheme({ ...newScheme, nameTa: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold block mb-1">Min Age:</label>
                    <input
                      type="number"
                      value={newScheme.minAge}
                      onChange={(e) => setNewScheme({ ...newScheme, minAge: parseInt(e.target.value) })}
                      className="w-full p-2.5 bg-slate-50 border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Monthly Payout String:</label>
                    <input
                      type="text"
                      value={newScheme.payoutEn}
                      onChange={(e) => setNewScheme({ ...newScheme, payoutEn: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-md shadow-blue-900/30 transition border border-blue-400/30"
                  >
                    {editingScheme ? 'Save Changes' : 'Save Scheme Rule'}
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

