import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save, User, Activity, Coffee, Sparkles, Mic, MicOff, AlertCircle } from 'lucide-react';
import { predictADHD } from '../services/api';
import CycleTracker from '../components/CycleTracker';
import CameraTracker from '../components/CameraTracker';
import { useAuth } from '../context/AuthContext';
import {
  isSpeechSupported,
  startListening,
  stopListening,
  detectEmotions,
  getEmotionMeta,
  buildEmotionNarrative,
} from '../services/voiceAnalysis';

/* ─────────────────────────────────────────────
   Step-dependent color config
   ───────────────────────────────────────────── */
const stepColors = {
  1: { orb1: 'bg-indigo-200/50', orb2: 'bg-purple-200/40', accent: 'indigo', gradient: 'from-indigo-600 to-purple-600' },
  2: { orb1: 'bg-cyan-200/50', orb2: 'bg-blue-200/40', accent: 'cyan', gradient: 'from-cyan-600 to-blue-600' },
  3: { orb1: 'bg-violet-200/50', orb2: 'bg-purple-200/40', accent: 'violet', gradient: 'from-violet-600 to-purple-600' },
  4: { orb1: 'bg-fuchsia-200/50', orb2: 'bg-rose-200/40', accent: 'fuchsia', gradient: 'from-fuchsia-600 to-rose-600' },
};

/* ─────────────────────────────────────────────
   Animated Background for Assessment (Light Neural Theme)
   ───────────────────────────────────────────── */
const AssessmentBackground = ({ step }) => {
  const colors = stepColors[step] || stepColors[1];
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-slate-50">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-indigo-50/40" />
      
      {/* Neural Video Background — Inverted to light mode & masked to the edges! */}
      <div 
        className="absolute inset-0 opacity-70 mix-blend-multiply"
        style={{
          maskImage: 'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 25%, rgba(0,0,0,0) 75%, rgba(0,0,0,1) 100%)',
          WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 25%, rgba(0,0,0,0) 75%, rgba(0,0,0,1) 100%)'
        }}
      >
        <video
          src="/362486.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'invert(1) hue-rotate(180deg) contrast(1.2) saturate(1.5)' }}
        />
      </div>

      <div className="absolute inset-0 neural-grid animate-dot-pulse opacity-30" />

      {/* Step-reactive orbs */}
      <motion.div
        key={`orb1-${step}`}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2 }}
        className={`absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full ${colors.orb1} animate-float-slow blur-3xl`}
      />
      <motion.div
        key={`orb2-${step}`}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, delay: 0.2 }}
        className={`absolute -bottom-40 -left-40 w-[450px] h-[450px] rounded-full ${colors.orb2} animate-float-medium animation-delay-1000 blur-3xl`}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-100/30 animate-float-fast animation-delay-2000 blur-3xl" />
    </div>
  );
};

/* ─────────────────────────────────────────────
   Main Assessment Page
   ───────────────────────────────────────────── */
const AssessmentPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    age: 22,
    gender: 'Other',
    education: 'Bachelor',
    sleep_hours: 8.0,
    screen_time: 2.0,
    focus_level: 1.0,
    hyperactivity: 1.0,
    impulsiveness: 1.0,
    stress_level: 1.0,
    attention_span: 10.0,
    task_completion: 10.0,
    journal_text: '',
  });
  const [loading, setLoading] = useState(false);

  // Cycle tracker data (set when female user fills it)
  const [cycleData, setCycleData] = useState(null);

  // Voice / speech-to-text state
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const [detectedEmotions, setDetectedEmotions] = useState([]);
  const [webcamTelemetry, setWebcamTelemetry] = useState({
    gaze_deviation: 0.0,
    fidget_index: 0.0,
    tracked_expression: 'Focused'
  });
  const speechSupported = isSpeechSupported();
  const journalRef = useRef(null);

  // Update detected emotions whenever journal text changes
  useEffect(() => {
    setDetectedEmotions(detectEmotions(formData.journal_text));
  }, [formData.journal_text]);
  const stepPanelTransition = { type: 'spring', stiffness: 170, damping: 22, mass: 0.85 };
  const demoPersonas = {
    moderate: {
      age: 21,
      gender: 'Male',
      education: 'Bachelor',
      sleep_hours: 6.5,
      screen_time: 6.0,
      focus_level: 4.0,
      hyperactivity: 6.0,
      impulsiveness: 6.0,
      stress_level: 7.0,
      attention_span: 4.5,
      task_completion: 5.0,
      journal_text: 'I keep planning my day but get distracted quickly by messages and random thoughts. I start tasks with energy but struggle to finish on time and feel mentally exhausted by evening.',
    },
    high: {
      age: 24,
      gender: 'Female',
      education: 'Master',
      sleep_hours: 4.5,
      screen_time: 8.0,
      focus_level: 2.0,
      hyperactivity: 8.5,
      impulsiveness: 8.0,
      stress_level: 9.0,
      attention_span: 2.5,
      task_completion: 3.0,
      journal_text: 'Most days I jump between tasks every few minutes and cannot settle. I interrupt people, lose track of deadlines, and feel overwhelmed even with simple routines. My sleep is poor and my stress is constantly high.',
    },
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: (name === 'journal_text' ? value : (parseFloat(value) || value)) }));
  };

  const handleSliderChange = (name, val) => {
    setFormData(prev => ({ ...prev, [name]: parseFloat(val) }));
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 4));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));
  const applyPersona = (key) => {
    const selected = demoPersonas[key];
    if (selected) {
      setFormData(selected);
    }
  };

  // Voice handlers
  const handleVoiceToggle = useCallback(() => {
    if (isListening) {
      stopListening();
      setIsListening(false);
      setInterimText('');
      return;
    }
    setVoiceError('');
    startListening({
      onTranscript: (text, isFinal) => {
        if (isFinal) {
          setFormData(prev => ({ ...prev, journal_text: prev.journal_text + text }));
          setInterimText('');
        } else {
          setInterimText(text);
        }
      },
      onError: (msg) => {
        setVoiceError(msg);
        setIsListening(false);
        setInterimText('');
      },
      onEnd: () => {
        setIsListening(false);
        setInterimText('');
      },
    });
    setIsListening(true);
  }, [isListening]);

  const handleSubmit = async () => {
    if (isListening) stopListening();
    setLoading(true);
    try {
      // Merge emotion narrative into journal_text for backend NLP
      const emotionNarrative = buildEmotionNarrative(detectedEmotions);
      const enrichedJournal = formData.journal_text + emotionNarrative;

      const dataToSubmit = {
        age: parseInt(formData.age),
        sleep_hours: parseFloat(formData.sleep_hours),
        screen_time: parseFloat(formData.screen_time),
        focus_level: parseFloat(formData.focus_level),
        hyperactivity: parseFloat(formData.hyperactivity),
        impulsiveness: parseFloat(formData.impulsiveness),
        stress_level: parseFloat(formData.stress_level),
        attention_span: parseFloat(formData.attention_span),
        task_completion: parseFloat(formData.task_completion),
        journal_text: enrichedJournal,
        gaze_deviation: webcamTelemetry.gaze_deviation,
        fidget_index: webcamTelemetry.fidget_index,
        tracked_expression: webcamTelemetry.tracked_expression,
      };

      const result = await predictADHD(dataToSubmit);

      // Save to History
      const historyRecord = {
        date: new Date().toISOString(),
        user: user ? user.email : 'guest',
        result,
        inputData: formData,
        cycleData: cycleData || null,
        detectedEmotions,
      };
      
      try {
        const rawHistory = localStorage.getItem('adhd_assessment_history');
        const historyData = rawHistory ? JSON.parse(rawHistory) : [];
        historyData.push(historyRecord);
        localStorage.setItem('adhd_assessment_history', JSON.stringify(historyData));
      } catch (e) {
        console.error("Could not save to history", e);
      }

      navigate('/result', { state: { result, inputData: formData, cycleData, detectedEmotions } });
    } catch (err) {
      console.error(err);
      alert("Error submitting assessment. Ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const colors = stepColors[step] || stepColors[1];

  return (
    <div className="relative min-h-screen">
      {/* Animated Background */}
      <AssessmentBackground step={step} />

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="relative z-10 py-12 px-4 flex items-start justify-center min-h-screen"
      >
        <div className="flex flex-col lg:flex-row gap-8 max-w-6xl w-full items-start justify-center">
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="max-w-3xl w-full rounded-3xl overflow-hidden glass-card-dark"
          >
          {/* Progress Bar */}
          <div className="h-1.5 bg-slate-800 w-full overflow-hidden">
            <motion.div
              className={`h-full bg-gradient-to-r ${colors.gradient} shadow-[0_0_15px_rgba(99,102,241,0.5)]`}
              initial={{ width: '0%' }}
              animate={{ width: `${(step / 4) * 100}%` }}
              transition={{ type: "spring", stiffness: 50, damping: 20 }}
            />
          </div>

          <div className="p-8 md:p-12">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-10">
              <button 
                  onClick={() => navigate('/')} 
                  className="group flex items-center gap-2 text-indigo-400 hover:text-cyan-300 transition-all font-bold uppercase tracking-widest text-xs"
              >
                <div className="p-3 glass-neural rounded-2xl group-hover:border-indigo-400/30 transition-colors">
                  <ArrowLeft className="w-5 h-5 text-indigo-400" />
                </div>
                <span>Exit Neural Flow</span>
              </button>
              
              <div className="flex gap-2.5">
                {[1, 2, 3, 4].map(i => (
                  <div 
                      key={i} 
                      className={`h-1.5 transition-all duration-500 rounded-full ${
                        step === i 
                          ? `w-10 bg-gradient-to-r ${colors.gradient} shadow-[0_0_15px_rgba(99,102,241,0.5)]` 
                          : step > i
                            ? 'w-5 bg-indigo-500/40'
                            : 'w-3 bg-slate-600'
                      }`} 
                  />
                ))}
              </div>
            </div>


            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -12, filter: 'blur(2px)' }}
                  transition={stepPanelTransition}
                  className="space-y-8"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-indigo-600">
                      <User className="w-5 h-5" />
                      <span className="text-xs font-bold uppercase tracking-[0.2em]">Step 01</span>
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Personal Profile</h2>
                    <p className="text-slate-600 text-sm">Basic demographics for baseline comparison.</p>
                  </div>

                  <div className="rounded-2xl glass-neural p-5 space-y-4">
                    <div className="flex items-center gap-3 text-cyan-500">

                      <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Preset Assessment Modes</span>
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                      <button
                        onClick={() => applyPersona('moderate')}
                        className="rounded-2xl glass-neural px-4 py-3 text-left hover:border-indigo-400/30 transition-all group"
                      >
                        <p className="text-sm font-bold text-slate-900 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">Moderate Persona</p>
                        <p className="text-xs text-slate-600 mt-1">Balanced but stressed profile for explainability demo.</p>
                      </button>
                      <button
                        onClick={() => applyPersona('high')}
                        className="rounded-2xl glass-neural px-4 py-3 text-left hover:border-fuchsia-400/30 transition-all group"
                      >
                        <p className="text-sm font-bold text-slate-900 uppercase tracking-widest group-hover:text-fuchsia-600 transition-colors">High Persona</p>
                        <p className="text-xs text-slate-600 mt-1">Higher-risk profile for action-plan and red-flag demo.</p>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <InputGroup label="Age" name="age" value={formData.age} onChange={handleChange} min={10} max={100} type="number" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <SelectGroup label="Gender" name="gender" value={formData.gender} onChange={handleChange} options={['Male', 'Female', 'Other']} />
                      <SelectGroup label="Education" name="education" value={formData.education} onChange={handleChange} options={['High School', 'Bachelor', 'Master', 'PhD']} />
                    </div>

                    {/* Cycle Tracker — only for Female users */}
                    <AnimatePresence>
                      {formData.gender === 'Female' && (
                        <motion.div
                          key="cycle-tracker"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.35 }}
                        >
                          <CycleTracker onCycleDataChange={setCycleData} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -12, filter: 'blur(2px)' }}
                  transition={stepPanelTransition}
                  className="space-y-8"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-cyan-600">
                      <Activity className="w-5 h-5" />
                      <span className="text-xs font-bold uppercase tracking-[0.2em]">Step 02</span>
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Behavioral Habits</h2>
                    <p className="text-slate-600 text-sm">How you typically act and react.</p>
                  </div>

                  <div className="space-y-6">
                    <SliderGroup label="Focus Difficulty" description="Difficulty staying focused on one thing" name="focus_level" value={formData.focus_level} onChange={handleSliderChange} delay={0.03} step={step} />
                    <SliderGroup label="Restlessness" description="Feeling the need to move or fidget constantly" name="hyperactivity" value={formData.hyperactivity} onChange={handleSliderChange} delay={0.08} step={step} />
                    <SliderGroup label="Acting on Impulse" description="Tendency to do things without thinking first" name="impulsiveness" value={formData.impulsiveness} onChange={handleSliderChange} delay={0.13} step={step} />
                    <SliderGroup label="Attention Span" description="How long you can pay attention to one thing" name="attention_span" value={formData.attention_span} onChange={handleSliderChange} delay={0.18} step={step} />
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -12, filter: 'blur(2px)' }}
                  transition={stepPanelTransition}
                  className="space-y-8"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-violet-600">
                      <Coffee className="w-5 h-5" />
                      <span className="text-xs font-bold uppercase tracking-[0.2em]">Step 03</span>
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Lifestyle & Sleep</h2>
                    <p className="text-slate-600 text-sm">Your daily routines and environment.</p>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <InputGroup label="Sleep (Hours)" name="sleep_hours" value={formData.sleep_hours} onChange={handleChange} type="number" step="0.5" />
                      <InputGroup label="Screen Time" name="screen_time" value={formData.screen_time} onChange={handleChange} type="number" step="0.5" />
                    </div>
                    <SliderGroup label="Finishing Tasks" description="How often you finish the tasks you start" name="task_completion" value={formData.task_completion} onChange={handleSliderChange} delay={0.03} step={step} />
                    <SliderGroup label="Stress Level" description="How much stress or pressure you feel daily" name="stress_level" value={formData.stress_level} onChange={handleSliderChange} delay={0.08} step={step} />
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -12, filter: 'blur(2px)' }}
                  transition={stepPanelTransition}
                  className="space-y-8"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-fuchsia-600">
                      <Sparkles className="w-5 h-5" />
                      <span className="text-xs font-bold uppercase tracking-[0.2em]">Final Phase</span>
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Writing Sample</h2>
                    <p className="text-slate-600 text-sm">Share your thoughts to help the AI analyze your patterns.</p>
                  </div>

                  <div className="space-y-5">

                    {/* Mic controls */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {speechSupported ? (
                        <motion.button
                          type="button"
                          onClick={handleVoiceToggle}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.96 }}
                          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all ${
                            isListening
                              ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse'
                              : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-[0_0_25px_rgba(99,102,241,0.4)]'
                          }`}
                        >
                          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                          {isListening ? 'Stop Recording' : 'Speak to Write'}
                        </motion.button>
                      ) : (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl glass-neural text-slate-500 text-xs font-semibold">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Speech not supported in this browser
                        </div>
                      )}
                      {isListening && (
                        <div className="flex items-center gap-2 px-2">
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-[10px] font-bold uppercase tracking-widest text-rose-400"
                          >
                            🎙 Listening...
                          </motion.span>
                          <LiveAudioWaveform isListening={isListening} />
                        </div>
                      )}
                      {voiceError && (
                        <span className="text-[10px] font-semibold text-rose-400">{voiceError}</span>
                      )}
                    </div>

                    <div className="relative">
                      <textarea
                          ref={journalRef}
                          name="journal_text"
                          value={formData.journal_text + (isListening && interimText ? interimText : '')}
                          onChange={handleChange}
                          placeholder="Type, paste, or speak your journal entry — describe your typical day..."
                          className={`w-full h-56 glass-input rounded-2xl p-8 text-slate-900 outline-none transition-all resize-none leading-relaxed placeholder:text-slate-500 font-medium ${
                            isListening ? 'border-rose-500/40 shadow-[0_0_0_3px_rgba(239,68,68,0.1)]' : ''
                          }`}
                      />
                      <div className="absolute bottom-6 right-8 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                          {formData.journal_text.length} Characters
                      </div>
                    </div>

                    {/* Emotion badges */}
                    {detectedEmotions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-2"
                      >
                        <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-slate-500 ml-1">Emotion Signals Detected</p>
                        <div className="flex flex-wrap gap-2">
                          {detectedEmotions.map(emotion => {
                            const meta = getEmotionMeta(emotion);
                            if (!meta) return null;
                            return (
                              <motion.span
                                key={emotion}
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold glass-neural"
                                style={{ color: meta.color, borderColor: `${meta.color}33` }}
                              >
                                <span>{meta.emoji}</span>
                                {meta.label}
                              </motion.span>
                            );
                          })}
                          <span className="text-[9px] font-semibold text-slate-600 flex items-center">→ sent to NLP</span>
                        </div>
                      </motion.div>
                    )}
                    
                    <div className="glass-neural p-5 rounded-2xl flex gap-4 border border-slate-200">
                      <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 h-fit">
                          <Activity className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                          <p className="text-slate-600 text-xs leading-relaxed">
                              The GENAI model reads your text <strong className="text-slate-900">and</strong> detected emotion signals to strengthen the attention and stress inference pathways.
                          </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-between mt-12 pt-10 border-t border-slate-200">
              {step > 1 ? (
                <button
                  onClick={prevStep}
                  className="flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-widest text-xs hover:text-cyan-300 transition-colors"
                  disabled={loading}
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              ) : <div />}

              {step < 4 ? (
                <motion.button
                  onClick={nextStep}
                  className={`group flex items-center gap-3 bg-gradient-to-r ${colors.gradient} text-white px-10 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs shadow-[0_0_30px_rgba(99,102,241,0.25)] hover:shadow-[0_0_45px_rgba(99,102,241,0.4)] transition-all transform active:scale-95`}
                  whileHover={{ y: -1, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Next Step <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              ) : (
                <motion.button
                  onClick={handleSubmit}
                  disabled={loading}
                  className={`flex items-center gap-3 bg-gradient-to-r from-fuchsia-600 to-rose-600 text-white px-12 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs shadow-[0_0_35px_rgba(217,70,239,0.3)] transition-all transform active:scale-95 ${loading ? 'opacity-50 cursor-wait' : 'hover:shadow-[0_0_50px_rgba(217,70,239,0.5)]'}`}
                  whileHover={loading ? {} : { y: -1, scale: 1.01 }}
                  whileTap={loading ? {} : { scale: 0.98 }}
                >
                  {loading ? 'Synthesizing...' : <><Save className="w-4 h-4" /> Run Diagnosis</>}
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>

        {step >= 2 && (
          <div className="w-full lg:w-[380px] shrink-0 lg:sticky lg:top-8">
            <CameraTracker onTelemetryUpdate={setWebcamTelemetry} />
          </div>
        )}
      </div>
    </motion.div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Reusable Form Components — Light Theme
   ───────────────────────────────────────────── */
const InputGroup = ({ label, ...props }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-bold text-indigo-600 uppercase tracking-[0.2em] ml-1">{label}</label>
    <input 
      {...props} 
      className="w-full glass-input rounded-xl px-6 py-4 text-slate-900 outline-none font-medium placeholder:text-slate-400 border border-slate-300 focus:border-indigo-500" 
    />
  </div>
);

const SelectGroup = ({ label, options, ...props }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-bold text-indigo-600 uppercase tracking-[0.2em] ml-1">{label}</label>
    <div className="relative">
        <select 
            {...props} 
            className="w-full h-[56px] appearance-none glass-input rounded-xl px-6 text-slate-900 outline-none font-medium cursor-pointer border border-slate-300 focus:border-indigo-500"
        >
            <option value="" disabled className="text-slate-500">Select {label}</option>
            {options.map(o => <option key={o} value={o} className="bg-white text-slate-900">{o}</option>)}
        </select>
        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
            <ArrowRight className="w-4 h-4 rotate-90" />
        </div>
    </div>
  </div>
);

const SliderGroup = ({ label, description, name, value, onChange, delay = 0, step: currentStep }) => {
  const colors = stepColors[currentStep] || stepColors[1];
  const accentHexMap = { indigo: '#4f46e5', cyan: '#0284c7', violet: '#7c3aed', fuchsia: '#c026d3' };
  const accentColor = accentHexMap[colors.accent] || '#12a4ff';

  const min = 0;
  const max = 10;
  const thumbW = 64;

  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pos, setPos] = useState(value || min);

  useEffect(() => {
    if (!isDragging) setPos(value || min);
  }, [value, isDragging, min]);

  const valueFromEvent = useCallback((e) => {
    if (!containerRef.current) return pos;
    const r = containerRef.current.getBoundingClientRect();
    const x = e.clientX - r.left - (thumbW / 2);
    const span = containerRef.current.clientWidth - thumbW;
    if (span <= 0) return min;
    const t = Math.min(1, Math.max(0, x / span));
    return min + t * (max - min);
  }, [min, max, pos]);

  const handlePointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    setPos(valueFromEvent(e));
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    setPos(valueFromEvent(e));
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;
    setIsDragging(false);
    const snapped = Math.max(min, Math.min(max, Math.round(pos)));
    onChange(name, snapped);
    setPos(snapped);
  };

  const handleKeyDown = (e) => {
    let stepAmount = 0;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') stepAmount = 1;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') stepAmount = -1;
    if (stepAmount !== 0) {
      e.preventDefault();
      const snapped = Math.max(min, Math.min(max, Math.round((value || min) + stepAmount)));
      onChange(name, snapped);
    }
    if (e.key === 'Home') onChange(name, min);
    if (e.key === 'End') onChange(name, max);
  };

  const percent = Math.max(0, Math.min(1, (pos - min) / (max - min)));
  const thumbLeft = `calc(${percent * 100}% - ${percent * thumbW}px)`;
  const centerPos = `calc(${percent * 100}% - ${percent * thumbW}px + ${thumbW / 2}px)`;

  const dots = [];
  for (let i = min; i <= max; i++) dots.push(i);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
      className="space-y-4 rounded-2xl glass-neural p-5 hover:border-indigo-400/40 transition-all border border-slate-200 bg-white/80"
    >
      <div className="flex justify-between items-end px-1">
        <div className="space-y-1">
          <h4 className="font-bold text-slate-900 text-lg tracking-tight">{label}</h4>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{description}</p>
        </div>
        <motion.div
          key={`${name}-${value}`}
          initial={{ scale: 0.86, opacity: 0.55 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.22 }}
          className="text-slate-900 font-bold text-xl tabular-nums flex items-center gap-1"
        >
          {Math.round(value || min)} <span className="text-slate-400 text-sm font-medium">/ 10</span>
        </motion.div>
      </div>

      <div 
        className="relative w-full h-[80px] touch-none select-none cursor-pointer outline-none group mt-2"
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        ref={containerRef}
        style={{
          '--accent': accentColor,
          '--track': '#d9d9d9',
          '--dot-off': '#cfcfcf',
          '--thumb-w': '64px',
          '--thumb-h': '40px'
        }}
      >
        <div className="absolute left-0 right-0 top-[28px] h-[8px] rounded-full bg-[var(--track)]">
            <div 
              className="absolute left-0 top-0 bottom-0 rounded-full" 
              style={{ 
                width: centerPos, 
                backgroundColor: 'var(--accent)',
                transition: isDragging ? 'none' : 'width 0.22s cubic-bezier(0.3, 1.2, 0.5, 1)' 
              }}
            />
        </div>

        <div className="absolute left-0 right-0 top-[46px] h-[6px]">
            {dots.map(d => {
                const dPercent = (d - min) / (max - min);
                const isActive = d <= Math.round(pos);
                return (
                    <div 
                      key={d}
                      className="absolute w-[5px] h-[5px] rounded-full transition-colors duration-200"
                      style={{
                          left: `calc(32px + ${dPercent * 100}% - ${dPercent * 64}px)`,
                          transform: 'translateX(-50%)',
                          backgroundColor: isActive ? 'var(--accent)' : 'var(--dot-off)'
                      }}
                    />
                );
            })}
        </div>

        <div 
          className="absolute top-[12px] rounded-full border border-white/90 will-change-[left] group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-[var(--accent)] group-focus-visible:outline-offset-[3px]"
          style={{
              width: 'var(--thumb-w)',
              height: 'var(--thumb-h)',
              left: thumbLeft,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.35) 45%, rgba(255,255,255,0.55) 100%)',
              backdropFilter: 'blur(1.5px) saturate(1.4) brightness(1.12)',
              WebkitBackdropFilter: 'blur(1.5px) saturate(1.4) brightness(1.12)',
              boxShadow: isDragging 
                  ? '0 10px 22px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.2), inset 0 1px 2px #fff, inset 0 -3px 6px rgba(0,0,0,0.06)'
                  : '0 6px 14px rgba(0,0,0,0.14), 0 1px 3px rgba(0,0,0,0.18), inset 0 1px 2px rgba(255,255,255,0.95), inset 0 -3px 6px rgba(0,0,0,0.06)',
              transform: isDragging ? 'scale(1.08)' : 'scale(1)',
              transition: isDragging 
                  ? 'transform 0.18s cubic-bezier(0.3, 1.4, 0.5, 1), box-shadow 0.18s'
                  : 'left 0.22s cubic-bezier(0.3, 1.2, 0.5, 1), transform 0.18s cubic-bezier(0.3, 1.4, 0.5, 1), box-shadow 0.18s, width 0.22s cubic-bezier(0.3, 1.2, 0.5, 1)'
          }}
        />
      </div>
    </motion.div>
  );
};

const LiveAudioWaveform = ({ isListening }) => {
  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (isListening) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        streamRef.current = stream;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new AudioContext();
        analyserRef.current = audioCtxRef.current.createAnalyser();
        analyserRef.current.fftSize = 64;
        const source = audioCtxRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const draw = () => {
          animationRef.current = requestAnimationFrame(draw);
          analyserRef.current.getByteFrequencyData(dataArray);
          
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          const barWidth = (canvas.width / bufferLength) * 1.5;
          let x = 0;
          
          for(let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * canvas.height;
            // Rose-500 color matching the UI
            ctx.fillStyle = `rgb(244, 63, 94)`;
            // Draw pill shaped rounded bars
            ctx.beginPath();
            ctx.roundRect(x, canvas.height - barHeight - 2, barWidth - 1, barHeight + 4, [4]);
            ctx.fill();
            x += barWidth;
          }
        };
        draw();
      }).catch(err => console.error("Mic access denied", err));
    } else {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') audioCtxRef.current.close();
      
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') audioCtxRef.current.close();
    };
  }, [isListening]);

  return (
    <div className={`h-4 w-[60px] flex items-center justify-center transition-opacity ${isListening ? 'opacity-100' : 'opacity-0'}`}>
      <canvas ref={canvasRef} width="60" height="16" className="w-full h-full" />
    </div>
  );
};

export default AssessmentPage;
