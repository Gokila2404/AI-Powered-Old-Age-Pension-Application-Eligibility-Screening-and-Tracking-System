import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Volume2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Award,
  Layers,
  FileText,
  MapPin,
  Calendar,
  IndianRupee,
  ShieldCheck,
  Check,
  ChevronRight
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

export const EligibilityQuiz = () => {
  const {
    language,
    speakText,
    setActiveTab,
    runEligibilityAssessment,
    aiAssessmentResult,
    setEligibilityData,
    requireAuth
  } = useApp();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState(aiAssessmentResult);

  // Form inputs
  const [age, setAge] = useState(68);
  const [residenceState, setResidenceState] = useState('Tamil Nadu');
  const [district, setDistrict] = useState('Madurai');
  const [annualIncome, setAnnualIncome] = useState(64000);
  const [hasExistingPension, setHasExistingPension] = useState(false);
  const [existingPensionName, setExistingPensionName] = useState('');
  const [isWidow, setIsWidow] = useState(false);
  const [hasDisability, setHasDisability] = useState(false);
  const [disabilityPercentage, setDisabilityPercentage] = useState(0);

  // Document availability declaration
  const [hasAgeProof, setHasAgeProof] = useState(true);
  const [hasIncomeCertificate, setHasIncomeCertificate] = useState(true);
  const [hasBankPassbook, setHasBankPassbook] = useState(true);

  // Question metadata per step
  const stepMeta = [
    {
      num: 1,
      titleEn: '1. What is your current age?',
      titleTa: '1. à®‰à®™à¯à®•à®³à¯ à®¤à®±à¯à®ªà¯‹à®¤à¯ˆà®¯ à®µà®¯à®¤à¯ à®Žà®©à¯à®©?',
      descEn: 'Senior welfare pensions in Tamil Nadu typically begin at age 60, while destitute widow benefits begin at age 40.',
      descTa: 'à®®à¯à®¤à®¿à®¯à¯‹à®°à¯ à®“à®¯à¯à®µà¯‚à®¤à®¿à®¯à®®à¯ à®ªà¯Šà®¤à¯à®µà®¾à®• 60 à®µà®¯à®¤à®¿à®²à¯ à®¤à¯Šà®Ÿà®™à¯à®•à¯à®•à®¿à®±à®¤à¯; à®µà®¿à®¤à®µà¯ˆ à®“à®¯à¯à®µà¯‚à®¤à®¿à®¯à®®à¯ 40 à®µà®¯à®¤à®¿à®²à¯ à®¤à¯Šà®Ÿà®™à¯à®•à¯à®•à®¿à®±à®¤à¯.'
    },
    {
      num: 2,
      titleEn: '2. What is your residential location?',
      titleTa: '2. à®‰à®™à¯à®•à®³à¯ à®µà®šà®¿à®ªà¯à®ªà®¿à®Ÿà®®à¯ à®Žà®™à¯à®•à¯à®³à¯à®³à®¤à¯?',
      descEn: 'State top-up benefits require continuous residence in Tamil Nadu. Select your district.',
      descTa: 'à®®à®¾à®¨à®¿à®² à®“à®¯à¯à®µà¯‚à®¤à®¿à®¯ à®‰à®¤à®µà®¿à®•à®³à¯à®•à¯à®•à¯ à®¤à®®à®¿à®´à¯à®¨à®¾à®Ÿà¯à®Ÿà®¿à®²à¯ à®¨à®¿à®°à®¨à¯à®¤à®° à®µà®šà®¿à®ªà¯à®ªà®¿à®Ÿ à®šà®¾à®©à¯à®±à¯ à®¤à¯‡à®µà¯ˆ.'
    },
    {
      num: 3,
      titleEn: '3. What is your estimated annual household income?',
      titleTa: '3. à®‰à®™à¯à®•à®³à¯ à®•à¯à®Ÿà¯à®®à¯à®ªà®¤à¯à®¤à®¿à®©à¯ à®†à®£à¯à®Ÿà¯ à®µà®°à¯à®®à®¾à®©à®®à¯ à®Žà®©à¯à®©?',
      descEn: 'The social welfare ceiling in Tamil Nadu is generally â‚¹72,000 per year for destitute assistance.',
      descTa: 'à®†à®¤à®°à®µà®±à¯à®± à®®à¯à®¤à®¿à®¯à¯‹à®°à¯ à®‰à®¤à®µà®¿à®•à¯à®•à¯ à®†à®£à¯à®Ÿà¯ à®µà®°à¯à®®à®¾à®© à®µà®°à®®à¯à®ªà¯ à®ªà¯Šà®¤à¯à®µà®¾à®• à®°à¯‚.72,000 à®†à®•à¯à®®à¯.'
    },
    {
      num: 4,
      titleEn: '4. Do you receive any existing government pension?',
      titleTa: '4. à®¨à¯€à®™à¯à®•à®³à¯ à®à®±à¯à®•à®©à®µà¯‡ à®à®¤à¯‡à®©à¯à®®à¯ à®…à®°à®šà¯ à®“à®¯à¯à®µà¯‚à®¤à®¿à®¯à®®à¯ à®ªà¯†à®±à¯à®•à®¿à®±à¯€à®°à¯à®•à®³à®¾?',
      descEn: 'Under social security regulations, dual-drawing of multiple cash welfare pensions is restricted.',
      descTa: 'à®‡à®°à¯ à®µà¯‡à®±à¯ à®ªà®£ à®‰à®¤à®µà®¿ à®“à®¯à¯à®µà¯‚à®¤à®¿à®¯à®™à¯à®•à®³à¯ˆ à®’à®°à¯‡ à®¨à¯‡à®°à®¤à¯à®¤à®¿à®²à¯ à®ªà¯†à®±à¯à®µà®¤à¯ à®šà®®à¯‚à®• à®ªà®¾à®¤à¯à®•à®¾à®ªà¯à®ªà¯ à®µà®¿à®¤à®¿à®•à®³à®¿à®©à¯à®ªà®Ÿà®¿ à®…à®©à¯à®®à®¤à®¿à®•à¯à®•à®ªà¯à®ªà®Ÿà®¾à®¤à¯.'
    },
    {
      num: 5,
      titleEn: '5. Which supporting documents do you have available?',
      titleTa: '5. à®‰à®™à¯à®•à®³à®¿à®Ÿà®®à¯ à®Žà®©à¯à®©à¯†à®©à¯à®© à®†à®µà®£à®™à¯à®•à®³à¯ à®‰à®³à¯à®³à®©?',
      descEn: 'Verify if you have physical or digital copies ready for verification.',
      descTa: 'à®šà®°à®¿à®ªà®¾à®°à¯à®ªà¯à®ªà®¿à®±à¯à®•à¯ à®¤à¯‡à®µà¯ˆà®¯à®¾à®© à®†à®µà®£à®™à¯à®•à®³à¯ à®‰à®™à¯à®•à®³à®¿à®Ÿà®®à¯ à®¤à®¯à®¾à®°à®¾à®• à®‰à®³à¯à®³à®¤à®¾ à®Žà®© à®•à¯à®±à®¿à®ªà¯à®ªà®¿à®Ÿà®µà¯à®®à¯.'
    },
    {
      num: 6,
      titleEn: '6. Review & Calculate AI Assessment Score',
      titleTa: '6. à®µà®¿à®µà®°à®™à¯à®•à®³à¯ˆ à®šà®°à®¿à®ªà®¾à®°à¯à®¤à¯à®¤à¯ AI à®®à®¤à®¿à®ªà¯à®ªà¯†à®£à¯ à®ªà¯†à®±à®µà¯à®®à¯',
      descEn: 'Review your declarations. The AI engine will compute an explainable preliminary score (0â€“100).',
      descTa: 'à®‰à®™à¯à®•à®³à¯ à®¤à®•à®µà®²à¯à®•à®³à¯ˆ à®šà®°à®¿à®ªà®¾à®°à¯à®¤à¯à®¤à¯ à®‰à®Ÿà®©à®Ÿà®¿ AI à®¤à®•à¯à®¤à®¿ à®®à®¤à®¿à®ªà¯à®ªà¯€à®Ÿà¯à®Ÿà¯ à®…à®±à®¿à®•à¯à®•à¯ˆà®¯à¯ˆ à®ªà¯†à®±à¯à®™à¯à®•à®³à¯.'
    }
  ];

  const currentMeta = stepMeta[step - 1];

  const handleVoiceGuide = () => {
    const text = language === 'ta'
      ? `${currentMeta.titleTa}. ${currentMeta.descTa}`
      : `${currentMeta.titleEn}. ${currentMeta.descEn}`;
    speakText(text);
  };

  const handleNext = () => {
    if (step < 6) {
      setStep(step + 1);
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleCalculateScore = async () => {
    setIsSubmitting(true);
    const payload = {
      age: parseInt(age, 10),
      residenceState,
      district,
      annualIncome: parseInt(annualIncome, 10),
      hasExistingPension,
      existingPensionName: hasExistingPension ? existingPensionName : '',
      isWidow,
      hasDisability,
      disabilityPercentage: hasDisability ? parseInt(disabilityPercentage, 10) : 0,
      hasAgeProof,
      hasIncomeCertificate,
      hasBankPassbook
    };

    try {
      const res = await runEligibilityAssessment(payload);
      setAssessmentResult(res);
      setEligibilityData(payload);
      speakText(
        language === 'ta'
          ? `à®¤à®•à¯à®¤à®¿ à®®à®¤à®¿à®ªà¯à®ªà¯€à®Ÿà¯ à®®à¯à®Ÿà®¿à®¨à¯à®¤à®¤à¯. à®‰à®™à¯à®•à®³à¯ à®†à®°à®®à¯à®ª à®®à®¤à®¿à®ªà¯à®ªà¯†à®£à¯ 100-à®•à¯à®•à¯ ${res.score} à®†à®•à¯à®®à¯.`
          : `Eligibility assessment complete. Preliminary AI score: ${res.score} out of 100.`
      );
    } catch (err) {
      alert('Unable to connect to AI scoring engine. Please verify the backend service.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProceedToApplication = (schemeId = 'IGNOAPS-TN') => {
    // Carries forward eligibility data into Application Wizard!
    setEligibilityData({
      age: parseInt(age, 10),
      residenceState,
      district,
      annualIncome: parseInt(annualIncome, 10),
      hasExistingPension,
      existingPensionName,
      isWidow,
      hasDisability,
      disabilityPercentage,
      hasAgeProof,
      hasIncomeCertificate,
      hasBankPassbook,
      recommendedSchemeId: schemeId,
      selectedSchemeId: schemeId,
      schemeSelectionLocked: true,
      aiScore: assessmentResult?.score || 86
    });

    requireAuth('wizard');
  };

  // Chart data formatting for breakdown
  const chartData = assessmentResult ? [
    { factor: 'Age (Max 25)', score: assessmentResult.breakdown.ageScore, max: 25 },
    { factor: 'Income (Max 25)', score: assessmentResult.breakdown.incomeScore, max: 25 },
    { factor: 'Residence (Max 20)', score: assessmentResult.breakdown.residenceScore, max: 20 },
    { factor: 'Benefit (Max 10)', score: assessmentResult.breakdown.benefitScore, max: 10 },
    { factor: 'Documents (Max 6)', score: assessmentResult.breakdown.documentConfidenceScore, max: 6 },
    { factor: 'Identity (Max 10)', score: assessmentResult.breakdown.identityConsistencyScore, max: 10 },
  ] : [];

  return (
    <div className="w-full py-6 font-sans space-y-8">
      
      {/* 1. TOP HEADER & PROGRESS BAR */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-blue-100 text-blue-700 text-xs font-black uppercase px-2.5 py-0.5 rounded-full">
                Step-by-Step Screener
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Step {step} of 6
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
              {language === 'ta' ? 'à®®à¯à®¤à®¿à®¯à¯‹à®°à¯ à®“à®¯à¯à®µà¯‚à®¤à®¿à®¯ à®¤à®•à¯à®¤à®¿ à®šà¯‹à®¤à®©à¯ˆ' : 'AI Pension Eligibility Screener'}
            </h1>
          </div>

          <button
            type="button"
            onClick={handleVoiceGuide}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5"
            title="Listen to question instructions"
          >
            <Volume2 className="w-4 h-4 text-blue-600" />
            <span>{language === 'ta' ? 'ðŸ”Š à®µà®´à®¿à®•à®¾à®Ÿà¯à®Ÿà®²à¯ˆ à®•à¯‡à®³à¯à®™à¯à®•à®³à¯' : 'ðŸ”Š Voice Guide'}</span>
          </button>
        </div>

        {/* 6-Step Visual Stepper */}
        <div className="grid grid-cols-6 gap-2 pt-1">
          {[1, 2, 3, 4, 5, 6].map((num) => (
            <div
              key={num}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                step >= num ? 'bg-blue-600' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

      </div>

      {/* 2. WIZARD STEP CONTENT OR ASSESSMENT RESULTS */}
      {!assessmentResult ? (
        
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-6 text-left">
          
          {/* Question Title & Description */}
          <div className="space-y-1.5 border-b border-slate-100 pb-4">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              {language === 'ta' ? currentMeta.titleTa : currentMeta.titleEn}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {language === 'ta' ? currentMeta.descTa : currentMeta.descEn}
            </p>
          </div>

          {/* STEP 1: AGE */}
          {step === 1 && (
            <div className="space-y-4 max-w-lg">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Applicant Age (in completed years)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="18"
                    max="115"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-32 px-4 py-3 text-lg font-black text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                  />
                  <span className="text-sm font-semibold text-slate-500">Years Old</span>
                </div>
              </div>

              {/* Special categories */}
              <div className="pt-2 space-y-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700">Special Eligibility Circumstances:</span>
                
                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isWidow}
                    onChange={(e) => setIsWidow(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800">Destitute Widow Status</div>
                    <div className="text-[11px] text-slate-500">Qualifies for Widow Pension Scheme starting at age 40.</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasDisability}
                    onChange={(e) => setHasDisability(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800">Person with Benchmark Disability (PwD)</div>
                    <div className="text-[11px] text-slate-500">Qualifies for Differently Abled Welfare Pension.</div>
                  </div>
                </label>

                {hasDisability && (
                  <div className="pl-6 space-y-1">
                    <label className="text-xs font-bold text-slate-700">Certified Disability Percentage (%)</label>
                    <input
                      type="number"
                      min="40"
                      max="100"
                      value={disabilityPercentage}
                      onChange={(e) => setDisabilityPercentage(e.target.value)}
                      placeholder="e.g. 50"
                      className="w-32 px-3 py-2 text-xs rounded-xl border border-slate-300 font-bold"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: RESIDENCE */}
          {step === 2 && (
            <div className="space-y-4 max-w-lg">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">State of Permanent Residence</label>
                <input
                  type="text"
                  value={residenceState}
                  onChange={(e) => setResidenceState(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-300 bg-slate-50"
                  readOnly
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">District in Tamil Nadu</label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[
                    'Chennai', 'Madurai', 'Coimbatore', 'Salem', 'Tiruchirappalli',
                    'Tirunelveli', 'Thanjavur', 'Erode', 'Dindigul', 'Vellore',
                    'Cuddalore', 'Kanchipuram', 'Virudhunagar', 'Sivaganga', 'Theni'
                  ].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* STEP 3: INCOME */}
          {step === 3 && (
            <div className="space-y-4 max-w-lg">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Estimated Annual Household Income (â‚¹ / Year)</label>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-slate-400">â‚¹</span>
                  <input
                    type="number"
                    step="1000"
                    value={annualIncome}
                    onChange={(e) => setAnnualIncome(e.target.value)}
                    className="w-48 px-4 py-3 text-lg font-black text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-left"
                  />
                  <span className="text-xs font-semibold text-slate-500">per annum</span>
                </div>
              </div>

              <div className="flex gap-2">
                {[36000, 48000, 60000, 72000].map(inc => (
                  <button
                    key={inc}
                    type="button"
                    onClick={() => setAnnualIncome(inc)}
                    className={`py-1.5 px-2.5 rounded-lg text-[11px] font-bold border transition ${
                      parseInt(annualIncome, 10) === inc ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    â‚¹{inc.toLocaleString()}
                  </button>
                ))}
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
                ðŸ’¡ Standard eligibility guideline: Destitute senior pension programs require an annual income under â‚¹72,000.
              </div>
            </div>
          )}

          {/* STEP 4: EXISTING BENEFITS */}
          {step === 4 && (
            <div className="space-y-4 max-w-lg">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Are you currently receiving any monthly pension?</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setHasExistingPension(false)}
                    className={`py-3 px-4 rounded-xl text-xs font-bold border transition ${
                      !hasExistingPension ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    No, I do not receive any pension
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasExistingPension(true)}
                    className={`py-3 px-4 rounded-xl text-xs font-bold border transition ${
                      hasExistingPension ? 'bg-amber-600 text-white border-amber-600 shadow-sm' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Yes, I receive an active pension
                  </button>
                </div>
              </div>

              {hasExistingPension && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-700">Scheme Name / Payout Details</label>
                  <input
                    type="text"
                    placeholder="e.g. EPF Pension / Other Welfare Assistance"
                    value={existingPensionName}
                    onChange={(e) => setExistingPensionName(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 font-medium"
                  />
                  <p className="text-[11px] text-amber-700">
                    âš ï¸ Dual pensions from government treasuries are restricted; you may still qualify for non-cash benefits like Annapurna food grains.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: DOCUMENTS CHECK */}
          {step === 5 && (
            <div className="space-y-3 max-w-lg">
              <div className="text-xs text-slate-600">
                Select the documents you currently possess:
              </div>

              <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasAgeProof}
                  onChange={(e) => setHasAgeProof(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <div>
                  <div className="text-xs font-bold text-slate-800">Age Proof / Aadhaar Card</div>
                  <div className="text-[11px] text-slate-500">Confirms date of birth and residential address.</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasIncomeCertificate}
                  onChange={(e) => setHasIncomeCertificate(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <div>
                  <div className="text-xs font-bold text-slate-800">Tahsildar Income Certificate</div>
                  <div className="text-[11px] text-slate-500">Government certified household income statement.</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasBankPassbook}
                  onChange={(e) => setHasBankPassbook(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <div>
                  <div className="text-xs font-bold text-slate-800">Bank Savings Account Passbook</div>
                  <div className="text-[11px] text-slate-500">Required for Direct Benefit Transfer (DBT) monthly payments.</div>
                </div>
              </label>
            </div>
          )}

          {/* STEP 6: REVIEW SUMMARY BEFORE SCORE */}
          {step === 6 && (
            <div className="space-y-4 max-w-xl">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 text-xs">
                <h3 className="font-extrabold text-slate-900 border-b border-slate-200 pb-2">
                  Summary of Declared Circumstances
                </h3>
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div><strong>Age:</strong> {age} Years</div>
                  <div><strong>District:</strong> {district}, {residenceState}</div>
                  <div><strong>Declared Income:</strong> â‚¹{parseInt(annualIncome, 10).toLocaleString()} / year</div>
                  <div><strong>Existing Pension:</strong> {hasExistingPension ? 'Yes' : 'None'}</div>
                  <div><strong>Widow / Destitute:</strong> {isWidow ? 'Yes' : 'No'}</div>
                  <div><strong>Differently Abled:</strong> {hasDisability ? `Yes (${disabilityPercentage}%)` : 'No'}</div>
                  <div><strong>Documents Available:</strong> {[hasAgeProof && 'Aadhaar', hasIncomeCertificate && 'Income Cert', hasBankPassbook && 'Bank Passbook'].filter(Boolean).join(', ')}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCalculateScore}
                disabled={isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-lg transition flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5 text-amber-300" />
                <span>{isSubmitting ? 'Evaluating AI Assessment...' : 'Calculate AI Eligibility Assessment Score'}</span>
              </button>
            </div>
          )}

          {/* Stepper Navigation Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrev}
              disabled={step === 1}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 disabled:opacity-30 flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            {step < 6 && (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-extrabold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
              >
                <span>Next Question</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

        </div>

      ) : (

        /* 3. AI ASSESSMENT SCORE REPORT & RECOMMENDED SCHEMES */
        <div className="space-y-6 text-left">
          
          {/* Main Score Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-lg space-y-6">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                  AI Decision Support Report
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                  Preliminary Eligibility Assessment
                </h2>
                <p className="text-xs text-slate-500">
                  This is a preliminary AI assessment. Final eligibility is decided after administrative review.
                </p>
              </div>

              {/* Score Badge */}
              <div className="flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-md">
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 uppercase font-black">AI Score</div>
                  <div className="text-2xl sm:text-3xl font-black text-amber-400">
                    {assessmentResult.score} / 100
                  </div>
                </div>
                <div className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                  assessmentResult.score >= 80 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  assessmentResult.score >= 50 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                  'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {assessmentResult.status}
                </div>
              </div>
            </div>

            {/* Score Breakdown Chart (Recharts) */}
            <div className="space-y-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                Explainable Score Breakdown
              </h3>
              <div className="h-56 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <XAxis type="number" domain={[0, 25]} textAnchor="end" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="factor" type="category" width={130} tick={{ fontSize: 11, fontWeight: 600 }} />
                    <Tooltip formatter={(value) => [`${value} Points`, 'Score']} />
                    <Bar dataKey="score" fill="#3b82f6" radius={[0, 6, 6, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.score === entry.max ? '#10b981' : '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Reasons and Factors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-2">
                <h4 className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Positive Qualifying Factors
                </h4>
                <ul className="text-xs text-emerald-800 space-y-1.5 list-disc list-inside">
                  {assessmentResult.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>

              {assessmentResult.conditionsAffected.length > 0 && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-2">
                  <h4 className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    Conditions Under Review
                  </h4>
                  <ul className="text-xs text-amber-800 space-y-1.5 list-disc list-inside">
                    {assessmentResult.conditionsAffected.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

          </div>

          {/* 4. RECOMMENDED SCHEMES SECTION */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-black text-slate-900">
                Recommended Welfare Schemes
              </h3>
              <p className="text-xs text-slate-500">
                The schemes below may be relevant to you based on your screening responses.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assessmentResult.recommendedSchemes.map((scheme) => (
                <div
                  key={scheme.schemeId}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                        {scheme.matchStatus} ({scheme.matchPercentage}% Alignment)
                      </span>
                      <span className="text-xs font-bold text-slate-400">{scheme.schemeId}</span>
                    </div>

                    <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
                      {scheme.schemeName}
                    </h4>

                    <div className="space-y-1 text-xs text-slate-600">
                      {scheme.keyConditionsMet.map((c, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-emerald-700">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{c}</span>
                        </div>
                      ))}
                    </div>

                    <div className="text-[11px] text-slate-500 pt-1">
                      <strong>Required Proofs:</strong> {scheme.requiredDocuments.join(', ')}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleProceedToApplication(scheme.schemeId)}
                    className="w-full py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2"
                  >
                    <span>Apply for This Scheme</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Reset Screener Button */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => { setAssessmentResult(null); setStep(1); }}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 underline"
            >
              Take Screener Again with Different Values
            </button>
          </div>

        </div>

      )}

    </div>
  );
};

