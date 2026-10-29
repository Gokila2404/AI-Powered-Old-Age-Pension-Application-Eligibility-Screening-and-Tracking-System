import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileCheck2,
  BookOpen,
  GitBranch,
  BarChart3,
  FileSpreadsheet,
  Megaphone,
  History,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

const NAV_ITEMS = [
  { to: '/admin/dashboard',    label: 'Dashboard',          icon: LayoutDashboard },
  { to: '/admin/applications', label: 'Review Queue',       icon: FileCheck2 },
  { to: '/admin/schemes',      label: 'Schemes',            icon: BookOpen },
  { to: '/admin/rules',        label: 'Rules & Versions',   icon: GitBranch },
  { to: '/admin/analytics',    label: 'Analytics',          icon: BarChart3 },
  { to: '/admin/reports',      label: 'Reports',            icon: FileSpreadsheet },
  { to: '/admin/updates',      label: 'Announcements',      icon: Megaphone },
  { to: '/admin/audit-logs',   label: 'Audit Logs',         icon: History },
];

const linkClass = (isActive) =>
  `flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-xs transition whitespace-nowrap ${
    isActive
      ? 'bg-sky-600 text-white shadow-md'
      : 'text-sky-100/80 hover:bg-white/10 hover:text-white'
  }`;

export const AdminSidebar = () => {
  const { logout } = useApp();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  /* ── Sidebar content (shared by desktop + mobile drawer) ─────────────────── */
  const SidebarContent = () => (
    <nav className="h-full flex flex-col bg-[#092d49] text-slate-200 rounded-2xl p-4 border border-[#164866] shadow-lg">

      {/* Brand */}
      <NavLink
        to="/admin/dashboard"
        className="flex items-center gap-3 px-2 py-3 mb-5 border-b border-white/10"
        onClick={() => setMobileOpen(false)}
      >
        {/* PS logo tile — no external image needed */}
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-white text-sm shrink-0">
          PS
        </div>
        <span>
          <strong className="block text-sm text-white">Pension Seva</strong>
          <small className="text-[10px] text-sky-300">Admin Panel</small>
        </span>
      </NavLink>

      <p className="px-3 mb-2 text-[10px] uppercase tracking-widest font-bold text-sky-400">
        Workspace
      </p>

      {/* Nav links */}
      <div className="flex flex-col gap-0.5 flex-1 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/admin/dashboard'}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => linkClass(isActive)}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>

      {/* Footer actions */}
      <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-0.5">
        <NavLink
          to="/admin/settings"
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) => linkClass(isActive)}
        >
          <Settings className="w-4 h-4 shrink-0" />
          <span>Settings</span>
        </NavLink>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-xs text-rose-300 hover:bg-rose-900/40 hover:text-rose-200 transition w-full text-left"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </nav>
  );

  return (
    <>
      {/* ── Mobile top bar ────────────────────────────────────────────────────── */}
      <div className="lg:hidden flex items-center justify-between bg-[#092d49] text-white px-4 py-3 mb-4 rounded-2xl border border-[#164866] shadow">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-white text-xs">
            PS
          </div>
          <span className="font-extrabold text-sm text-white">Admin Panel</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition"
          aria-label="Toggle admin menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden mb-4">
          <SidebarContent />
        </div>
      )}

      {/* ── Desktop fixed sidebar ──────────────────────────────────────────────── */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:top-0 lg:bottom-0 lg:left-0 lg:w-64 lg:z-30 p-3">
        <SidebarContent />
      </aside>
    </>
  );
};
