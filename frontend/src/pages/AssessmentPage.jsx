import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save, User, Activity, BrainCircuit, Sparkles, Mic, MicOff, AlertCircle } from 'lucide-react';
import { predictADHD } from '../services/api';
import CycleTracker from '../components/CycleTracker';
import CameraTracker from '../components/CameraTracker';
import CognitiveQuiz from '../components/CognitiveQuiz';
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
  4: { orb1: 'bg-emerald-200/50', orb2: 'bg-teal-200/40', accent: 'emerald', gradient: 'from-emerald-600 to-teal-600' },
  5: { orb1: 'bg-fuchsia-200/50', orb2: 'bg-rose-200/40', accent: 'fuchsia', gradient: 'from-fuchsia-600 to-rose-600' },
};

/* ─────────────────────────────────────────────
   Animated Background
   ───────────────────────────────────────────── */
const AssessmentBackground = ({ step }) => {
  const colors = stepColors[step] || stepColors[1];
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-slate-50">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-indigo-50/40" />
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
   ASRS Questions Definition
   ───────────────────────────────────────────── */
const ASRS_QUESTIONS = {
  partA: [
    { id: 'q1', text: "1. How often do you make careless mistakes or overlook details in school, work or other activities?" },
    { id: 'q2', text: "2. How often do you have trouble keeping your attention on tasks or activities?" },
    { id: 'q3', text: "3. How often do you seem not to listen when someone speaks to you directly?" },
    { id: 'q4', text: "4. How often do you fail to follow through on instructions and leave tasks unfinished because you lose focus?" },
    { id: 'q5', text: "5. How often do you have trouble organizing tasks and activities?" },
    { id: 'q6', text: "6. How often do you avoid, dislike or put off tasks that need mental effort for a long time?" },
    { id: 'q7', text: "7. How often do you lose things you need (keys, phone, wallet, paperwork, glasses)?" },
    { id: 'q8', text: "8. How often do you get easily distracted?" },
    { id: 'q9', text: "9. How often do you forget things in daily activities (appointments, errands, chores)?" },
  ],
  partB: [
    { id: 'q10', text: "10. How often do you fidget, tap your hands or feet, or squirm in your seat?" },
    { id: 'q11', text: "11. How often do you leave your seat when you are expected to stay seated?" },
    { id: 'q12', text: "12. How often do you feel restless (or run/climb when it isn't appropriate)?" },
    { id: 'q13', text: "13. How often do you find it hard to take part in leisure activities quietly?" },
    { id: 'q14', text: "14. How often do you feel 'on the go,' as if driven by a motor?" },
    { id: 'q15', text: "15. How often do you talk excessively?" },
    { id: 'q16', text: "16. How often do you blurt out an answer before the question is finished?" },
    { id: 'q17', text: "17. How often do you have trouble waiting your turn?" },
    { id: 'q18', text: "18. How often do you interrupt or intrude on others (conversations, games)?" },
  ]
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
    // ASRS questions (0=Never to 4=Very Often)
    q1: null, q2: null, q3: null, q4: null, q5: null, q6: null, q7: null, q8: null, q9: null,
    q10: null, q11: null, q12: null, q13: null, q14: null, q15: null, q16: null, q17: null, q18: null,
    journal_text: '',
    quiz_score: 0.0,
    quiz_attempted: false,
  });

  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    setDetectedEmotions(detectEmotions(formData.journal_text));
  }, [formData.journal_text]);

  const stepPanelTransition = { type: 'spring', stiffness: 170, damping: 22, mass: 0.85 };
  
  const demoPersonas = {
    moderate: {
      age: 21, gender: 'Male', education: 'Bachelor', sleep_hours: 6.5, screen_time: 6.0,
      q1: 2, q2: 3, q3: 2, q4: 3, q5: 2, q6: 3, q7: 2, q8: 3, q9: 2, // Part A - Inattentive leaning
      q10: 1, q11: 1, q12: 2, q13: 1, q14: 2, q15: 1, q16: 2, q17: 1, q18: 1, // Part B
      journal_text: 'I keep planning my day but get distracted quickly by messages and random thoughts. I start tasks with energy but struggle to finish on time.',
      quiz_score: 0.45, quiz_attempted: true,
    },
    high: {
      age: 24, gender: 'Female', education: 'Master', sleep_hours: 4.5, screen_time: 8.0,
      q1: 4, q2: 4, q3: 3, q4: 4, q5: 4, q6: 4, q7: 4, q8: 4, q9: 3, // Part A - High Inattentive
      q10: 4, q11: 3, q12: 4, q13: 3, q14: 4, q15: 4, q16: 4, q17: 3, q18: 4, // Part B - High Hyperactive
      journal_text: 'Most days I jump between tasks every few minutes and cannot settle. I interrupt people, lose track of deadlines, and feel overwhelmed even with simple routines.',
      quiz_score: 0.85, quiz_attempted: true,
    },
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: (name === 'journal_text' ? value : (parseFloat(value) || value)) }));
  };

  const handleQuestionSelect = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const applyPersona = (key) => {
    const selected = demoPersonas[key];
    if (selected) setFormData(selected);
  };

  const canProceed = () => {
    if (step === 2) return ASRS_QUESTIONS.partA.every(q => formData[q.id] !== null);
    if (step === 3) return ASRS_QUESTIONS.partB.every(q => formData[q.id] !== null);
    if (step === 4) return formData.quiz_attempted;
    return true;
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 5));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

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
      const emotionNarrative = buildEmotionNarrative(detectedEmotions);
      const enrichedJournal = formData.journal_text + emotionNarrative;

      const dataToSubmit = {
        age: parseInt(formData.age),
        sleep_hours: parseFloat(formData.sleep_hours),
        screen_time: parseFloat(formData.screen_time),
        q1: formData.q1 || 0, q2: formData.q2 || 0, q3: formData.q3 || 0,
        q4: formData.q4 || 0, q5: formData.q5 || 0, q6: formData.q6 || 0,
        q7: formData.q7 || 0, q8: formData.q8 || 0, q9: formData.q9 || 0,
        q10: formData.q10 || 0, q11: formData.q11 || 0, q12: formData.q12 || 0,
        q13: formData.q13 || 0, q14: formData.q14 || 0, q15: formData.q15 || 0,
        q16: formData.q16 || 0, q17: formData.q17 || 0, q18: formData.q18 || 0,
        journal_text: enrichedJournal,
        quiz_score: formData.quiz_score,
        quiz_attempted: formData.quiz_attempted,
        gaze_deviation: webcamTelemetry.gaze_deviation,
        fidget_index: webcamTelemetry.fidget_index,
        tracked_expression: webcamTelemetry.tracked_expression,
      };

      const result = await predictADHD(dataToSubmit);

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
            className="max-w-4xl w-full rounded-3xl overflow-hidden glass-card-dark"
          >
            {/* Progress Bar */}
            <div className="h-1.5 bg-slate-800 w-full overflow-hidden">
              <motion.div
                className={`h-full bg-gradient-to-r ${colors.gradient} shadow-[0_0_15px_rgba(99,102,241,0.5)]`}
                initial={{ width: '0%' }}
                animate={{ width: `${(step / 5) * 100}%` }}
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
                  <span>Exit Assessment</span>
                </button>
                
                <div className="flex gap-2.5">
                  {[1, 2, 3, 4, 5].map(i => (
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
                      <p className="text-slate-600 text-sm">Basic demographics and lifestyle factors.</p>
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

                      <div className="grid grid-cols-2 gap-6">
                        <InputGroup label="Sleep (Hours)" name="sleep_hours" value={formData.sleep_hours} onChange={handleChange} type="number" step="0.5" />
                        <InputGroup label="Screen Time" name="screen_time" value={formData.screen_time} onChange={handleChange} type="number" step="0.5" />
                      </div>

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
                        <span className="text-xs font-bold uppercase tracking-[0.2em]">Step 02 — ASRS Part A</span>
                      </div>
                      <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Attention & Focus</h2>
                      <p className="text-slate-600 text-sm">Please answer based on the past 6 months.</p>
                    </div>

                    <div className="space-y-6">
                      {ASRS_QUESTIONS.partA.map((q) => (
                        <QuestionCard 
                          key={q.id} 
                          question={q} 
                          value={formData[q.id]} 
                          onChange={(val) => handleQuestionSelect(q.id, val)}
                          accent="cyan" 
                        />
                      ))}
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
                        <Activity className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-[0.2em]">Step 03 — ASRS Part B</span>
                      </div>
                      <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Activity & Impulses</h2>
                      <p className="text-slate-600 text-sm">Please answer based on the past 6 months.</p>
                    </div>

                    <div className="space-y-6">
                      {ASRS_QUESTIONS.partB.map((q) => (
                        <QuestionCard 
                          key={q.id} 
                          question={q} 
                          value={formData[q.id]} 
                          onChange={(val) => handleQuestionSelect(q.id, val)}
                          accent="violet" 
                        />
                      ))}
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
                      <div className="flex items-center gap-3 text-emerald-600">
                        <BrainCircuit className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-[0.2em]">Step 04</span>
                      </div>
                      <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Cognitive Quizzes</h2>
                      <p className="text-slate-600 text-sm">Interactive tasks measuring attention and working memory.</p>
                    </div>

                    {!formData.quiz_attempted ? (
                      <CognitiveQuiz onComplete={(payload) => setFormData(prev => ({ ...prev, quiz_score: payload.score, quiz_metrics: payload.metrics, quiz_attempted: true }))} />
                    ) : (
                      <div className="p-12 text-center space-y-4 bg-emerald-50 h-[400px] flex flex-col items-center justify-center rounded-3xl border border-emerald-200">
                        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
                          <Activity className="w-10 h-10 text-emerald-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900">Quizzes Completed</h3>
                        <p className="text-slate-600 max-w-sm">Your cognitive metrics have been recorded. You can proceed to the final step.</p>
                        <button onClick={() => setFormData(p => ({ ...p, quiz_attempted: false }))} className="text-xs font-bold text-emerald-600 hover:underline mt-4 uppercase tracking-widest">
                          Retake Quizzes
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}

                {step === 5 && (
                  <motion.div
                    key="step5"
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

                {step < 5 ? (
                  <motion.button
                    onClick={nextStep}
                    disabled={!canProceed()}
                    className={`group flex items-center gap-3 bg-gradient-to-r ${colors.gradient} text-white px-10 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs shadow-[0_0_30px_rgba(99,102,241,0.25)] transition-all transform ${!canProceed() ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:shadow-[0_0_45px_rgba(99,102,241,0.4)] active:scale-95'}`}
                    whileHover={canProceed() ? { y: -1, scale: 1.01 } : {}}
                    whileTap={canProceed() ? { scale: 0.98 } : {}}
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

          {step >= 2 && step <= 4 && (
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
   Reusable Form Components
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

/* ─────────────────────────────────────────────
   Question Card (replaces Slider)
   ───────────────────────────────────────────── */
const QuestionCard = ({ question, value, onChange, accent = "indigo" }) => {
  const options = [
    { value: 0, label: "Never" },
    { value: 1, label: "Rarely" },
    { value: 2, label: "Sometimes" },
    { value: 3, label: "Often" },
    { value: 4, label: "Very Often" }
  ];

  const activeColorMap = {
    indigo: "bg-indigo-600 text-white shadow-[0_4px_15px_rgba(79,70,229,0.3)]",
    cyan: "bg-cyan-600 text-white shadow-[0_4px_15px_rgba(2,132,199,0.3)]",
    violet: "bg-violet-600 text-white shadow-[0_4px_15px_rgba(124,58,237,0.3)]"
  };
  const activeColor = activeColorMap[accent];

  return (
    <div className="glass-neural rounded-2xl p-6 border border-slate-200 transition-all hover:border-slate-300 bg-white/80">
      <p className="font-bold text-slate-800 text-[15px] mb-5 leading-relaxed">
        {question.text}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={`flex-1 min-w-[80px] py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all transform active:scale-95 ${
                isSelected 
                  ? activeColor 
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
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
            ctx.fillStyle = `rgb(244, 63, 94)`;
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
