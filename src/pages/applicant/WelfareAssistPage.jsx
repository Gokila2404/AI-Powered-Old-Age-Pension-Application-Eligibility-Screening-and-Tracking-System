import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import api from '../../api/client';
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Bot,
  User,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  RefreshCw,
  FileText,
  Search
} from 'lucide-react';

export const WelfareAssistPage = () => {
  const { language, speakText, stopSpeech, currentUser } = useApp();

  const [messages, setMessages] = useState([
    {
      id: 'msg-1',
      sender: 'bot',
      text: language === 'ta'
        ? 'வணக்கம்! நான் உங்கள் ஓய்வூதிய வழிகாட்டி (Pension Seva Assistant). தகுதி விதிமுறைகள், தேவையான ஆவணங்கள் அல்லது விண்ணப்பம் பற்றிய ஏதேனும் கேள்விகளை என்னிடம் கேட்கலாம்.'
        : 'Welcome! I am your Pension Seva Welfare Assistant. You can ask me questions about old-age pension eligibility rules, required certificates, or how to apply.',
      suggestions: [
        language === 'ta' ? 'முதியோர் ஓய்வூதிய தகுதி என்ன?' : 'Who is eligible for Old Age Pension?',
        language === 'ta' ? 'என்னென்ன ஆவணங்கள் தேவை?' : 'What documents are required?',
        language === 'ta' ? 'மாதாந்திர உதவித்தொகை எவ்வளவு?' : 'What is the monthly pension amount?'
      ]
    }
  ]);

  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Voice recognition setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language === 'ta' ? 'ta-IN' : 'en-IN';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
        handleSendQuery(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [language]);

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert('Voice input is not supported in your browser.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      stopSpeech();
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const handleSendQuery = async (queryText = null) => {
    const textToSend = queryText || inputText;
    if (!textToSend.trim() || isLoading) return;

    const userMsg = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: textToSend
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await api.post('/chat', {
        message: textToSend,
        language: language,
        userId: currentUser?.id || 'guest-citizen'
      });

      const reply = res.data.response;
      const botMsg = {
        id: `msg-${Date.now() + 1}`,
        sender: 'bot',
        text: reply,
        intent: res.data.intent,
        suggestions: [
          'Check My Eligibility Score',
          'Explore Welfare Schemes',
          'Track Application Progress'
        ]
      };

      setMessages(prev => [...prev, botMsg]);
      speakText(reply);
    } catch (err) {
      const fallbackReply = language === 'ta'
        ? 'மன்னிக்கவும், தகவல் தொடர்பில் சிக்கல் ஏற்பட்டுள்ளது. தயவுசெய்து மீண்டும் முயற்சிக்கவும்.'
        : 'I apologize, but I could not connect to the Welfare Assist service. Please try again.';
      setMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now() + 1}`,
          sender: 'bot',
          text: fallbackReply
        }
      ]);
      speakText(fallbackReply);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full py-6 font-sans space-y-6 text-left">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-emerald-950 to-teal-900 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-teal-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider bg-teal-500/30 text-teal-200 px-3 py-0.5 rounded-full border border-teal-400/30">
            Voice-Enabled AI Guide
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-white">
            Welfare Assist Decision Support
          </h1>
          <p className="text-xs text-teal-200/90 max-w-xl">
            Ask any questions in English or தமிழ் regarding old-age pension eligibility, income limits, or required documents.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => speakText('Welcome to Welfare Assist. How can I help you today?')}
            className="p-3 bg-teal-800 hover:bg-teal-700 text-white rounded-2xl border border-teal-600/50 transition"
            title="Listen Introduction"
          >
            <Volume2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Chat Conversation Box */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[520px] overflow-hidden">
        
        {/* Messages Stream */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {messages.map((m) => {
            const isBot = m.sender === 'bot';
            return (
              <div
                key={m.id}
                className={`flex gap-3 ${isBot ? 'items-start' : 'items-start justify-end'}`}
              >
                {isBot && (
                  <div className="w-9 h-9 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                    <Bot className="w-5 h-5" />
                  </div>
                )}

                <div className={`space-y-2 max-w-xl ${isBot ? 'text-left' : 'text-right'}`}>
                  <div
                    className={`p-4 rounded-3xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                      isBot
                        ? 'bg-slate-50 text-slate-800 border border-slate-200'
                        : 'bg-blue-600 text-white font-medium ml-auto'
                    }`}
                  >
                    <p className="whitespace-pre-line">{m.text}</p>
                    {isBot && (
                      <button
                        onClick={() => speakText(m.text)}
                        className="mt-2 text-[11px] font-bold text-teal-700 hover:underline flex items-center gap-1"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Listen Aloud</span>
                      </button>
                    )}
                  </div>

                  {/* Suggestion Chips */}
                  {isBot && m.suggestions && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {m.suggestions.map((sug, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendQuery(sug)}
                          className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-900 font-bold text-xs rounded-xl border border-teal-200 transition text-left"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {!isBot && (
                  <div className="w-9 h-9 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                )}
              </div>
            );
          })}
          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-400 font-bold p-2">
              <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
              <span>Welfare Assist is thinking...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuery();
            }}
            className="flex items-center gap-2"
          >
            <button
              type="button"
              onClick={toggleMic}
              className={`p-3 rounded-2xl border transition shadow-xs ${
                isListening
                  ? 'bg-red-500 text-white border-red-600 animate-pulse'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
              title={isListening ? 'Listening... click to stop' : 'Click to speak'}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-teal-700" />}
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isListening ? 'Listening to your speech...' : (language === 'ta' ? 'உங்கள் கேள்வியை உள்ளிடவும்...' : 'Type your pension question here...')}
              className="flex-1 p-3 bg-white border border-slate-300 rounded-2xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="px-5 py-3 bg-teal-700 hover:bg-teal-600 disabled:opacity-40 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-md transition flex items-center gap-1.5"
            >
              <span>Ask</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>

    </div>
  );
};
