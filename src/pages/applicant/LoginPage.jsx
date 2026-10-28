import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  LogIn,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Volume2,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

export const LoginPage = () => {
  const { language, login, isLoading, errorMsg, setErrorMsg, speakText } = useApp();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleListen = () => {
    speakText("Citizen Sign In page. Enter your registered email or 10-digit mobile number and password to access your dashboard.");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setErrorMsg('');

    if (!identifier.trim()) {
      setLocalError('Please enter your email or mobile number.');
      return;
    }
    if (!password) {
      setLocalError('Please enter your password.');
      return;
    }

    try {
      const user = await login(identifier, password);
      if (user.otp_required) {
        navigate('/verify-otp?purpose=login', { state: { verification: user } });
        return;
      }
      // After sign-in, always start on the website home page for citizens,
      // and the admin dashboard for administrators. Discard any stale saved
      // route so users are never dropped into the application filing page.
      sessionStorage.removeItem('pension_seva_next_route');
      navigate(user.role === 'ADMIN' ? '/admin/dashboard' : '/', { replace: true });
    } catch (err) {
      // errorMsg handled in context
    }
  };

  return (
    <div className="max-w-md mx-auto my-8 p-6 sm:p-8 bg-white rounded-3xl border border-slate-200 shadow-xl space-y-6 text-left">
      
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto font-black text-xl">
          <LogIn className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          {language === 'ta' ? 'குடிமக்கள் உள்நுழைவு' : 'Citizen Sign In'}
        </h1>
        <p className="text-xs text-slate-500">
          Access your pension eligibility, application wizard, and tracking status
        </p>
        <button
          type="button"
          onClick={handleListen}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition"
        >
          <Volume2 className="w-3.5 h-3.5 text-amber-600" />
          <span>🔊 Listen</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1" role="tablist" aria-label="Sign in mode">
        <div role="tab" aria-selected="true" className="rounded-lg bg-white px-3 py-2 text-center text-xs font-bold text-blue-700 shadow-sm">Citizen Login</div>
        <Link role="tab" aria-selected="false" to="/admin/login" className="rounded-lg px-3 py-2 text-center text-xs font-semibold text-slate-600 hover:bg-white hover:text-blue-700 transition">Admin Login</Link>
      </div>

      {/* Error alert */}
      {(localError || errorMsg) && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <span>{localError || errorMsg}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Email Address or Mobile Number
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <input
              type="text"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
              }}
              placeholder="e.g. 9842109823 or citizen@pensionseva.in"
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Forgot Password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
              }}
              placeholder="Enter your account password"
              className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-md transition text-sm disabled:opacity-50"
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>

      </form>

      {/* Switch to Register */}
      <div className="text-center pt-2 border-t border-slate-100 text-xs text-slate-600">
        Don’t have an account yet?{' '}
        <Link to="/register" className="font-bold text-blue-600 hover:text-blue-700">
          Create Account
        </Link>
      </div>

    </div>
  );
};
