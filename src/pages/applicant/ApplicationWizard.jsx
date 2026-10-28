import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import api from '../../api/client';
import {
  FileText,
  User,
  Home,
  IndianRupee,
  Building,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Volume2,
  Sparkles,
  FileCheck,
  RefreshCw,
  Eye,
  Check,
  X,
  Send,
  HelpCircle,
  FileWarning
} from 'lucide-react';

export const ApplicationWizard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const draft = location.state?.applicationDraft || {};
  const {
    language,
    currentUser,
    schemes,
    eligibilityData,
    submitApplication,
    speakText,
    setActiveTab,
    setSelectedAppIdForDetail
  } = useApp();

  const [currentStep, setCurrentStep] = useState(draft.currentStep || 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(null);
  const [stepError, setStepError] = useState('');
  const [stepWarnings, setStepWarnings] = useState([]);
  const [otpVerified, setOtpVerified] = useState(Boolean(location.state?.verifiedPurpose));

  // Scheme Selection
  const [selectedSchemeId, setSelectedSchemeId] = useState(
    draft.selectedSchemeId ||
    new URLSearchParams(location.search).get('schemeId') ||
    eligibilityData?.selectedSchemeId ||
    eligibilityData?.recommendedSchemeId ||
    'IGNOAPS-TN'
  );
  const schemeSelectionLocked = Boolean(eligibilityData?.schemeSelectionLocked);

  // Step 1: Personal Information (Smart auto-filled from currentUser & eligibilityData)
  const [personalInfo, setPersonalInfo] = useState(draft.personalInfo || {
    fullName: currentUser?.fullName || '',
    dob: currentUser?.dob || '',
    gender: currentUser?.gender || '',
    mobile: currentUser?.mobile || '',
    email: currentUser?.email || '',
    aadhaarLast4: ''
  });

  // Keep the registered user's name & contact details in sync â€” a late-loading
  // profile or a stale draft must never leave the applicant name blank.
  useEffect(() => {
    if (!currentUser?.fullName) return;
    setPersonalInfo((prev) => ({
      ...prev,
      fullName: prev.fullName?.trim() ? prev.fullName : currentUser.fullName,
      mobile: prev.mobile?.trim() ? prev.mobile : (currentUser.mobile || ''),
      email: prev.email?.trim() ? prev.email : (currentUser.email || '')
    }));
  }, [currentUser?.fullName, currentUser?.mobile, currentUser?.email]);

  // Step 2: Address (Smart carry-forward)
  const [addressInfo, setAddressInfo] = useState(draft.addressInfo || {
    doorNo: '',
    street: '',
    villageTown: '',
    district: eligibilityData?.district || '',
    state: eligibilityData?.residenceState || currentUser?.addressInfo?.state || 'Tamil Nadu',
    pinCode: ''
  });

  // Step 3: Income (Smart carry-forward)
  const [incomeInfo, setIncomeInfo] = useState(draft.incomeInfo || {
    annualIncome: eligibilityData?.annualIncome ?? '',
    incomeSource: '',
    incomeCertificateNo: ''
  });

  // Step 4: Existing Benefits
  const [existingBenefitsInfo, setExistingBenefitsInfo] = useState(draft.existingBenefitsInfo || {
    hasExistingPension: eligibilityData?.hasExistingPension || false,
    otherWelfareBenefits: false,
    schemeName: eligibilityData?.existingPensionName || '',
    benefitAmount: 0
  });

  // Step 5: Bank Details
  const [bankInfo, setBankInfo] = useState(draft.bankInfo || {
    accountHolderName: currentUser?.fullName || '',
    bankName: '',
    branch: '',
    accountNumber: '',
    ifscCode: ''
  });

  // Step 6: Document Upload & Processing State
  const [uploadedDocs, setUploadedDocs] = useState(draft.uploadedDocs || []);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [documentReviews, setDocumentReviews] = useState(() => {
    if (draft.documentReviews) return draft.documentReviews;
    if (!draft.latestProcessResult?.docId) return {};
    return {
      [draft.latestProcessResult.docId]: {
        result: draft.latestProcessResult,
        confirmedFields: draft.confirmedFields || {},
        dismissed: Boolean(draft.autoFillAlertDismissed)
      }
    };
  });
  const [documentCheckResult, setDocumentCheckResult] = useState(draft.documentCheckResult || null);
  const [documentCheckLoading, setDocumentCheckLoading] = useState(false);
  const [showRawOcr, setShowRawOcr] = useState({});

  const documentCheckSignature = JSON.stringify({
    docIds: uploadedDocs.map(doc => doc.docId).sort(), personalInfo, addressInfo, incomeInfo, bankInfo,
  });
  const documentsFullyMatched = documentCheckResult?.status === 'MATCHED'
    && documentCheckResult.signature === documentCheckSignature;

  const runDocumentCheck = async (docs = uploadedDocs) => {
    if (!docs.length) {
      setDocumentCheckResult({ status: 'NEEDS_REVIEW', message: 'Upload the required documents before continuing.', documents: [] });
      return true;
    }
    setDocumentCheckLoading(true);
    try {
      const response = await api.post('/documents/check-application-details', {
        docIds: docs.map(doc => doc.docId), personalInfo, addressInfo, incomeInfo, bankInfo,
      });
      const signature = JSON.stringify({
        docIds: docs.map(doc => doc.docId).sort(), personalInfo, addressInfo, incomeInfo, bankInfo,
      });
      const result = { ...response.data, signature };
      setDocumentCheckResult(result);
      if (result.status !== 'MATCHED') {
        setStepError(`${result.message || 'Some document details do not match.'} You can still continue to review and correct the information.`);
      }
      return true;
    } catch (error) {
      const detail = error.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : (detail?.message || 'Could not verify the documents. Please try again.');
      setDocumentCheckResult({
        status: 'NEEDS_REVIEW',
        message,
        documents: detail?.documentChecks || [],
      });
      setStepError(`${message} You can still continue to review and correct the information.`);
      return true;
    } finally {
      setDocumentCheckLoading(false);
    }
  };

  // Step 7: Consent & Declaration
  const [userConsent, setUserConsent] = useState(draft.userConsent || false);

  // Scheme-specific dynamic questions (served by /schemes/{id}/application-form)
  const [schemeForm, setSchemeForm] = useState(draft.schemeForm || null);
  const [schemeFormLoading, setSchemeFormLoading] = useState(false);
  const [schemeAnswers, setSchemeAnswers] = useState(draft.schemeAnswers || {});
  const setSchemeAnswer = (key, value) => setSchemeAnswers(prev => ({ ...prev, [key]: value }));

  // Fetch the per-scheme application form whenever the selected scheme changes
  useEffect(() => {
    let cancelled = false;
    setSchemeFormLoading(true);
    api.get(`/schemes/${selectedSchemeId}/application-form`)
      .then((res) => { if (!cancelled) setSchemeForm(res.data); })
      .catch(() => {
        if (!cancelled) setSchemeForm({ schemeId: selectedSchemeId, fields: [], requiredDocuments: [], applyNotes: '' });
      })
      .finally(() => { if (!cancelled) setSchemeFormLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSchemeId]);


  // Apply eligibility data only once on first load. Re-running this on every
  // eligibilityData change would overwrite income/district values the user or
  // the OCR auto-fill has since corrected (extraction "mismatch" bug).
  const appliedEligibilityRef = React.useRef(false);
  useEffect(() => {
    if (eligibilityData && !appliedEligibilityRef.current && !draft.incomeInfo) {
      appliedEligibilityRef.current = true;
      if (eligibilityData.district) {
        setAddressInfo(prev => ({ ...prev, district: eligibilityData.district }));
      }
      if (eligibilityData.annualIncome) {
        setIncomeInfo(prev => ({ ...prev, annualIncome: eligibilityData.annualIncome }));
      }
      if (eligibilityData.selectedSchemeId || eligibilityData.recommendedSchemeId) {
        setSelectedSchemeId(eligibilityData.selectedSchemeId || eligibilityData.recommendedSchemeId);
      }
    }
  }, [eligibilityData]);

  // Handle Document Upload & Quality Check API
  const handleFileUpload = async (e, docType) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10 MB limit.');
      return;
    }

    setUploadLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('docType', docType);

    try {
      const res = await api.post('/documents/upload-and-process', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const proc = res.data;
      const replacedDoc = uploadedDocs.find(d => d.docType === docType);

      // Add to uploaded docs array
      setUploadedDocs(prev => [
        ...prev.filter(d => d.docType !== docType),
        {
          docId: proc.docId,
          docType: docType,
          fileName: proc.originalName,
          qualityStatus: proc.quality.overallQuality,
          qualityDetails: proc.quality,
          extractedFields: proc.extractedFields
        }
      ]);
      setDocumentReviews(prev => {
        const next = { ...prev };
        if (replacedDoc) delete next[replacedDoc.docId];
        next[proc.docId] = { result: proc, confirmedFields: {}, dismissed: false };
        return next;
      });

      const nextDocs = [
        ...uploadedDocs.filter(d => d.docType !== docType),
        { docId: proc.docId, docType, fileName: proc.originalName, qualityStatus: proc.quality.overallQuality, extractedFields: proc.extractedFields },
      ];
      await runDocumentCheck(nextDocs);

      speakText(
        language === 'ta'
          ? 'à®†à®µà®£à®®à¯ à®µà¯†à®±à¯à®±à®¿à®•à®°à®®à®¾à®• à®ªà®¤à®¿à®µà¯‡à®±à¯à®±à®ªà¯à®ªà®Ÿà¯à®Ÿà¯ à®µà®¿à®µà®°à®™à¯à®•à®³à¯ à®Žà®Ÿà¯à®•à¯à®•à®ªà¯à®ªà®Ÿà¯à®Ÿà®¤à¯.'
          : proc.extractionStatus === 'FAILED'
            ? 'Document uploaded, but readable text could not be extracted. Check the processing message or enter details manually.'
            : proc.extractionStatus === 'NEEDS_REVIEW'
              ? 'Text was read from the document, but the fields need manual review.'
              : 'Document processed. Review the values read from the uploaded file before continuing.'
      );

    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data?.message;
      const message = typeof detail === 'string'
        ? detail
        : detail?.message || (err.request
          ? 'Could not reach the application server. Make sure the backend is running, then try uploading again.'
          : err.message || 'Document upload failed.');
      alert(message);
    } finally {
      setUploadLoading(false);
    }
  };

  // Fields are NOT hard-required: applicants may move freely between any
  // steps and come back later. validateCurrentStep only reports FORMAT
  // problems for values actually typed, returned as gentle warnings that
  // never block navigation.
  const validateCurrentStep = () => {
    const warnings = [];
    if (currentStep === 1 && String(personalInfo.aadhaarLast4 || '') !== '' && !/^\d{4}$/.test(String(personalInfo.aadhaarLast4))) {
      warnings.push('The Aadhaar digits entered are incomplete (4 digits expected).');
    }
    if (currentStep === 1 && personalInfo.dob && (Number.isNaN(Date.parse(personalInfo.dob)) || new Date(personalInfo.dob) > new Date())) {
      warnings.push('The date of birth entered looks invalid (it is in the future).');
    }
    if (currentStep === 1 && personalInfo.mobile && !/^[6-9]\d{9}$/.test(String(personalInfo.mobile).replace(/\D/g, '').slice(-10))) {
      warnings.push('The mobile number entered does not look like a valid 10-digit Indian number.');
    }
    if (currentStep === 1 && personalInfo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalInfo.email)) {
      warnings.push('The email address entered looks incomplete.');
    }
    if (currentStep === 2 && addressInfo.pinCode && !/^\d{6}$/.test(String(addressInfo.pinCode).trim())) {
      warnings.push('The PIN code entered is not 6 digits.');
    }
    if (currentStep === 3 && incomeInfo.annualIncome !== '' && incomeInfo.annualIncome !== undefined && (!Number.isFinite(Number(incomeInfo.annualIncome)) || Number(incomeInfo.annualIncome) < 0)) {
      warnings.push('The annual income entered must be a non-negative number.');
    }
    if (currentStep === 5) {
      if (bankInfo.accountNumber && !/^\d{9,18}$/.test(String(bankInfo.accountNumber).replace(/\s/g, ''))) {
        warnings.push('Bank account numbers normally contain 9 to 18 digits.');
      }
      if (bankInfo.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(String(bankInfo.ifscCode).trim().toUpperCase())) {
        warnings.push('The IFSC code entered does not look valid (e.g. SBIN0001234).');
      }
    }
    return warnings;
  };

  const advanceWizard = async () => {
    // Never block navigation - only surface gentle, dismissible warnings.
    setStepWarnings(validateCurrentStep());
    setStepError('');
    if (currentStep === 7 && !documentsFullyMatched) await runDocumentCheck();
    setCurrentStep(prev => Math.min(8, prev + 1));
  };

  // Submission handler
  const handleFinalSubmit = async () => {
    if (!userConsent) {
      alert('Please check the declaration consent box to proceed.');
      return;
    }

    if (!otpVerified) {
      try {
        const response = await api.post('/auth/send-otp', {
          mobileOrEmail: currentUser.email,
          purpose: 'application-submit',
        }, { timeout: 40000 });
        navigate('/verify-otp?purpose=application-submit', {
          state: {
            verification: response.data,
            applicationDraft: {
              currentStep, selectedSchemeId, personalInfo, addressInfo, incomeInfo,
              existingBenefitsInfo, bankInfo, uploadedDocs, documentReviews,
              documentCheckResult, userConsent,
              schemeForm, schemeAnswers,
            },
          },
        });
      } catch (err) {
        alert(err.response?.data?.detail || 'Could not send the email verification code.');
      }
      return;
    }

    setIsSubmitting(true);
    const payload = {
      schemeId: selectedSchemeId,
      personalInfo,
      addressInfo,
      incomeInfo,
      existingBenefitsInfo,
      bankInfo,
      uploadedDocs,
      schemeAnswers: schemeAnswers || {},
      userConsent: true,
      aiScoreSnapshot: eligibilityData?.aiScore ?? null,
      eligibilitySnapshot: eligibilityData || null,
    };

    try {
      const res = await submitApplication(payload);
      setSubmissionSuccess(res);
      setSelectedAppIdForDetail(res.id);
      speakText(
        language === 'ta'
          ? `à®µà®¿à®£à¯à®£à®ªà¯à®ªà®®à¯ à®µà¯†à®±à¯à®±à®¿à®•à®°à®®à®¾à®• à®šà®®à®°à¯à®ªà¯à®ªà®¿à®•à¯à®•à®ªà¯à®ªà®Ÿà¯à®Ÿà®¤à¯. à®ªà®¤à®¿à®µà¯ à®Žà®£à¯ ${res.id}`
          : `Application submitted successfully. Your Application ID is ${res.id}`
      );
    } catch (err) {
      const detail = err.response?.data?.detail;
      let message;
      if (Array.isArray(detail)) {
        message = detail.map((item) => `${(item.loc || []).slice(-1)[0] || 'Field'}: ${item.msg}`).join('\n');
      } else if (detail && typeof detail === 'object' && (detail.missing || detail.errors || detail.documentChecks)) {
        const parts = [];
        if (detail.message) parts.push(detail.message);
        if (detail.missing && detail.missing.length) parts.push('Missing documents: ' + detail.missing.join(', '));
        if (detail.documentChecks?.length) {
          setDocumentCheckResult({ status: 'NEEDS_CORRECTION', message: detail.message, documents: detail.documentChecks });
          setCurrentStep(6);
          parts.push(...detail.documentChecks.filter(item => item.status !== 'MATCHED').map(item => `${item.docType}: ${item.reason}`));
        }
        if (detail.errors && detail.errors.length) {
          parts.push('Missing questions: ' + detail.errors.map((e) => (typeof e === 'string' ? e : (e.label || e.message || ''))).join(', '));
        }
        message = parts.join('\n');
      } else {
        message = typeof detail === 'string' ? detail : (err.message || 'Application submission failed. Please try again.');
      }
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepsList = [
    '1. Personal Info',
    '2. Address',
    '3. Income Details',
    '4. Existing Benefits',
    '5. Bank Account',
    '6. Scheme Questions',
    '7. Documents & OCR',
    '8. Review & Submit'
  ];

  return (
    <div className="w-full py-6 font-sans space-y-8">
      
      {/* SUCCESS MODAL / CONFIRMATION VIEW */}
      {submissionSuccess ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-6 animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              {submissionSuccess.status === 'REJECTED' ? 'AI Screening Complete' : 'Sent for Manual Review'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              Pension Application Registered
            </h1>
            <p className="text-sm text-slate-600 max-w-lg mx-auto">
              {submissionSuccess.status === 'REJECTED'
                ? 'The preliminary AI score was below 50, so this application was rejected at screening. You can review the result and next steps in application tracking.'
                : 'Your preliminary AI screening passed. The application is now in the administrative review queue. You will receive a notification when an officer updates the result.'}
            </p>
          </div>

          <div className="gradient-hero text-white rounded-2xl p-6 max-w-md mx-auto space-y-2 shadow-xl shadow-indigo-900/25">
            <div className="text-[10px] text-blue-100 uppercase font-black tracking-widest">Official Application ID</div>
            <div className="text-2xl sm:text-3xl font-mono font-black text-amber-300 tracking-wider">
              {submissionSuccess.id}
            </div>
            <div className="text-[11px] text-blue-100">
              Status: <span className="text-emerald-300 font-bold">{submissionSuccess.status}</span> â€¢ AI Score: <span className="text-amber-300 font-bold">{submissionSuccess.aiScore}/100</span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={() => {
                setSelectedAppIdForDetail(submissionSuccess.id);
                setActiveTab('tracker');
              }}
              className="bg-blue-900 hover:bg-blue-800 text-white font-extrabold text-xs sm:text-sm px-6 py-3 rounded-xl shadow transition flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              <span>Track Application Live</span>
            </button>

            <button
              onClick={() => setActiveTab('user-dash')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm px-6 py-3 rounded-xl border border-slate-200 transition"
            >
              Back to User Dashboard
            </button>
          </div>
        </div>
      ) : (

        /* 8-STEP APPLICATION WIZARD FORM */
        <div className="space-y-6">
          
          {/* Top Card: Progress & Scheme Info */}
          <div className="rounded-3xl border border-white/60 bg-white/80 backdrop-blur p-6 shadow-lg shadow-blue-900/5 space-y-4 text-left">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-white bg-gradient-to-r from-blue-900 via-blue-950 to-indigo-950 px-3 py-1 rounded-full shadow-sm">
                  Smart Application Wizard
                </span>
                <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-blue-700 to-violet-700 bg-clip-text text-transparent mt-2">
                  Step {currentStep} of 8: {stepsList[currentStep - 1]}
                </h1>
                <p className="text-xs text-slate-500">
                  {language === 'ta'
                    ? `à®µà®¿à®£à¯à®£à®ªà¯à®ªà®¤à®¾à®°à®°à¯: ${personalInfo.fullName || currentUser?.fullName || 'à®µà®¿à®°à¯à®¨à¯à®¤à®¿à®©à®°à¯'} â€” à®¤à®•à¯à®¤à®¿ à®šà®°à®¿à®ªà®¾à®°à¯à®ªà¯à®ªà®¿à®²à®¿à®°à¯à®¨à¯à®¤à¯ à®¤à®•à®µà®²à¯à®•à®³à¯ à®®à¯à®©à¯à®•à¯‚à®Ÿà¯à®Ÿà®¿à®¯à¯‡ à®¨à®¿à®°à®ªà¯à®ªà®ªà¯à®ªà®Ÿà¯à®•à®¿à®©à¯à®±à®©.`
                    : `Applicant: ${personalInfo.fullName || currentUser?.fullName || 'Guest'} â€” information carried forward from eligibility check is pre-filled below.`}
                </p>
              </div>

              {/* Keep the recommendation selected when application starts from eligibility results. */}
              <div className="w-full sm:w-auto">
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Applying For Scheme:</label>
                {schemeSelectionLocked ? (
                  <input
                    type="text"
                    value={schemes.find(s => s.id === selectedSchemeId)?.nameEn || selectedSchemeId}
                    readOnly
                    aria-readonly="true"
                    className="w-full sm:w-72 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-slate-100 text-slate-700"
                  />
                ) : (
                  <select
                    value={selectedSchemeId}
                    onChange={(e) => setSelectedSchemeId(e.target.value)}
                    className="w-full sm:w-72 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 bg-white text-slate-900"
                  >
                    {schemes.map(s => (
                      <option key={s.id} value={s.id}>{s.nameEn}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Stepper Progress Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-1">
              {stepsList.map((label, idx) => (
                <button
                  key={idx}
                  type="button"
                  aria-current={currentStep === idx + 1 ? 'step' : undefined}
                  onClick={async () => {
                    // Free navigation: jumping to any step is allowed.
                    if (idx + 1 > 7 && !documentsFullyMatched) await runDocumentCheck();
                    setStepWarnings(idx + 1 === currentStep ? validateCurrentStep() : []);
                    setStepError('');
                    setCurrentStep(idx + 1);
                  }}
                  className={`min-h-10 rounded-xl px-2.5 py-2 text-[10px] font-bold text-center border transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 ${
                    currentStep === idx + 1
                      ? 'gradient-hero text-white border-transparent shadow-md shadow-blue-900/25 scale-[1.03]'
                      : currentStep > idx + 1
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                  }`}
                >
                  {currentStep > idx + 1 ? 'âœ“ ' : ''}{label}
                </button>
              ))}
            </div>
          </div>

          {/* Form Step Body */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-lg shadow-blue-900/5 space-y-6 text-left">
            
            {/* STEP 1: PERSONAL INFORMATION */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-black text-slate-900 border-b-2 border-blue-100 pb-3 flex items-center gap-2.5">
                  <span className="gradient-accent w-1.5 h-6 rounded-full inline-block" aria-hidden="true"></span>
                  1. Personal Identification Information
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Full Name (As in Official ID)</label>
                    <input
                      type="text"
                      value={personalInfo.fullName}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, fullName: e.target.value })}
                      className="w-full px-4 py-3 text-sm font-medium rounded-xl border border-slate-200 shadow-xs transition placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 hover:border-slate-300"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Date of Birth</label>
                    <input
                      type="date"
                      value={personalInfo.dob}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, dob: e.target.value })}
                      className="w-full px-4 py-3 text-sm font-medium rounded-xl border border-slate-200 shadow-xs transition placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 hover:border-slate-300"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Aadhaar last 4 digits</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={personalInfo.aadhaarLast4 || ''}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, aadhaarLast4: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                      className="w-full px-4 py-3 text-sm font-medium rounded-xl border border-slate-200 shadow-xs transition placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 hover:border-slate-300"
                    />
                    <p className="text-[10px] text-slate-500">Only the final four digits are used for matching.</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Gender</label>
                    <select
                      value={personalInfo.gender}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, gender: e.target.value })}
                      className="w-full px-4 py-3 text-sm font-medium rounded-xl border border-slate-200 shadow-xs transition placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 hover:border-slate-300"
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Transgender">Transgender</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Mobile Number (Active)</label>
                    <input
                      type="tel"
                      value={personalInfo.mobile}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, mobile: e.target.value })}
                      className="w-full px-4 py-3 text-sm font-medium rounded-xl border border-slate-200 shadow-xs transition placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 hover:border-slate-300"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700">Email Address (Optional)</label>
                    <input
                      type="email"
                      value={personalInfo.email}
                      onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                      className="w-full px-4 py-3 text-sm font-medium rounded-xl border border-slate-200 shadow-xs transition placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 hover:border-slate-300"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: ADDRESS */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-black text-slate-900 border-b-2 border-blue-100 pb-3 flex items-center gap-2.5">
                  <span className="gradient-accent w-1.5 h-6 rounded-full inline-block" aria-hidden="true"></span>
                  2. Residential Address in Tamil Nadu
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Door / House Number</label>
                    <input
                      type="text"
                      value={addressInfo.doorNo}
                      onChange={(e) => setAddressInfo({ ...addressInfo, doorNo: e.target.value })}
                      className="w-full px-4 py-3 text-sm font-medium rounded-xl border border-slate-200 shadow-xs transition placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 hover:border-slate-300"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Street / Area</label>
                    <input
                      type="text"
                      value={addressInfo.street}
                      onChange={(e) => setAddressInfo({ ...addressInfo, street: e.target.value })}
                      className="w-full px-4 py-3 text-sm font-medium rounded-xl border border-slate-200 shadow-xs transition placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 hover:border-slate-300"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Village / Town / Ward</label>
                    <input
                      type="text"
                      value={addressInfo.villageTown}
                      onChange={(e) => setAddressInfo({ ...addressInfo, villageTown: e.target.value })}
                      className="w-full px-4 py-3 text-sm font-medium rounded-xl border border-slate-200 shadow-xs transition placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 hover:border-slate-300"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">District</label>
                    <input
                      type="text"
                      value={addressInfo.district}
                      onChange={(e) => setAddressInfo({ ...addressInfo, district: e.target.value })}
                      className="w-full px-4 py-3 text-sm font-medium rounded-xl border border-slate-200 shadow-xs transition placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 hover:border-slate-300"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">State</label>
                    <input
                      type="text"
                      value={addressInfo.state || ''}
                      onChange={(e) => setAddressInfo({ ...addressInfo, state: e.target.value })}
                      className="w-full px-3 py-2.5 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50 text-slate-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Postal PIN Code</label>
                    <input
                      type="text"
                      value={addressInfo.pinCode}
                      onChange={(e) => setAddressInfo({ ...addressInfo, pinCode: e.target.value })}
                      className="w-full px-4 py-3 text-sm font-medium rounded-xl border border-slate-200 shadow-xs transition placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 hover:border-slate-300"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: INCOME */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <h3 className="text-lg font-black text-slate-900 border-b-2 border-blue-100 pb-3 flex items-center gap-2.5">
                  <span className="gradient-accent w-1.5 h-6 rounded-full inline-block" aria-hidden="true"></span>
                  3. Household Income & Certificate Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Annual Household Income (â‚¹ / Year)</label>
                    <input
                      type="number"
                      value={incomeInfo.annualIncome}
                      onChange={(e) => setIncomeInfo({ ...incomeInfo, annualIncome: e.target.value === '' ? '' : parseInt(e.target.value, 10) })}
                      className="w-full px-3 py-2.5 text-xs font-black rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Income Certificate Number</label>
                    <input
                      type="text"
                      value={incomeInfo.incomeCertificateNo}
                      onChange={(e) => setIncomeInfo({ ...incomeInfo, incomeCertificateNo: e.target.value })}
                      className="w-full px-4 py-3 text-sm font-medium rounded-xl border border-slate-200 shadow-xs transition placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 hover:border-slate-300"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700">Primary Source of Livelihood</label>
                    <input
                      type="text"
                      value={incomeInfo.incomeSource}
                      onChange={(e) => setIncomeInfo({ ...incomeInfo, incomeSource: e.target.value })}
                      className="w-full px-4 py-3 text-sm font-medium rounded-xl border border-slate-200 shadow-xs transition placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 hover:border-slate-300"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: EXISTING BENEFITS */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <h3 className="text-lg font-black text-slate-900 border-b-2 border-blue-100 pb-3 flex items-center gap-2.5">
                  <span className="gradient-accent w-1.5 h-6 rounded-full inline-block" aria-hidden="true"></span>
                  4. Existing Benefits & Non-Duplication Declaration
                </h3>

                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={existingBenefitsInfo.hasExistingPension}
                      onChange={(e) => setExistingBenefitsInfo({ ...existingBenefitsInfo, hasExistingPension: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800">Currently drawing a cash pension from government</div>
                      <div className="text-[11px] text-slate-500">Uncheck if you are not receiving any pension.</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={existingBenefitsInfo.otherWelfareBenefits}
                      onChange={(e) => setExistingBenefitsInfo({ ...existingBenefitsInfo, otherWelfareBenefits: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800">Other Welfare Entitlements (e.g. Free Rice / PDS Ration)</div>
                      <div className="text-[11px] text-slate-500">Non-cash welfare benefits are allowable alongside social pensions.</div>
                    </div>
                  </label>

                  <div className="space-y-1 pt-2">
                    <label className="text-xs font-bold text-slate-700">Other Scheme / Cardholder Name</label>
                    <input
                      type="text"
                      value={existingBenefitsInfo.schemeName}
                      onChange={(e) => setExistingBenefitsInfo({ ...existingBenefitsInfo, schemeName: e.target.value })}
                      className="w-full px-4 py-3 text-sm font-medium rounded-xl border border-slate-200 shadow-xs transition placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 hover:border-slate-300"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: BANK ACCOUNT */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <h3 className="text-lg font-black text-slate-900 border-b-2 border-blue-100 pb-3 flex items-center gap-2.5">
                  <span className="gradient-accent w-1.5 h-6 rounded-full inline-block" aria-hidden="true"></span>
                  5. Bank Account for Direct Benefit Transfer (DBT)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Account Holder Name</label>
                    <input
                      type="text"
                      value={bankInfo.accountHolderName}
                      onChange={(e) => setBankInfo({ ...bankInfo, accountHolderName: e.target.value })}
                      className="w-full px-4 py-3 text-sm font-medium rounded-xl border border-slate-200 shadow-xs transition placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 hover:border-slate-300"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Bank Name</label>
                    <input
                      type="text"
                      value={bankInfo.bankName}
                      onChange={(e) => setBankInfo({ ...bankInfo, bankName: e.target.value })}
                      className="w-full px-4 py-3 text-sm font-medium rounded-xl border border-slate-200 shadow-xs transition placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 hover:border-slate-300"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Branch Name</label>
                    <input
                      type="text"
                      value={bankInfo.branch}
                      onChange={(e) => setBankInfo({ ...bankInfo, branch: e.target.value })}
                      className="w-full px-4 py-3 text-sm font-medium rounded-xl border border-slate-200 shadow-xs transition placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 hover:border-slate-300"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Bank Account Number</label>
                    <input
                      type="text"
                      value={bankInfo.accountNumber}
                      onChange={(e) => setBankInfo({ ...bankInfo, accountNumber: e.target.value })}
                      className="w-full px-4 py-3 text-sm font-bold rounded-xl border border-slate-200 shadow-xs transition font-mono focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 hover:border-slate-300"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">IFSC Code</label>
                    <input
                      type="text"
                      value={bankInfo.ifscCode}
                      onChange={(e) => setBankInfo({ ...bankInfo, ifscCode: e.target.value })}
                      className="w-full px-4 py-3 text-sm font-bold rounded-xl border border-slate-200 shadow-xs transition font-mono focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 hover:border-slate-300"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 6: SCHEME-SPECIFIC QUESTIONS (dynamic per NSAP scheme) */}
            {currentStep === 6 && (
              <div className="space-y-4">
                <h3 className="text-lg font-black text-slate-900 border-b-2 border-blue-100 pb-3 flex items-center gap-2.5">
                  <span className="gradient-accent w-1.5 h-6 rounded-full inline-block" aria-hidden="true"></span>
                  6. {schemes.find(s => s.id === selectedSchemeId)?.nameEn || selectedSchemeId} â€” Scheme-Specific Questions
                </h3>

                {schemeForm?.applyNotes && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-xs text-indigo-900">
                    <strong>Who can apply:</strong> {schemeForm.applyNotes}
                  </div>
                )}

                {schemeFormLoading ? (
                  <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Loading scheme questions...
                  </div>
                ) : (schemeForm?.fields || []).length === 0 ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-800">
                    This scheme has no extra questions. Continue to the document upload step.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {schemeForm.fields.map((field) => {
                      const dep = field.dependsOn;
                      const depMet = !dep || String(schemeAnswers[dep.key]) === String(dep.equals);
                      if (!depMet) return null;
                      const value = schemeAnswers[field.key] ?? '';
                      const inputCls = "w-full px-3 py-2.5 text-xs font-medium rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500";
                      return (
                        <div key={field.key} className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">
                            {field.labelEn}{field.required ? ' *' : ''}
                          </label>
                          {field.type === 'select' ? (
                            <select value={value} onChange={(e) => setSchemeAnswer(field.key, e.target.value)} className={inputCls}>
                              <option value="">â€” Select â€”</option>
                              {(field.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          ) : field.type === 'boolean' ? (
                            <div className="flex gap-4 pt-1">
                              {[{ v: 'yes', label: 'Yes' }, { v: 'no', label: 'No' }].map(opt => (
                                <label key={opt.v} className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                                  <input type="radio" name={field.key} checked={value === opt.v}
                                    onChange={() => setSchemeAnswer(field.key, opt.v)} className="w-4 h-4 text-blue-600" />
                                  {opt.label}
                                </label>
                              ))}
                            </div>
                          ) : (
                            <input
                              type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                              value={value}
                              onChange={(e) => setSchemeAnswer(field.key, e.target.value)}
                              className={inputCls}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* STEP 7: DOCUMENTS, QUALITY CHECK, AND OCR MATCHING */}
            {currentStep === 7 && (
              <div className="space-y-6">
                
                {/* Guidelines Box */}
                <div className="bg-gradient-to-r from-blue-600/10 via-violet-500/10 to-cyan-400/10 border border-blue-200 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-blue-900 text-xs flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-blue-600" />
                      Document Upload Guidelines (Max 10 MB: PDF, JPG, PNG)
                    </span>
                    <button
                      type="button"
                      onClick={() => speakText('Keep all 4 corners visible. Use good lighting. Avoid blur. Make sure text is readable.')}
                      className="text-blue-700 hover:text-blue-900 font-bold text-xs flex items-center gap-1 bg-white rounded-full px-2.5 py-1 border border-blue-200 shadow-xs hover:shadow transition"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>ðŸ”Š Listen</span>
                    </button>
                  </div>
                  <ul className="text-xs text-blue-800 grid grid-cols-1 sm:grid-cols-2 gap-1 list-disc list-inside">
                    <li>Keep all 4 corners visible</li>
                    <li>Ensure good ambient lighting & avoid shadows</li>
                    <li>Avoid motion blur and harsh glares</li>
                    <li>Keep the document straight</li>
                  </ul>
                </div>

                {/* Upload Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {(schemeForm?.requiredDocuments?.length
                    ? schemeForm.requiredDocuments.map(name => ({ label: name, type: name }))
                    : [
                        { label: 'Income Certificate', type: 'Income Certificate' },
                        { label: 'Aadhaar / Age Proof', type: 'Age Proof / Aadhaar' },
                        { label: 'Bank Passbook', type: 'Bank Passbook' }
                      ]
                  ).map((doc) => {
                    const uploaded = uploadedDocs.find(d => d.docType === doc.type);
                    return (
                      <div key={doc.type} className={`border rounded-2xl p-4 text-center space-y-2.5 transition shadow-xs ${uploaded ? 'border-emerald-300 bg-gradient-to-b from-emerald-50 to-white' : 'border-slate-200 bg-white hover:border-blue-400 hover:shadow-md'}`}>
                        <div className="text-xs font-black text-slate-800">{doc.label}</div>
                        
                        {uploaded ? (
                          <div className="space-y-1 animate-popIn">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Uploaded ({uploaded.qualityStatus})
                            </span>
                            <div className="text-[10px] text-slate-500 truncate" title={uploaded.fileName}>{uploaded.fileName}</div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1"><UploadCloud className="w-3.5 h-3.5" /> Not uploaded yet</div>
                        )}

                        <label className={`inline-flex items-center gap-1.5 cursor-pointer text-xs font-bold px-4 py-2 rounded-xl border shadow-xs transition ${uploaded ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300' : 'bg-blue-900 hover:bg-blue-800 text-white border-transparent shadow-blue-900/25'}`}>
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>{uploaded ? 'Re-upload' : 'Choose File'}</span>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => handleFileUpload(e, doc.type)}
                            className="hidden"
                          />
                        </label>
                      </div>
                    );
                  })}
                </div>

                {uploadLoading && (
                  <div className="rounded-xl border border-violet-200 bg-violet-50 text-center text-xs font-bold text-violet-800 flex items-center justify-center gap-2 px-4 py-3">
                    <RefreshCw className="w-4 h-4 animate-spin text-violet-600" />
                    <span>Running OpenCV quality verification &amp; OCR extractionâ€¦</span>
                  </div>
                )}

                {/* Document Intelligence Extraction Card â€” renders the ACTUAL
                    backend response for THIS document; fields differ per doc type. */}
                {uploadedDocs.map((uploaded) => {
                  const review = documentReviews[uploaded.docId];
                  if (!review || review.dismissed) return null;
                  const proc = review.result;
                  const docFields = proc.documentFields || {};
                  const fieldOrder = ({
                    INCOME_CERTIFICATE: ["name", "annual_income", "monthly_income", "income_source", "certificate_number", "issue_date", "valid_until", "issuing_authority", "district", "taluk", "village"],
                    IDENTITY_DOCUMENT: ["name", "date_of_birth", "age", "gender", "document_number", "father_name", "address", "district", "state", "pincode"],
                    RESIDENCE_CERTIFICATE: ["name", "address", "house_number", "street", "village", "town", "taluk", "district", "state", "pincode", "certificate_number", "issue_date", "issuing_authority"],
                    RATION_CARD: ["ration_card_number", "head_of_family", "member_names", "card_type", "address", "district", "state", "pincode"],
                    DISABILITY_CERTIFICATE: ["name", "date_of_birth", "disability_type", "disability_percentage", "certificate_number", "issue_date", "issuing_authority"],
                    DEATH_CERTIFICATE: ["beneficiary_name", "deceased_person_name", "relationship", "date_of_death", "certificate_number", "issue_date", "issuing_authority"],
                    BANK_DOCUMENT: ["account_holder_name", "name", "bank_name", "branch_name", "ifsc", "account_number_masked"],
                    UNKNOWN: ["name", "date_of_birth", "annual_income", "certificate_number"],
                  })[proc.detectedDocumentType || 'UNKNOWN'] || ["name", "date_of_birth", "annual_income", "certificate_number"];
                  const FIELD_LABELS = {
                    name: 'Name', date_of_birth: 'Date of Birth', age: 'Age', gender: 'Gender',
                    document_number: 'Document Number', father_name: "Father's Name",
                    address: 'Address', district: 'District', state: 'State', pincode: 'PIN Code',
                    annual_income: 'Annual Income', monthly_income: 'Monthly Income',
                    income_source: 'Income Source', certificate_number: 'Certificate Number',
                    issue_date: 'Issue Date', valid_until: 'Valid Until',
                    issuing_authority: 'Issuing Authority', taluk: 'Taluk', village: 'Village / Town',
                    house_number: 'House / Door No.', street: 'Street', town: 'Town',
                    ration_card_number: 'Ration Card Number', head_of_family: 'Head of Family',
                    member_names: 'Family Members', card_type: 'Card Type',
                    disability_type: 'Type of Disability', disability_percentage: 'Disability Percentage',
                    date_of_death: 'Date of Death', deceased_person_name: 'Deceased Person',
                    relationship: 'Relationship', beneficiary_name: 'Beneficiary Name',
                    account_holder_name: 'Account Holder', bank_name: 'Bank',
                    branch_name: 'Branch', ifsc: 'IFSC Code', account_number_masked: 'Account Number',
                  };
                  const formatValue = (field, value) => {
                    if (value === null || value === undefined || value === '') return null;
                    if (field === 'document_number' || field === 'account_number_masked') {
                      const digits = String(value).replace(/\D/g, '');
                      return digits ? `â€¢â€¢â€¢â€¢ ${digits.slice(-4)}` : 'Unreadable';
                    }
                    if (field === 'annual_income' || field === 'monthly_income') return 'â‚¹' + Number(value).toLocaleString('en-IN');
                    return String(value);
                  };
                  const confBadge = (conf) => {
                    if (conf == null) return null;
                    if (conf >= 0.9) return <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">High</span>;
                    if (conf >= 0.75) return <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">Medium</span>;
                    return <span className="text-[9px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-full">Low â€” verify</span>;
                  };
                  const confColor = (conf) => (conf == null ? 'bg-slate-200' : conf >= 0.9 ? 'bg-emerald-500' : conf >= 0.75 ? 'bg-amber-500' : 'bg-rose-500');
                  const qualityPct = { Good: 100, Fair: 65, Poor: 30 }[proc.quality?.overallQuality] ?? 50;
                  const detectedCount = fieldOrder.filter(f => docFields[f]?.value != null).length;
                  return (
                  <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-blue-50 p-5 space-y-4 shadow-lg shadow-violet-900/10 animate-fadeIn">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-violet-900/30">
                          <Sparkles className="w-4.5 h-4.5" />
                        </span>
                        <div>
                          <div className="font-black text-slate-900 text-sm">OCR Intelligence Report</div>
                          <div className="text-[11px] text-slate-500">{proc.detectedDocumentTypeLabel || proc.originalName}</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {proc.extractionConfidence != null && (
                          <span className="text-[10px] font-black text-white bg-gradient-to-r from-blue-900 via-blue-950 to-indigo-950 px-2.5 py-1 rounded-full shadow-sm">
                            {Math.round(proc.extractionConfidence * 100)}% confidence
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                          proc.quality.overallQuality === 'Good' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : proc.quality.overallQuality === 'Fair' ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                          Quality: {proc.quality.overallQuality}
                        </span>
                        <button type="button" onClick={() => setShowRawOcr(prev => ({ ...prev, [proc.docId || proc.originalName]: !prev[proc.docId || proc.originalName] }))}
                          className="text-[10px] font-bold text-violet-700 hover:text-violet-900 underline underline-offset-2">
                          {showRawOcr[proc.docId || proc.originalName] ? 'Hide raw text' : 'View raw text'}
                        </button>
                      </div>
                    </div>

                    <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${qualityPct === 100 ? 'bg-emerald-500' : qualityPct >= 65 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${qualityPct}%` }} />
                    </div>

                    <p className="text-xs text-slate-700 font-medium">
                      {detectedCount > 0
                        ? <span><strong className="text-violet-700">{detectedCount} field{detectedCount > 1 ? 's' : ''} extracted</strong> from this upload. Confidence bars show how reliably each value was read â€” verify anything below <strong>High</strong> against the original.</span>
                        : 'No recognizable fields were extracted from this upload. Check the processing details, try a clearer copy, or enter the details manually.'}
                    </p>

                    {showRawOcr[proc.docId || proc.originalName] && (
                      <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-900 text-emerald-300 p-3 text-[10px] font-mono shadow-inner">{proc.rawOcrText || '(No raw OCR text available)'}</pre>
                    )}

                    <div className="bg-white rounded-xl border border-violet-100 divide-y divide-slate-100 shadow-xs overflow-hidden">
                      <div className="flex items-center gap-3 bg-gradient-to-r from-violet-600 to-blue-600 px-3.5 py-2 text-white">
                        <span className="text-[10px] font-black uppercase tracking-widest w-32 sm:w-40 shrink-0">Field</span>
                        <span className="flex-1 text-[10px] font-black uppercase tracking-widest">Value read from document</span>
                        <span className="text-[10px] font-black uppercase tracking-widest shrink-0">Confidence</span>
                      </div>
                      {fieldOrder.map((field, index) => {
                        const entry = docFields[field];
                        const value = entry ? entry.value : null;
                        const shown = formatValue(field, value);
                        const conf = entry?.confidence;
                        return (
                          <div key={field} className={`flex items-center gap-3 px-3.5 py-2.5 transition hover:bg-violet-50/50 ${index % 2 === 1 ? 'bg-slate-50/60' : ''}`}>
                            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wide w-32 sm:w-40 shrink-0">{FIELD_LABELS[field] || field}</span>
                            <div className="flex-1 min-w-0">
                              {shown === null ? (
                                <span className="text-xs text-slate-400 italic">Not detected in this document</span>
                              ) : (
                                <span className="text-xs font-bold text-slate-900 break-words">{shown}</span>
                              )}
                              {shown !== null && conf != null && (
                                <div className="mt-1 h-1 w-full sm:w-40 rounded-full bg-slate-100 overflow-hidden">
                                  <div className={`h-full rounded-full ${confColor(conf)}`} style={{ width: `${Math.round(conf * 100)}%` }} />
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {shown !== null && confBadge(conf)}
                              {shown !== null && conf != null && (
                                <span className="text-[10px] font-mono text-slate-400">{Math.round(conf * 100)}%</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {(proc.quality.overallQuality !== 'Good') && detectedCount > 0 && (
                      <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-[11px] text-amber-900 flex gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                        <span>Document quality is low. Some extracted information may require manual verification â€” please check every value against the original.</span>
                      </div>
                    )}

                    <details className="rounded-xl border border-violet-100 bg-white p-3 text-[11px] text-slate-700 shadow-xs">
                      <summary className="cursor-pointer font-bold text-slate-900 select-none">Image quality review (OpenCV)</summary>
                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[['Blur', proc.quality.blurScore], ['Brightness', proc.quality.brightness], ['Contrast', proc.quality.contrast], ['Resolution', proc.quality.resolution]].map(([label, val]) => (
                          <div key={label} className="rounded-lg bg-slate-50 border border-slate-100 p-2 text-center">
                            <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
                            <div className="text-xs font-black text-slate-800">{val ?? 'â€”'}</div>
                          </div>
                        ))}
                      </div>
                      {(proc.quality.guidanceNotes || []).map((note, index) => <p key={index} className="mt-2 text-amber-800">ðŸ’¡ {note}</p>)}
                      {(proc.processingErrors || []).map((error, index) => <p key={`error-${index}`} className="mt-1 font-semibold text-rose-700">âš  {error}</p>)}
                    </details>

                    <div className="text-[11px] font-semibold text-violet-800 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" /> Extracted values are for comparison only and are never copied into the application automatically.
                    </div>
                  </div>
                  );
                })}

                <section className={`rounded-2xl border-2 p-5 space-y-3 shadow-sm transition ${documentsFullyMatched ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-white' : documentCheckResult?.status === 'REJECTED' ? 'border-rose-300 bg-gradient-to-br from-rose-50 to-white' : 'border-amber-300 bg-gradient-to-br from-amber-50 to-white'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-md ${documentsFullyMatched ? 'bg-emerald-500 shadow-emerald-500/30 text-white' : documentCheckResult?.status === 'REJECTED' ? 'bg-rose-500 shadow-rose-500/30 text-white' : 'bg-amber-500 shadow-amber-500/30 text-white'}`}>
                        {documentsFullyMatched ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                      </span>
                      <div>
                        <h3 className="text-sm font-black text-slate-900">Document &amp; application cross-check</h3>
                        <p className="mt-0.5 text-xs text-slate-600 max-w-xl">
                          {documentsFullyMatched ? 'âœ… All readable fields match your application. You can continue to review.' : (documentCheckResult?.message || 'Compare the uploaded documents with the details you entered. OCR values will not be copied into your form.')}
                        </p>
                      </div>
                    </div>
                    <button type="button" onClick={() => runDocumentCheck()} disabled={documentCheckLoading || uploadedDocs.length === 0} className="shrink-0 btn-primary !py-2 !px-4">
                      {documentCheckLoading ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Checkingâ€¦</> : <><FileCheck className="w-3.5 h-3.5" /> Check details</>}
                    </button>
                  </div>
                  {(documentCheckResult?.documents || []).map((doc) => (
                    <div key={doc.docId} className="rounded-xl border border-white bg-white p-4 text-xs shadow-xs space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${doc.status === 'MATCHED' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        <span className="font-black text-slate-900">{doc.docType}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${doc.status === 'MATCHED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{doc.status.replaceAll('_', ' ')}</span>
                      </div>
                      <p className="text-slate-600">{doc.reason}</p>
                      {doc.comparisons?.length > 0 && (
                        <div className="rounded-lg border border-slate-100 bg-white divide-y divide-slate-100 overflow-hidden">
                          <div className="flex flex-wrap items-center gap-2 bg-slate-900 px-3 py-2 text-white">
                            <span className="text-[10px] font-black uppercase tracking-widest">Field-by-field comparison</span>
                            <span className="ml-auto text-[10px] font-bold">
                              {doc.comparisons.filter(i => i.matched).length}/{doc.comparisons.length} matched
                            </span>
                          </div>
                          {doc.comparisons.map(item => (
                            <div key={item.field} className={`flex flex-wrap items-center gap-2 px-3 py-2 ${item.matched ? '' : 'bg-rose-50/70'}`}>
                              <span className="text-[10px] font-black uppercase tracking-wide text-slate-500 w-28">{item.label}</span>
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${item.matched ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-500 text-white shadow-sm'}`}>{item.matched ? 'MATCH' : 'MISMATCH'}</span>
                              {!item.matched && (
                                <span className="text-rose-800 font-semibold flex items-center gap-1.5">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                  {item.reason} {item.documentValue ? <span className="rounded bg-white border border-rose-200 px-1.5 py-0.5 font-mono text-[10px]">document: {item.documentValue}</span> : ''}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </section>


              </div>
            )}

            {/* STEP 8: REVIEW ALL DETAILS & CONSENT */}
            {currentStep === 8 && (
              <div className="space-y-6">
                <h3 className="text-lg font-black text-slate-900 border-b-2 border-blue-100 pb-3 flex items-center gap-2.5">
                  <span className="gradient-accent w-1.5 h-6 rounded-full inline-block" aria-hidden="true"></span>
                  8. Review All Information Before Final Submission
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  
                  {/* Personal Summary */}
                  <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-white p-5 shadow-xs space-y-2">
                    <span className="flex items-center gap-2 font-black text-blue-700 text-xs uppercase tracking-wider border-b border-blue-100 pb-2">
                      <User className="w-4 h-4" /> Applicant Profile
                    </span>
                    <dl className="divide-y divide-slate-100">
                      {[['Name', personalInfo.fullName], ['DOB', personalInfo.dob], ['Gender', personalInfo.gender], ['Mobile', personalInfo.mobile], ['Email', personalInfo.email || 'None']].map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-3 py-1.5"><dt className="text-slate-500 font-semibold">{label}</dt><dd className="font-bold text-slate-900 text-right">{value || 'â€”'}</dd></div>
                      ))}
                    </dl>
                  </div>

                  {/* Address Summary */}
                  <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-white p-5 shadow-xs space-y-2">
                    <span className="flex items-center gap-2 font-black text-violet-700 text-xs uppercase tracking-wider border-b border-violet-100 pb-2">
                      <Home className="w-4 h-4" /> Address Details
                    </span>
                    <dl className="divide-y divide-slate-100">
                      {[['House/Door No', addressInfo.doorNo], ['Street', addressInfo.street], ['Town/Village', addressInfo.villageTown], ['District', `${addressInfo.district}${addressInfo.state ? `, ${addressInfo.state}` : ''}`], ['PIN Code', addressInfo.pinCode]].map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-3 py-1.5"><dt className="text-slate-500 font-semibold">{label}</dt><dd className="font-bold text-slate-900 text-right">{value || 'â€”'}</dd></div>
                      ))}
                    </dl>
                  </div>

                  {/* Income & Scheme Summary */}
                  <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white p-5 shadow-xs space-y-2">
                    <span className="flex items-center gap-2 font-black text-emerald-700 text-xs uppercase tracking-wider border-b border-emerald-100 pb-2">
                      <IndianRupee className="w-4 h-4" /> Income & Selected Scheme
                    </span>
                    <dl className="divide-y divide-slate-100">
                      {[['Scheme', schemes.find(s => s.id === selectedSchemeId)?.nameEn || selectedSchemeId], ['Annual Income', `â‚¹${incomeInfo.annualIncome?.toLocaleString('en-IN')} / year`], ['Income Cert No', incomeInfo.incomeCertificateNo], ['Source', incomeInfo.incomeSource]].map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-3 py-1.5"><dt className="text-slate-500 font-semibold">{label}</dt><dd className="font-bold text-slate-900 text-right">{value || 'â€”'}</dd></div>
                      ))}
                    </dl>
                  </div>

                  {/* Bank Summary */}
                  <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-white p-5 shadow-xs space-y-2">
                    <span className="flex items-center gap-2 font-black text-amber-700 text-xs uppercase tracking-wider border-b border-amber-100 pb-2">
                      <Building className="w-4 h-4" /> Bank DBT Information
                    </span>
                    <dl className="divide-y divide-slate-100">
                      {[['Account Holder', bankInfo.accountHolderName], ['Bank', bankInfo.bankName], ['Branch', bankInfo.branch], ['Account No', `â€¢â€¢â€¢â€¢ â€¢â€¢â€¢â€¢ ${bankInfo.accountNumber.slice(-4)}`], ['IFSC', bankInfo.ifscCode]].map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-3 py-1.5"><dt className="text-slate-500 font-semibold">{label}</dt><dd className="font-bold text-slate-900 text-right">{value || 'â€”'}</dd></div>
                      ))}
                    </dl>
                  </div>

                </div>

                  {/* Scheme Question Answers */}
                  {schemeForm?.fields?.length > 0 && (
                    <div className="bg-blue-50/70 p-5 rounded-2xl border border-blue-200 text-xs space-y-1.5 sm:col-span-2">
                      <span className="font-black text-blue-700 uppercase tracking-wider block border-b border-blue-200 pb-1.5">Scheme-Specific Answers</span>
                      <dl className="divide-y divide-blue-100">
                        {schemeForm.fields.filter(f => !f.dependsOn || String(schemeAnswers[f.dependsOn.key]) === String(f.dependsOn.equals)).map(f => (
                          <div key={f.key} className="flex justify-between gap-3 py-1.5"><dt className="text-slate-500 font-semibold">{f.labelEn}</dt><dd className="font-bold text-slate-900 text-right">{String(schemeAnswers[f.key] ?? 'â€”')}</dd></div>
                        ))}
                      </dl>
                    </div>
                  )}

                {/* Uploaded Documents Confirmation */}
                <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-200 text-xs space-y-1.5">
                  <span className="font-extrabold text-blue-900 block">Uploaded Supporting Documents:</span>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {uploadedDocs.map(d => (
                      <span key={d.docId} className="bg-white border border-blue-200 text-blue-800 px-2.5 py-1 rounded-lg font-bold">
                        {d.docType} ({d.qualityStatus})
                      </span>
                    ))}
                  </div>
                </div>

                {/* Consent Checkbox */}
                <div className="bg-amber-50/70 border border-amber-300 rounded-2xl p-4 space-y-2">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={userConsent}
                      onChange={(e) => setUserConsent(e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded mt-0.5"
                    />
                    <div className="text-xs text-amber-900 leading-relaxed">
                      <strong>Declaration & Consent:</strong> I hereby declare that all details furnished above are true and accurate to the best of my knowledge. I understand this portal is an academic prototype and that final eligibility determination is made exclusively through official administrative review.
                    </div>
                  </label>
                </div>

              </div>
            )}

            {currentStep === 8 && <section className="mt-5 rounded-2xl border-2 border-blue-200 bg-blue-50 p-4 space-y-2">
              <h3 className="text-sm font-extrabold text-blue-950">Email verification</h3>
              <p className="text-xs text-blue-900">
                {otpVerified ? 'Your email is verified.' : 'A verification code will be sent to your registered email. SMS verification is not supported.'}
              </p>
            </section>}

            {/* Stepper Navigation Buttons */}
            {stepWarnings.length > 0 && (
              <div role="status" className="rounded-xl border-2 border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 space-y-1">
                <div className="font-black flex items-center gap-2"><AlertCircle className="w-4 h-4" />Just a heads-up â€” you can still continue:</div>
                <ul className="list-disc list-inside space-y-0.5">
                  {stepWarnings.map((warning, idx) => <li key={idx}>{warning}</li>)}
                </ul>
                <button type="button" onClick={() => setStepWarnings([])} className="mt-1 font-bold underline underline-offset-2">Dismiss</button>
              </div>
            )}
            {stepError && <div role="alert" className="rounded-xl border-2 border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800 flex items-center gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{stepError}</div>}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => { setStepError(''); setCurrentStep(prev => Math.max(1, prev - 1)); }}
                disabled={currentStep === 1}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border-2 border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous Step</span>
              </button>

              {currentStep < 8 ? (
                <button
                  type="button"
                  onClick={advanceWizard}
                  disabled={documentCheckLoading}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-900 to-blue-950 px-7 py-2.5 text-xs font-extrabold text-white shadow-md shadow-blue-900/30 transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting || !userConsent}
                  className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-teal-800 to-emerald-900 px-8 py-3 text-xs font-black text-white shadow-lg shadow-emerald-600/30 transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 sm:text-sm"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Registering Application...' : !otpVerified ? 'Verify Email to Submit' : 'Submit Pension Application'}</span>
                </button>
              )}
            </div>

          </div>

        </div>

      )}

    </div>
  );
};



