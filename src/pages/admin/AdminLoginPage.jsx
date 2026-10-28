import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Mail,
  AlertCircle,
  Eye,
  EyeOff,
  Volume2
} from 'lucide-react';

export const AdminLoginPage = () => {
  const { adminLogin, isLoading, errorMsg, setErrorMsg, speakText } = useApp();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleListen = () => {
    speakText("Administrative Officer Sign In Portal. Restricted to authorized welfare officers and revenue administrators.");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setErrorMsg('');

    if (!identifier.trim()) {
      setLocalError('Please enter authorized officer email or ID.');
      return;
    }
    if (!password) {
      setLocalError('Please enter administrator password.');
      return;
    }

    try {
      const user = await adminLogin(identifier, password);
      if (user.otp_required) {
        navigate('/verify-otp?purpose=login', { state: { verification: user } });
        return;
      }
      navigate('/admin/dashboard');
    } catch (err) {
      // errorMsg handled in context
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 p-6 sm:p-8 bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-2xl space-y-6 text-left">
      
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30 font-black text-xl">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">
          Administrative Portal
        </h1>
        <p className="text-xs text-slate-400">
          Restricted to authorized revenue officers and review administrators
        </p>
        <button
          type="button"
          onClick={handleListen}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold transition"
        >
          <Volume2 className="w-3.5 h-3.5 text-amber-400" />
          <span>ðŸ”Š Listen</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-700 bg-slate-800 p-1" role="tablist" aria-label="Sign in mode">
        <Link role="tab" aria-selected="false" to="/login" className="rounded-lg px-3 py-2 text-center text-xs font-semibold text-slate-300 hover:bg-slate-700 transition">Citizen Login</Link>
        <div role="tab" aria-selected="true" className="rounded-lg bg-blue-600 px-3 py-2 text-center text-xs font-bold text-white">Admin Login</div>
      </div>

      {/* Warning statement */}
      <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-300 text-[11px] leading-relaxed">
        <span className="font-bold text-amber-300 block mb-0.5">Authorization Notice:</span>
        All administrative reviews, approvals, and status transitions are recorded in permanent system audit logs. Public user registration is not permitted on this portal.
      </div>

      {/* Error alert */}
      {(localError || errorMsg) && (
        <div className="p-3.5 rounded-2xl bg-red-900/40 border border-red-800 text-red-200 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
          <span>{localError || errorMsg}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        
        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5">
            Officer Email / ID
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
            <input
              type="text"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
              }}
              placeholder="e.g. admin@pensionseva.in"
              className="w-full pl-9 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1.5">
            Admin Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
              }}
              placeholder="Enter administrator password"
              className="w-full pl-9 pr-10 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>


        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-2xl shadow-lg transition text-sm disabled:opacity-50"
        >
          {isLoading ? 'Verifying Credentials...' : 'Authenticate & Access Queue'}
        </button>

      </form>

      <div className="text-center pt-2 border-t border-slate-800 text-xs text-slate-400">
        Citizen applicant?{' '}
        <Link to="/login" className="font-bold text-blue-400 hover:text-blue-300">
          Citizen Sign In
        </Link>
      </div>

    </div>
  );
};

