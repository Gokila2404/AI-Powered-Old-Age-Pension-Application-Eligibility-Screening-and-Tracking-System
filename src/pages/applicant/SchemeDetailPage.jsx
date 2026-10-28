import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import api from '../../api/client';
import {
  FileText,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Calendar,
  IndianRupee,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  Volume2,
  AlertCircle
} from 'lucide-react';

export const SchemeDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { language, speakText, setEligibilityData, schemes } = useApp();

  const [scheme, setScheme] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await api.get(`/schemes/${id}`);
        setScheme(res.data);
      } catch (err) {
        // Fallback to local schemes list
        const local = schemes.find(s => s.id === id);
        if (local) setScheme(local);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id, schemes]);

  if (loading) {
    return (
      <div className="w-full py-12 text-center text-slate-500">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-xs">Loading scheme details...</p>
      </div>
    );
  }

  if (!scheme) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Scheme Not Found</h2>
        <p className="text-xs text-slate-600">The requested welfare program could not be located.</p>
        <Link to="/schemes" className="inline-block px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold">
          Back to Schemes
        </Link>
      </div>
    );
  }

  const handleListen = () => {
    speakText(`${scheme.nameEn}. ${scheme.descriptionEn}. Payout is ${scheme.payoutEn}.`);
  };

  const handleStartApp = () => {
    setEligibilityData(prev => ({
      ...(prev || {}),
      selectedSchemeId: scheme.id,
      selectedSchemeName: scheme.nameEn,
      schemeSelectionLocked: false
    }));
    navigate(`/application?schemeId=${scheme.id}`);
  };

  return (
    <div className="w-full py-6 space-y-8 text-left">

      {/* Back button */}
      <div>
        <Link
          to="/schemes"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Schemes Catalog</span>
        </Link>
      </div>

      {/* Hero Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                {scheme.id}
              </span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {scheme.deptEn}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              {language === 'ta' ? scheme.nameTa : scheme.nameEn}
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
              {language === 'ta' ? scheme.descriptionTa : scheme.descriptionEn}
            </p>
          </div>

          <button
            onClick={handleListen}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition shrink-0"
          >
            <Volume2 className="w-4 h-4 text-amber-600" />
            <span>ðŸ”Š Listen</span>
          </button>
        </div>

        {/* Benefits Strip */}
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-800 block">Monthly Welfare Benefit</span>
            <span className="text-lg font-black text-emerald-900">
              {language === 'ta' ? scheme.payoutTa : scheme.payoutEn}
            </span>
          </div>
          <span className="text-xs text-emerald-700 font-medium">
            Direct Benefit Transfer (DBT) to registered bank account
          </span>
        </div>

        {/* Key Eligibility Conditions */}
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Eligibility Requirements
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="font-semibold uppercase text-[10px]">Age Requirement</span>
              </div>
              <p className="font-bold text-slate-900 text-sm">{scheme.minAge}+ Years of age</p>
              <p className="text-[11px] text-slate-500 mt-1">Verified via Aadhaar or birth proof</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                <IndianRupee className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold uppercase text-[10px]">Income Ceiling</span>
              </div>
              <p className="font-bold text-slate-900 text-sm">Up to â‚¹{scheme.maxIncome.toLocaleString()}/year</p>
              <p className="text-[11px] text-slate-500 mt-1">Certified by Tahsildar / VAO</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                <MapPin className="w-4 h-4 text-rose-600" />
                <span className="font-semibold uppercase text-[10px]">Residence</span>
              </div>
              <p className="font-bold text-slate-900 text-sm">{scheme.residenceRequired}</p>
              <p className="text-[11px] text-slate-500 mt-1">Permanent residential proof required</p>
            </div>
          </div>
        </div>

        {/* Required Documents */}
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Required Documents
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {scheme.requiredDocuments.map((doc, idx) => (
              <div key={idx} className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium text-slate-800">{doc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Application Process Guide */}
        <div className="space-y-2 pt-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Application Process
          </h3>
          <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1.5 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <li>Check preliminary compatibility using our 5-question wizard.</li>
            <li>Prepare your application with pre-filled personal and address information.</li>
            <li>Upload scanned copies or clear photos of required documents (PDF/JPG/PNG up to 10 MB).</li>
            <li>Verify extracted fields, declare your consent, and receive a permanent Application ID.</li>
            <li>Track application progress through administrative review.</li>
          </ol>
        </div>

        {/* Important Disclaimer Notice */}
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
          <span className="font-bold block">Important Notice:</span>
          <p className="leading-relaxed">
            Pension Seva is an independent decision-support platform. Listing of this scheme does not guarantee sanction. Final legal approval rests solely with the authorized administrative officer following statutory scrutiny.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
          <Link
            to="/eligibility"
            className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-2xl text-xs sm:text-sm transition flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Check My Eligibility</span>
          </Link>

          <button
            onClick={handleStartApp}
            className="px-6 py-3 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-md transition flex items-center gap-2"
          >
            <span>Start Application for This Scheme</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>

    </div>
  );
};

