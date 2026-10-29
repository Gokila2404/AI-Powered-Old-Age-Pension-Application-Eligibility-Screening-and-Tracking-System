import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { KeyRound, ShieldCheck, Volume2, AlertCircle, CheckCircle2, Eye, Mail } from 'lucide-react';
import api from '../../api/client';
import { useApp } from '../../context/AppContext';
import { OTPInput } from '../../components/auth/OTPInput';

const PURPOSES = {
  registration: { title: 'otp.title_registration', successRoute: '/dashboard' },
  login: { title: 'otp.title_login' },
  'forgot-password': { title: 'otp.title_forgot', successRoute: '/forgot-password' },
  'application-submit': { title: 'otp.title_application', successRoute: '/application' },
  'change-email': { title: 'otp.title_change', successRoute: '/profile' },
  'change-mobile': { title: 'otp.title_change', successRoute: '/profile' },
  'sensitive-action': { title: 'otp.title_generic', successRoute: '/profile' },
};

export const OTPVerificationPage = () => {
  const [searchParams] = useSearchParams();
  const purpose = searchParams.get('purpose') || '';
  const config = PURPOSES[purpose];
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { language, speakText, acceptAuthenticatedSession, register } = useApp();
  const [verification, setVerification] = useState(location.state?.verification || null);
  const registrationData = location.state?.registrationData;

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [success, setSuccess] = useState(false);
  const [expiresAt, setExpiresAt] = useState(() => Date.now() + (verification?.expires_in || 120) * 1000);
  const [resendAt, setResendAt] = useState(() => Date.now() + (verification?.resend_after || 30) * 1000);
  const [secondsLeft, setSecondsLeft] = useState(verification ? verification.expires_in || 120 : 0);
  const [resendLeft, setResendLeft] = useState(verification ? verification.resend_after || 30 : 0);

  // If email delivery failed, the server returns demo_code in the response.
  // Auto-fill the OTP input and show an on-screen banner so users can still verify.
  const [demoCode, setDemoCode] = useState(verification?.demo_code || null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
      setResendLeft(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    }, 500);
    return () => window.clearInterval(timer);
  }, [expiresAt, resendAt]);

  const expiresLabel = useMemo(() => {
    const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
    const seconds = String(secondsLeft % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  }, [secondsLeft]);

  const goAfterVerification = async (result) => {
    if (purpose === 'login') {
      const user = acceptAuthenticatedSession(result);
      // Land on the website home page after citizen sign-in; admins go
      // straight to their review dashboard. Discard stale saved routes so
      // users are never dropped into the application filing page.
      sessionStorage.removeItem('pension_seva_next_route');
      const destination = user.role === 'ADMIN' ? '/admin/dashboard' : '/';
      navigate(destination, { replace: true });
      return;
    }
    if (purpose === 'registration') {
      if (!registrationData) throw new Error(t('otp.session_missing'));
      await register(registrationData);
      // New accounts land on the website home page instead of the filing page.
      sessionStorage.removeItem('pension_seva_next_route');
      navigate('/', { replace: true });
      return;
    }
    if (purpose === 'forgot-password') {
      navigate('/forgot-password', {
        replace: true,
        state: {
          verificationToken: result.verification_token,
          accountIdentifier: location.state?.accountIdentifier,
        },
      });
      return;
    }
    if (purpose === 'application-submit') {
      navigate('/application', { replace: true, state: { verifiedPurpose: purpose, applicationDraft: location.state?.applicationDraft } });
      return;
    }
    if (purpose === 'change-email' && result.user) {
      acceptAuthenticatedSession({
        access_token: sessionStorage.getItem('pension_seva_token'),
        user: result.user,
      });
    }
    navigate(config?.successRoute || '/profile', { replace: true, state: { verifiedPurpose: purpose } });
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    if (!verification?.verification_id || code.length !== 6 || secondsLeft <= 0 || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await api.post('/auth/verify-otp', {
        verification_id: verification.verification_id,
        purpose,
        otp: code,
      });
      setSuccess(true);
      speakText(language === 'ta' ? 'சரிபார்ப்பு வெற்றிகரமாக முடிந்தது.' : 'Your verification was successful. Continuing.');
      window.setTimeout(() => {
        goAfterVerification(response.data).catch((continuationError) => {
          setSuccess(false);
          setError(continuationError.response?.data?.detail || continuationError.message || t('otp.unavailable'));
        });
      }, 600);
    } catch (err) {
      setCode('');
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      setError(status === 429 ? (detail || t('otp.locked')) : status === 400 && /expired/i.test(detail || '') ? t('otp.expired') : status === 400 ? (detail || t('otp.wrong')) : t('otp.unavailable'));
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    if (!verification?.verification_id || resendLeft > 0 || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await api.post('/auth/resend-otp', {
        verification_id: verification.verification_id,
        purpose,
      });
      const next = response.data;
      setVerification(next);
      setCode('');
      setExpiresAt(Date.now() + next.expires_in * 1000);
      setResendAt(Date.now() + next.resend_after * 1000);
      setSecondsLeft(next.expires_in);
      setResendLeft(next.resend_after);
      setNotice(next.message || 'New code sent.');
      // If resend also fell back to console, update demoCode so user can see the new code
      if (next.demo_code) setDemoCode(next.demo_code);
    } catch (err) {
      const status = err.response?.status;
      setError(status === 429 ? (err.response?.data?.detail || t('otp.locked')) : err.response?.data?.detail || t('otp.unavailable'));
    } finally {
      setBusy(false);
    }
  };

  if (!config || !verification?.verification_id) {
    return (
      <section className="mx-auto my-12 max-w-lg rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-xl">
        <AlertCircle className="mx-auto h-10 w-10 text-amber-600" />
        <h1 className="mt-4 text-xl font-black text-slate-900">{t('otp.session_missing')}</h1>
        <p className="mt-2 text-sm text-slate-600">{t('otp.email_only')}</p>
        <Link to={purpose === 'registration' ? '/register' : purpose === 'forgot-password' ? '/forgot-password' : purpose === 'application-submit' ? '/application' : '/login'} className="mt-6 inline-flex rounded-xl bg-blue-700 px-5 py-3 font-bold text-white">{t('otp.restart')}</Link>
      </section>
    );
  }

  return (
    <section className="mx-auto my-8 w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
      <div className="bg-gradient-to-br from-blue-950 to-blue-800 px-6 py-7 text-center text-white sm:px-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-sky-200">
          <ShieldCheck className="h-7 w-7" aria-hidden="true" />
        </div>
        <p className="mt-4 text-xs font-bold tracking-wide text-blue-100">Pension Seva · {t('otp.tagline')}</p>
        <h1 className="mt-2 text-2xl font-black sm:text-3xl">{t(config.title)}</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-blue-100">{t('otp.description')}</p>
      </div>

      <div className="space-y-6 px-5 py-7 sm:px-10">
        <div className="text-center">
          <p className="text-sm font-bold text-slate-800">{t('otp.sent', { destination: verification.destination_masked })}</p>
          <p className="mt-1 text-xs text-slate-500">{t('otp.email_only')}</p>
        </div>

        {error && <div role="alert" aria-live="polite" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
        {notice && <div role="status" aria-live="polite" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center text-sm font-semibold text-emerald-800">{notice}</div>}
        {success && <div role="status" className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 p-3 font-bold text-emerald-800"><CheckCircle2 className="h-5 w-5" />{t('otp.success')} · {t('otp.continuing')}</div>}

        {/* Email-delivery fallback banner — shown when server cannot send email
            (Render Free blocks SMTP; Brevo/Resend not configured).
            The server returns demo_code in the API response in this case. */}
        {demoCode && !success && (
          <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 px-4 py-4 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">
              ⚠️ Email unavailable — use this code
            </p>
            <p className="text-[11px] text-amber-600 mb-3">
              The email server is not reachable. Your verification code is shown below.
            </p>
            <div className="text-4xl font-black tracking-[0.3em] text-amber-900 bg-white rounded-xl py-3 px-4 border border-amber-300 shadow-sm mb-3">
              {demoCode}
            </div>
            <button
              type="button"
              onClick={() => setCode(demoCode)}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition"
            >
              Use this code ↓
            </button>
          </div>
        )}

        {!success && <form onSubmit={handleVerify} className="space-y-6">
          <OTPInput value={code} onChange={setCode} disabled={busy || secondsLeft <= 0} />
          <div className="text-center text-sm font-bold text-slate-600" aria-live="polite">
            {secondsLeft > 0 ? t('otp.expires', { time: expiresLabel }) : t('otp.expired')}
          </div>
          <button type="submit" disabled={busy || code.length !== 6 || secondsLeft <= 0} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-base font-black text-white shadow-md transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-45">
            <KeyRound className="h-5 w-5" />{busy ? t('otp.verifying') : t('otp.verify')}
          </button>
          <div className="text-center">
            <button type="button" onClick={handleResend} disabled={busy || resendLeft > 0} className="min-h-11 px-4 font-bold text-blue-700 underline decoration-2 underline-offset-4 disabled:text-slate-400 disabled:no-underline">
              {busy ? t('otp.sending') : resendLeft > 0 ? t('otp.resend_wait', { seconds: resendLeft }) : t('otp.resend')}
            </button>
          </div>
        </form>}

        <button type="button" onClick={() => speakText(language === 'ta' ? 'உங்கள் மின்னஞ்சலுக்கு அனுப்பிய ஆறு இலக்க சரிபார்ப்புக் குறியீட்டை உள்ளிடவும்.' : 'Please enter the six digit verification code sent to your registered email.')} className="mx-auto flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
          <Volume2 className="h-4 w-4" />{t('otp.speak')}
        </button>
      </div>
    </section>
  );
};
