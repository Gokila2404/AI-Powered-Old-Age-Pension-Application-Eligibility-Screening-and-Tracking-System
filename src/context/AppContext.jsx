import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import i18n from '../i18n';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const navigate = useNavigate();
  // Localization & Accessibility
  const [language, setLanguageState] = useState(() => localStorage.getItem('pension_seva_lang') || 'en');
  const [fontScale, setFontScale] = useState(() => localStorage.getItem('pension_seva_font') || 'normal');

  useEffect(() => {
    i18n.changeLanguage(language);
    document.documentElement.lang = language === 'ta' ? 'ta' : 'en';
  }, [language]);
  const [highContrast, setHighContrastState] = useState(() => localStorage.getItem('pension_seva_contrast') === 'true');
  const [simpleMode, setSimpleModeState] = useState(() => localStorage.getItem('pension_seva_simple_mode') === 'true');
  const [speechSpeed, setSpeechSpeed] = useState(() => localStorage.getItem('pension_seva_speech_speed') || 'normal');

  // Auth State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('pension_seva_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Business Data
  const [applications, setApplications] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [systemUpdates, setSystemUpdates] = useState([]);
  const [eligibilityData, setEligibilityData] = useState(null);
  const [aiAssessmentResult, setAiAssessmentResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const [selectedAppIdForDetail, setSelectedAppIdForDetail] = useState(() => sessionStorage.getItem('pension_seva_selected_application'));
  const [userSidebarTab, setUserSidebarTab] = useState('overview');

  const wsRef = useRef(null);

  const userRole = currentUser ? currentUser.role : 'GUEST';
  const isAuthenticated = !!currentUser;
  const selectApplication = useCallback((id) => {
    setSelectedAppIdForDetail(id || null);
    if (id) sessionStorage.setItem('pension_seva_selected_application', id);
    else sessionStorage.removeItem('pension_seva_selected_application');
  }, []);

  const setActiveTab = useCallback((tab) => {
    const routes = {
      home: '/', quiz: '/eligibility', eligibility: '/eligibility',
      wizard: '/application', application: '/application',
      'my-applications': '/applications', documents: '/documents', history: '/pension-history',
      profile: '/profile', settings: '/settings', updates: '/welfare-updates', assist: '/welfare-assist',
      tracker: (selectedAppIdForDetail || sessionStorage.getItem('pension_seva_selected_application'))
        ? `/track/${selectedAppIdForDetail || sessionStorage.getItem('pension_seva_selected_application')}` : '/track',
      schemes: '/schemes', 'user-dash': '/dashboard', dashboard: '/dashboard',
      notifications: '/notifications', help: '/help',
      'admin-queue': '/admin/applications', 'admin-detail': (selectedAppIdForDetail || sessionStorage.getItem('pension_seva_selected_application'))
        ? `/admin/applications/${selectedAppIdForDetail || sessionStorage.getItem('pension_seva_selected_application')}` : '/admin/applications',
      'admin-dashboard': '/admin/dashboard'
    };
    navigate(routes[tab] || '/dashboard');
  }, [navigate, selectedAppIdForDetail]);

  const requireAuth = useCallback((destination) => {
    if (currentUser) {
      setActiveTab(destination);
      return;
    }
    sessionStorage.setItem('pension_seva_next_route', destination);
    navigate('/login');
  }, [currentUser, navigate, setActiveTab]);

  // Show temporary toast notification
  const showToast = useCallback((msg, type = 'info') => {
    const id = Date.now();
    setToastMessage({ message: msg, type, id });
    setTimeout(() => {
      setToastMessage(prev => prev?.id === id ? null : prev);
    }, 5000);
  }, []);

  // Speech Synthesis Helper
  const speakText = useCallback((text, langCode = null) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported in this browser environment.');
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const targetLang = langCode || (language === 'ta' ? 'ta-IN' : 'en-IN');
      utterance.lang = targetLang;

      // Rate control based on setting
      if (speechSpeed === 'slow') utterance.rate = 0.75;
      else if (speechSpeed === 'fast') utterance.rate = 1.05;
      else utterance.rate = 0.88;

      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('Speech synthesis error:', err);
    }
  }, [language, speechSpeed]);

  const stopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const switchLanguage = (lang) => {
    setLanguageState(lang);
    i18n.changeLanguage(lang);
    localStorage.setItem('pension_seva_lang', lang);
    document.documentElement.lang = lang === 'ta' ? 'ta' : 'en';
    speakText(
      lang === 'ta' ? 'தமிழ் மொழி தேர்ந்தெடுக்கப்பட்டது' : 'English language selected',
      lang === 'ta' ? 'ta-IN' : 'en-IN'
    );
  };

  const setHighContrast = () => {
    setHighContrastState(prev => {
      const next = !prev;
      localStorage.setItem('pension_seva_contrast', String(next));
      return next;
    });
  };

  const setSimpleMode = (val) => {
    setSimpleModeState(val);
    localStorage.setItem('pension_seva_simple_mode', String(val));
    if (val) {
      speakText(language === 'ta' ? 'எளிய பயன்முறை இயக்கப்பட்டது' : 'Simple Mode activated');
    }
  };

  // Sync Schemes
  const fetchSchemes = useCallback(async () => {
    try {
      const endpoint = currentUser?.role === 'ADMIN' ? '/admin/schemes' : '/schemes';
      const res = await api.get(endpoint);
      setSchemes(res.data);
    } catch (err) {
      console.error('Failed to fetch schemes from backend:', err);
    }
  }, [currentUser]);

  // Sync Applications
  const fetchApplications = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await api.get('/applications');
      setApplications(res.data);
    } catch (err) {
      console.error('Failed to fetch applications:', err);
    }
  }, [currentUser]);

  // Sync Notifications
  const fetchNotifications = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, [currentUser]);

  const fetchSystemUpdates = useCallback(async () => {
    if (!currentUser || currentUser.role === 'ADMIN') return;
    try {
      const res = await api.get('/users/me/updates');
      setSystemUpdates(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch published updates:', err);
    }
  }, [currentUser]);

  // Keep the visible React auth state aligned with the token. Without this,
  // a 401 cleared storage but left a stale user profile on screen.
  useEffect(() => {
    const onSessionExpired = (event) => {
      if (!currentUser) return;
      const path = window.location.pathname;
      if (path !== '/login' && path !== '/admin/login') {
        sessionStorage.setItem('pension_seva_next_route', path);
      }
      setCurrentUser(null);
      setApplications([]);
      setNotifications([]);
      setSystemUpdates([]);
      setErrorMsg(typeof event.detail === 'string' ? event.detail : 'Your sign-in session has expired. Please sign in again.');
      navigate(currentUser.role === 'ADMIN' ? '/admin/login' : '/login', { replace: true });
    };
    window.addEventListener('pension:session-expired', onSessionExpired);
    return () => window.removeEventListener('pension:session-expired', onSessionExpired);
  }, [currentUser, navigate]);

  useEffect(() => {
    fetchSchemes();
  }, [fetchSchemes]);

  useEffect(() => {
    if (currentUser) {
      fetchApplications();
      fetchNotifications();
      fetchSystemUpdates();
    } else {
      setApplications([]);
      setNotifications([]);
      setSystemUpdates([]);
    }
  }, [currentUser, fetchApplications, fetchNotifications, fetchSystemUpdates]);

  // Real-time updates use WebSockets with periodic API refresh as a fallback.
  useEffect(() => {
    if (!currentUser) return undefined;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const token = sessionStorage.getItem('pension_seva_token') || '';
    const wsUrl = `${protocol}//${host}/api/ws?token=${token}`;

    let socket;
    let reconnectTimer;
    let heartbeatTimer;
    let closed = false;
    const connect = () => {
      if (closed) return;
      try {
        socket = new WebSocket(wsUrl);
        wsRef.current = socket;
        socket.onopen = () => {
          console.log('Pension Seva WebSocket connected.');
          heartbeatTimer = setInterval(() => {
            if (socket?.readyState === WebSocket.OPEN) socket.send('ping');
          }, 25000);
        };
        socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'APPLICATION_STATUS_UPDATE') {
            fetchApplications();
            fetchNotifications();
            showToast(`Application ${data.applicationId} status updated to ${data.status}`, 'info');
            speakText(`Application update received. Status is now ${data.status}.`);
          } else if (data.type === 'NEW_SCHEME_PUBLISHED') {
            fetchSchemes();
            fetchNotifications();
            showToast(`New Scheme Published: ${data.name}`, 'success');
          } else if (data.type === 'SYSTEM_UPDATE_PUBLISHED') {
            fetchSystemUpdates();
            fetchNotifications();
            showToast(`New announcement: ${data.update?.titleEn || 'Welfare update'}`, 'info');
          } else if (data.type === 'NEW_APPLICATION_SUBMITTED') {
            fetchApplications();
            if (currentUser?.role === 'ADMIN') showToast(`New Application Submitted: ${data.applicationId} (${data.applicant})`, 'info');
          }
        } catch (e) {
          // Plain message
        }
      };
        socket.onclose = () => {
          clearInterval(heartbeatTimer);
          if (!closed) reconnectTimer = setTimeout(connect, 2500);
        };
        socket.onerror = () => socket.close();
      } catch (err) { reconnectTimer = setTimeout(connect, 2500); }
    };
    connect();
    const refreshTimer = setInterval(() => {
      fetchApplications();
      fetchNotifications();
      fetchSchemes();
      fetchSystemUpdates();
    }, 15000);

    return () => {
      closed = true;
      clearInterval(refreshTimer);
      clearInterval(heartbeatTimer);
      clearTimeout(reconnectTimer);
      if (socket) socket.close();
    };
  }, [currentUser, fetchApplications, fetchNotifications, fetchSchemes, fetchSystemUpdates, showToast, speakText]);

  // Auth Operations
  const acceptAuthenticatedSession = (session) => {
    const { access_token, user } = session;
    sessionStorage.setItem('pension_seva_token', access_token);
    sessionStorage.setItem('pension_seva_user', JSON.stringify(user));
    setApplications([]);
    setNotifications([]);
    setCurrentUser(user);
    if (user.settings) {
      if (user.settings.simple_mode !== undefined) setSimpleModeState(user.settings.simple_mode);
      if (user.settings.speech_speed) setSpeechSpeed(user.settings.speech_speed);
      if (user.settings.high_contrast !== undefined) setHighContrastState(user.settings.high_contrast);
    }
    return user;
  };

  const login = async (identifier, password, otp = '') => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await api.post('/auth/login', { identifier, password }, { timeout: 40000 });
      if (res.data.otp_required) return res.data;
      const user = acceptAuthenticatedSession(res.data);

      speakText(
        language === 'ta'
          ? `வணக்கம் ${user.fullName}! உங்கள் கணக்கில் வெற்றிகரமாக நுழைந்துள்ளீர்கள்.`
          : `Welcome back, ${user.fullName}!`
      );
      return user;
    } catch (err) {
      const msg = err.response?.data?.detail || (err.code === 'ECONNABORTED' ? 'Email delivery timed out. Please try again.' : err.message || 'Invalid login credentials.');
      setErrorMsg(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const adminLogin = async (identifier, password) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await api.post('/auth/admin-login', { identifier, password }, { timeout: 40000 });
      if (res.data.otp_required) return res.data;
      const user = acceptAuthenticatedSession(res.data);
      speakText('Welcome to Pension Seva Administrative Review Portal.');
      return user;
    } catch (err) {
      const msg = err.response?.data?.detail || (err.code === 'ECONNABORTED' ? 'Email delivery timed out. Please try again.' : err.message || 'Invalid administrator credentials.');
      setErrorMsg(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await api.post('/auth/register', userData);
      const user = acceptAuthenticatedSession(res.data);
      speakText(
        language === 'ta'
          ? `பதிவு வெற்றிகரமாக முடிந்தது. வணக்கம் ${user.fullName}!`
          : `Registration successful. Welcome to Pension Seva, ${user.fullName}!`
      );
      return user;
    } catch (err) {
      const msg = err.response?.data?.detail || 'Registration failed. Please check your details.';
      setErrorMsg(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    stopSpeech();
    sessionStorage.removeItem('pension_seva_token');
    sessionStorage.removeItem('pension_seva_user');
    setCurrentUser(null);
    setApplications([]);
    setNotifications([]);
    speakText(language === 'ta' ? 'வெற்றிகரமாக வெளியேறிவிட்டீர்கள்.' : 'You have been signed out successfully.');
  };

  // Eligibility Evaluation
  const runEligibilityAssessment = async (inputData) => {
    setIsLoading(true);
    try {
      const res = await api.post('/eligibility/check', inputData);
      setEligibilityData(inputData);
      setAiAssessmentResult(res.data);
      return res.data;
    } catch (err) {
      console.error('Eligibility assessment failed:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Application
  const submitApplication = async (payload) => {
    if (!sessionStorage.getItem('pension_seva_token')) {
      window.dispatchEvent(new CustomEvent('pension:session-expired', {
        detail: 'Your sign-in session has expired. Sign in again to submit your application.'
      }));
      throw new Error('Your sign-in session has expired. Sign in again to submit your application.');
    }
    setIsLoading(true);
    try {
      const res = await api.post('/applications', payload);
      setApplications(prev => [res.data, ...prev]);
      fetchNotifications();
      return res.data;
    } catch (err) {
      console.error('Application submission error:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const addScheme = async (scheme) => {
    const payload = {
      nameEn: scheme.nameEn,
      nameTa: scheme.nameTa,
      deptEn: scheme.deptEn || 'Social Welfare Department',
      deptTa: scheme.deptTa || 'சமூக நலத்துறை',
      payoutEn: scheme.payoutEn || 'As per scheme rules',
      payoutTa: scheme.payoutTa || 'திட்ட விதிகளின்படி',
      minAge: Number(scheme.minAge) || 0,
      maxIncome: Number(scheme.maxIncome) || 0,
      residenceRequired: scheme.residenceRequired || 'Tamil Nadu',
      benefitType: scheme.benefitType || scheme.level || 'Welfare benefit',
      requiredDocuments: scheme.requiredDocuments || ['Aadhaar Card', 'Income Certificate', 'Bank Passbook'],
      descriptionEn: scheme.descriptionEn || '',
      descriptionTa: scheme.descriptionTa || '',
      isActive: scheme.status !== 'Paused' && scheme.isActive !== false
    };
    const res = await api.post('/admin/schemes', payload);
    setSchemes(prev => [res.data, ...prev.filter(item => item.id !== res.data.id)]);
    return res.data;
  };

  const updateScheme = async (schemeId, changes) => {
    const current = schemes.find(item => item.id === schemeId);
    if (!current) throw new Error('Scheme not found. Refresh the page and try again.');
    const updated = { ...current, ...changes };
    if (changes.status) updated.isActive = changes.status === 'Active';
    const payload = {
      nameEn: updated.nameEn, nameTa: updated.nameTa,
      deptEn: updated.deptEn, deptTa: updated.deptTa,
      payoutEn: updated.payoutEn, payoutTa: updated.payoutTa,
      minAge: Number(updated.minAge), maxIncome: Number(updated.maxIncome),
      residenceRequired: updated.residenceRequired || 'Tamil Nadu',
      benefitType: updated.benefitType || 'Welfare benefit',
      requiredDocuments: updated.requiredDocuments || [],
      descriptionEn: updated.descriptionEn || '', descriptionTa: updated.descriptionTa || '',
      isActive: updated.isActive !== false
    };
    const res = await api.put(`/admin/schemes/${schemeId}`, payload);
    setSchemes(prev => prev.map(item => item.id === schemeId ? res.data : item));
    return res.data;
  };

  // Admin Decisions
  const reviewApplication = async (appId, action, remarks, sanctionOrderNo = null, correctionField = null) => {
    setIsLoading(true);
    try {
      const res = await api.put(`/admin/applications/${appId}/review`, {
        action,
        remarks,
        sanctionOrderNo,
        correctionField
      });
      setApplications(prev => prev.map(a => a.id === appId ? res.data : a));
      return res.data;
    } catch (err) {
      console.error('Review decision failed:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Mark notification read
  const markNotificationRead = async (notifId) => {
    try {
      await api.put(`/notifications/${notifId}/read`);
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    }
  };

  return (
    <AppContext.Provider value={{
      language,
      setLanguage: switchLanguage,
      fontScale,
      setFontScale: (scale) => { setFontScale(scale); localStorage.setItem('pension_seva_font', scale); },
      highContrast,
      setHighContrast,
      simpleMode,
      setSimpleMode,
      speechSpeed,
      setSpeechSpeed: (speed) => { setSpeechSpeed(speed); localStorage.setItem('pension_seva_speech_speed', speed); },
      currentUser,
      userSidebarTab,
      setUserSidebarTab,
      setActiveTab,
      requireAuth,
      selectedAppIdForDetail,
      setSelectedAppIdForDetail: selectApplication,
      userRole,
      isAuthenticated,
      applications,
      schemes,
      notifications,
      systemUpdates,
      eligibilityData,
      setEligibilityData,
      aiAssessmentResult,
      setAiAssessmentResult,
      isLoading,
      errorMsg,
      setErrorMsg,
      toastMessage,
      showToast,
      login,
      adminLogin,
      register,
      acceptAuthenticatedSession,
      logout,
      runEligibilityAssessment,
      submitApplication,
      addScheme,
      updateScheme,
      reviewApplication,
      markNotificationRead,
      markAllNotificationsRead,
      fetchApplications,
      fetchSchemes,
      fetchNotifications,
      speakText,
      stopSpeech,
    }}>
      <div className={`font-scale-${fontScale} ${highContrast ? 'high-contrast' : ''} ${simpleMode ? 'simple-mode-active' : ''}`}>
        {children}
      </div>
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
