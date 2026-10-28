import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, Heart, ExternalLink, HelpCircle } from 'lucide-react';

export const Footer = () => {
  const { language } = useApp();

  return (
    <footer className="bg-slate-950 text-slate-400 text-xs border-t border-slate-800 pb-6 font-sans">
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Brand Info */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2 text-white font-extrabold text-base">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm">
                PS
              </div>
              <span>Pension Seva</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Check. Apply. Track. Get Support.
            </p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              An independent welfare-assistance platform designed to help senior citizens discover schemes, verify documents, and track applications.
            </p>
          </div>

          {/* Platform Navigation */}
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">
              {language === 'ta' ? 'வழிகாட்டி' : 'Navigation'}
            </h4>
            <ul className="space-y-2 text-[11px]">
              <li>
                <Link to="/" className="hover:text-white transition">Home</Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition">About Pension Seva</Link>
              </li>
              <li>
                <Link to="/how-it-works" className="hover:text-white transition">How It Works</Link>
              </li>
              <li>
                <Link to="/schemes" className="hover:text-white transition">Welfare Schemes</Link>
              </li>
              <li>
                <Link to="/eligibility" className="hover:text-white transition">Eligibility Wizard</Link>
              </li>
            </ul>
          </div>

          {/* Citizen Assistance */}
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">
              {language === 'ta' ? 'சேவைகள்' : 'Services'}
            </h4>
            <ul className="space-y-2 text-[11px]">
              <li>
                <Link to="/application" className="hover:text-white transition">Start Application</Link>
              </li>
              <li>
                <Link to="/track" className="hover:text-white transition">Track Application Status</Link>
              </li>
              <li>
                <Link to="/welfare-assist" className="hover:text-white transition">Welfare Assist AI Guide</Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition">About</Link>
              </li>
              <li>
                <Link to="/schemes" className="hover:text-white transition">Schemes</Link>
              </li>
              <li>
                <Link to="/help" className="hover:text-white transition">Help & FAQs</Link>
              </li>
            </ul>
          </div>

          {/* Important Identity Notice */}
          <div>
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-3">
              {language === 'ta' ? 'அறிவிப்பு' : 'Important Notice'}
            </h4>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-[11px] space-y-1.5 text-slate-400">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Not a Government Portal</span>
              </div>
              <p className="leading-normal">
                Pension Seva is an independent decision-support platform. It does not replace official revenue determination.
              </p>
              <div className="pt-1">
                <Link to="/admin/login" className="text-blue-400 hover:text-blue-300 text-[10px] font-semibold flex items-center gap-1">
                  <span>Administrative Login</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <p>© 2026 Pension Seva. Built for citizen accessibility and empowerment.</p>
          <Link to="/help" className="hover:text-slate-300">Support</Link>
        </div>
      </div>
    </footer>
  );
};
