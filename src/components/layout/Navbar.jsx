import React, { useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  Home,
  HelpCircle,
  FileText,
  Search,
  Bell,
  Sparkles,
  User,
  ShieldCheck,
  Menu,
  X,
  LogIn,
  LogOut,
  Workflow,
  Settings,
  History,
  Radio,
  MessageSquareHeart,
  FileCheck,
  ChevronDown,
  Languages,
  Check
} from 'lucide-react';

export const Navbar = () => {
  const {
    language,
    setLanguage,
    currentUser,
    userRole,
    logout,
    notifications,
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 gradient-hero text-white shadow-lg shadow-indigo-900/20 font-sans">

      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4">

        {/* Brand Logo & Tagline */}
        <Link
          to={userRole === 'ADMIN' ? '/admin/dashboard' : (currentUser ? '/' : '/')}
          className="flex items-center gap-3 group shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-md border border-blue-400/30">
            PS
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white group-hover:text-blue-300 transition">
                Pension Seva
              </span>
              {userRole === 'ADMIN' && (
                <span className="text-[10px] uppercase font-black tracking-wider bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full shadow-sm">
                  Admin
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-300 font-medium">
              Check. Apply. Track. Get Support.
            </p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1.5 text-xs font-semibold">

          {userRole === 'ADMIN' ? (
            /* Admin Nav Items */
            <>
              <NavLink
                to="/admin/dashboard"
                className={({ isActive }) => `px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${isActive ? 'bg-white/20 text-white font-bold shadow-sm' : 'text-blue-100 hover:bg-white/10'}`}
              >
                <span>Dashboard</span>
              </NavLink>
              <NavLink
                to="/admin/applications"
                className={({ isActive }) => `px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${isActive ? 'bg-white/20 text-white font-bold shadow-sm' : 'text-blue-100 hover:bg-white/10'}`}
              >
                <span>Applications Queue</span>
              </NavLink>
              <NavLink
                to="/admin/schemes"
                className={({ isActive }) => `px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${isActive ? 'bg-white/20 text-white font-bold shadow-sm' : 'text-blue-100 hover:bg-white/10'}`}
              >
                <span>Schemes</span>
              </NavLink>
              <NavLink
                to="/admin/rules"
                className={({ isActive }) => `px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${isActive ? 'bg-white/20 text-white font-bold shadow-sm' : 'text-blue-100 hover:bg-white/10'}`}
              >
                <span>Rules</span>
              </NavLink>
              <NavLink
                to="/admin/analytics"
                className={({ isActive }) => `px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${isActive ? 'bg-white/20 text-white font-bold shadow-sm' : 'text-blue-100 hover:bg-white/10'}`}
              >
                <span>Analytics</span>
              </NavLink>
              <NavLink
                to="/admin/reports"
                className={({ isActive }) => `px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${isActive ? 'bg-white/20 text-white font-bold shadow-sm' : 'text-blue-100 hover:bg-white/10'}`}
              >
                <span>Reports</span>
              </NavLink>
              <NavLink
                to="/admin/updates"
                className={({ isActive }) => `px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${isActive ? 'bg-white/20 text-white font-bold shadow-sm' : 'text-blue-100 hover:bg-white/10'}`}
              >
                <span>Updates</span>
              </NavLink>
              <NavLink
                to="/admin/audit-logs"
                className={({ isActive }) => `px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${isActive ? 'bg-white/20 text-white font-bold shadow-sm' : 'text-blue-100 hover:bg-white/10'}`}
              >
                <span>Audit Logs</span>
              </NavLink>
            </>
          ) : (
            /* Citizen / Public Nav Items */
            <>
              <NavLink
                to="/"
                className={({ isActive }) => `px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${isActive ? 'bg-white/20 text-white font-bold shadow-sm' : 'text-blue-100 hover:bg-white/10'}`}
              >
                <Home className="w-3.5 h-3.5 text-blue-300" />
                <span>{language === 'ta' ? 'à®®à¯à®•à®ªà¯à®ªà¯' : 'Home'}</span>
              </NavLink>

              <NavLink
                to="/how-it-works"
                className={({ isActive }) => `px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${isActive ? 'bg-white/20 text-white font-bold shadow-sm' : 'text-blue-100 hover:bg-white/10'}`}
              >
                <Workflow className="w-3.5 h-3.5 text-blue-300" />
                <span>{language === 'ta' ? 'à®šà¯†à®¯à®²à¯à®®à¯à®±à¯ˆ' : 'How It Works'}</span>
              </NavLink>

              <NavLink
                to="/schemes"
                className={({ isActive }) => `px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${isActive ? 'bg-white/20 text-white font-bold shadow-sm' : 'text-blue-100 hover:bg-white/10'}`}
              >
                <FileText className="w-3.5 h-3.5 text-blue-300" />
                <span>{language === 'ta' ? 'à®¤à®¿à®Ÿà¯à®Ÿà®™à¯à®•à®³à¯' : 'Schemes'}</span>
              </NavLink>

              <NavLink
                to="/eligibility"
                className={({ isActive }) => `px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${isActive ? 'bg-white/20 text-white font-bold shadow-sm' : 'text-blue-100 hover:bg-white/10'}`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{language === 'ta' ? 'à®¤à®•à¯à®¤à®¿ à®šà®°à®¿à®ªà®¾à®°à¯' : 'Check Eligibility'}</span>
              </NavLink>

              <NavLink
                to="/track"
                className={({ isActive }) => `px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${isActive ? 'bg-white/20 text-white font-bold shadow-sm' : 'text-blue-100 hover:bg-white/10'}`}
              >
                <Search className="w-3.5 h-3.5 text-cyan-300" />
                <span>{language === 'ta' ? 'à®•à®£à¯à®•à®¾à®£à®¿à®ªà¯à®ªà¯' : 'Track'}</span>
              </NavLink>

              <NavLink
                to="/welfare-assist"
                className={({ isActive }) => `px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${isActive ? 'bg-rose-600 text-white font-bold' : 'text-rose-300 hover:bg-white/10'}`}
              >
                <MessageSquareHeart className="w-3.5 h-3.5" />
                <span>{language === 'ta' ? 'à®‰à®¤à®µà®¿ à®ªà®¾à®Ÿà¯' : 'Welfare Assist'}</span>
              </NavLink>

              <NavLink
                to="/help"
                className={({ isActive }) => `px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${isActive ? 'bg-white/20 text-white font-bold shadow-sm' : 'text-blue-100 hover:bg-white/10'}`}
              >
                <HelpCircle className="w-3.5 h-3.5 text-blue-300" />
                <span>{language === 'ta' ? 'à®‰à®¤à®µà®¿' : 'Help'}</span>
              </NavLink>

              {currentUser && (
                <NavLink
                  to="/applications"
                  className={({ isActive }) => `px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${isActive ? 'bg-white/20 text-white font-bold shadow-sm' : 'text-blue-100 hover:bg-white/10'}`}
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-300" />
                  <span>{language === 'ta' ? 'à®Žà®©à®¤à¯ à®µà®¿à®£à¯à®£à®ªà¯à®ªà®™à¯à®•à®³à¯' : 'My Applications'}</span>
                </NavLink>
              )}

              {currentUser && (
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) => `px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${isActive ? 'bg-white/20 text-white font-bold shadow-sm' : 'text-blue-100 hover:bg-white/10'}`}
                >
                  <User className="w-3.5 h-3.5 text-blue-300" />
                  <span>{language === 'ta' ? 'à®Žà®©à®¤à¯ à®¤à®³à®®à¯' : 'My Dashboard'}</span>
                </NavLink>
              )}
            </>
          )}
        </nav>

        {/* Right CTA / Auth controls */}
        <div className="flex items-center gap-2">
          {currentUser ? (
            <div className="flex items-center gap-1.5">
              {/* Notification bell icon */}
              <Link
                to="/notifications"
                className="relative p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
                aria-label={language === 'ta' ? 'à®…à®±à®¿à®µà®¿à®ªà¯à®ªà¯à®•à®³à¯' : 'Notifications'}
                title={language === 'ta' ? 'à®…à®±à®¿à®µà®¿à®ªà¯à®ªà¯à®•à®³à¯' : 'Notifications'}
              >
                <Bell className="w-5 h-5 text-amber-300" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-400 text-amber-950 font-black text-[10px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full border-2 border-white/70">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              {/* Profile avatar */}
              <Link
                to={userRole === 'ADMIN' ? '/admin/dashboard' : '/profile'}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-xl border border-white/20 transition"
                title={currentUser.fullName}
              >
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center font-bold text-[11px]">
                  {currentUser.fullName ? currentUser.fullName[0].toUpperCase() : 'U'}
                </div>
                <span className="hidden md:inline max-w-[120px] truncate">{currentUser.fullName}</span>
              </Link>

              {/* Sign out icon */}
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/30 text-rose-200 transition"
                aria-label={language === 'ta' ? 'à®µà¯†à®³à®¿à®¯à¯‡à®±à¯' : 'Sign Out'}
                title={language === 'ta' ? 'à®µà¯†à®³à®¿à®¯à¯‡à®±à¯' : 'Sign Out'}
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-blue-100 hover:text-white hover:bg-white/10 transition flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5 text-blue-400" />
                <span>{language === 'ta' ? 'à®‰à®³à¯à®¨à¯à®´à¯ˆ' : 'Login'}</span>
              </Link>
              <Link
                to="/register"
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-900 hover:bg-blue-800 text-white shadow-md transition"
              >
                <span>{language === 'ta' ? 'à®ªà®¤à®¿à®µà¯à®šà¯†à®¯à¯' : 'Register'}</span>
              </Link>
            </div>
          )}

          {/* Language Dropdown */}
          <div className="relative">
            <button
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-[11px] font-bold border border-white/20 transition"
              aria-haspopup="listbox"
              aria-expanded={langDropdownOpen}
              aria-label={language === 'ta' ? 'à®®à¯Šà®´à®¿à®¤à¯ à®¤à¯‡à®°à¯à®µà¯' : 'Language selection'}
            >
              <Languages className="w-4 h-4 text-blue-300" />
              <span>{language === 'ta' ? 'à®¤à®®à®¿à®´à¯' : 'English'}</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${langDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {langDropdownOpen && (
              <ul
                className="absolute right-0 mt-2 w-36 bg-white border border-slate-200 rounded-xl shadow-2xl py-1 z-50 text-xs overflow-hidden"
                role="listbox"
              >
                {[{ code: 'en', label: 'English', sub: 'English' }, { code: 'ta', label: 'à®¤à®®à®¿à®´à¯', sub: 'Tamil' }].map(opt => (
                  <li key={opt.code}>
                    <button
                      onClick={() => { setLanguage(opt.code); setLangDropdownOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left transition ${language === opt.code ? 'bg-blue-600/20 text-blue-300' : 'text-slate-200 hover:bg-white/10'}`}
                      role="option"
                      aria-selected={language === opt.code}
                    >
                      <span>
                        <span className="block font-bold">{opt.label}</span>
                        <span className="block text-[10px] text-slate-400">{opt.sub}</span>
                      </span>
                      {language === opt.code && <Check className="w-3.5 h-3.5" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <nav aria-label="Main navigation" className="lg:hidden max-h-[75vh] overflow-y-auto bg-gradient-to-b from-indigo-700 to-blue-800 border-t border-white/15 px-4 py-4 space-y-1 text-sm font-semibold">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-white/10 text-slate-200"
          >
            <Home className="w-4 h-4 text-blue-400" />
            <span>Home</span>
          </Link>
          <Link
            to="/how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-white/10 text-slate-200"
          >
            <Workflow className="w-4 h-4 text-blue-400" />
            <span>How It Works</span>
          </Link>
          <Link
            to="/schemes"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-white/10 text-slate-200"
          >
            <FileText className="w-4 h-4 text-blue-400" />
            <span>Schemes</span>
          </Link>
          <Link
            to="/eligibility"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-white/10 text-slate-200"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Check Eligibility</span>
          </Link>
          <Link
            to="/track"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-white/10 text-slate-200"
          >
            <Search className="w-4 h-4 text-cyan-400" />
            <span>Track Application</span>
          </Link>
          <Link
            to="/welfare-assist"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-white/10 text-rose-300"
          >
            <MessageSquareHeart className="w-4 h-4" />
            <span>Welfare Assist</span>
          </Link>
          <Link
            to="/about"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-white/10 text-slate-200"
          >
            <ShieldCheck className="w-4 h-4 text-slate-400" />
            <span>About Pension Seva</span>
          </Link>
          <Link
            to="/help"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-white/10 text-slate-200"
          >
            <HelpCircle className="w-4 h-4 text-blue-400" />
            <span>Help & FAQ</span>
          </Link>
          <div className="pt-2 border-t border-slate-700">
            <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {language === 'ta' ? 'à®®à¯Šà®´à®¿ / Language' : 'Language / à®®à¯Šà®´à®¿'}
            </p>
            <div className="px-3">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full py-2 px-3 text-xs font-bold rounded-lg border bg-white/10 border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-white/40"
                aria-label={language === 'ta' ? 'à®®à¯Šà®´à®¿à®¤à¯ à®¤à¯‡à®°à¯à®µà¯' : 'Language selection'}
              >
                <option value="en">English</option>
                <option value="ta">à®¤à®®à®¿à®´à¯ (Tamil)</option>
              </select>
            </div>
          </div>
          {currentUser && (
            <div className="mt-3 border-t border-slate-700 pt-3">
              <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Your account</p>
              <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-200 hover:bg-white/10">
                <User className="h-4 w-4 text-blue-400" /> Dashboard
              </Link>
              <Link to="/applications" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-200 hover:bg-white/10">
                <FileText className="h-4 w-4 text-emerald-400" /> My Applications
              </Link>
              <Link to="/documents" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-200 hover:bg-white/10">
                <FileCheck className="h-4 w-4 text-amber-400" /> Documents
              </Link>
              <Link to="/pension-history" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-200 hover:bg-white/10">
                <History className="h-4 w-4 text-indigo-400" /> Pension History
              </Link>
              <Link to="/welfare-updates" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-200 hover:bg-white/10">
                <Radio className="h-4 w-4 text-cyan-400" /> Welfare Updates
              </Link>
              <Link to="/notifications" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-between rounded-lg px-3 py-2 text-slate-200 hover:bg-white/10">
                <span className="flex items-center gap-2"><Bell className="h-4 w-4 text-amber-400" /> Notifications</span>
                {unreadCount > 0 && <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{unreadCount}</span>}
              </Link>
              <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-200 hover:bg-white/10">
                <User className="h-4 w-4 text-slate-400" /> Profile
              </Link>
              <Link to="/settings" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-200 hover:bg-white/10">
                <Settings className="h-4 w-4 text-slate-400" /> Settings
              </Link>
            </div>
          )}
        </nav>
      )}
    </header>
  );
};




