import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  CheckCircle2,
  Workflow,
  Sparkles,
  Search,
  FileCheck,
  Volume2,
  Lock,
  ArrowRight
} from 'lucide-react';

export const AboutPage = () => {
  const { language, speakText } = useApp();

  const handleListen = () => {
    speakText(
      "About Pension Seva. Pension Seva is an independent welfare assistance platform designed to assist senior citizens with eligibility screening, document verification, application preparation, and milestone tracking."
    );
  };

  return (
    <div className="w-full py-6 space-y-10">

      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-bold text-xs">
          <ShieldCheck className="w-4 h-4" />
          <span>Independent Welfare Assistance Platform</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          What is Pension Seva?
        </h1>
        <p className="text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Pension Seva is a digital welfare-support system built to simplify how citizens explore, apply for, and track old age pensions and social security assistance.
        </p>
        <button
          onClick={handleListen}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition"
        >
          <Volume2 className="w-4 h-4 text-amber-600" />
          <span>🔊 Listen to About Pension Seva</span>
        </button>
      </div>

      {/* What Pension Seva Helps With */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900">
          What Pension Seva Helps With
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Preliminary Eligibility Assessment</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Calculates a decision-support compatibility score (0–100) based on age, income limits, residence, and existing welfare benefits.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
              <Workflow className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Welfare Scheme Discovery</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Matches your profile against active social welfare programs including old age pensions, destitute widow assistance, and food security.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
              <FileCheck className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Smart Application Preparation</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Carries forward verified details so you never have to enter the same information twice, minimizing clerical errors.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Automated Document Verification</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Screens uploaded certificates for blur, brightness, and legibility before OCR extraction and user confirmation.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-cyan-50/60 border border-cyan-100 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-600 text-white flex items-center justify-center font-bold">
              <Search className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Real-Time Application Tracking</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Provides live tracking from Submission to Administrative Review and Sanction Order with clear milestone updates.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold">
              <Volume2 className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Voice & Multilingual Assistance</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Offers read-aloud support and conversational guidance in both English and Tamil to assist elderly citizens.
            </p>
          </div>

        </div>
      </section>

      {/* How It Works Overview */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900">
          How It Works
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Pension Seva guides you through an end-to-end journey: from answering basic age and income questions to uploading clear certificates, verifying extracted data, and receiving live status updates once an administrative officer reviews your case.
        </p>
        <div className="pt-2">
          <Link
            to="/how-it-works"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700"
          >
            <span>See the step-by-step process</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Future Integration & Official Status Notice */}
      <section className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
          <Lock className="w-4 h-4" />
          <span>Independent Platform & Future Integration</span>
        </div>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          Pension Seva is an independent digital welfare assistance platform. It is designed with modular architecture so that authorized external administrative services and government API integrations can be seamlessly connected in the future.
        </p>
        <p className="text-xs text-slate-400">
          Final statutory approval of all welfare applications belongs strictly to designated revenue authorities and taluk welfare officers.
        </p>
      </section>

    </div>
  );
};
