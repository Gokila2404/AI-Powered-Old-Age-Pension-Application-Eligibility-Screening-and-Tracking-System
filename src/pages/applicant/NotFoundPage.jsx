import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export const NotFoundPage = () => {
  return (
    <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-3xl border border-slate-200 shadow-xl text-center space-y-5 font-sans">
      <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto text-2xl font-black shadow-xs">
        404
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-black text-slate-900">Page Not Found</h1>
        <p className="text-xs text-slate-500 leading-relaxed">
          The page or pension resource you are looking for does not exist or may have been relocated.
        </p>
      </div>
      <div className="pt-2">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-900 hover:bg-blue-800 text-white font-extrabold text-xs rounded-xl shadow-md transition"
        >
          <Home className="w-4 h-4" />
          <span>Return to Pension Seva Home</span>
        </Link>
      </div>
    </div>
  );
};

