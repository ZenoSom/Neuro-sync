import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save, User, Activity, Coffee, Sparkles } from 'lucide-react';
import { predictADHD } from '../services/api';

const AssessmentPage = () => {
  const navigate = useNavigate();
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

  const handleSubmit = async () => {
    setLoading(true);
    try {
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
        journal_text: formData.journal_text,
      };

      const result = await predictADHD(dataToSubmit);

      // Save to History
      const historyRecord = {
        date: new Date().toISOString(),
        result,
        inputData: formData
      };
      
      try {
        const rawHistory = localStorage.getItem('adhd_assessment_history');
        const historyData = rawHistory ? JSON.parse(rawHistory) : [];
        historyData.push(historyRecord);
        localStorage.setItem('adhd_assessment_history', JSON.stringify(historyData));
      } catch (e) {
        console.error("Could not save to history", e);
      }

      navigate('/result', { state: { result, inputData: formData } });
    } catch (err) {
      console.error(err);
      alert("Error submitting assessment. Ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative min-h-screen bg-white py-12 px-4 z-10 flex items-center justify-center selection:bg-amber-700/20 selection:text-cyan-900"
    >
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="max-w-3xl w-full rounded-[2.5rem] overflow-hidden border border-slate-200 bg-white shadow-[0_32px_120px_-40px_rgba(0,0,0,0.1)]"
      >
        {/* Progress Bar */}
        <div className="h-1.5 bg-slate-200 w-full overflow-hidden">
          <motion.div
            className="h-full bg-indigo-600 shadow-[0_0_15px_rgba(37,99,235,0.6)]"
            initial={{ width: '0%' }}
            animate={{ width: `${(step / 4) * 100}%` }}
            transition={{ type: "spring", stiffness: 50, damping: 20 }}
          />
        </div>

        <div className="p-8 md:p-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-10">
            <button 
                onClick={() => navigate('/')} 
                className="group flex items-center gap-2 text-indigo-600 hover:text-cyan-800 transition-all font-black uppercase tracking-widest text-xs"
            >
              <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100 group-hover:bg-indigo-100 transition-colors">
                <ArrowLeft className="w-5 h-5 text-indigo-600" />
              </div>
              <span>Exit Neural Flow</span>
            </button>
            
            <div className="flex gap-2.5">
              {[1, 2, 3, 4].map(i => (
                <div 
                    key={i} 
                    className={`h-1.5 transition-all duration-500 rounded-full ${step === i ? 'w-10 bg-cyan-400 shadow-[0_0_18px_rgba(56,189,248,0.45)]' : 'w-3 bg-slate-300'}`} 
                />
              ))}
            </div>
          </div>

            <div className="rounded-[2rem] border border-slate-200 bg-indigo-50/50 p-6 mb-10 shadow-[0_24px_50px_-30px_rgba(0,0,0,0.05)]">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-50/50 border border-indigo-100 shadow-[0_0_30px_rgba(56,189,248,0.12)]">
                <Sparkles className="w-7 h-7 text-indigo-600" />
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-indigo-600">GENAI Copilot</p>
                <h1 className="text-3xl font-black tracking-tight text-slate-900">Adaptive Assessment Engine</h1>
                <p className="text-sm text-slate-600 max-w-2xl">Answer the guided prompts, then watch the AI brain synthesize your behavioral signals into an explainable diagnostic model.</p>
              </div>
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
                    <span className="text-xs font-black uppercase tracking-[0.2em]">Step 01</span>
                  </div>
                  <h2 className="text-4xl font-black text-slate-900 tracking-tight">Personal Profile</h2>
                  <p className="text-slate-600 text-sm font-medium">Basic demographics for baseline comparison.</p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4">
                  <div className="flex items-center gap-3 text-indigo-600">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Preset Assessment Modes</span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <button
                      onClick={() => applyPersona('moderate')}
                      className="rounded-2xl border border-slate-200 bg-indigo-50/50 px-4 py-3 text-left hover:bg-slate-100 transition-colors"
                    >
                      <p className="text-sm font-black text-slate-900 uppercase tracking-widest">Moderate Persona</p>
                      <p className="text-xs text-slate-600 mt-1">Balanced but stressed profile for explainability demo.</p>
                    </button>
                    <button
                      onClick={() => applyPersona('high')}
                      className="rounded-2xl border border-slate-200 bg-indigo-50/50 px-4 py-3 text-left hover:bg-slate-100 transition-colors"
                    >
                      <p className="text-sm font-black text-slate-900 uppercase tracking-widest">High Persona</p>
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
                  <div className="flex items-center gap-3 text-indigo-600">
                    <Activity className="w-5 h-5" />
                    <span className="text-xs font-black uppercase tracking-[0.2em]">Step 02</span>
                  </div>
                  <h2 className="text-4xl font-black text-slate-900 tracking-tight">Behavioral Habits</h2>
                  <p className="text-slate-600 text-sm font-medium">How you typically act and react.</p>
                </div>

                <div className="space-y-10">
                  <SliderGroup label="Focus Difficulty" description="Difficulty staying focused on one thing" name="focus_level" value={formData.focus_level} onChange={handleSliderChange} delay={0.03} />
                  <SliderGroup label="Restlessness" description="Feeling the need to move or fidget constantly" name="hyperactivity" value={formData.hyperactivity} onChange={handleSliderChange} delay={0.08} />
                  <SliderGroup label="Acting on Impulse" description="Tendency to do things without thinking first" name="impulsiveness" value={formData.impulsiveness} onChange={handleSliderChange} delay={0.13} />
                  <SliderGroup label="Attention Span" description="How long you can pay attention to one thing" name="attention_span" value={formData.attention_span} onChange={handleSliderChange} delay={0.18} />
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
                  <div className="flex items-center gap-3 text-indigo-600">
                    <Coffee className="w-5 h-5" />
                    <span className="text-xs font-black uppercase tracking-[0.2em]">Step 03</span>
                  </div>
                  <h2 className="text-4xl font-black text-slate-900 tracking-tight">Lifestyle & Sleep</h2>
                  <p className="text-slate-600 text-sm font-medium">Your daily routines and environment.</p>
                </div>

                <div className="space-y-10">
                  <div className="grid grid-cols-2 gap-6">
                    <InputGroup label="Sleep (Hours)" name="sleep_hours" value={formData.sleep_hours} onChange={handleChange} type="number" step="0.5" />
                    <InputGroup label="Screen Time" name="screen_time" value={formData.screen_time} onChange={handleChange} type="number" step="0.5" />
                  </div>
                  <SliderGroup label="Finishing Tasks" description="How often you finish the tasks you start" name="task_completion" value={formData.task_completion} onChange={handleSliderChange} delay={0.03} />
                  <SliderGroup label="Stress Level" description="How much stress or pressure you feel daily" name="stress_level" value={formData.stress_level} onChange={handleSliderChange} delay={0.08} />
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
                  <div className="flex items-center gap-3 text-indigo-600">
                    <Sparkles className="w-5 h-5" />
                    <span className="text-xs font-black uppercase tracking-[0.2em]">Final Phase</span>
                  </div>
                  <h2 className="text-4xl font-black text-slate-900 tracking-tight">Writing Sample</h2>
                  <p className="text-slate-600 text-sm font-medium">Share your thoughts to help the AI analyze your patterns.</p>
                </div>

                <div className="space-y-6">
                  <div className="relative">
                    <textarea
                        name="journal_text"
                        value={formData.journal_text}
                        onChange={handleChange}
                        placeholder="Type or paste a personal journal entry or a description of your typical day..."
                        className="w-full h-56 bg-white border border-slate-300 rounded-[2rem] p-8 text-slate-900 outline-none focus:border-cyan-400/70 transition-all resize-none leading-relaxed placeholder:text-slate-500"
                    />
                    <div className="absolute bottom-6 right-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        {formData.journal_text.length} Characters
                    </div>
                  </div>
                  
                  <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100 flex gap-4 shadow-[0_24px_80px_-50px_rgba(0,0,0,0.05)]">
                    <div className="p-3 bg-indigo-50/50 rounded-2xl h-fit">
                        <Activity className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                        <p className="text-slate-600 text-xs leading-relaxed font-semibold">
                            The GENAI model is reading your text signal to strengthen the attention and stress inference pathways.
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
                className="flex items-center gap-2 text-indigo-600 font-black uppercase tracking-widest text-xs hover:text-cyan-800 transition-colors"
                disabled={loading}
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            ) : <div />}

            {step < 4 ? (
              <motion.button
                onClick={nextStep}
                className="group flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-600/30 transition-all transform active:scale-95"
                whileHover={{ y: -1, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                Next Step <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            ) : (
              <motion.button
                onClick={handleSubmit}
                disabled={loading}
                className={`flex items-center gap-3 bg-indigo-600 text-white px-12 py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl transition-all transform active:scale-95 ${loading ? 'opacity-50 cursor-wait' : 'hover:bg-indigo-700'}`}
                whileHover={loading ? {} : { y: -1, scale: 1.01 }}
                whileTap={loading ? {} : { scale: 0.98 }}
              >
                {loading ? 'Synthesizing...' : <><Save className="w-4 h-4" /> Run Diagnosis</>}
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const InputGroup = ({ label, ...props }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] ml-2">{label}</label>
    <input 
      {...props} 
      className="w-full bg-white border border-slate-300 rounded-2xl px-6 py-4 text-slate-900 outline-none focus:border-cyan-400/80 transition-all font-bold placeholder:text-slate-500" 
    />
  </div>
);

const SelectGroup = ({ label, options, ...props }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] ml-2">{label}</label>
    <div className="relative">
        <select 
            {...props} 
            className="w-full appearance-none bg-white border border-slate-300 rounded-2xl px-6 py-4 text-slate-900 outline-none focus:border-cyan-400/80 transition-all font-bold cursor-pointer"
        >
            {options.map(o => <option key={o} value={o} className="bg-white text-slate-900">{o}</option>)}
        </select>
        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
            <ArrowRight className="w-4 h-4 rotate-90" />
        </div>
    </div>
  </div>
);

const SliderGroup = ({ label, description, name, value, onChange, delay = 0 }) => {
  const progress = Math.max(0, Math.min(100, ((value - 1) / 9) * 100));
  const bubbleLeft = Math.max(5, Math.min(95, progress));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
      className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 hover:border-indigo-100 transition-colors"
    >
      <div className="flex justify-between items-end px-1">
        <div className="space-y-1">
          <h4 className="font-black text-slate-900 text-lg tracking-tight">{label}</h4>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{description}</p>
        </div>
        <motion.div
          key={`${name}-${value}`}
          initial={{ scale: 0.86, opacity: 0.55 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.22 }}
          className="text-indigo-600 font-black text-xl tabular-nums"
        >
          {value.toFixed(1)}
        </motion.div>
      </div>
      <div className="relative pt-4">
        <div className="relative h-2.5 rounded-full bg-slate-200 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-amber-700 via-blue-500 to-indigo-500"
            animate={{ width: `${progress}%` }}
            transition={{ type: 'spring', stiffness: 230, damping: 30, mass: 0.9 }}
          />
        </div>
        <motion.div
          className="absolute -top-0.5 text-[9px] font-black text-slate-900 bg-fuchsia-500 px-2 py-1 rounded-full shadow-sm pointer-events-none"
          animate={{ left: `calc(${bubbleLeft}% - 16px)` }}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        >
          {value.toFixed(1)}
        </motion.div>
        <input
          type="range"
          min="1"
          max="10"
          step="0.5"
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          className="adhd-slider absolute inset-0 w-full h-2.5 bg-transparent appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] mt-4">
          <span>Minimum</span>
          <span>Maximum</span>
        </div>
      </div>
    </motion.div>
  );
};

export default AssessmentPage;
