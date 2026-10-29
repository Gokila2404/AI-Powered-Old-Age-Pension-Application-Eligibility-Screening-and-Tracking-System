import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import api from '../../api/client';
import {
  Megaphone,
  Plus,
  Calendar,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Bell
} from 'lucide-react';

export const AdminUpdatesPage = () => {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    titleEn: '',
    titleTa: '',
    descEn: '',
    descTa: '',
    category: 'General Update',
    isPublished: true
  });
  const [editingId, setEditingId] = useState(null);

  const fetchUpdates = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/updates');
      setUpdates(res.data);
    } catch (err) {
      console.error('Failed to load system updates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpdates();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/admin/updates/${editingId}`, formData);
        alert('Announcement updated and re-broadcasted to connected citizens.');
      } else {
        await api.post('/admin/updates', formData);
        alert('Announcement published to all registered citizen accounts.');
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({
        titleEn: '', titleTa: '', descEn: '', descTa: '',
        category: 'General Update', isPublished: true
      });
      fetchUpdates();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save the announcement.');
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setFormData({
      titleEn: item.titleEn || '', titleTa: item.titleTa || '',
      descEn: item.descEn || '', descTa: item.descTa || '',
      category: item.category || 'General Update',
      isPublished: item.isPublished !== false
    });
    setShowModal(true);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-fadeIn pb-12 font-sans text-left">
      <AdminSidebar />

      <main className="flex-1 min-w-0 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="bg-indigo-500/20 text-indigo-300 text-xs font-bold px-3 py-1 rounded-full border border-indigo-400/30">
              Public Information Dissemination
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              System Announcements & Scheme Updates
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl">
              Broadcast welfare scheme modifications, annual pension revisions, and field camp schedules to all registered citizens.
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="px-5 py-3 bg-blue-900 hover:bg-blue-800 text-white font-extrabold text-xs rounded-xl shadow-lg transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Announcement</span>
          </button>
        </div>

        {/* Updates List */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-bold bg-white rounded-3xl border border-slate-200">
            Loading announcements...
          </div>
        ) : (
          <div className="space-y-4">
            {updates.map((item) => (
              <div key={item.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                      {item.category}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-400">
                      {item.id}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{item.date}</span>
                    <span className="text-slate-300">â€¢</span>
                    <span>By: {item.publishedBy}</span>
                    <button
                      onClick={() => openEdit(item)}
                      className="ml-2 text-[11px] font-bold text-blue-700 hover:text-blue-900 underline decoration-2 underline-offset-2"
                    >
                      Edit
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-slate-900 text-base">
                      {item.titleEn}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {item.descEn}
                    </p>
                  </div>

                  <div className="space-y-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="text-[10px] font-black text-slate-400 uppercase">Tamil Translation (à®¤à®®à®¿à®´à¯):</div>
                    <h4 className="font-extrabold text-slate-800 text-sm">
                      {item.titleTa || item.titleEn}
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {item.descTa || item.descEn}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-200 shadow-2xl space-y-5 animate-scaleUp">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-black text-slate-900">{editingId ? 'Edit Announcement' : 'Publish Announcement'}</h2>
                </div>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 font-black text-lg">
                  Ã—
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4 text-xs font-bold text-slate-700">
                <div className="space-y-1">
                  <label>Title (English)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Revised Destitute Old Age Pension Norms for 2026"
                    value={formData.titleEn}
                    onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label>Title (Tamil / à®¤à®®à®¿à®´à¯)</label>
                  <input
                    type="text"
                    placeholder="e.g. 2026 à®†à®®à¯ à®†à®£à¯à®Ÿà®¿à®±à¯à®•à®¾à®© à®®à¯à®¤à®¿à®¯à¯‹à®°à¯ à®‰à®¤à®µà®¿à®¤à¯à®¤à¯Šà®•à¯ˆ à®µà®¿à®¤à®¿à®®à¯à®±à¯ˆà®•à®³à¯"
                    value={formData.titleTa}
                    onChange={(e) => setFormData({ ...formData, titleTa: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label>Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="General Update">General Update</option>
                    <option value="New Scheme">New Scheme</option>
                    <option value="Disbursement Notification">Disbursement Notification</option>
                    <option value="Policy Revision">Policy Revision</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label>Detailed Announcement (English)</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Enter full details of the policy update or revision..."
                    value={formData.descEn}
                    onChange={(e) => setFormData({ ...formData, descEn: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label>Detailed Announcement (Tamil / à®¤à®®à®¿à®´à¯)</label>
                  <textarea
                    rows={3}
                    placeholder="à®…à®±à®¿à®µà®¿à®ªà¯à®ªà®¿à®©à¯ à®®à¯à®´à¯ à®µà®¿à®µà®°à®™à¯à®•à®³à¯ˆ à®¤à®®à®¿à®´à®¿à®²à¯ à®‰à®³à¯à®³à®¿à®Ÿà®µà¯à®®à¯..."
                    value={formData.descTa}
                    onChange={(e) => setFormData({ ...formData, descTa: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

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
                    {submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Publish to Citizens'}
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

