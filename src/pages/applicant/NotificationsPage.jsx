import React from 'react';
import { useApp } from '../../context/AppContext';
import { Bell, Sparkles, CheckCircle2, Volume2 } from 'lucide-react';

export const NotificationsPage = () => {
  const { language, notifications, speakText, setActiveTab, setSelectedAppIdForDetail, markNotificationRead } = useApp();

  const unread = notifications.filter(n => !n.read).length;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5 animate-fadeIn pb-16 font-sans">

      {/* ── Hero header ─────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 rounded-3xl px-6 py-8 sm:px-10 sm:py-10 shadow-xl border border-slate-800">
        <div className="flex items-center gap-2 text-cyan-300 font-extrabold text-xs uppercase tracking-wider mb-2">
          <Bell className="w-4 h-4 text-cyan-400" />
          Real-Time Alerts Center
        </div>
        {/* Explicit text-white so heading is always visible on dark bg */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
          {language === 'ta' ? 'அறிவிப்புகள் & தகவல்கள்' : 'My Notifications & Scheme Nudges'}
        </h1>
        {unread > 0 && (
          <p className="mt-2 text-sm text-cyan-200 font-semibold">
            {unread} unread {unread === 1 ? 'notification' : 'notifications'}
          </p>
        )}
      </div>

      {/* ── Notifications feed ───────────────────────────────────────────────── */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <Bell className="w-10 h-10 text-slate-300" />
          <p className="text-sm font-semibold text-slate-500">No notifications yet</p>
          <p className="text-xs text-slate-400">Application and scheme updates will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-5 rounded-2xl border transition shadow-sm space-y-2 ${
                n.read
                  ? 'bg-white border-slate-200'
                  : 'bg-blue-50/80 border-blue-200 ring-1 ring-blue-300'
              }`}
            >
              {/* Title + date */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900 min-w-0">
                  {n.type === 'status' || n.type === 'APPLICATION_STATUS_UPDATE' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                  )}
                  <span className="truncate">{language === 'ta' ? n.titleTa : n.titleEn}</span>
                </div>
                <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap shrink-0">
                  {n.date}
                </span>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'ta' ? n.descTa : n.descEn}
              </p>

              {/* Actions row */}
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => speakText(language === 'ta' ? n.descTa : n.descEn)}
                  className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1.5 transition"
                >
                  <Volume2 className="w-3.5 h-3.5 text-blue-500" />
                  Listen
                </button>
                <button
                  onClick={() => {
                    if (!n.read) markNotificationRead(n.id);
                    if (n.applicationId) setSelectedAppIdForDetail(n.applicationId);
                    setActiveTab(
                      n.type === 'status' || n.type === 'APPLICATION_STATUS_UPDATE'
                        ? 'tracker'
                        : n.type === 'scheme'
                        ? 'schemes'
                        : 'user-dash'
                    );
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
                >
                  View Details ➔
                </button>
              </div>

              {/* Unread pill */}
              {!n.read && (
                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 uppercase tracking-wide">
                  New
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
