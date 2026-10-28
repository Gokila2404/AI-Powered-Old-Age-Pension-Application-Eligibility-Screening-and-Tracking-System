import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import api from '../../api/client';
import {
  FileText,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Award,
  ArrowRight,
  Sparkles,
  Volume2,
  Calendar,
  IndianRupee,
  ShieldCheck,
  ChevronRight,
  SlidersHorizontal,
  Info
} from 'lucide-react';

export const SchemesPage = () => {
  const {
    language,
    schemes,
    eligibilityData,
    aiAssessmentResult,
    speakText,
    setEligibilityData,
    currentUser
  } = useApp();

  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [ageFilter, setAgeFilter] = useState('ALL');
  const [benefitTypeFilter, setBenefitTypeFilter] = useState('ALL');
  const [incomeFilter, setIncomeFilter] = useState('ALL');
  const [activeSectionTab, setActiveSectionTab] = useState('ALL_SCHEMES'); // 'ALL_SCHEMES', 'RECOMMENDED', 'NEW', 'POSSIBLE'
  const [schemeCheckId, setSchemeCheckId] = useState(null);
  const [schemeCheckLoading, setSchemeCheckLoading] = useState(false);
  const [schemeCheckResult, setSchemeCheckResult] = useState(null);
  const [schemeCheckError, setSchemeCheckError] = useState('');
  const [checkForm, setCheckForm] = useState(() => {
    const dob = currentUser?.dob ? new Date(currentUser.dob) : null;
    const ageFromProfile = dob && !Number.isNaN(dob.getTime()) ? Math.floor((Date.now() - dob.getTime()) / 31557600000) : '';
    return {
      age: eligibilityData?.age ?? ageFromProfile,
      annualIncome: eligibilityData?.annualIncome ?? '',
      residenceState: eligibilityData?.residenceState || currentUser?.addressInfo?.state || '',
      hasExistingPension: eligibilityData?.hasExistingPension ?? '',
    };
  });

  const dob = currentUser?.dob ? new Date(currentUser.dob) : null;
  const ageFromProfile = dob && !Number.isNaN(dob.getTime()) ? Math.floor((Date.now() - dob.getTime()) / 31557600000) : null;
  const userAge = eligibilityData?.age ?? ageFromProfile;
  const userIncome = eligibilityData?.annualIncome;

  const filteredSchemes = useMemo(() => {
    return schemes.filter(s => {
      // Search
      const searchTarget = `${s.nameEn} ${s.nameTa} ${s.descriptionEn} ${s.deptEn}`.toLowerCase();
      if (searchQuery && !searchTarget.includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Age Filter
      if (ageFilter === '60_PLUS' && s.minAge < 60) return false;
      if (ageFilter === '65_PLUS' && s.minAge < 65) return false;
      if (ageFilter === 'BELOW_60' && s.minAge >= 60) return false;

      // Benefit Type Filter
      if (benefitTypeFilter === 'CASH' && !s.benefitType.toLowerCase().includes('cash')) return false;
      if (benefitTypeFilter === 'FOOD' && !s.benefitType.toLowerCase().includes('food')) return false;

      // Income Filter
      if (incomeFilter === 'BELOW_72K' && s.maxIncome > 72000) return false;

      return true;
    });
  }, [schemes, searchQuery, ageFilter, benefitTypeFilter, incomeFilter]);

  // Derived sections
  const recommendedSchemes = useMemo(() => {
    return filteredSchemes.filter(s => {
      if (userAge == null || userIncome == null) return false;
      return userAge >= s.minAge && userIncome <= s.maxIncome;
    });
  }, [filteredSchemes, userAge, userIncome]);

  const newlyAddedSchemes = useMemo(() => {
    return filteredSchemes.slice(0, 2);
  }, [filteredSchemes]);

  const displayedSchemes = useMemo(() => {
    if (activeSectionTab === 'RECOMMENDED') return recommendedSchemes;
    if (activeSectionTab === 'NEW') return newlyAddedSchemes;
    return filteredSchemes;
  }, [activeSectionTab, recommendedSchemes, newlyAddedSchemes, filteredSchemes]);

  const handleApplyNow = (scheme) => {
    setEligibilityData(prev => ({
      ...(prev || {}),
      selectedSchemeId: scheme.id,
      selectedSchemeName: scheme.nameEn,
      schemeSelectionLocked: false
    }));
    navigate(`/application?schemeId=${scheme.id}`);
  };

  const openSchemeCheck = (schemeId) => {
    setSchemeCheckId(current => current === schemeId ? null : schemeId);
    setSchemeCheckResult(null);
    setSchemeCheckError('');
  };

  const runSchemeCheck = async (event, schemeId) => {
    event.preventDefault();
    setSchemeCheckLoading(true);
    setSchemeCheckResult(null);
    setSchemeCheckError('');
    try {
      const response = await api.post(`/schemes/${encodeURIComponent(schemeId)}/check-eligibility`, {
        age: Number(checkForm.age),
        annualIncome: Number(checkForm.annualIncome),
        residenceState: checkForm.residenceState.trim(),
        hasExistingPension: checkForm.hasExistingPension === true || checkForm.hasExistingPension === 'true',
      });
      setSchemeCheckResult(response.data);
    } catch (error) {
      setSchemeCheckError(error.response?.data?.detail || 'Could not check this scheme right now.');
    } finally {
      setSchemeCheckLoading(false);
    }
  };

  return (
    <div className="w-full py-6 space-y-8 text-left">
      
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              Welfare Scheme Catalog
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              {language === 'ta' ? 'ஓய்வூதிய மற்றும் நலத்திட்டங்கள்' : 'Welfare & Pension Schemes'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              Explore active social security programs. Review age criteria, income limits, and required documents. Eligibility is determined through administrative evaluation.
            </p>
          </div>

          <button
            onClick={() => speakText("Welfare Schemes directory. Explore active old age pensions and social welfare assistance.")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition shrink-0"
          >
            <Volume2 className="w-4 h-4 text-amber-600" />
            <span>🔊 Listen</span>
          </button>
        </div>

        {/* Search & Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
          
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search scheme name, department, or benefits..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Age Filter */}
          <div>
            <select
              value={ageFilter}
              onChange={(e) => setAgeFilter(e.target.value)}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="ALL">All Age Requirements</option>
              <option value="60_PLUS">60+ Years (Senior)</option>
              <option value="65_PLUS">65+ Years</option>
              <option value="BELOW_60">Under 60 Years (Widow/Disabled)</option>
            </select>
          </div>

          {/* Benefit Type Filter */}
          <div>
            <select
              value={benefitTypeFilter}
              onChange={(e) => setBenefitTypeFilter(e.target.value)}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="ALL">All Benefit Types</option>
              <option value="CASH">Monthly Cash Payout</option>
              <option value="FOOD">Food Grain Subsidy</option>
            </select>
          </div>

        </div>

        {/* Section Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={() => setActiveSectionTab('ALL_SCHEMES')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${activeSectionTab === 'ALL_SCHEMES' ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            All Schemes ({filteredSchemes.length})
          </button>
          <button
            onClick={() => setActiveSectionTab('RECOMMENDED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${activeSectionTab === 'RECOMMENDED' ? 'bg-emerald-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Recommended For You ({recommendedSchemes.length})</span>
          </button>
          <button
            onClick={() => setActiveSectionTab('NEW')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${activeSectionTab === 'NEW' ? 'bg-indigo-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Newly Added ({newlyAddedSchemes.length})
          </button>
        </div>

      </div>

      {/* Scheme Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-start">
        {displayedSchemes.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
            <Info className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No schemes found matching criteria</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your filter settings or search terms to explore other available welfare programs.
            </p>
            <button
              onClick={() => { setSearchQuery(''); setAgeFilter('ALL'); setBenefitTypeFilter('ALL'); setActiveSectionTab('ALL_SCHEMES'); }}
              className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-xs hover:bg-blue-100 transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          displayedSchemes.map((scheme) => (
            <div
              key={scheme.id}
              className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 hover:border-blue-400 hover:shadow-lg hover:-translate-y-0.5 transition flex flex-col h-full space-y-4"
            >
              {/* Header: icon + clean title row */}
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 shrink-0 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                  <Award className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm sm:text-[15px] font-extrabold text-slate-900 leading-snug line-clamp-2">
                    {language === 'ta' ? scheme.nameTa : scheme.nameEn}
                  </h3>
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">
                    {scheme.deptEn}
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                {language === 'ta' ? scheme.descriptionTa : scheme.descriptionEn}
              </p>

              {/* Payout banner */}
              <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 px-3 py-2">
                <IndianRupee className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-[11px] font-bold text-emerald-800 truncate">
                  {language === 'ta' ? scheme.payoutTa : scheme.payoutEn}
                </span>
              </div>

              {/* Conditions Strip: icon-aligned list */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-bold text-slate-800">{scheme.minAge}+ Years</span>
                </div>
                <div className="flex items-center gap-2">
                  <IndianRupee className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-bold text-slate-800">≤ ₹{scheme.maxIncome.toLocaleString()}/yr income ceiling</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-bold text-slate-800 truncate">{scheme.residenceRequired}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-bold text-slate-800 truncate">{scheme.benefitType}</span>
                </div>
              </div>

              {/* Required Documents */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                  Required Documents:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {scheme.requiredDocuments.map((doc, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] text-slate-700 font-medium"
                    >
                      {doc}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card Actions */}
              <div className="flex flex-col gap-2 pt-2 mt-auto border-t border-slate-100">
                <Link
                  to={`/schemes/${scheme.id}`}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <span>View Full Scheme Details</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => openSchemeCheck(scheme.id)}
                    className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition text-center whitespace-nowrap"
                  >
                    Check Scheme
                  </button>

                  <button
                    onClick={() => handleApplyNow(scheme)}
                    className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm whitespace-nowrap"
                  >
                    <span>Apply</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {schemeCheckId === scheme.id && (
                <form onSubmit={(event) => runSchemeCheck(event, scheme.id)} className="rounded-2xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                  <div>
                    <h4 className="text-sm font-extrabold text-blue-950">Check {scheme.nameEn}</h4>
                    <p className="mt-1 text-xs text-blue-800">Enter your details to check this scheme’s age, income, residence, and pension-conflict rules.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="text-xs font-semibold text-slate-700">Age in years
                      <input required type="number" min="0" max="120" value={checkForm.age} onChange={(event) => setCheckForm(current => ({ ...current, age: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" />
                    </label>
                    <label className="text-xs font-semibold text-slate-700">Annual income
                      <input required type="number" min="0" value={checkForm.annualIncome} onChange={(event) => setCheckForm(current => ({ ...current, annualIncome: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" />
                    </label>
                    <label className="text-xs font-semibold text-slate-700">State / territory
                      <input required value={checkForm.residenceState} onChange={(event) => setCheckForm(current => ({ ...current, residenceState: event.target.value }))} placeholder="e.g. Tamil Nadu" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" />
                    </label>
                    <label className="text-xs font-semibold text-slate-700">Currently receiving another pension?
                      <select required value={checkForm.hasExistingPension} onChange={(event) => setCheckForm(current => ({ ...current, hasExistingPension: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2">
                        <option value="">Select</option><option value="false">No</option><option value="true">Yes</option>
                      </select>
                    </label>
                  </div>
                  <button disabled={schemeCheckLoading} className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
                    {schemeCheckLoading ? 'Checking…' : `Check ${scheme.nameEn}`}
                  </button>
                  {schemeCheckError && <p role="alert" className="rounded-lg bg-red-100 p-3 text-xs text-red-800">{schemeCheckError}</p>}
                  {schemeCheckResult?.schemeId === scheme.id && <div className={`rounded-xl border p-3 ${schemeCheckResult.eligible ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>
                    <strong className="text-sm">{schemeCheckResult.status}</strong>
                    <ul className="mt-2 space-y-1 text-xs">{schemeCheckResult.checks.map((check) => <li key={check.criterion}>{check.passed ? '✓' : '✗'} {check.criterion}: {check.actual} · Required: {check.required}</li>)}</ul>
                    <p className="mt-2 text-[11px]">{schemeCheckResult.notice}</p>
                  </div>}
                </form>
              )}

            </div>
          ))
        )}
      </div>

    </div>
  );
};

export const TNSchemesPage = SchemesPage;
