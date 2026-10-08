import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, CheckCircle2, Circle, Flame,
  Calendar, Repeat, Brain, Leaf, Wind, Sparkles, Sun, Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ── Wellness-guide preset tasks sourced from IKS recommendations ──
const WELLNESS_PRESETS = {
  daily: [
    { title: 'Morning Pranayama (5 min)', icon: '🧘', category: 'Wellness' },
    { title: 'Anulom Vilom breathing', icon: '🌬️', category: 'Wellness' },
    { title: 'Take medication / supplements', icon: '💊', category: 'Health' },
    { title: 'Hydrate: 8 glasses of water', icon: '💧', category: 'Health' },
    { title: 'No screens 1 hr before bed', icon: '📵', category: 'Sleep' },
    { title: 'Write 3 things you completed today', icon: '✍️', category: 'Journal' },
    { title: 'Mindfulness meditation (5 min)', icon: '🧠', category: 'Wellness' },
    { title: 'Brahmi / Ashwagandha supplement', icon: '🌿', category: 'Ayurveda' },
    { title: 'Physical exercise (20 min)', icon: '🏃', category: 'Health' },
    { title: 'Consistent bedtime routine', icon: '🌙', category: 'Sleep' },
  ],
  weekly: [
    { title: 'Abhyanga (oil self-massage)', icon: '🫧', category: 'Ayurveda' },
    { title: 'Yoga session (30+ min)', icon: '🧘', category: 'Wellness' },
    { title: 'Trataka (candle gazing) meditation', icon: '🕯️', category: 'Wellness' },
    { title: 'Plan next week\'s tasks & priorities', icon: '📋', category: 'Planning' },
    { title: 'Review ADHD assessment progress', icon: '📊', category: 'Planning' },
    { title: 'Social connection — call a friend', icon: '📞', category: 'Social' },
    { title: 'Nature walk / outdoor time', icon: '🌳', category: 'Health' },
  ],
};

const CATEGORY_COLORS = {
  Wellness: { color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
  Health:   { color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0' },
  Sleep:    { color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
  Journal:  { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
  Ayurveda: { color: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0' },
  Planning: { color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' },
  Social:   { color: '#ec4899', bg: '#fdf2f8', border: '#fbcfe8' },
  Custom:   { color: '#78716c', bg: '#fafaf9', border: '#e7e5e4' },
};

function getTodayKey() {
  return new Date().toISOString().split('T')[0];
}
function getWeekKey() {
  const d = new Date();
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  return start.toISOString().split('T')[0];
}

function computeStreak(completedDates, type) {
  if (!completedDates || completedDates.length === 0) return 0;
  const sorted = [...new Set(completedDates)].sort().reverse();
  const now = new Date();
  let streak = 0;

  if (type === 'daily') {
    for (let i = 0; i < 60; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().split('T')[0];
      if (sorted.includes(key)) streak++;
      else break;
    }
  } else {
    // weekly: check week keys
    for (let i = 0; i < 12; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - (now.getDay() + i * 7));
      const key = d.toISOString().split('T')[0];
      if (sorted.includes(key)) streak++;
      else break;
    }
  }
  return streak;
}

function buildHeatmap(completedDates) {
  const cells = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().split('T')[0];
    cells.push({ key, done: completedDates.includes(key), day: d.getDate(), month: d.getMonth() });
  }
  return cells;
}

const TrackerPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userStorageKey = `adhd_task_tracker_${user?.email || 'guest'}`;
  const [tab, setTab] = useState('daily');
  const [tasks, setTasks] = useState({ daily: [], weekly: [] });
  const [showPresets, setShowPresets] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [addingCustom, setAddingCustom] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(userStorageKey);
      if (raw) setTasks(JSON.parse(raw));
    } catch (_) {}
  }, [userStorageKey]);

  const save = useCallback((next) => {
    setTasks(next);
    localStorage.setItem(userStorageKey, JSON.stringify(next));
  }, [userStorageKey]);

  const toggleComplete = (type, id) => {
    const key = type === 'daily' ? getTodayKey() : getWeekKey();
    const next = {
      ...tasks,
      [type]: tasks[type].map(t => {
        if (t.id !== id) return t;
        const dates = t.completedDates || [];
        const alreadyDone = dates.includes(key);
        return {
          ...t,
          completedDates: alreadyDone
            ? dates.filter(d => d !== key)
            : [...dates, key],
        };
      }),
    };
    save(next);
  };

  const addPreset = (preset) => {
    const key = tab;
    const alreadyAdded = tasks[key].some(t => t.title === preset.title);
    if (alreadyAdded) return;
    const newTask = {
      id: Date.now().toString(),
      title: preset.title,
      icon: preset.icon,
      category: preset.category,
      type: key,
      completedDates: [],
    };
    save({ ...tasks, [key]: [...tasks[key], newTask] });
  };

  const addCustom = () => {
    if (!customTitle.trim()) return;
    const newTask = {
      id: Date.now().toString(),
      title: customTitle.trim(),
      icon: '⭐',
      category: 'Custom',
      type: tab,
      completedDates: [],
    };
    save({ ...tasks, [tab]: [...tasks[tab], newTask] });
    setCustomTitle('');
    setAddingCustom(false);
  };

  const deleteTask = (type, id) => {
    save({ ...tasks, [type]: tasks[type].filter(t => t.id !== id) });
  };

  const currentPeriodKey = tab === 'daily' ? getTodayKey() : getWeekKey();
  const currentTasks = tasks[tab] || [];
  const doneTasks = currentTasks.filter(t => (t.completedDates || []).includes(currentPeriodKey));
  const completionRate = currentTasks.length > 0 ? Math.round((doneTasks.length / currentTasks.length) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-white py-10 px-4"
    >
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl hover:bg-indigo-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-indigo-600" />
            </button>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600">ADHD Recovery</p>
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">{user ? `${user.name}'s Wellness Tracker` : 'Wellness Tracker'}</h1>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-50/50 border border-indigo-100">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Streak-based Recovery</span>
          </div>
        </div>

        {/* Tab selector */}
        <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit">
          {['daily', 'weekly', 'focus'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-xs transition-all ${
                tab === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'daily' ? <Sun className="w-3.5 h-3.5" /> : t === 'weekly' ? <Calendar className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
              {t === 'focus' ? 'Focus Mode' : t}
            </button>
          ))}
        </div>

        {tab === 'focus' ? (
          <FocusMode />
        ) : (
          <>
            {/* Progress summary */}
            <motion.div
              layout
          className="p-6 rounded-[2rem] border border-slate-200 bg-white shadow-[0_20px_60px_-30px_rgba(0,0,0,0.07)] flex items-center justify-between gap-6"
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 mb-1">
              {tab === 'daily' ? "Today's Progress" : "This Week's Progress"}
            </p>
            <p className="text-5xl font-black text-slate-900">{completionRate}%</p>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              {doneTasks.length} of {currentTasks.length} tasks completed
            </p>
          </div>
          <div className="relative w-24 h-24">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" />
              <motion.circle
                cx="18" cy="18" r="15.9" fill="none"
                stroke="#6366f1" strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${completionRate} 100`}
                initial={{ strokeDasharray: '0 100' }}
                animate={{ strokeDasharray: `${completionRate} 100` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Brain className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </motion.div>

        {/* Task list */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {currentTasks.map((task) => {
              const isDone = (task.completedDates || []).includes(currentPeriodKey);
              const streak = computeStreak(task.completedDates || [], tab);
              const heatmap = buildHeatmap(task.completedDates || []);
              const catStyle = CATEGORY_COLORS[task.category] || CATEGORY_COLORS.Custom;

              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20, scale: 0.95 }}
                  className={`rounded-3xl border p-5 transition-all ${
                    isDone ? 'bg-emerald-50/60 border-emerald-200' : 'bg-white border-slate-200 hover:border-indigo-100'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => toggleComplete(tab, task.id)}
                      className="mt-0.5 flex-shrink-0 transition-transform active:scale-90"
                    >
                      {isDone
                        ? <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                        : <Circle className="w-6 h-6 text-slate-300 hover:text-indigo-400 transition-colors" />
                      }
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg leading-none">{task.icon}</span>
                        <span className={`font-black text-slate-900 ${isDone ? 'line-through text-slate-400' : ''}`}>
                          {task.title}
                        </span>
                        <span
                          className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                          style={{ color: catStyle.color, background: catStyle.bg }}
                        >
                          {task.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 mt-3">
                        {/* Streak */}
                        {streak > 0 && (
                          <div className="flex items-center gap-1 text-orange-500">
                            <Flame className="w-3.5 h-3.5" />
                            <span className="text-xs font-black">{streak} {tab === 'daily' ? 'day' : 'week'} streak</span>
                          </div>
                        )}
                        {/* Mini heatmap — last 30 days */}
                        <div className="flex gap-0.5">
                          {heatmap.slice(-14).map((cell) => (
                            <div
                              key={cell.key}
                              title={cell.key}
                              className="w-2.5 h-2.5 rounded-sm"
                              style={{ background: cell.done ? '#6366f1' : '#e2e8f0' }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => deleteTask(tab, task.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 group transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-slate-300 group-hover:text-rose-400 transition-colors" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {currentTasks.length === 0 && !showPresets && !addingCustom && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 rounded-[2rem] border-2 border-dashed border-indigo-100 bg-indigo-50/30"
            >
              <Leaf className="w-10 h-10 text-indigo-300 mx-auto mb-4" />
              <p className="text-slate-700 font-black text-lg">No tasks yet</p>
              <p className="text-slate-500 text-sm font-medium mt-1">Add wellness tasks from the IKS guide or create custom ones.</p>
            </motion.div>
          )}
        </div>

        {/* Add controls */}
        <div className="space-y-3">
          <div className="flex gap-3 flex-wrap">
            <motion.button
              whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}
              onClick={() => { setShowPresets(p => !p); setAddingCustom(false); }}
              className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              {showPresets ? 'Hide' : 'Add from Wellness Guide'}
            </motion.button>
            <button
              onClick={() => { setAddingCustom(p => !p); setShowPresets(false); }}
              className="flex items-center gap-2 px-5 py-3 border border-slate-200 text-slate-700 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-50 transition-all"
            >
              <Plus className="w-4 h-4" />
              Custom Task
            </button>
          </div>

          {/* Preset picker */}
          <AnimatePresence>
            {showPresets && (
              <motion.div
                key="presets"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="grid sm:grid-cols-2 gap-2 pt-2">
                  {WELLNESS_PRESETS[tab].map((preset) => {
                    const alreadyAdded = currentTasks.some(t => t.title === preset.title);
                    const catStyle = CATEGORY_COLORS[preset.category] || CATEGORY_COLORS.Custom;
                    return (
                      <button
                        key={preset.title}
                        onClick={() => addPreset(preset)}
                        disabled={alreadyAdded}
                        className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${
                          alreadyAdded
                            ? 'opacity-40 cursor-not-allowed border-slate-100 bg-white'
                            : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/30'
                        }`}
                      >
                        <span className="text-xl">{preset.icon}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-900 leading-tight">{preset.title}</p>
                          <span
                            className="text-[9px] font-black uppercase tracking-widest"
                            style={{ color: catStyle.color }}
                          >
                            {preset.category}
                            {alreadyAdded && ' · Added'}
                          </span>
                        </div>
                        {!alreadyAdded && (
                          <Plus className="w-4 h-4 text-indigo-400 ml-auto flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Custom task input */}
          <AnimatePresence>
            {addingCustom && (
              <motion.div
                key="custom-input"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden pt-1"
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customTitle}
                    onChange={e => setCustomTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCustom()}
                    placeholder="Enter your custom task..."
                    className="flex-1 bg-white border border-slate-300 rounded-2xl px-5 py-3.5 text-slate-900 font-bold text-sm outline-none focus:border-indigo-400 transition-all placeholder:text-slate-400"
                    autoFocus
                  />
                  <button
                    onClick={addCustom}
                    className="px-5 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all"
                  >
                    Add
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* IKS Info note */}
        <div className="flex gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-100">
          <Wind className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-800 font-medium leading-relaxed">
            <span className="font-black">Wellness tasks are sourced from IKS (Indian Knowledge Systems)</span> — Yoga, Pranayama, Ayurveda, and Dinacharya practices recommended for ADHD management. These complement — not replace — professional care.
          </p>
        </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

const FocusMode = () => {
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [distractions, setDistractions] = useState(0);
  const [alert, setAlert] = useState('');

  useEffect(() => {
    let interval = null;
    let telemetryInterval = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(t => t - 1);
      }, 1000);

      // Mock Gaze Telemetry
      telemetryInterval = setInterval(() => {
        if (Math.random() > 0.7) { // 30% chance of distraction
          setDistractions(d => d + 1);
          setAlert("Gaze drifting detected! Please look at the screen.");
          setTimeout(() => setAlert(''), 4000);
          try {
             const audio = new Audio('https://cdn.freesound.org/previews/242/242501_4414128-lq.mp3');
             audio.volume = 0.2;
             audio.play();
          } catch(e) {}
        }
      }, 10000);
    } else if (timeLeft === 0) {
      setIsActive(false);
    }

    return () => {
      clearInterval(interval);
      clearInterval(telemetryInterval);
    };
  }, [isActive, timeLeft]);

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => { setIsActive(false); setTimeLeft(25 * 60); setDistractions(0); };

  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const seconds = (timeLeft % 60).toString().padStart(2, '0');

  return (
    <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="space-y-8">
      <div className="p-10 rounded-[3rem] bg-slate-900 text-white relative overflow-hidden border border-slate-800 shadow-2xl text-center flex flex-col items-center justify-center min-h-[400px]">
        {/* Animated Background */}
        <div className={`absolute inset-0 transition-opacity duration-1000 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15)_0%,transparent_70%)] animate-pulse" />
        </div>

        <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-8 flex items-center gap-2 relative z-10">
          <Activity className="w-3 h-3" /> Smart Focus Mode with Gaze Telemetry
        </h3>

        <div className="text-8xl font-black tracking-tighter text-white relative z-10 mb-12 tabular-nums">
          {minutes}:{seconds}
        </div>

        <div className="flex items-center gap-4 relative z-10">
          <button 
            onClick={toggleTimer} 
            className={`px-8 py-4 rounded-full font-black uppercase tracking-widest text-xs transition-all ${isActive ? 'bg-rose-500 hover:bg-rose-600 shadow-[0_0_20px_rgba(244,63,94,0.4)]' : 'bg-indigo-500 hover:bg-indigo-600 shadow-[0_0_20px_rgba(99,102,241,0.4)]'}`}
          >
            {isActive ? 'Pause Focus' : 'Start Focus'}
          </button>
          <button onClick={resetTimer} className="px-8 py-4 bg-white/10 hover:bg-white/20 rounded-full font-black uppercase tracking-widest text-xs transition-colors">
            Reset
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
         <div className="p-6 rounded-[2rem] border border-slate-200 bg-white">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Telemetry Status</p>
           <div className="flex items-center gap-3">
             <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
             <p className="text-lg font-black text-slate-800">{isActive ? 'Webcam Monitoring Active' : 'Standby'}</p>
           </div>
         </div>
         <div className="p-6 rounded-[2rem] border border-slate-200 bg-white">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Distractions Avoided</p>
           <p className="text-3xl font-black text-rose-500">{distractions}</p>
         </div>
      </div>

      <AnimatePresence>
        {alert && (
          <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0}} className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-rose-500 text-white px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl flex items-center gap-3 z-50">
             <Wind className="w-5 h-5" /> {alert}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TrackerPage;
