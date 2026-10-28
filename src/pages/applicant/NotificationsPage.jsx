import React from 'react';
import { useApp } from '../../context/AppContext';
import { Bell, Sparkles, CheckCircle2, Volume2, ShieldAlert } from 'lucide-react';

export const NotificationsPage = () => {
  const { language, notifications, speakText, setActiveTab, setSelectedAppIdForDetail, markNotificationRead } = useApp();

  return (
    <div className="w-full space-y-6 animate-fadeIn pb-12 font-sans">

      {/* Header */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-cyan-300 font-extrabold text-xs uppercase tracking-wider">
            <Bell className="w-4 h-4 text-cyan-400" /> Real-Time Alerts Center
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">
            {language === 'ta' ? 'அறிவிப்புகள் & தகவல்கள்' : 'My Notifications & Scheme Nudges'}
          </h1>
        </div>
      </div>

      {/* Notifications Feed */}
      <div className="space-y-3">
        {notifications.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            You have no notifications yet. Application and scheme updates will appear here.
          </div>
        )}
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`p-5 rounded-2xl border transition shadow-sm space-y-2 ${
              n.read ? 'bg-white border-slate-200' : 'bg-blue-50/80 border-blue-200 ring-1 ring-blue-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900">
                {n.type === 'status' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Sparkles className="w-4 h-4 text-blue-600" />
                )}
                <span>{language === 'ta' ? n.titleTa : n.titleEn}</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">{n.date}</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              {language === 'ta' ? n.descTa : n.descEn}
            </p>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => speakText(language === 'ta' ? n.descTa : n.descEn)}
                className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 transition"
              >
                <Volume2 className="w-4 h-4 text-blue-600" /> Listen
              </button>

              <button
                onClick={() => {
                  if (!n.read) markNotificationRead(n.id);
                  if (n.applicationId) setSelectedAppIdForDetail(n.applicationId);
                  setActiveTab(n.type === 'status' || n.type === 'APPLICATION_STATUS_UPDATE' ? 'tracker' : (n.type === 'scheme' ? 'schemes' : 'user-dash'));
                }}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
              >
                View Details ➔
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
