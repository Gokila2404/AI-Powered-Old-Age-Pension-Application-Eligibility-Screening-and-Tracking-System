import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import api from '../../api/client';
import {
  UserPlus,
  User,
  Mail,
  Phone,
  Lock,
  Languages,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  Volume2
} from 'lucide-react';

export const RegisterPage = () => {
  const { language, isLoading, errorMsg, setErrorMsg, speakText } = useApp();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [preferredLang, setPreferredLang] = useState('en');
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleListen = () => {
    speakText("Citizen Registration Page. Fill your full name, 10-digit mobile number, email, and choose a secure password to create your account.");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setErrorMsg('');

    if (!fullName.trim() || fullName.trim().length < 2) {
      setLocalError('Please enter your full name (at least 2 characters).');
      return;
    }
    const cleanMobile = mobile.trim();
    if (!cleanMobile || cleanMobile.length < 10) {
      setLocalError('Please enter a valid 10-digit mobile phone number.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setLocalError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must contain at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Password and confirmation password do not match.');
      return;
    }
    if (!agreeTerms) {
      setLocalError('Please accept the Terms and Privacy Policy to proceed.');
      return;
    }

    try {
      const registrationData = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        mobile: cleanMobile,
        password,
        preferredLanguage: preferredLang
      };
      const response = await api.post('/auth/send-otp', {
        mobileOrEmail: registrationData.email,
        purpose: 'registration',
      }, { timeout: 40000 });
      navigate('/verify-otp?purpose=registration', {
        state: { verification: response.data, registrationData },
      });
    } catch (err) {
      setLocalError(err.response?.data?.detail || (err.code === 'ECONNABORTED' ? 'Email delivery timed out. Please try again.' : err.message || 'Could not send the verification code.'));
    }
  };

  return (
    <div className="max-w-md mx-auto my-8 p-6 sm:p-8 bg-white rounded-3xl border border-slate-200 shadow-xl space-y-6 text-left">
      
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto font-black text-xl">
          <UserPlus className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          {language === 'ta' ? 'புதிய கணக்கு பதிவு' : 'Create Citizen Account'}
        </h1>
        <p className="text-xs text-slate-500">
          Register to screen eligibility, prepare applications, and upload documents
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
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Full Name (as per documents) *
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Lakshmi Devi"
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Mobile Number *
          </label>
          <div className="relative">
            <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="e.g. 9842109823"
              maxLength={15}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Email Address *
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
              }}
              placeholder="e.g. citizen@example.com"
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>


        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 chars"
                className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-3 text-slate-400"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Confirm Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Preferred Language
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPreferredLang('en')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl border transition ${preferredLang === 'en' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-700 border-slate-200'}`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setPreferredLang('ta')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl border transition ${preferredLang === 'ta' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-700 border-slate-200'}`}
            >
              தமிழ் (Tamil)
            </button>
          </div>
        </div>

        {/* Checkbox */}
        <div className="flex items-start gap-2.5 pt-1">
          <input
            type="checkbox"
            id="terms"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
          />
          <label htmlFor="terms" className="text-xs text-slate-600 leading-tight">
            I agree to the <Link to="/about" className="text-blue-600 underline font-semibold">Terms and Privacy Policy</Link> and consent to automated document pre-screening.
          </label>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-md transition text-sm disabled:opacity-50"
        >
          {isLoading ? 'Please wait...' : 'Send Code to Verify Email'}
        </button>

      </form>

      {/* Switch to Login */}
      <div className="text-center pt-2 border-t border-slate-100 text-xs text-slate-600">
        Already have an account?{' '}
        <Link to="/login" className="font-bold text-blue-600 hover:text-blue-700">
          Sign In
        </Link>
      </div>

    </div>
  );
};
