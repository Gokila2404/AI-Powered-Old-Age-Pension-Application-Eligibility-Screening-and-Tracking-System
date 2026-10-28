import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  Sparkles,
  Search,
  Volume2,
  ShieldCheck,
  ArrowRight,
  FileText,
  UserCheck,
  CheckCircle2,
  Workflow,
  Award,
  HelpCircle,
  Clock,
  Eye,
  Camera,
  Bot,
  ChevronRight
} from 'lucide-react';

export const HomePage = () => {
  const {
    language,
    currentUser,
    applications,
    notifications,
    speakText,
    simpleMode
  } = useApp();



  const heroHeading = language === 'ta'
    ? 'à®®à¯à®¤à®¿à®¯à¯‹à®°à¯ à®“à®¯à¯à®µà¯‚à®¤à®¿à®¯ à®‰à®¤à®µà®¿, à®ªà®Ÿà®¿à®ªà¯à®ªà®Ÿà®¿à®¯à®¾à®•'
    : 'Get Pension Support, Step by Step';

  const heroSubheading = language === 'ta'
    ? 'à®‰à®™à¯à®•à®³à¯ à®¤à®•à¯à®¤à®¿à®¯à¯ˆ à®šà®°à®¿à®ªà®¾à®°à¯à®•à¯à®•à®µà¯à®®à¯, à®ªà¯Šà®°à¯à®¤à¯à®¤à®®à®¾à®© à®¨à®²à®¤à¯à®¤à®¿à®Ÿà¯à®Ÿà®™à¯à®•à®³à¯ˆ à®•à®£à¯à®Ÿà®±à®¿à®¯à®µà¯à®®à¯, à®µà®¿à®£à¯à®£à®ªà¯à®ªà®¤à¯à®¤à¯ˆ à®¤à®¯à®¾à®°à®¿à®•à¯à®•à®µà¯à®®à¯, à®†à®µà®£à®™à¯à®•à®³à¯ˆ à®šà®°à®¿à®ªà®¾à®°à¯à®•à¯à®•à®µà¯à®®à¯ à®®à®±à¯à®±à¯à®®à¯ à®¨à®¿à®²à¯ˆà®¯à¯ˆ à®’à®°à¯‡ à®Žà®³à®¿à®¯ à®¤à®³à®¤à¯à®¤à®¿à®²à¯ à®•à®£à¯à®•à®¾à®£à®¿à®•à¯à®•à®µà¯à®®à¯.'
    : 'Check your eligibility, discover relevant welfare schemes, prepare your application, verify your documents, and track your application in one simple platform.';

  const handleHeroListen = () => {
    speakText(`${heroHeading}. ${heroSubheading}`);
  };

  const howItWorksSteps = [
    { num: 1, title: 'Check Eligibility', desc: 'Answer quick questions on age, residence, and income.' },
    { num: 2, title: 'Find a Scheme', desc: 'Discover programs that may match your circumstances.' },
    { num: 3, title: 'Prepare Application', desc: 'Pre-fill application details without redundant typing.' },
    { num: 4, title: 'Upload Documents', desc: 'Securely upload clear certificates or ID proofs.' },
    { num: 5, title: 'Verify Information', desc: 'Inspect automated OCR extraction and confirm details.' },
    { num: 6, title: 'Submit', desc: 'Submit with your verified declaration consent.' },
    { num: 7, title: 'Track', desc: 'Monitor administrative review progress in real time.' },
  ];

  const docProcessingPipeline = [
    { step: 'Upload', desc: 'Select or snap clear photo' },
    { step: 'Quality Check', desc: 'Inspect blur, brightness, contrast' },
    { step: 'Read Information', desc: 'Automated OCR extraction' },
    { step: 'Understand Information', desc: 'NLP named entity recognition' },
    { step: 'Confirm', desc: 'Review & correct extracted values' },
    { step: 'Continue', desc: 'Auto-fill application fields' }
  ];

  return (
    <div className="space-y-12 py-4">



      {/* HERO SECTION â€” personalized heading when signed in, public pitch for guests */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-50 via-white to-blue-50 text-slate-900 border border-blue-100 shadow-xl">
        <div className="grid min-h-[340px] lg:grid-cols-[.9fr_1.1fr]">
        <div className="relative z-10 flex flex-col justify-center p-6 sm:p-10 lg:p-12 space-y-5">
          
          {/* Identity Tag & Audio */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold border border-blue-200">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              Pension Seva Platform
            </span>
            <button
              onClick={handleHeroListen}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold border border-amber-200 transition"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>ðŸ”Š Listen to this page</span>
            </button>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight text-slate-950">
            {heroHeading}
          </h1>

          {/* Subheading */}
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
            {heroSubheading}
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to="/eligibility"
              className="px-6 py-3.5 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-2xl shadow-lg transition flex items-center gap-2 text-sm sm:text-base"
            >
              <Sparkles className="w-5 h-5 text-amber-300" />
              <span>Check Eligibility</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>

            <Link
              to={currentUser ? "/application" : "/login"}
              state={currentUser ? undefined : { nextAction: 'application' }}
              className="px-6 py-3.5 bg-white hover:bg-blue-50 text-blue-800 font-bold rounded-2xl border border-blue-200 shadow-sm transition flex items-center gap-2 text-sm sm:text-base"
            >
              <FileText className="w-5 h-5 text-blue-400" />
              <span>{currentUser ? 'Start Application' : 'Sign In to Apply'}</span>
            </Link>
          </div>
        </div>
        <div className="flex min-h-[480px] items-center justify-center overflow-hidden bg-gradient-to-br from-sky-50 to-blue-100 p-4 sm:p-5">
          <img src="/assets/elderly-couple-walking-cropped.jpg" alt="Older couple walking together" className="h-[480px] max-w-full rounded-2xl border border-white/80 bg-white/60 object-contain object-center shadow-lg" />
          </div>
        </div>
      </section>

      {/* QUICK ACCESS CARDS */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link
          to="/eligibility"
          className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-lg transition group text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm mb-1">Check Eligibility</h3>
          <p className="text-xs text-slate-500">5-step wizard to see matching criteria</p>
        </Link>

        <Link
          to={currentUser ? "/application" : "/login"}
          className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 hover:border-emerald-400 hover:shadow-lg transition group text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm mb-1">{currentUser ? 'Apply Online' : 'Apply Online'}</h3>
          <p className="text-xs text-slate-500">{currentUser ? 'Prepare with auto-filled document info' : 'Sign in to prepare your application'}</p>
        </Link>

        <Link
          to="/track"
          className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 hover:border-cyan-400 hover:shadow-lg transition group text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition">
            <Search className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm mb-1">Track Application</h3>
          <p className="text-xs text-slate-500">Live timeline & officer review status</p>
        </Link>

        <Link
          to="/welfare-assist"
          className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200 hover:border-rose-400 hover:shadow-lg transition group text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition">
            <Bot className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm mb-1">Welfare Assist</h3>
          <p className="text-xs text-slate-500">Voice-assisted conversational help</p>
        </Link>
      </section>

      {/* HOW IT WORKS - 7 STEPS */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Step by Step Guide</span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">How Pension Seva Works</h2>
          </div>
          <Link
            to="/how-it-works"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>View Full Visual Process</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {howItWorksSteps.map((step) => (
            <div key={step.num} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                {step.num}
              </span>
              <h4 className="font-bold text-slate-900 text-sm">{step.title}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DOCUMENT PROCESSING TIMELINE */}
      <section className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white space-y-6 shadow-xl">
        <div>
          <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
            Intelligent Document Handling
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
            â€œSee it. Hear it. Understand it. Confirm it.â€
          </h2>
          <p className="text-xs text-slate-300 max-w-xl mt-1">
            Uploaded certificates undergo real-time clarity inspection, optical character recognition, and user confirmation before auto-filling.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {docProcessingPipeline.map((p, idx) => (
            <div key={idx} className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 space-y-1">
              <div className="text-[10px] uppercase font-bold tracking-wider text-blue-300">
                Phase {idx + 1}
              </div>
              <h4 className="font-bold text-white text-xs">{p.step}</h4>
              <p className="text-[11px] text-slate-300">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* EXAMPLE APPLICATION TIMELINE */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div>
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Transparent Tracking</span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">Live Application Milestone Tracking</h2>
          <p className="text-xs text-slate-600">Every application follows transparent stages with official audit trails.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
          <div className="flex items-start gap-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-slate-900 text-xs">1. Submitted</h4>
              <p className="text-[11px] text-slate-600">Form prepared & ID generated</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-slate-900 text-xs">2. Document Verification</h4>
              <p className="text-[11px] text-slate-600">Quality checked & text extracted</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-blue-50 border border-blue-200">
            <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <h4 className="font-bold text-slate-900 text-xs">3. Under Review</h4>
              <p className="text-[11px] text-slate-600">Taluk officer scrutiny & field enquiry</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <Award className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-slate-900 text-xs">4. Decision & Sanction</h4>
              <p className="text-[11px] text-slate-600">Approval, correction, or sanction</p>
            </div>
          </div>
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="text-center bg-blue-50 border border-blue-200 rounded-3xl p-8 sm:p-12 space-y-4">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
          Ready to Check Your Eligibility?
        </h2>
        <p className="text-sm text-slate-600 max-w-xl mx-auto">
          Start with our simple 5-question wizard. No documents needed for preliminary screening.
        </p>
        <div className="pt-2">
          <Link
            to="/eligibility"
            className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg transition text-base"
          >
            <Sparkles className="w-5 h-5 text-amber-300" />
            <span>Check Eligibility Now</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </section>

    </div>
  );
};

