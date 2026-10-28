import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  Sparkles,
  Award,
  Layers,
  FileText,
  FileCheck,
  CheckCircle2,
  Send,
  Clock,
  Volume2,
  ArrowRight
} from 'lucide-react';

export const HowItWorksPage = () => {
  const { language, speakText } = useApp();

  const handleListenAll = () => {
    speakText(
      "How Pension Seva Works in 8 Simple Steps. " +
      "Step 1: Check Eligibility. Step 2: Understand Your Result. Step 3: Find Relevant Schemes. " +
      "Step 4: Start Application. Step 5: Upload Documents. Step 6: Verify Information. " +
      "Step 7: Submit. Step 8: Track Your Application Status."
    );
  };

  const steps = [
    {
      num: 1,
      title: 'Check Eligibility',
      desc: 'Answer 5 basic questions regarding your age, residence, income, and existing pensions. No documents are required at this stage.',
      icon: Sparkles,
      color: 'bg-blue-600 text-white'
    },
    {
      num: 2,
      title: 'Understand Your Result',
      desc: 'View an explainable 0–100 preliminary score breakdown explaining positive factors, missing info, and qualifying criteria.',
      icon: Layers,
      color: 'bg-indigo-600 text-white'
    },
    {
      num: 3,
      title: 'Find Relevant Schemes',
      desc: 'Review welfare schemes that may be relevant to you, such as IGNOAPS, Destitute OAP, or Annapurna food security.',
      icon: Award,
      color: 'bg-emerald-600 text-white'
    },
    {
      num: 4,
      title: 'Start Application',
      desc: 'Begin your structured application. Information already entered during eligibility checking is pre-filled automatically.',
      icon: FileText,
      color: 'bg-amber-600 text-white'
    },
    {
      num: 5,
      title: 'Upload Documents',
      desc: 'Upload clear photographs or PDF copies of your age proof, income certificate, and bank passbook. Real-time quality checks guide you.',
      icon: FileCheck,
      color: 'bg-cyan-600 text-white'
    },
    {
      num: 6,
      title: 'Verify Information',
      desc: 'Inspect automated OCR information extracted from your certificates. You have full freedom to confirm or correct any field.',
      icon: CheckCircle2,
      color: 'bg-teal-600 text-white'
    },
    {
      num: 7,
      title: 'Submit Application',
      desc: 'Review your complete dossier, agree to the declaration, and submit. A standardized Application ID (PS-2026-000XXX) is generated.',
      icon: Send,
      color: 'bg-purple-600 text-white'
    },
    {
      num: 8,
      title: 'Track Real-Time Progress',
      desc: 'Monitor the administrative review queue, receive notification alerts if correction is required, and view your official decision.',
      icon: Clock,
      color: 'bg-rose-600 text-white'
    }
  ];

  return (
    <div className="w-full py-6 space-y-10">

      {/* Title & Listen */}
      <div className="text-center space-y-4">
        <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
          8 Simple Steps
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          How Pension Seva Works
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto">
          We guide you through a step-by-step process so your pension application is complete, verified, and easy to track.
        </p>
        <button
          onClick={handleListenAll}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition"
        >
          <Volume2 className="w-4 h-4 text-amber-600" />
          <span>🔊 Listen to All Steps</span>
        </button>
      </div>

      {/* Step by step cards */}
      <div className="space-y-4">
        {steps.map((s) => (
          <div
            key={s.num}
            className="flex flex-col sm:flex-row items-start gap-4 p-5 sm:p-6 bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition"
          >
            <div className={`w-12 h-12 rounded-2xl ${s.color} flex items-center justify-center font-black text-lg shrink-0 shadow`}>
              {s.num}
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  {s.title}
                </h3>
                <button
                  onClick={() => speakText(`Step ${s.num}: ${s.title}. ${s.desc}`)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-md"
                  title="Read this step aloud"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {s.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="text-center pt-4">
        <Link
          to="/eligibility"
          className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg transition"
        >
          <Sparkles className="w-5 h-5 text-amber-300" />
          <span>Start with Step 1: Check Eligibility</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

    </div>
  );
};
