import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileCheck2,
  BookOpen,
  GitBranch,
  BarChart3,
  FileSpreadsheet,
  Megaphone,
  ShieldCheck,
  History,
  Settings,
  LogOut
} from 'lucide-react';

export const AdminSidebar = () => {
  const navItems = [
    { to: '/admin/dashboard', label: 'Executive Overview', icon: LayoutDashboard },
    { to: '/admin/applications', label: 'Review Queue', icon: FileCheck2 },
    { to: '/admin/schemes', label: 'Schemes', icon: BookOpen },
    { to: '/admin/rules', label: 'Rules & Versions', icon: GitBranch },
    { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/admin/reports', label: 'Reports', icon: FileSpreadsheet },
    { to: '/admin/updates', label: 'Announcements', icon: Megaphone },
    { to: '/admin/audit-logs', label: 'Audit Logs', icon: History },
  ];

  return (
    <aside className="w-full lg:w-64 lg:fixed lg:top-0 lg:bottom-0 lg:left-0 lg:z-30 lg:p-3">
      <nav className="lg:h-full lg:overflow-y-auto bg-[#092d49] text-slate-200 rounded-2xl p-4 border border-[#164866] font-sans shadow-lg flex flex-col">
        <NavLink to="/admin/dashboard" className="flex items-center gap-3 px-2 py-3 mb-5 border-b border-white/10">
          <img src="/assets/logo.png" alt="" className="w-9 h-9 rounded-xl bg-white object-contain p-1" />
          <span><strong className="block text-sm text-white">Pension Seva</strong><small className="text-[10px] text-sky-200">Admin Panel</small></span>
        </NavLink>
        <p className="px-3 mb-2 text-[10px] uppercase tracking-widest font-bold text-sky-300">Workspace</p>
        <div className="flex flex-wrap lg:flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} end={item.to === '/admin/dashboard'}
                className={({ isActive }) => `px-3 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-3 transition ${isActive ? 'bg-sky-600 text-white shadow-md' : 'text-sky-100/75 hover:bg-white/10 hover:text-white'}`}>
                <Icon className="w-4 h-4 shrink-0" /><span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
        <div className="mt-auto pt-4 border-t border-white/10 hidden lg:block">
          <NavLink to="/admin/settings" className="px-3 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-3 text-sky-100/75 hover:bg-white/10"><Settings className="w-4 h-4" />Settings</NavLink>
          <NavLink to="/admin/login" className="px-3 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-3 text-sky-100/75 hover:bg-white/10"><LogOut className="w-4 h-4" />Admin sign in</NavLink>
        </div>
      </nav>
    </aside>
  );
};
