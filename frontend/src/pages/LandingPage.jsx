import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Brain, ArrowRight, Flame, User, LogOut, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/* ─────────────────────────────────────────────
   High-Visibility Video Background (362486.mp4)
   ───────────────────────────────────────────── */
const NeuralBackground = () => (
  <div className="absolute inset-0 z-0 overflow-hidden">
    {/* Rich deep background base for glowing neural video */}
    <div className="absolute inset-0 bg-[#080c18]" />

    {/* User Uploaded Video Background (/362486.mp4) — 85% OPACITY HIGH VISIBILITY */}
    <video
      src="/362486.mp4"
      autoPlay
      loop
      muted
      playsInline
      className="absolute inset-0 w-full h-full object-cover opacity-85 pointer-events-none scale-100 filter brightness-115 contrast-110 saturate-125"
    />

    {/* Subtle gradient vignette */}
    <div className="absolute inset-0 bg-gradient-to-b from-[#080c18]/50 via-transparent to-[#080c18]/80 pointer-events-none" />
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(8,12,24,0.7)_100%)] pointer-events-none" />

    {/* Subtle neural grid overlay */}
    <div className="absolute inset-0 neural-grid animate-dot-pulse opacity-30 pointer-events-none" />

    {/* Floating accent orbs for ambient glow */}
    <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-indigo-600/15 animate-float-slow pointer-events-none blur-3xl" />
    <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] rounded-full bg-purple-600/15 animate-float-medium pointer-events-none blur-3xl" />
  </div>
);

/* ─────────────────────────────────────────────
   Main Landing Page
   ───────────────────────────────────────────── */
const LandingPage = () => {
  const navigate = useNavigate();
  const { user, login, logout } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');

  const handleStartAssessment = () => {
    if (user) {
      navigate('/assessment');
    } else {
      setShowLoginModal(true);
    }
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (nameInput && emailInput) {
      login(nameInput, emailInput);
      setShowLoginModal(false);
      navigate('/assessment');
    }
  };

  return (
    <div className="h-screen w-full relative overflow-hidden bg-[#080c18] font-['Inter'] text-slate-100 flex flex-col justify-between">
      {/* 1. High Visibility Video Background */}
      <NeuralBackground />

      {/* 2. Top Navigation Bar with View History & Wellness Tracker moved to Top Right */}
      <header className="relative z-50 px-8 py-5 flex items-center justify-between backdrop-blur-md bg-black/30 border-b border-white/10">
        <div
          className="flex items-center gap-3 text-white font-bold text-xl tracking-tight cursor-pointer group"
          onClick={() => navigate('/')}
        >
          <div className="p-2.5 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-[0_0_25px_rgba(99,102,241,0.5)] group-hover:shadow-[0_0_35px_rgba(99,102,241,0.7)] transition-shadow">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <span>NEURO <span className="text-cyan-400 font-light">SYNC</span></span>
        </div>

        {/* Top Right Action & Navigation Bar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/progress')}
            className="group inline-flex items-center gap-2 bg-slate-900/70 backdrop-blur-md border border-white/20 text-slate-200 hover:text-white px-5 py-2.5 rounded-full font-semibold text-xs hover:border-indigo-400/50 hover:bg-slate-800 transition-all shadow-md"
          >
            View History
          </button>

          <button
            onClick={() => navigate('/tracker')}
            className="group inline-flex items-center gap-2 bg-slate-900/70 backdrop-blur-md border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 px-5 py-2.5 rounded-full font-semibold text-xs hover:border-emerald-400/50 hover:bg-emerald-950/40 transition-all shadow-md"
          >
            <Flame className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
            Wellness Tracker
          </button>

          <button
            onClick={() => navigate('/doctor-portal')}
            className="group inline-flex items-center gap-2 bg-slate-900/70 backdrop-blur-md border border-indigo-500/30 text-indigo-400 hover:text-indigo-300 px-5 py-2.5 rounded-full font-semibold text-xs hover:border-indigo-400/50 hover:bg-indigo-950/40 transition-all shadow-md hidden sm:inline-flex"
          >
            For Providers
          </button>

          {user ? (
            <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-md border border-indigo-500/30 px-4 py-2 rounded-full">
              <User className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-semibold text-slate-200">Welcome, {user.name}</span>
              <button onClick={logout} className="ml-2 text-rose-400 hover:text-rose-300 transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 backdrop-blur-md border border-indigo-400/40 px-6 py-2.5 rounded-full transition-all shadow-lg hover:shadow-[0_0_20px_rgba(99,102,241,0.5)]"
            >
              Log In
            </button>
          )}
        </div>
      </header>

      {/* 3. Hero Content — PERFECTLY CENTERED VERTICALLY & HORIZONTALLY */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 py-6 flex-1 flex flex-col items-center justify-center text-center space-y-9">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-5 py-2 bg-slate-900/80 backdrop-blur-md rounded-full text-cyan-300 font-semibold text-xs uppercase tracking-[0.25em] border border-cyan-500/40 shadow-[0_0_20px_rgba(34,211,238,0.25)]"
        >
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          Neural Diagnostic
        </motion.div>

        {/* Headline */}
        <div className="space-y-6 max-w-3xl">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl sm:text-7xl lg:text-8xl font-black leading-[0.95] tracking-tighter"
          >
            <span className="text-white drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)]">Decoding</span>
            <br />
            <span className="text-gradient-shimmer">Complexity.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-xl lg:text-2xl text-slate-200 max-w-2xl mx-auto leading-relaxed font-normal drop-shadow-md"
          >
            Advanced deep learning linguistic models & real-time behavioral mapping to understand the neurodivergent spectrum.
          </motion.p>
        </div>

        {/* CTA Button — Prominent Primary CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="pt-2"
        >
          <button className="upload-btn" onClick={handleStartAssessment}>
            <span className="upload-border"></span>
            <div className="upload-content">
              <span className="icon">
                <Brain className="w-[22px] h-[22px]" />
              </span>
              Start Assessment
            </div>
          </button>
        </motion.div>
      </main>

      {/* 4. Bottom Status Bar */}
      <footer className="relative z-50 px-8 py-4 backdrop-blur-md bg-black/40 border-t border-white/10 flex justify-between items-center text-xs">
        <div className="bg-slate-900/80 backdrop-blur-md px-5 py-2.5 rounded-xl flex items-center gap-6 border border-white/15 shadow-md">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Model Precision:</span>
            <span className="text-sm font-bold text-gradient-primary">89.4%</span>
          </div>
          <div className="w-px h-4 bg-white/20" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Architecture:</span>
            <span className="text-sm font-bold text-cyan-400">CNN + LSTM</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)] animate-pulse" />
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">NEURO SYNC LAB ACTIVE</span>
        </div>
      </footer>

      {/* Login Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-slate-950/90 rounded-3xl w-full max-w-md p-8 relative border border-white/20 shadow-2xl"
            >
              <button
                onClick={() => setShowLoginModal(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors text-2xl font-light"
              >
                &times;
              </button>

              <div className="mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg text-white">
                  <User className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Identity Sync</h2>
                <p className="text-sm text-slate-300 mt-2">Log in to sync your diagnostic results with the personalized wellness tracker.</p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest ml-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full bg-slate-900 border border-white/20 rounded-xl px-5 py-3 text-sm font-medium text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
                    placeholder="E.g., John Doe"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest ml-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full bg-slate-900 border border-white/20 rounded-xl px-5 py-3 text-sm font-medium text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
                    placeholder="john@example.com"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg transition-all active:scale-[0.98]"
                >
                  Confirm Identity & Continue
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LandingPage;
