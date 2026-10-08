import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, ChevronDown, ChevronUp, Info } from 'lucide-react';

const STORAGE_KEY = 'adhd_cycle_data';

const PHASES = [
  {
    name: 'Menstrual',
    dayRange: [1, 5],
    color: '#ef4444',
    bg: '#fef2f2',
    border: '#fecaca',
    icon: '🌑',
    note: 'Estrogen & progesterone are lowest. ADHD symptoms like fatigue, brain fog, and emotional dysregulation may peak. Prioritise rest and reduce stimulation.',
  },
  {
    name: 'Follicular',
    dayRange: [6, 13],
    color: '#10b981',
    bg: '#ecfdf5',
    border: '#a7f3d0',
    icon: '🌒',
    note: 'Rising estrogen supports dopamine production — the ADHD brain\'s key chemical. Many people report improved focus and motivation during this window.',
  },
  {
    name: 'Ovulatory',
    dayRange: [14, 16],
    color: '#f59e0b',
    bg: '#fffbeb',
    border: '#fde68a',
    icon: '🌕',
    note: 'Estrogen peaks, boosting verbal fluency and social confidence. ADHD meds may feel slightly more effective. Great time for complex tasks.',
  },
  {
    name: 'Luteal',
    dayRange: [17, 28],
    color: '#8b5cf6',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    icon: '🌘',
    note: 'Progesterone rises then drops. PMS symptoms can amplify ADHD challenges — especially impulsivity, emotional reactivity, and poor working memory. Extra structure helps.',
  },
];

function getCurrentPhase(lastPeriodDate, cycleLength) {
  if (!lastPeriodDate) return null;
  const today = new Date();
  const last = new Date(lastPeriodDate);
  const diffMs = today - last;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) % cycleLength;
  const cycleDay = (diffDays % cycleLength) + 1;
  const phase = PHASES.find(p => cycleDay >= p.dayRange[0] && cycleDay <= p.dayRange[1])
    || PHASES[3]; // default to Luteal if cycle is longer
  return { ...phase, cycleDay, cycleLength };
}

const CycleTracker = ({ onCycleDataChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [lastPeriod, setLastPeriod] = useState('');
  const [cycleLength, setCycleLength] = useState(28);
  const [phaseInfo, setPhaseInfo] = useState(null);

  // Load saved data
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        setLastPeriod(data.lastPeriod || '');
        setCycleLength(data.cycleLength || 28);
      }
    } catch (_) {}
  }, []);

  // Recalculate phase when inputs change
  useEffect(() => {
    if (lastPeriod) {
      const phase = getCurrentPhase(lastPeriod, cycleLength);
      setPhaseInfo(phase);
      const cycleData = { lastPeriod, cycleLength, currentPhase: phase?.name };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cycleData));
      onCycleDataChange?.(cycleData);
    }
  }, [lastPeriod, cycleLength]);

  const phasePercent = phaseInfo
    ? Math.round(((phaseInfo.cycleDay - 1) / phaseInfo.cycleLength) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-pink-100 bg-pink-50/40 overflow-hidden"
    >
      {/* Header toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        className="w-full flex items-center justify-between p-5 group"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-pink-100 rounded-2xl">
            <Moon className="w-4 h-4 text-pink-600" />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-pink-600">Cycle Health</p>
            <p className="text-sm font-bold text-slate-700">
              {phaseInfo
                ? `${phaseInfo.icon} Day ${phaseInfo.cycleDay} — ${phaseInfo.name} Phase`
                : 'Track your menstrual cycle'}
            </p>
          </div>
        </div>
        <div className="p-2 rounded-xl bg-pink-100/60 group-hover:bg-pink-200 transition-colors">
          {isOpen ? <ChevronUp className="w-4 h-4 text-pink-600" /> : <ChevronDown className="w-4 h-4 text-pink-600" />}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="cycle-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 26 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-6 space-y-5 border-t border-pink-100">

              {/* Inputs */}
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-600 ml-1">
                    Last Period Start
                  </label>
                  <input
                    type="date"
                    value={lastPeriod}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={e => setLastPeriod(e.target.value)}
                    className="w-full bg-white border border-pink-200 rounded-2xl px-4 py-3 text-slate-900 text-sm font-bold outline-none focus:border-pink-400 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-600 ml-1">
                    Avg Cycle Length (days)
                  </label>
                  <input
                    type="number"
                    min={21}
                    max={40}
                    value={cycleLength}
                    onChange={e => setCycleLength(parseInt(e.target.value) || 28)}
                    className="w-full bg-white border border-pink-200 rounded-2xl px-4 py-3 text-slate-900 text-sm font-bold outline-none focus:border-pink-400 transition-all"
                  />
                </div>
              </div>

              {/* Phase display */}
              {phaseInfo && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ background: phaseInfo.bg, borderColor: phaseInfo.border }}
                  className="rounded-2xl border p-4 space-y-3"
                >
                  {/* Phase cycle bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest" style={{ color: phaseInfo.color }}>
                      <span>Day 1</span>
                      <span>Day {phaseInfo.cycleLength}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-white/60 overflow-hidden border" style={{ borderColor: phaseInfo.border }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: phaseInfo.color }}
                        initial={{ width: '0%' }}
                        animate={{ width: `${phasePercent}%` }}
                        transition={{ type: 'spring', stiffness: 80, damping: 18 }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-500">
                      {PHASES.map(p => (
                        <span key={p.name} style={{ color: p.name === phaseInfo.name ? p.color : undefined }}>
                          {p.name.substring(0, 3)}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Phase name */}
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{phaseInfo.icon}</span>
                    <div>
                      <p className="font-black text-slate-900 text-base">{phaseInfo.name} Phase</p>
                      <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: phaseInfo.color }}>
                        Cycle Day {phaseInfo.cycleDay} of {phaseInfo.cycleLength}
                      </p>
                    </div>
                  </div>

                  {/* ADHD note */}
                  <div className="flex gap-2.5 bg-white/70 rounded-xl p-3">
                    <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: phaseInfo.color }} />
                    <p className="text-xs text-slate-700 font-medium leading-relaxed">{phaseInfo.note}</p>
                  </div>
                </motion.div>
              )}

              {/* Phase legend */}
              <div className="grid grid-cols-2 gap-2">
                {PHASES.map(p => (
                  <div
                    key={p.name}
                    className="flex items-center gap-2 rounded-xl px-3 py-2"
                    style={{
                      background: phaseInfo?.name === p.name ? p.bg : 'white',
                      border: `1px solid ${phaseInfo?.name === p.name ? p.border : '#f3f4f6'}`,
                    }}
                  >
                    <span className="text-sm">{p.icon}</span>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: p.color }}>{p.name}</p>
                      <p className="text-[9px] text-slate-500 font-semibold">Day {p.dayRange[0]}–{p.dayRange[1]}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export { getCurrentPhase, PHASES, STORAGE_KEY as CYCLE_STORAGE_KEY };
export default CycleTracker;
