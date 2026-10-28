import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import {
  Lock,
  Mail,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ArrowRight
} from 'lucide-react';

export const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(1); // 1: Request OTP, 2: Enter OTP & New Password, 3: Success
  const [emailOrMobile, setEmailOrMobile] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpNotice, setOtpNotice] = useState('');
  const verificationToken = location.state?.verificationToken;

  useEffect(() => {
    if (verificationToken) {
      setEmailOrMobile(location.state?.accountIdentifier || '');
      setOtpNotice('Your email has been verified. Choose a new password.');
      setStep(2);
    }
  }, [verificationToken, location.state]);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!emailOrMobile.trim()) {
      setError('Please provide your registered email or mobile number.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { mobileOrEmail: emailOrMobile.trim() });
      navigate('/verify-otp?purpose=forgot-password', {
        state: {
          verification: res.data,
          accountIdentifier: emailOrMobile.trim(),
        },
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Account lookup failed. Please verify your details.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (!verificationToken) {
      setError('Verify your email before resetting the password.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        verification_token: verificationToken,
        newPassword,
        confirmPassword
      });
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.detail || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-8 p-6 sm:p-8 bg-white rounded-3xl border border-slate-200 shadow-xl space-y-6 text-left">
      
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto font-black text-xl">
          <KeyRound className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Reset Password
        </h1>
        <p className="text-xs text-slate-500">
          Recover your Pension Seva account credentials securely
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {step === 1 && (
        <form onSubmit={handleRequestOtp} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Registered Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="text"
                value={emailOrMobile}
                onChange={(e) => setEmailOrMobile(e.target.value)}
              placeholder="Enter your registered email"
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">The verification code is sent by email. SMS codes are not supported.</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-md transition text-sm disabled:opacity-50"
          >
            {loading ? 'Sending OTP...' : 'Send Verification OTP'}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleResetPassword} className="space-y-4">
          {otpNotice && <p className="rounded-xl border border-blue-200 bg-blue-50 p-2.5 text-xs text-blue-700">{otpNotice}</p>}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 6 characters"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-md transition text-sm disabled:opacity-50"
          >
            {loading ? 'Updating Password...' : 'Reset Password'}
          </button>
        </form>
      )}

      {step === 3 && (
        <div className="text-center space-y-4 py-4">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">Password Updated Successfully</h3>
          <p className="text-xs text-slate-600">
            Your new password has been set. You can now log into your account.
          </p>
          <Link
            to="/login"
            className="inline-block w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-sm transition"
          >
            Proceed to Login
          </Link>
        </div>
      )}

      <div className="text-center pt-2 border-t border-slate-100 text-xs text-slate-600">
        <Link to="/login" className="font-bold text-blue-600 hover:text-blue-700">
          Back to Login
        </Link>
      </div>

    </div>
  );
};
