import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Mic, MicOff, Volume2, VolumeX, Sparkles, X, MessageSquare, HelpCircle, CheckCircle2, RefreshCw } from 'lucide-react';

export const VoiceAssistantDrawer = () => {
  const { language, setLanguage, speakText, setActiveTab } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Predefined Tamil & English Voice Prompts
  const VOICE_FAQS = [
    {
      qEn: "Am I eligible for IGNOAPS pension?",
      qTa: "à®Žà®©à®•à¯à®•à¯ à®®à¯à®¤à®¿à®¯à¯‹à®°à¯ à®“à®¯à¯à®µà¯‚à®¤à®¿à®¯à®®à¯ à®•à®¿à®Ÿà¯ˆà®•à¯à®•à¯à®®à®¾?",
      ansEn: "If you are 60 years or older and have a BPL Ration Card, you qualify for â‚¹1,000 monthly pension + 4kg free rice.",
      ansTa: "à®‰à®™à¯à®•à®³à¯à®•à¯à®•à¯ 60 à®µà®¯à®¤à¯ à®¨à®¿à®°à®®à¯à®ªà®¿à®¯à®¿à®°à¯à®¨à¯à®¤à¯, à®µà®±à¯à®®à¯ˆà®•à¯ à®•à¯‹à®Ÿà¯à®Ÿà®¿à®±à¯à®•à¯ à®•à¯€à®´à¯ (BPL) à®•à¯à®Ÿà¯à®®à¯à®ª à®…à®Ÿà¯à®Ÿà¯ˆ à®‡à®°à¯à®¨à¯à®¤à®¾à®²à¯, à®®à®¾à®¤à®®à¯ à®°à¯‚.1,000 à®“à®¯à¯à®µà¯‚à®¤à®¿à®¯à®®à¯ à®•à®¿à®Ÿà¯ˆà®•à¯à®•à¯à®®à¯."
    },
    {
      qEn: "What documents do I need to upload?",
      qTa: "à®Žà®©à¯à®©à¯†à®©à¯à®© à®†à®µà®£à®™à¯à®•à®³à¯ à®¤à¯‡à®µà¯ˆ?",
      ansEn: "You need 3 simple documents: 1. Aadhaar Card, 2. Smart Ration Card, and 3. Bank Passbook first page.",
      ansTa: "3 à®Žà®³à®¿à®¯ à®†à®µà®£à®™à¯à®•à®³à¯ à®ªà¯‹à®¤à¯à®®à¯: 1. à®†à®¤à®¾à®°à¯ à®…à®Ÿà¯à®Ÿà¯ˆ, 2. à®•à¯à®Ÿà¯à®®à¯à®ª à®…à®Ÿà¯à®Ÿà¯ˆ (à®°à¯‡à®·à®©à¯ à®•à®¾à®°à¯à®Ÿà¯), 3. à®µà®™à¯à®•à®¿ à®•à®£à®•à¯à®•à¯ à®ªà¯à®¤à¯à®¤à®•à®®à¯."
    },
    {
      qEn: "What if I upload my son's Aadhaar by mistake?",
      qTa: "à®¤à®µà®±à¯à®¤à®²à®¾à®• à®Žà®©à®¤à¯ à®®à®•à®©à®¿à®©à¯ à®†à®¤à®¾à®°à¯ˆ à®ªà®¤à®¿à®µà¯‡à®±à¯à®±à®¿à®©à®¾à®²à¯ à®Žà®©à¯à®© à®†à®•à¯à®®à¯?",
      ansEn: "Our AI OCR engine reads the name & age on the card immediately and warns you to upload the senior citizen's card instead of rejecting you.",
      ansTa: "à®¨à®®à®¤à¯ AI à®¤à¯Šà®´à®¿à®²à¯ à®¨à¯à®Ÿà¯à®ªà®®à¯ à®‰à®Ÿà®©à¯‡ à®•à®¾à®°à¯à®Ÿà®¿à®²à¯ à®‰à®³à¯à®³ à®ªà¯†à®¯à®°à¯ à®®à®±à¯à®±à¯à®®à¯ à®µà®¯à®¤à¯ˆ à®ªà®Ÿà®¿à®¤à¯à®¤à¯, à®šà®°à®¿à®¯à®¾à®© à®®à¯à®¤à®¿à®¯à®µà®°à®¿à®©à¯ à®†à®¤à®¾à®°à¯ˆ à®®à®¾à®±à¯à®± à®…à®±à®¿à®µà¯à®±à¯à®¤à¯à®¤à¯à®®à¯."
    },
    {
      qEn: "How do I track my application status?",
      qTa: "à®µà®¿à®£à¯à®£à®ªà¯à®ª à®¨à®¿à®²à¯ˆà®¯à¯ˆ à®Žà®µà¯à®µà®¾à®±à¯ à®ªà®¾à®°à¯à®ªà¯à®ªà®¤à¯?",
      ansEn: "Click on 'Check Status' at the top, enter your Application ID or Aadhaar number, and see real-time progress.",
      ansTa: "'à®¨à®¿à®²à¯ˆ à®…à®±à®¿à®¤à®²à¯' à®ªà¯Šà®¤à¯à®¤à®¾à®©à¯ˆ à®…à®´à¯à®¤à¯à®¤à®¿, à®‰à®™à¯à®•à®³à¯ à®µà®¿à®£à¯à®£à®ªà¯à®ª à®Žà®£à¯ à®…à®²à¯à®²à®¤à¯ à®†à®¤à®¾à®°à¯ à®Žà®£à¯à®£à¯ˆ à®‰à®³à¯à®³à®¿à®Ÿà¯à®Ÿà¯ à®¨à®¿à®²à¯ˆà®¯à¯ˆ à®…à®±à®¿à®¯à®²à®¾à®®à¯."
    }
  ];

  const handleAskFaq = (faq) => {
    const qText = language === 'ta' ? faq.qTa : faq.qEn;
    const aText = language === 'ta' ? faq.ansTa : faq.ansEn;
    
    setTranscript(qText);
    setAiResponse(aText);
    setIsSpeaking(true);
    speakText(aText);
  };

  // Web Speech Recognition Handler
  const startListening = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert(language === 'ta' ? 'à®‰à®™à¯à®•à®³à¯ à®‰à®²à®¾à®µà®¿à®¯à®¿à®²à¯ à®•à¯à®°à®²à¯ à®…à®±à®¿à®¤à®²à¯ à®µà®šà®¤à®¿ à®‡à®²à¯à®²à¯ˆ. à®ªà¯Šà®¤à¯à®¤à®¾à®©à¯à®•à®³à¯ˆà®ªà¯ à®ªà®¯à®©à¯à®ªà®Ÿà¯à®¤à¯à®¤à®µà¯à®®à¯.' : 'Voice recognition is not supported in this browser. Please click the FAQ options.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = language === 'ta' ? 'ta-IN' : 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    setIsListening(true);
    setTranscript(language === 'ta' ? 'à®•à¯‡à®Ÿà¯à®•à®¿à®±à®¤à¯...' : 'Listening...');

    recognition.onresult = (event) => {
      const speechToText = event.results[0][0].transcript;
      setTranscript(speechToText);
      setIsListening(false);

      // Provide AI response based on speech
      let reply = language === 'ta'
        ? `à®‰à®™à¯à®•à®³à¯ à®•à¯‡à®³à¯à®µà®¿: "${speechToText}". à®“à®¯à¯à®µà¯‚à®¤à®¿à®¯à®¤à¯ à®¤à®•à¯à®¤à®¿à®¯à¯ˆ 2 à®¨à®¿à®®à®¿à®Ÿà®™à¯à®•à®³à®¿à®²à¯ à®…à®±à®¿à®¯ à®¤à®•à¯à®¤à®¿ à®šà¯‹à®¤à®©à¯ˆ à®ªà¯Šà®¤à¯à®¤à®¾à®©à¯ˆ à®…à®´à¯à®¤à¯à®¤à®µà¯à®®à¯.`
        : `Received your question: "${speechToText}". You can check your instant eligibility using the Screener button.`;

      if (speechToText.toLowerCase().includes('age') || speechToText.includes('à®µà®¯à®¤à¯')) {
        reply = language === 'ta'
          ? 'à®®à¯à®¤à®¿à®¯à¯‹à®°à¯ à®“à®¯à¯à®µà¯‚à®¤à®¿à®¯à®¤à¯à®¤à®¿à®±à¯à®•à¯ à®•à¯à®±à¯ˆà®¨à¯à®¤à®ªà®Ÿà¯à®šà®®à¯ 60 à®µà®¯à®¤à¯ à®¨à®¿à®°à®®à¯à®ªà®¿à®¯à®¿à®°à¯à®•à¯à®• à®µà¯‡à®£à¯à®Ÿà¯à®®à¯.'
          : 'Minimum age for old age pension is 60 years.';
      }

      setAiResponse(reply);
      setIsSpeaking(true);
      speakText(reply);
    };

    recognition.onerror = () => {
      setIsListening(false);
      const fallback = language === 'ta' ? 'à®®à®©à¯à®©à®¿à®•à¯à®•à®µà¯à®®à¯, à®®à¯€à®£à¯à®Ÿà¯à®®à¯ à®®à¯à®¯à®±à¯à®šà®¿à®•à¯à®•à®µà¯à®®à¯.' : 'Sorry, could not hear clearly. Please try again.';
      setTranscript(fallback);
    };

    recognition.start();
  };

  return (
    <>
      {/* Floating Trigger Button (Bottom Right) */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 font-sans">
        <button
          onClick={() => {
            const nextState = !isOpen;
            setIsOpen(nextState);
            if (nextState && !aiResponse) {
              const welcome = language === 'ta' 
                ? 'à®µà®£à®•à¯à®•à®®à¯! à®¨à®¾à®©à¯ à®‰à®™à¯à®•à®³à¯ à®¤à®®à®¿à®´à¯ à®•à¯à®°à®²à¯ à®‰à®¤à®µà®¿à®¯à®¾à®³à®°à¯. à®“à®¯à¯à®µà¯‚à®¤à®¿à®¯ à®šà®¨à¯à®¤à¯‡à®•à®™à¯à®•à®³à¯ˆ à®Žà®©à¯à®©à®¿à®Ÿà®®à¯ à®•à¯‡à®Ÿà¯à®•à®²à®¾à®®à¯.' 
                : 'Hello! I am your AI Voice Assistant. How can I help you with your pension application today?';
              setAiResponse(welcome);
              speakText(welcome);
            }
          }}
          className="group relative bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-bold p-4 rounded-full shadow-2xl border-2 border-blue-400/40 transition-all transform hover:scale-110 flex items-center gap-3"
          aria-label="Voice Assistant"
        >
          <div className="relative">
            <Mic className="w-7 h-7 text-white animate-bounce" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-slate-900 animate-ping"></span>
          </div>
          <span className="hidden sm:inline text-sm font-extrabold pr-1 tracking-wide">
            {language === 'ta' ? 'à®•à¯à®°à®²à¯ à®‰à®¤à®µà®¿à®¯à®¾à®³à®°à¯' : 'AI Voice Guide'}
          </span>
        </button>
      </div>

      {/* Voice Assistant Modal / Drawer */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-8 z-50 w-[420px] max-w-[calc(100vw-2rem)] bg-slate-950 text-white rounded-3xl shadow-2xl border border-slate-800 p-5 animate-fadeIn backdrop-blur-xl font-sans">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-900/30">
                <Sparkles className="w-5 h-5 text-cyan-200" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-100">
                  {language === 'ta' ? 'à®¤à®®à®¿à®´à¯ à®•à¯à®°à®²à¯ à®µà®´à®¿à®•à®¾à®Ÿà¯à®Ÿà®¿' : 'AI Multilingual Voice Guide'}
                </h3>
                <p className="text-[11px] text-slate-400">Powered by Gemini AI + Web Speech Engine</p>
              </div>
            </div>
            
            <button
              onClick={() => {
                window.speechSynthesis.cancel();
                setIsOpen(false);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Voice Response Area */}
          <div className="my-4 bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3">
            {/* User Speech Display */}
            {transcript && (
              <div className="text-xs text-blue-300 bg-blue-950/60 p-2.5 rounded-xl border border-blue-800/50 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 shrink-0 text-blue-400" />
                <span>{transcript}</span>
              </div>
            )}

            {/* AI Audio Wave & Response Text */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase text-slate-400 flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  {language === 'ta' ? 'à®•à¯à®°à®²à¯ à®ªà®¤à®¿à®²à¯ (à®ªà®Ÿà®¿à®•à¯à®•à®ªà¯à®ªà®Ÿà¯à®•à®¿à®±à®¤à¯)' : 'Spoken Guidance'}
                </span>
                {isSpeaking && (
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-4 bg-cyan-400 animate-pulse rounded"></span>
                    <span className="w-1.5 h-6 bg-blue-500 animate-pulse delay-75 rounded"></span>
                    <span className="w-1.5 h-3 bg-emerald-400 animate-pulse delay-150 rounded"></span>
                  </div>
                )}
              </div>
              <p className="text-sm font-normal text-slate-200 leading-relaxed bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                {aiResponse || (language === 'ta' ? 'à®à®¤à¯‡à®©à¯à®®à¯ à®•à¯‡à®³à¯à®µà®¿à®¯à¯ˆ à®•à®¿à®³à®¿à®•à¯ à®šà¯†à®¯à¯à®¯à®µà¯à®®à¯ à®…à®²à¯à®²à®¤à¯ à®®à¯ˆà®•à¯ à®®à¯‚à®²à®®à¯ à®ªà¯‡à®šà®µà¯à®®à¯.' : 'Click a question below or tap the microphone to speak.')}
              </p>
            </div>
          </div>

          {/* Mic Button & Speak Trigger */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={startListening}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition border border-blue-400/30 ${
                isListening
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-900/30'
              }`}
            >
              <Mic className="w-5 h-5" />
              <span>
                {isListening
                  ? (language === 'ta' ? 'à®ªà¯‡à®šà®µà¯à®®à¯... (à®•à¯‡à®Ÿà¯à®•à®¿à®±à®¤à¯)' : 'Listening now... Speak')
                  : (language === 'ta' ? 'à®•à¯à®°à®²à¯ à®®à¯‚à®²à®®à¯ à®•à¯‡à®³à¯à®µà®¿ à®•à¯‡à®Ÿà¯à®•' : 'Tap to Speak Question')}
              </span>
            </button>

            <button
              onClick={() => {
                if (aiResponse) speakText(aiResponse);
              }}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl border border-slate-700 transition"
              title="Replay Voice Audio"
            >
              <Volume2 className="w-5 h-5" />
            </button>
          </div>

          {/* Quick FAQ Chips */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
              {language === 'ta' ? 'à®…à®Ÿà®¿à®•à¯à®•à®Ÿà®¿ à®•à¯‡à®Ÿà¯à®•à®ªà¯à®ªà®Ÿà¯à®®à¯ à®•à¯‡à®³à¯à®µà®¿à®•à®³à¯ (FAQS)' : 'Frequently Asked Questions'}
            </div>
            
            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {VOICE_FAQS.map((faq, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAskFaq(faq)}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white flex items-center justify-between transition group"
                >
                  <span className="line-clamp-1">{language === 'ta' ? faq.qTa : faq.qEn}</span>
                  <Volume2 className="w-4 h-4 shrink-0 text-slate-500 group-hover:text-cyan-400 transition" />
                </button>
              ))}
            </div>
          </div>

          {/* Direct Wizard Trigger */}
          <div className="mt-4 pt-3 border-t border-slate-800 text-center">
            <button
              onClick={() => {
                window.speechSynthesis.cancel();
                setIsOpen(false);
                setActiveTab('quiz');
              }}
              className="text-xs font-bold text-cyan-400 hover:text-cyan-300 underline flex items-center justify-center gap-1.5 mx-auto"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{language === 'ta' ? '2 à®¨à®¿à®®à®¿à®Ÿ à®¤à®•à¯à®¤à®¿ à®šà¯‹à®¤à®©à¯ˆà®¯à¯ˆ à®¤à¯Šà®Ÿà®™à¯à®•à¯à®•' : 'Take 2-Minute Eligibility Screener'}</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

