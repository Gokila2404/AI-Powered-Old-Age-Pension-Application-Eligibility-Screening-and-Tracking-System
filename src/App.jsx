import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { VoiceAssistantDrawer } from './components/common/VoiceAssistantDrawer';
import { translatePage } from './translation/translatePage';

// Applicant Pages
import { HomePage } from './pages/applicant/HomePage';
import { AboutPage } from './pages/applicant/AboutPage';
import { SchemesPage } from './pages/applicant/SchemesPage';
import { EligibilityQuiz } from './pages/applicant/EligibilityQuiz';
import { LoginPage } from './pages/applicant/LoginPage';
import { RegisterPage } from './pages/applicant/RegisterPage';
import { ApplicationWizard } from './pages/applicant/ApplicationWizard';
import { StatusTrackerPage } from './pages/applicant/StatusTrackerPage';
import { NotificationsPage } from './pages/applicant/NotificationsPage';
import { HowItWorksPage } from './pages/applicant/HowItWorksPage';
import { HelpPage } from './pages/applicant/HelpPage';
import { UserDashboard } from './pages/applicant/UserDashboard';
import { WelfareAssistPage } from './pages/applicant/WelfareAssistPage';
import { ForgotPasswordPage } from './pages/applicant/ForgotPasswordPage';
import { SchemeDetailPage } from './pages/applicant/SchemeDetailPage';
import { OTPVerificationPage } from './pages/applicant/OTPVerificationPage';
import { NotFoundPage } from './pages/applicant/NotFoundPage';
import { ApplicantApplicationDetailPage, DocumentsPage, MyApplicationsPage, PensionHistoryPage, ProfilePage, SettingsPage, WelfareUpdatesPage } from './pages/applicant/UserServicePages';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminReviewQueue } from './pages/admin/AdminReviewQueue';
import { AdminApplicationDetail } from './pages/admin/AdminApplicationDetail';
import { AdminSchemeManagement } from './pages/admin/AdminSchemeManagement';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
import { AdminRuleManagement } from './pages/admin/AdminRuleManagement';
import { AdminAnalyticsPage } from './pages/admin/AdminAnalyticsPage';
import { AdminUpdatesPage } from './pages/admin/AdminUpdatesPage';
import { AdminAuditLogsPage } from './pages/admin/AdminAuditLogsPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';

const LiveUpdateToast = () => {
  const { toastMessage, currentUser } = useApp();
  const navigate = useNavigate();
  if (!toastMessage) return null;
  return (
    <button
      type="button"
      role="status"
      onClick={() => navigate(currentUser?.role === 'ADMIN' ? '/admin/applications' : '/notifications')}
      className="fixed right-4 top-4 z-[100] max-w-sm rounded-2xl border border-blue-200 bg-white px-5 py-4 text-left text-sm font-semibold text-slate-800 shadow-2xl ring-1 ring-blue-100"
    >
      <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-blue-700">Pension Seva Update</span>
      {toastMessage.message}
      <span className="mt-2 block text-[10px] font-bold text-blue-600">Click to view details</span>
    </button>
  );
};

const AdminRoute = ({ children }) => {
  const { userRole } = useApp();
  const location = useLocation();
  if (userRole !== 'ADMIN') {
    if (userRole === 'GUEST') {
      sessionStorage.setItem('pension_seva_next_route', `${location.pathname}${location.search}`);
    }
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-red-200 shadow-xl text-center space-y-4">
        <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold">
          🛡️
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-sm text-slate-600">
          Administrative credentials are required to view this portal. Please log in with an authorized officer account.
        </p>
        <div className="mt-4">
        <Navigate to="/admin/login" />
        </div>
      </div>
    );
  }
  return children;
};

const UserRoute = ({ children }) => {
  const { currentUser } = useApp();
  const location = useLocation();
  if (!currentUser) {
    sessionStorage.setItem('pension_seva_next_route', `${location.pathname}${location.search}`);
    return <Navigate to="/login" />;
  }
  if (currentUser.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
  return children;
};

const MainContent = () => {
  const location = useLocation();
  const { language } = useApp();
  const isAdmin = location.pathname.startsWith('/admin') && location.pathname !== '/admin/login';

  useEffect(() => {
    if (language !== 'ta') return undefined;
    return translatePage(document.getElementById('root'), 'ta');
  }, [language, location.pathname]);

  // Route changes should start at the top. In particular, completing OTP
  // must show the dashboard heading instead of preserving the login scroll.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  return (
    <main className="w-full px-3 sm:px-6 lg:px-8 py-4 min-h-[640px]">
      <div className="mx-auto w-full max-w-[1400px]">
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/schemes" element={<SchemesPage />} />
        <Route path="/schemes/:id" element={<SchemeDetailPage />} />
        <Route path="/eligibility" element={<EligibilityQuiz />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/verify-otp" element={<OTPVerificationPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/track" element={<UserRoute><StatusTrackerPage /></UserRoute>} />
        <Route path="/track/:id" element={<UserRoute><StatusTrackerPage /></UserRoute>} />
        <Route path="/welfare-assist" element={<WelfareAssistPage />} />
        <Route path="/help" element={<HelpPage />} />

        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* User Routes */}
        <Route path="/dashboard" element={<UserRoute><UserDashboard /></UserRoute>} />
        <Route path="/applications" element={<UserRoute><MyApplicationsPage /></UserRoute>} />
        <Route path="/applications/:applicationId" element={<UserRoute><ApplicantApplicationDetailPage /></UserRoute>} />
        <Route path="/application" element={<UserRoute><ApplicationWizard /></UserRoute>} />
        <Route path="/notifications" element={<UserRoute><NotificationsPage /></UserRoute>} />
        <Route path="/documents" element={<UserRoute><DocumentsPage /></UserRoute>} />
        <Route path="/pension-history" element={<UserRoute><PensionHistoryPage /></UserRoute>} />
        <Route path="/updates" element={<UserRoute><WelfareUpdatesPage /></UserRoute>} />
        <Route path="/welfare-updates" element={<UserRoute><WelfareUpdatesPage /></UserRoute>} />
        <Route path="/profile" element={<UserRoute><ProfilePage /></UserRoute>} />
        <Route path="/settings" element={<UserRoute><SettingsPage /></UserRoute>} />

        {/* Admin Routes */}
        <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/applications" element={<AdminRoute><AdminReviewQueue /></AdminRoute>} />
        <Route path="/admin/applications/:id" element={<AdminRoute><AdminApplicationDetail /></AdminRoute>} />
        <Route path="/admin/schemes" element={<AdminRoute><AdminSchemeManagement /></AdminRoute>} />
        <Route path="/admin/rules" element={<AdminRoute><AdminRuleManagement /></AdminRoute>} />
        <Route path="/admin/analytics" element={<AdminRoute><AdminAnalyticsPage /></AdminRoute>} />
        <Route path="/admin/reports" element={<AdminRoute><AdminReportsPage /></AdminRoute>} />
        <Route path="/admin/updates" element={<AdminRoute><AdminUpdatesPage /></AdminRoute>} />
        <Route path="/admin/audit-logs" element={<AdminRoute><AdminAuditLogsPage /></AdminRoute>} />

        {/* Admin Settings Fallback */}
        <Route path="/admin/settings" element={<AdminRoute><AdminSettingsPage /></AdminRoute>} />

        {/* 404 Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </div>
    </main>
  );
};

export default function App() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin') && location.pathname !== '/admin/login';
  return (
    <AppProvider>
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900 font-sans">
        <LiveUpdateToast />
        {!isAdmin && <Navbar />}
        <div className="flex-1">
          <MainContent />
        </div>
        <VoiceAssistantDrawer />
        {!isAdmin && <Footer />}
      </div>
    </AppProvider>
  );
}
