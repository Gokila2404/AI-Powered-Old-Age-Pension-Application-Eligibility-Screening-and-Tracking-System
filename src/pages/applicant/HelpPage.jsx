import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  HelpCircle,
  Phone,
  Mail,
  Volume2,
  FileCheck,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertCircle
} from 'lucide-react';

export const HelpPage = () => {
  const { language, speakText } = useApp();

  const faqs = [
    {
      q: 'What is Pension Seva?',
      a: 'Pension Seva is an academic prototype designed to simplify welfare pension discovery, eligibility assessment, document verification, and tracking for senior citizens.'
    },
    {
      q: 'Does this platform directly grant government pensions?',
      a: 'No. Pension Seva is an academic prototype providing AI decision support. Final determinations are exclusively made by official government revenue authorities during administrative review.'
    },
    {
      q: 'What are the main eligibility criteria for old age pensions in Tamil Nadu?',
      a: 'Generally: minimum 60 years of age, continuous residence in Tamil Nadu, household annual income below ₹72,000, and no regular family sustenance or existing treasury pension.'
    },
    {
      q: 'How should I capture photos of my documents for verification?',
      a: 'Place the document on a flat surface with good lighting. Ensure all four corners are visible, text is crisp, and there are no glare reflections or heavy shadows.'
    },
    {
      q: 'How does the voice assistance feature work?',
      a: 'Look for the 🔊 Listen button on any screen. Clicking it activates your browser Web Speech audio to read the text and questions aloud clearly.'
    },
    {
      q: 'What happens if my document is flagged as "Needs Attention"?',
      a: 'You will receive specific guidance (e.g. increase lighting or steady your camera). You can re-upload a clearer image before submitting your application.'
    }
  ];

  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div className="w-full py-6 font-sans space-y-8 text-left">
      
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
          Support Center
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
          {language === 'ta' ? 'உதவி மற்றும் அடிக்கடி கேட்கப்படும் கேள்விகள்' : 'Help & Senior Citizen Support'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-2xl">
          Everything you need to know about using Pension Seva, document preparation tips, and helpline contact details.
        </p>
      </div>

      {/* Emergency Helpline Numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 space-y-2 flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Phone className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-emerald-800 uppercase">Senior Citizen National Helpline</div>
            <div className="text-2xl font-black text-emerald-950 font-mono">14567</div>
            <p className="text-[11px] text-emerald-700">Toll-free assistance for elder care and social welfare schemes.</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-3xl p-6 space-y-2 flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-blue-800 uppercase">Academic Prototype Support</div>
            <div className="text-sm font-black text-blue-950 font-mono pt-1">prototype@pensionseva.edu</div>
            <p className="text-[11px] text-blue-700">Technical inquiries, feedback, and academic research collaboration.</p>
          </div>
        </div>
      </div>

      {/* Document Guidelines Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-blue-600" />
            <span>Document Photograph Tips for Clear OCR</span>
          </h2>
          <button
            onClick={() => speakText('Keep all 4 corners visible. Use good ambient lighting. Avoid shadows. Make sure text is readable.')}
            className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
          >
            <Volume2 className="w-4 h-4" />
            <span>🔊 Listen</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <strong>✅ Good Lighting:</strong> Take photos during daytime or directly under room lights.
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <strong>✅ Steady Camera:</strong> Hold phone with both hands to prevent motion blur.
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <strong>✅ All Corners Visible:</strong> Frame the entire page inside the camera viewfinder.
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <strong>✅ Avoid Flash Glare:</strong> Glare covers text numbers on laminated cards like Aadhaar.
          </div>
        </div>
      </div>

      {/* FAQ Accordion */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-base font-extrabold text-slate-900">
          Frequently Asked Questions (FAQ)
        </h2>

        <div className="space-y-2.5">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="border border-slate-200 rounded-2xl overflow-hidden transition"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-4 text-xs font-extrabold text-slate-900 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left"
                >
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                </button>

                {isOpen && (
                  <div className="p-4 text-xs text-slate-600 leading-relaxed bg-white border-t border-slate-100 space-y-2">
                    <p>{faq.a}</p>
                    <button
                      onClick={() => speakText(`${faq.q}. ${faq.a}`)}
                      className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1 pt-1"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>🔊 Listen Answer</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
