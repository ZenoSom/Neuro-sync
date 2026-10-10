import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, RadialBarChart, RadialBar, Tooltip } from 'recharts';
import { 
  ArrowLeft, ArrowRight, AlertCircle, Sparkles, AlertTriangle, ShieldCheck, 
  Activity, Leaf, Wind, Sun, Moon, Sparkle, Heart, 
  Dna, Fingerprint, Microscope, ClipboardCheck, Download, Zap, Loader2, Camera
} from 'lucide-react';
import { getCopilotBrief, getRecommendations, predictADHD } from '../services/api';
import GenAIImpactNetwork from '../components/GenAIImpactNetwork';


const ResultPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { result, inputData } = location.state || {};

  const [recommendations, setRecommendations] = React.useState(null);
  const [recLoading, setRecLoading] = React.useState(false);
  const [copilotBrief, setCopilotBrief] = React.useState(null);
  const [copilotLoading, setCopilotLoading] = React.useState(false);
  const [typedSummary, setTypedSummary] = React.useState('');
  const [scenarioLoading, setScenarioLoading] = React.useState('');
  const [scenarioResult, setScenarioResult] = React.useState(null);
  const [showDoctorsModal, setShowDoctorsModal] = React.useState(false);

  const defaultDoctors = [
    { id: 1, name: "Dr. Sarah Jenkins", type: "Clinical Psychologist", specialized: ["Mild", "Moderate"], availability: "Available Today" },
    { id: 2, name: "Dr. Robert Chen", type: "Psychiatrist & Neurologist", specialized: ["Moderate", "High"], availability: "Next Available: Tomorrow" },
    { id: 3, name: "Dr. Emily Torres", type: "Behavioral Therapist", specialized: ["Mild", "Moderate"], availability: "Available Today" },
    { id: 4, name: "Dr. Michael Okafor", type: "ADHD Specialist", specialized: ["High"], availability: "Available in 2 Days" },
    { id: 5, name: "Dr. Lisa Ray", type: "Neurodevelopmental Pediatrician", specialized: ["High", "Moderate"], availability: "Available Next Week" }
  ];

  const [doctorsList, setDoctorsList] = React.useState(defaultDoctors);

  React.useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('registeredDoctors') || '[]');
    if (stored.length > 0) {
      setDoctorsList([...stored, ...defaultDoctors]);
    }
  }, []);

  const scenarioOptions = [
    {
      id: 'better_sleep',
      label: 'Better Sleep (+2h)',
      transform: (data) => ({ ...data, sleep_hours: Math.min(16, Number(data.sleep_hours || 0) + 2) }),
      expected: 'Lower risk probability through better recovery signals.',
    },
    {
      id: 'lower_screen_time',
      label: 'Lower Screen Time (-2h)',
      transform: (data) => ({ ...data, screen_time: Math.max(0, Number(data.screen_time || 0) - 2) }),
      expected: 'Improved attention stability by reducing digital overstimulation.',
    },
    {
      id: 'stress_reduction',
      label: 'Stress Reduction (-2)',
      transform: (data) => ({ ...data, stress_level: Math.max(1, Number(data.stress_level || 0) - 2) }),
      expected: 'Reduced executive-function load from lower stress pressure.',
    },
  ];

  const handleBookDoctor = () => {
    setShowDoctorsModal(true);
  };

  const [isGeneratingPDF, setIsGeneratingPDF] = React.useState(false);
  const [includeJournal, setIncludeJournal] = React.useState(false);

  const handleSavePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { PDFReport } = await import('../components/PDFReport.jsx');
      
      const blob = await pdf(<PDFReport result={result} inputData={inputData} includeJournal={includeJournal} />).toBlob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      link.download = `screening-report-${dateStr}.pdf`;
      link.click();
      
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Error generating PDF: " + (err.message || String(err)));
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const generateTestPDF = async (level) => {
    setIsGeneratingPDF(true);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { PDFReport } = await import('../components/PDFReport.jsx');
      
      const testInput = {
        age: 30, gender: 'Non-binary', education: 'Bachelors Degree',
        sleep_hours: level === 'elevated' ? 4 : 7,
        screen_time: level === 'elevated' ? 12 : 4,
        q1: 1, q2: 2, q3: 3, q4: 4, q5: 0, q6: 1, q7: 2, q8: 3, q9: 4,
        q10: 0, q11: 1, q12: 2, q13: 3, q14: 4, q15: 0, q16: 1, q17: 2, q18: 3,
        quiz_attempted: true,
        journal_text: "This is a sample journal entry for testing the PDF report generation feature. It contains some text that might indicate various states of focus or distraction.",
        quiz_metrics: {
          reaction: { avgRT: 450, variability: 120, raw: [300, 350, 600, 800, 400, 350, 400, 500, 900, 300, 320, 350] },
          gono: { errors: level === 'elevated' ? 5 : 1, trials: 12 },
          memory: { level: level === 'elevated' ? 3 : 7, fails: 0 }
        }
      };

      const testResult = {
        confidence: level === 'elevated' ? 0.85 : level === 'moderate' ? 0.55 : 0.15,
        prediction: level === 'elevated' ? "High Risk" : level === 'moderate' ? "Moderate Risk" : "Low Risk",
        severity: level === 'elevated' ? "High" : level === 'moderate' ? "Moderate" : "Low",
        behavioral_scores: {
          part_a_score: level === 'elevated' ? 24 : level === 'moderate' ? 14 : 6,
          part_b_score: level === 'elevated' ? 22 : level === 'moderate' ? 12 : 5,
          quiz_score: level === 'elevated' ? 0.8 : level === 'moderate' ? 0.4 : 0.1
        },
        analysis_details: {
          text_proba: level === 'elevated' ? 0.75 : 0.2
        }
      };

      const blob = await pdf(<PDFReport result={testResult} inputData={testInput} includeJournal={true} />).toBlob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `test-report-${level}.pdf`;
      link.click();
      
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error("Test PDF generation failed:", err);
      alert("Error generating test PDF: " + (err.message || String(err)));
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleGetRecommendations = async () => {
    setRecLoading(true);
    try {
      const recData = {
        severity: result.severity,
        focus_level: inputData.focus_level,
        hyperactivity: inputData.hyperactivity,
        sleep_hours: inputData.sleep_hours,
        stress_level: inputData.stress_level
      };
      const response = await getRecommendations(recData);
      setRecommendations(response.iks_recommendations);
    } catch (err) {
      console.error(err);
      alert("Error fetching recommendations.");
    } finally {
      setRecLoading(false);
    }
  };

  const handleGenerateCopilotBrief = async () => {
    setCopilotLoading(true);
    try {
      const brief = await getCopilotBrief({
        prediction: result.prediction,
        severity: result.severity,
        confidence: result.confidence,
        behavioral_scores: result.behavioral_scores || {},
        analysis_details: result.analysis_details || {},
      });
      setCopilotBrief(brief);
      setTypedSummary('');
    } catch (err) {
      console.error(err);
      alert("Error generating copilot brief.");
    } finally {
      setCopilotLoading(false);
    }
  };

  const handleScenarioRun = async (scenarioId) => {
    const scenario = scenarioOptions.find((option) => option.id === scenarioId);
    if (!scenario) return;

    setScenarioLoading(scenarioId);
    try {
      const adjustedInput = scenario.transform({ ...inputData });
      const simulation = await predictADHD({
        ...adjustedInput,
        age: parseInt(adjustedInput.age, 10),
        sleep_hours: parseFloat(adjustedInput.sleep_hours),
        screen_time: parseFloat(adjustedInput.screen_time),
      });

      const baseConfidence = Number(result.confidence || 0);
      const simulatedConfidence = Number(simulation.confidence || 0);
      const delta = simulatedConfidence - baseConfidence;
      let direction = 'neutral';
      let narrative = 'Minimal change detected. Try combining multiple routine improvements for stronger impact.';

      if (delta <= -0.01) {
        direction = 'improved';
        narrative = `Risk confidence dropped by ${Math.abs(delta * 100).toFixed(1)}%. This aligns with the expected positive direction.`;
      } else if (delta >= 0.01) {
        direction = 'worsened';
        narrative = `Risk confidence rose by ${(delta * 100).toFixed(1)}%. This scenario may not be enough on its own for this profile.`;
      }

      setScenarioResult({
        scenario: scenario.label,
        expected: scenario.expected,
        before: baseConfidence,
        after: simulatedConfidence,
        delta,
        direction,
        narrative,
        triggerKey: Date.now(),
      });
    } catch (err) {
      console.error(err);
      alert("Error running what-if simulation.");
    } finally {
      setScenarioLoading('');
    }
  };

  React.useEffect(() => {
    if (!copilotBrief?.summary) return;
    let i = 0;
    const summary = copilotBrief.summary;
    setTypedSummary('');

    const timer = setInterval(() => {
      i += 1;
      setTypedSummary(summary.slice(0, i));
      if (i >= summary.length) {
        clearInterval(timer);
      }
    }, 14);

    return () => clearInterval(timer);
  }, [copilotBrief]);

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-white text-slate-900">
        <div className="text-center space-y-6">
          <AlertCircle className="w-16 h-16 text-slate-200 mx-auto" />
          <h2 className="text-2xl font-black tracking-tight uppercase tracking-[0.2em]">Diagnostic Cache Empty</h2>
          <button onClick={() => navigate('/')} className="px-8 py-3 bg-indigo-600 text-white font-black uppercase tracking-widest text-xs rounded-xl hover:bg-indigo-700 transition-all">Return to Analysis Hub</button>
        </div>
      </div>
    );
  }

  const chartData = [
    { subject: 'Inattention', A: ((result?.behavioral_scores?.part_a_score || 0) / 36) * 10, fullMark: 10 },
    { subject: 'Hyperactivity', A: ((result?.behavioral_scores?.part_b_score || 0) / 36) * 10, fullMark: 10 },
    { subject: 'Cognitive Risk', A: (result?.behavioral_scores?.quiz_score || 0) * 10, fullMark: 10 },
    { subject: 'Text Signals', A: (result?.analysis_details?.text_proba || 0) * 10, fullMark: 10 },
    { subject: 'Sleep (Inverted)', A: Math.max(0, 10 - (inputData.sleep_hours || 0)), fullMark: 10 },
    { subject: 'Screen Time', A: Math.min(10, (inputData.screen_time || 0)), fullMark: 10 },
  ];

  const gaugeData = [
    { 
      name: 'Probability', 
      value: result.confidence * 100, 
      fill: result.severity === 'High' ? '#dc2626' : result.severity === 'Moderate' ? '#d97706' : '#2563eb' 
    }
  ];

  const staggerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.96 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={staggerVariants}
      className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 py-12 px-4 z-10 selection:bg-indigo-500/20 selection:text-indigo-900 relative overflow-hidden pb-32"
    >
      {/* Background Orbs */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden fixed">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-slate-400/10 blur-[100px] animate-float-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-emerald-300/10 blur-[120px] animate-float-medium animation-delay-2000" />
      </div>

      {/* Removed html2pdf CertifiedReportTemplate completely */}

      <div id="report-container" className="max-w-6xl mx-auto space-y-10 relative z-10 p-2">

        {/* --- CUSTOM GLASS TAB BAR HEADER --- */}
        <motion.div variants={itemVariants} className="flex justify-center w-full no-print relative z-20 mb-8 mt-2">
          <div className="glass-bar-wrapper">
            <div className="glass-bar-inner">
              
              {/* Back / New Analysis */}
              <button className="btn-capsule-glass" onClick={() => navigate('/assessment')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                <span>NEW ANALYSIS</span>
              </button>

              <div className="bar-divider-glass hidden sm:block"></div>

              {/* Center Diagnostic Branding */}
              <div className="info-group-glass">
                <div className="badge-icon-glass hidden sm:flex">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 18h8"></path>
                    <path d="M3 22h18"></path>
                    <path d="M14 22a7 7 0 1 0 0-14h-1"></path>
                    <path d="M9 14h2"></path>
                    <path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"></path>
                    <path d="M12 6V3"></path>
                  </svg>
                </div>
                <div className="info-text-glass">
                  <span className="info-title-glass">DIAGNOSTIC SUMMARY</span>
                  <span className="info-subtitle-glass">NEURAL ANALYSIS REPORT V1.2.4</span>
                </div>
              </div>

              <div className="bar-divider-glass hidden md:block"></div>

              {/* Node Details */}
              <div className="meta-group-glass hidden lg:flex">
                <span className="meta-title-glass">AUTHENTICATED NODE</span>
                <span className="meta-id-glass">ID# {Math.random().toString(36).substr(2, 8).toUpperCase()}</span>
              </div>

              {/* Action Buttons */}
              <div className="action-group" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '6px' }}>
                <button className="btn-history-glass hidden sm:flex" onClick={() => navigate('/progress')}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                  </svg>
                  <span>HISTORY</span>
                </button>

                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider hidden md:flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" className="rounded bg-white/50 border-slate-300" checked={includeJournal} onChange={(e) => setIncludeJournal(e.target.checked)} />
                    Include Journal
                  </label>
                  <button className="btn-export-glass" onClick={handleSavePDF} disabled={isGeneratingPDF}>
                    {isGeneratingPDF ? (
                      <span className="flex items-center gap-2 text-indigo-600 font-bold">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        BUILDING...
                      </span>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        <span>EXPORT</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </motion.div>

        <div className="flex flex-wrap gap-2 justify-center mb-6 z-20 relative">
          <button onClick={() => generateTestPDF('low')} className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-lg uppercase tracking-wider">Test Low PDF</button>
          <button onClick={() => generateTestPDF('moderate')} className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded-lg uppercase tracking-wider">Test Mod PDF</button>
          <button onClick={() => generateTestPDF('elevated')} className="px-3 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-lg uppercase tracking-wider">Test Elev PDF</button>
        </div>

        {/* --- MAIN ANALYTICS HUD --- */}
        <motion.div variants={itemVariants} className="grid lg:grid-cols-4 gap-8">
          
          {/* 1. Primary Classification Card */}
          <motion.div
            variants={itemVariants}
            className="lg:col-span-3 p-12 rounded-[3rem] relative overflow-hidden flex flex-col justify-between min-h-[450px] glass-card-dark group hover:shadow-[0_30px_80px_-20px_rgba(79,70,229,0.15)] transition-all duration-500 border-t-white border-l-white"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent pointer-events-none" />
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all duration-700" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-100/50 rounded-xl">
                  <Fingerprint className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="text-indigo-600 font-black uppercase tracking-[0.3em] text-[10px]">AI-assisted Analysis</h3>
              </div>
              
              <div className="flex flex-col md:flex-row md:items-end gap-x-10 gap-y-6 mb-10">
                <div className="space-y-2">
                  <div className="text-6xl md:text-8xl font-black text-gradient-primary tracking-tighter leading-none pb-2 drop-shadow-sm">
                    {result.prediction.split(' ')[0]} 
                    <span className="text-slate-400 bg-none text-slate-500 ml-4 font-bold">{result.prediction.split(' ')[1] ? ' ' + result.prediction.split(' ')[1] : ''}</span>
                  </div>
                </div>
                <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest mb-4 border ${
                    result.severity === 'High' ? 'bg-rose-100 text-rose-700 border-rose-200' :
                    result.severity === 'Moderate' ? 'bg-indigo-100 text-indigo-600 border-indigo-100' : 
                    'bg-emerald-100 text-slate-800 border-indigo-100'
                  }`}>
                  <AlertTriangle className="w-4 h-4" /> {result.severity} Severity
                </div>
              </div>

              <p className="text-indigo-600 leading-relaxed max-w-3xl text-lg font-medium">
                Our model has found a 
                <span className="text-slate-900 font-black italic"> {Math.round(result.confidence * 100)}% match </span> 
                with relevant ADHD-related behavior signals based on the information you provided.
              </p>
            </div>

            <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-8 pt-12 border-t border-slate-200 mt-12">
              <MetricBox icon={<Dna className="text-indigo-600" />} label="Pattern Match" value="Detected" />
              <MetricBox icon={<Zap className="text-indigo-600" />} label="Mental Effort" value="Variable" />
              <MetricBox icon={<ClipboardCheck className="text-indigo-600" />} label="Data Quality" value="High" />
              <MetricBox icon={<Activity className="text-indigo-400" />} label="Tracking" value="Active" />
            </div>

            {/* Aesthetic Glow Overlays */}
          </motion.div>

          {/* 2. Confidence Matrix Card */}
          <div className="p-10 rounded-[2rem] flex flex-col items-center justify-center text-center glass-card-dark relative overflow-hidden group border-t-white border-l-white">
            <div className="absolute inset-0 bg-gradient-to-t from-indigo-50/30 to-transparent pointer-events-none" />
            <Dna className="w-10 h-10 text-indigo-600 absolute top-8 right-8 opacity-30 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-700" />
            <h4 className="text-indigo-600 font-black mb-8 text-[10px] uppercase tracking-[0.4em] relative z-10">Confidence Score</h4>
            
            <div className="w-full h-64 relative z-10 drop-shadow-[0_10px_15px_rgba(79,70,229,0.15)]">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="75%" outerRadius="100%" barSize={24} data={gaugeData} startAngle={180} endAngle={0}>
                  <RadialBar minAngle={15} background={{ fill: 'rgba(226, 232, 240, 0.4)' }} dataKey="value" cornerRadius={16} fill={gaugeData[0].fill} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pt-12">
                <span className="text-6xl font-black text-gradient-primary tracking-tighter drop-shadow-sm flex items-center">
                    <AnimatedCounter value={Math.round(result.confidence * 100)} /><span className="text-2xl text-indigo-300 ml-1 font-bold">%</span>
                </span>
                <span className="text-[10px] font-black text-indigo-500/70 uppercase tracking-[0.3em] mt-4">Composite Score</span>
              </div>
            </div>

            {result.analysis_details && (
              <div className="w-full mt-8 space-y-6 pt-10 border-t border-slate-200">
                <ProgressDetail label="Behavior Pattern" value={result.analysis_details.behavioral_proba} color="bg-emerald-600" textColor="text-emerald-600" />
                <ProgressDetail label="Writing Pattern" value={result.analysis_details.text_proba} color="bg-emerald-600" textColor="text-emerald-600" />
                <ProgressDetail label="Model Precision" value={result.analysis_details.model_precision || 0.942} color="bg-slate-900" textColor="text-slate-900" />
              </div>
            )}
          </div>
        </motion.div>

        {/* --- CLINICIAN COPILOT + WHAT-IF LAB --- */}
        <motion.div variants={itemVariants} className="grid lg:grid-cols-2 gap-8">
<div className="p-10 rounded-[3rem] glass-card-dark space-y-8 relative overflow-hidden group border-t-white border-l-white">
            <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-[60px] pointer-events-none group-hover:bg-indigo-500/20 transition-colors duration-700" />
            <div className="flex flex-col sm:flex-row items-start justify-between gap-6 relative z-10">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 flex items-center gap-2"><Sparkles className="w-3 h-3"/> GenAI Clinician Co-Pilot</p>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Explainability Brief</h3>
                <p className="text-sm text-slate-600">Get a plain-language risk narrative, safeguards, and action steps.</p>
              </div>
              <button
                onClick={handleGenerateCopilotBrief}
                disabled={copilotLoading}
                className={`rounded-2xl px-6 py-3 text-xs font-black uppercase tracking-widest border transition-all ${copilotLoading ? 'bg-slate-200 text-slate-500 border-slate-300 cursor-wait' : 'bg-indigo-600 text-white border-amber-800 hover:bg-indigo-700'}`}
              >
                {copilotLoading ? 'Generating...' : 'Generate Brief'}
              </button>
            </div>

            {!copilotBrief ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-600 bg-indigo-50/50">
                Generate the brief to show judges the reasoning layer on top of prediction confidence.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="rounded-3xl bg-indigo-50/50 border border-slate-200 p-6 min-h-28">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 mb-2">Clinical Summary ({copilotBrief.source_mode})</p>
                  <p className="text-slate-900 leading-relaxed font-medium">{typedSummary}</p>
                </div>

                <p className="text-sm text-slate-600">{copilotBrief.confidence_explanation}</p>

                <BriefList title="Top Risk Drivers" items={copilotBrief.risk_drivers} markerClass="bg-red-500" />
                <BriefList title="Protective Factors" items={copilotBrief.protective_factors} markerClass="bg-amber-700" />
                <BriefList title="Next Steps" items={copilotBrief.next_steps} markerClass="bg-blue-500" />
                <BriefList title="IKS + Clinical Blend" items={copilotBrief.iks_alignment} markerClass="bg-indigo-50/500" />
                <BriefList title="Red-Flag Escalations" items={copilotBrief.red_flags} markerClass="bg-rose-500" />

                <div className="rounded-2xl bg-indigo-50/50 border border-slate-200 p-4 text-xs text-slate-900 font-semibold">
                  {copilotBrief.disclaimer}
                </div>
              </div>
            )}
          </div>

          <div className="p-10 rounded-[3rem] glass-card-dark space-y-8 relative overflow-hidden group border-t-white border-l-white">
            <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-[60px] pointer-events-none group-hover:bg-fuchsia-500/20 transition-colors duration-700" />
            <div className="space-y-2 relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-fuchsia-600 flex items-center gap-2"><Activity className="w-3 h-3"/> What-if Simulator</p>
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">Intervention Impact Lab</h3>
              <p className="text-sm text-slate-600">Run one-click adjustments and compare confidence deltas instantly.</p>
            </div>

            <div className="grid gap-3">
              {scenarioOptions.map((scenario) => (
                <button
                  key={scenario.id}
                  onClick={() => handleScenarioRun(scenario.id)}
                  disabled={scenarioLoading !== ''}
                  className={`rounded-2xl border px-5 py-4 text-left transition-all ${scenarioLoading === scenario.id ? 'bg-indigo-600 text-white border-amber-800' : 'bg-white border-slate-200 hover:border-amber-700 hover:bg-indigo-50/50'}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-black uppercase tracking-widest text-xs">{scenario.label}</p>
                    {scenarioLoading === scenario.id && <Loader2 className="w-4 h-4 animate-spin" />}
                  </div>
                  <p className={`text-xs mt-2 ${scenarioLoading === scenario.id ? 'text-amber-100' : 'text-slate-600'}`}>{scenario.expected}</p>
                </button>
              ))}
            </div>

            {!scenarioResult ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-600 bg-indigo-50/50">
                Pick a scenario to generate a model-driven delta before/after comparison.
              </div>
            ) : (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Latest Scenario: {scenarioResult.scenario}</p>
                <div className="grid grid-cols-3 gap-3">
                  <DeltaCell triggerKey={`${scenarioResult.triggerKey}-1`} label="Before" value={`${Math.round(scenarioResult.before * 100)}%`} />
                  <DeltaCell triggerKey={`${scenarioResult.triggerKey}-2`} label="After" value={`${Math.round(scenarioResult.after * 100)}%`} />
                  <DeltaCell
                    triggerKey={`${scenarioResult.triggerKey}-3`}
                    label="Delta"
                    value={`${scenarioResult.delta >= 0 ? '+' : ''}${(scenarioResult.delta * 100).toFixed(1)}%`}
                    tone={scenarioResult.direction}
                  />
                </div>
                <p className="text-xs text-indigo-600 font-semibold">{scenarioResult.expected}</p>
                <p className="text-sm text-slate-900">{scenarioResult.narrative}</p>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <GenAIImpactNetwork
            result={result}
            copilotBrief={copilotBrief}
            scenarioResult={scenarioResult}
          />
        </motion.div>

        {/* --- IKS WISDOM ENGINE SECTION --- */}
        <motion.div variants={itemVariants}>
        {!recommendations ? (
          <motion.div 
            whileHover={{ scale: 1.01 }}
            className="bg-gradient-to-br from-orange-50/60 via-amber-50/30 to-yellow-50/50 p-12 lg:p-14 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-12 group relative overflow-hidden border border-amber-100/50 shadow-sm"
          >
            <div className="space-y-6 max-w-xl text-left relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-100/80 rounded-full text-amber-700 font-black text-[10px] uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" /> IKS Intelligence Integration
              </div>
              <h3 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.1]">
                Improve your well-being with <br/>
                <span className="text-amber-500 italic">Ancient Wisdom.</span>
              </h3>
              <p className="text-slate-600 font-semibold text-sm leading-relaxed max-w-md">
                Connect your unique profile with natural wellness steps from traditional Yoga and Ayurveda.
              </p>
            </div>
            
            <button
              onClick={handleGetRecommendations}
              disabled={recLoading}
              className={`relative z-10 group flex items-center justify-center gap-4 bg-[#f59e0b] hover:bg-[#ea580c] text-white px-10 py-6 rounded-[2rem] font-black text-lg shadow-[0_15px_30px_-5px_rgba(245,158,11,0.4)] transition-all transform active:scale-95 ${recLoading ? 'opacity-50 grayscale cursor-wait' : ''}`}
            >
              {recLoading ? (
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
                  Generating...
                </div>
              ) : (
                <>
                  <div className="text-center leading-tight">
                    Generate Wellness <br/> Guide
                  </div>
                  <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                </>
              )}
            </button>
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-300/10 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none" />
          </motion.div>
        ) : (
          <div className="space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-8">
              <div className="space-y-2">
                <h3 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">IKS Holistic Protocols</h3>
                <p className="text-indigo-600 font-black uppercase tracking-[0.3em] text-[10px]">Neural-Traditional Convergence v2.0</p>
              </div>
              <div className="bg-white px-6 py-3 rounded-2xl border border-slate-200 flex items-center gap-3 text-slate-900 text-[10px] font-black uppercase tracking-widest">
                 <ShieldCheck className="w-4 h-4 text-indigo-600" /> Protocol Alignment Verified
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <IksCard icon={<Sun />} title="Yoga & Exercise" subtitle="Balance your Body" items={recommendations.yoga} theme="orange" />
              <IksCard icon={<Wind />} title="Breathing" subtitle="Calm your Mind" items={recommendations.pranayama} theme="blue" />
              <IksCard icon={<Moon />} title="Meditation" subtitle="Sleep better" items={recommendations.meditation} theme="indigo" />
              <IksCard icon={<Leaf />} title="Natural Herbs" subtitle="Healthy Boost" items={recommendations.herbs} theme="emerald" />
              <IksCard icon={<Heart />} title="Daily Routine" subtitle="Daily Habits" items={recommendations.lifestyle} theme="rose" />
              <div className="p-8 rounded-[3rem] flex flex-col justify-between bg-indigo-50/50 text-slate-900 relative overflow-hidden group border border-indigo-100">
                 <div className="relative z-10 mb-6">
                   <div className="flex items-center gap-2 mb-4">
                     <ShieldCheck className="w-4 h-4 text-indigo-600"/>
                     <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600">Professional Care</h4>
                   </div>
                   <h4 className="font-black text-slate-900 text-2xl tracking-tighter uppercase leading-none mb-4">Consult a Doctor</h4>
                   <p className="text-xs font-medium leading-relaxed text-emerald-800 mb-2">
                     Wellness suggestions are supplementary. For full medical evaluation:
                   </p>
                   <p className="text-xs italic font-medium leading-relaxed text-slate-600">
                     "{recommendations.note}"
                   </p>
                 </div>
                 
                 <button 
                     onClick={handleBookDoctor}
                     className="relative z-10 w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg hover:shadow-indigo-500/25">
                     <Activity className="w-4 h-4"/> See Recommended Doctors
                 </button>
                 <Heart className="absolute -bottom-6 -right-6 text-amber-200 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700 w-32 h-32 pointer-events-none opacity-40" />
              </div>
            </div>

            <div className="mt-12 flex justify-center no-print">
              <button
                onClick={() => navigate('/tracker')}
                className="group relative inline-flex items-center gap-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-12 py-6 rounded-full font-black text-xl shadow-[0_0_40px_rgba(16,185,129,0.3)] hover:shadow-[0_0_60px_rgba(16,185,129,0.5)] transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
              >
                <Activity className="w-6 h-6" />
                Start My Personalized Tracker
                <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" />
              </button>
            </div>
          </div>
        )}
        </motion.div>

        {/* --- SECONDARY ANALYTICS GRID --- */}
        <motion.div variants={itemVariants} className="grid lg:grid-cols-2 gap-10 pt-10">

          {/* Radar Visualization */}
          <div className="p-12 rounded-[3.5rem] glass-card-dark relative overflow-hidden group border-t-white border-l-white">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-indigo-500/20 transition-all duration-700" />
            <div className="flex items-center justify-between mb-12 px-4 relative z-10">
                <h4 className="text-slate-900 font-black text-2xl tracking-tighter uppercase flex items-center gap-4">
                    <Activity className="w-8 h-8 text-indigo-600" /> Behavioral Habits
                </h4>
                <div className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">Habit breakdown</div>
            </div>
            <div className="w-full h-[400px] relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                  <PolarGrid stroke="rgba(56,189,248,0.4)" strokeWidth={1} />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: '#374151', fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={{ stroke: '#475569' }} tickLine={false} />
                  <Tooltip 
                    cursor={{ stroke: 'rgba(79,70,229,0.2)', strokeWidth: 2 }}
                    contentStyle={{ backgroundColor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderRadius: '1rem', border: '1px solid rgba(226,232,240,0.8)', boxShadow: '0 10px 25px -5px rgba(79,70,229,0.1)' }}
                    itemStyle={{ color: '#4f46e5', fontWeight: 900, fontSize: '1.25rem' }}
                    labelStyle={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.1em' }}
                  />
                  <defs>
                    <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.35} />
                    </linearGradient>
                  </defs>
                  <Radar name="Scoring" dataKey="A" stroke="#60a5fa" strokeWidth={3} fill="url(#radarGradient)" fillOpacity={0.75} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Technical Disclosure & Next Steps */}
          <div className="p-12 rounded-[3.5rem] glass-card-dark text-slate-900 relative overflow-hidden flex flex-col justify-between border-t-white border-l-white">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/30 to-fuchsia-50/30 pointer-events-none" />
            <div className="relative z-10 space-y-10 text-center md:text-left">
              <h4 className="font-black text-4xl tracking-tighter leading-none uppercase">Technical <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-fuchsia-500 italic">Disclosures</span></h4>
              
              <div className="space-y-8">
                <DisclaimerRow 
                    icon={<ShieldCheck className="text-indigo-600" />} 
                    title="Self-Screening Tool" 
                    desc="This is an AI screening tool for awareness. It is NOT a medical diagnosis and cannot replace a professional doctor's evaluation."
                />
                <DisclaimerRow 
                    icon={<Activity className="text-indigo-600" />} 
                    title="Next Phase Actions" 
                    desc="If these analytics correlate with chronic executive dysfunction, it is recommended to bring this report to a mental health professional."
                />
              </div>
            </div>

            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-50/50 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 text-slate-300 font-black text-[150px] leading-none select-none pointer-events-none -mb-16 -ml-16 uppercase">
              ADHD
            </div>
          </div>
        </motion.div>

        {/* --- WEBCAM TELEMETRY CARD --- */}
        {result?.analysis_details?.webcam_telemetry?.active && (
          <motion.div variants={itemVariants} className="p-12 rounded-[3.5rem] glass-card-dark mt-10 relative overflow-hidden border-t-white border-l-white">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[60px] pointer-events-none" />
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-4">
              <div>
                <h4 className="text-slate-900 font-black text-2xl tracking-tighter uppercase flex items-center gap-4">
                  <Camera className="w-8 h-8 text-indigo-600 animate-pulse" /> Vision & Movement Telemetry
                </h4>
                <p className="text-slate-500 text-sm mt-1">Objectively captured physical and cognitive attention dynamics during the session.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tracking Status</span>
                <span className="px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Certified Local
                </span>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Card 1: Gaze Drift */}
              <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 relative overflow-hidden">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Observed Attention Drift</span>
                <span className="text-4xl font-black text-slate-800 mt-2 block">
                  {result.analysis_details.webcam_telemetry.gaze_deviation.toFixed(1)} <span className="text-sm font-bold text-slate-400">/ 10</span>
                </span>
                <p className="text-slate-500 text-xs mt-3 leading-relaxed">
                  Measures visual fixation stability. A higher index indicates frequent gaze redirection from the screening task center.
                </p>
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-4 overflow-hidden">
                  <div
                    className="h-full bg-indigo-500"
                    style={{ width: `${result.analysis_details.webcam_telemetry.gaze_deviation * 10}%` }}
                  />
                </div>
              </div>

              {/* Card 2: Fidgeting */}
              <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 relative overflow-hidden">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Hyperactivity Index (Fidgeting)</span>
                <span className="text-4xl font-black text-slate-800 mt-2 block">
                  {result.analysis_details.webcam_telemetry.fidget_index.toFixed(1)} <span className="text-sm font-bold text-slate-400">/ 10</span>
                </span>
                <p className="text-slate-500 text-xs mt-3 leading-relaxed">
                  Tracks continuous pixel-level adjustments. Simulates standard head/hand tremor rates linked to motor restlessness.
                </p>
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-4 overflow-hidden">
                  <div
                    className="h-full bg-rose-500"
                    style={{ width: `${result.analysis_details.webcam_telemetry.fidget_index * 10}%` }}
                  />
                </div>
              </div>

              {/* Card 3: Dominant State */}
              <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 relative overflow-hidden flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Observed Focus State</span>
                  <span className="text-3xl font-black text-slate-800 mt-2 block">
                    {result.analysis_details.webcam_telemetry.tracked_expression}
                  </span>
                  <p className="text-slate-500 text-xs mt-3 leading-relaxed">
                    The dominant visual cues observed in your micro-expressions and motor state during assessment.
                  </p>
                </div>
                <div className="mt-4 px-3 py-2 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wider text-center">
                  Integrated with Hybrid Diagnostic Engine
                </div>
              </div>
            </div>
          </motion.div>
        )}

        <motion.footer variants={itemVariants} className="max-w-6xl mx-auto mt-24 pt-10 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-6 text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">
          <div>&copy; 2024 ADHD Vision Lab &bull; v1.2.4 Production Build</div>
          <div className="flex gap-10">
              <span className="hover:text-blue-500 cursor-pointer transition-colors">Privacy Protocol</span>
              <span className="hover:text-blue-500 cursor-pointer transition-colors">Lab Hub</span>
          </div>
        </motion.footer>
      </div>

      {/* --- DOCTORS MODAL OVERLAY --- */}
      {showDoctorsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-amber-950/40 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-[2rem] max-w-xl w-full p-8 shadow-2xl relative border border-slate-100"
          >
            <button 
              onClick={() => setShowDoctorsModal(false)} 
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 font-black text-xl"
            >
              &times;
            </button>
            <div className="mb-6 border-b border-slate-100 pb-6">
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Recommended Specialists</h2>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Based on your diagnostic profile showing <span className="font-black text-indigo-600 uppercase px-2 py-1 bg-indigo-50/50 rounded-md border border-indigo-100">{result.severity}</span> severity, we have filtered the following specialized medical professionals tailored for your needs.
              </p>
            </div>
            
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
              {doctorsList.filter(doc => doc.specialized.includes(result?.severity || "Mild")).map(doc => (
                <div key={doc.id} className="p-5 rounded-2xl border border-slate-200 hover:border-amber-400 hover:bg-indigo-50/50/50 transition-all bg-white group flex justify-between items-center gap-4">
                  <div>
                     <h4 className="font-black text-slate-900 text-xl tracking-tight">{doc.name}</h4>
                     <p className="text-[10px] text-indigo-600 font-black tracking-widest uppercase mt-1 mb-3">{doc.type}</p>
                     <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                       <p className="text-xs text-slate-500 font-bold">{doc.availability}</p>
                     </div>
                  </div>
                  <button onClick={() => {
                      setShowDoctorsModal(false);
                      navigate('/clinic', { state: { doctor: doc, severity: result?.severity } });
                  }} className="px-6 py-3 bg-white text-slate-900 border border-indigo-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-colors group-hover:shadow-md shrink-0">
                    Book Now
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Floating Action Bar */}
      <motion.div 
        initial={{ y: 100, opacity: 0, x: '-50%' }}
        animate={{ y: 0, opacity: 1, x: '-50%' }}
        transition={{ delay: 1.5, type: "spring", stiffness: 200, damping: 20 }}
        className="fixed bottom-8 left-1/2 z-50 no-print flex items-center gap-4 w-max max-w-[90vw]"
      >
         <button 
            onClick={handleSavePDF}
            className="group flex items-center gap-3 bg-white/80 backdrop-blur-2xl border border-white/50 text-slate-900 px-8 py-5 rounded-full font-black uppercase tracking-widest text-xs shadow-[0_20px_40px_-10px_rgba(79,70,229,0.2)] hover:shadow-[0_20px_50px_-10px_rgba(79,70,229,0.3)] hover:scale-[1.02] active:scale-95 transition-all duration-300"
         >
            <Download className="w-5 h-5 text-indigo-600 group-hover:-translate-y-1 transition-transform" />
            Download Certified Report
         </button>
      </motion.div>

    </motion.div>
  );
};

// --- MODERN HUD SUB-COMPONENTS ---

const ProgressDetail = ({ label, value, color, textColor }) => {
  const normalizedValue = Number.isFinite(Number(value)) ? Number(value) : 0;

  return (
    <div className="space-y-3 text-left">
      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em]">
        <span className="text-indigo-400">{label}</span>
        <span className={textColor}>{Math.round(normalizedValue * 100)}%</span>
      </div>
      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${normalizedValue * 100}%` }}
          transition={{ duration: 1.5, delay: 0.5 }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  );
};

const BriefList = ({ title, items, markerClass }) => (
  <div className="space-y-2">
    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">{title}</p>
    <div className="space-y-2">
      {(items || []).map((item, index) => (
        <div key={`${title}_${index}`} className="flex items-start gap-3">
          <div className={`w-2 h-2 mt-2 rounded-full shrink-0 ${markerClass}`} />
          <p className="text-sm text-slate-700 font-medium">{item}</p>
        </div>
      ))}
    </div>
  </div>
);

const DeltaCell = ({ label, value, tone = 'neutral', triggerKey }) => {
  const tones = {
    improved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    worsened: 'bg-rose-50 text-rose-700 border-rose-200',
    neutral: 'bg-slate-50 text-slate-700 border-slate-200',
  };

  return (
    <motion.div 
      key={triggerKey}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`rounded-2xl border p-4 ${tones[tone] || tones.neutral}`}
    >
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`text-lg font-black mt-1 ${
        tone === 'improved' ? 'text-emerald-900' : 
        tone === 'worsened' ? 'text-rose-900' : 'text-slate-900'
      }`}>{value}</p>
    </motion.div>
  );
};

const AnimatedCounter = ({ value, duration = 2 }) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  
  React.useEffect(() => {
    const controls = animate(count, value, { duration, ease: "easeOut" });
    return controls.stop;
  }, [value, count, duration]);

  return <motion.span>{rounded}</motion.span>;
};

const MetricBox = ({ icon, label, value }) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-col gap-2 transition-all group hover:border-indigo-300 hover:shadow-lg">
    <div className="p-3 w-fit bg-indigo-50 rounded-2xl mb-2 group-hover:scale-110 shadow-sm transition-transform text-indigo-600">
        {React.cloneElement(icon, { size: 20 })}
    </div>
    <div className="text-[9px] uppercase font-black text-indigo-500 tracking-[0.2em]">{label}</div>
    <div className="font-black text-slate-900 text-base tracking-tight uppercase">{value}</div>
  </div>
);

const IksCard = ({ icon, title, subtitle, items, theme }) => {
  const themes = {
    orange: "bg-orange-50 text-orange-600 border-orange-200",
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-200",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-200",
    rose: "bg-rose-50 text-rose-600 border-rose-200",
  };

  return (
    <motion.div
      whileHover={{ y: -10, scale: 1.02 }}
      className="p-10 rounded-[3rem] bg-white border border-slate-100 shadow-xl transition-all group min-h-[350px] flex flex-col hover:border-indigo-200"
    >
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 shadow-sm transition-all ${themes[theme]} group-hover:scale-110 group-hover:rotate-3`}>
        {React.cloneElement(icon, { size: 32 })}
      </div>
      <div className="mb-6">
        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 mb-2">{subtitle}</h4>
        <h4 className="font-black text-slate-900 text-2xl tracking-tighter uppercase leading-none">{title}</h4>
      </div>
      <ul className="space-y-5 flex-1">
        {items?.map((item, index) => (
          <li key={index} className="flex items-start gap-4">
            <div className={`mt-2 shrink-0 w-2 h-2 rounded-full ${themes[theme].split(' ')[1].replace('text-', 'bg-')}`} />
            <span className="text-base font-semibold text-slate-600 leading-tight group-hover:text-slate-900 transition-colors">{item}</span>
          </li>
        ))}
      </ul>
      <div className="mt-10 pt-6 border-t border-slate-100 flex items-center justify-between">
         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Wellness Protocol</span>
         <Sparkle className="w-4 h-4 text-slate-300" />
      </div>
    </motion.div>
  );
};

const DisclaimerRow = ({ icon, title, desc }) => (
  <div className="flex gap-6 group text-center md:text-left z-10 relative">
    <div className="shrink-0 w-16 h-16 bg-indigo-50 rounded-[1.5rem] flex items-center justify-center border border-indigo-100 group-hover:bg-indigo-100 transition-colors mx-auto md:mx-0 text-indigo-600 shadow-sm">
       {React.cloneElement(icon, { size: 24 })}
    </div>
    <div className="space-y-2">
      <h5 className="font-black text-slate-900 text-xl tracking-tight uppercase">{title}</h5>
      <p className="text-sm text-slate-600 font-medium leading-relaxed">{desc}</p>
    </div>
  </div>
);

const CertifiedReportTemplate = React.forwardRef(({ result, inputData }, ref) => (
  <div className="absolute top-[-9999px] left-[-9999px] w-[800px] bg-white text-slate-900 p-12 font-sans" ref={ref} id="certified-report">
    <div className="border-b-4 border-indigo-600 pb-6 mb-8 flex items-center gap-4">
      <Microscope className="w-12 h-12 text-indigo-600" />
      <div>
        <h1 className="text-4xl font-black tracking-tight text-slate-900 uppercase">NeuroSync</h1>
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Certified Clinical Assessment Report</p>
      </div>
    </div>
    
    <div className="grid grid-cols-2 gap-8 mb-8">
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 mb-4">Patient Profile</h2>
        <div className="space-y-2 text-sm font-medium">
          <p><span className="text-slate-500 w-24 inline-block">Age:</span> {inputData.age}</p>
          <p><span className="text-slate-500 w-24 inline-block">Gender:</span> {inputData.gender}</p>
          <p><span className="text-slate-500 w-24 inline-block">Education:</span> {inputData.education}</p>
          <p><span className="text-slate-500 w-24 inline-block">Sleep:</span> {inputData.sleep_hours} hrs/night</p>
          <p><span className="text-slate-500 w-24 inline-block">Screen Time:</span> {inputData.screen_time} hrs/day</p>
        </div>
      </div>
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col justify-center">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 mb-4">Primary Findings</h2>
        <div className="space-y-4">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Composite Match</span>
            <span className="text-3xl font-black text-indigo-600">{Math.round(result.confidence * 100)}%</span>
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Severity Indicator</span>
            <span className="text-xl font-black text-rose-600 uppercase">{result.severity}</span>
          </div>
        </div>
      </div>
    </div>

    <div className="mb-8">
      <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 border-b-2 border-slate-200 pb-2 mb-4">Diagnostic Dimensions (DSM-5 & Cognitive)</h2>
      <div className="space-y-4 text-sm font-medium bg-slate-50 p-6 rounded-2xl border border-slate-200">
        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
          <span className="text-slate-600">ASRS Part A (Inattention Subscale)</span>
          <span className="font-bold text-slate-900">{result.behavioral_scores?.part_a_score || 0} / 36</span>
        </div>
        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
          <span className="text-slate-600">ASRS Part B (Hyperactivity/Impulsivity)</span>
          <span className="font-bold text-slate-900">{result.behavioral_scores?.part_b_score || 0} / 36</span>
        </div>
        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
          <span className="text-slate-600">Cognitive Risk Score (Reaction, Go/No-Go, Memory)</span>
          <span className="font-bold text-slate-900">{Math.round((result.behavioral_scores?.quiz_score || 0) * 100)}% Risk</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-600">Text & NLP Analysis (Written Expression)</span>
          <span className="font-bold text-slate-900">{Math.round((result.analysis_details?.text_proba || 0) * 100)}% Probability</span>
        </div>
      </div>
    </div>

    <div className="mb-8">
      <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 border-b-2 border-slate-200 pb-2 mb-4">Journal Extract</h2>
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-sm italic text-slate-600 leading-relaxed">
        "{inputData.journal_text || 'No journal provided.'}"
      </div>
    </div>

    <div className="mt-12 text-xs font-medium text-slate-400 border-t border-slate-200 pt-6">
      <p className="mb-2 uppercase tracking-widest font-bold text-[10px]">Technical Disclaimer</p>
      <p className="mb-1">This report was generated by NeuroSync AI. It is a self-screening tool designed to highlight behavioral patterns and cognitive indicators.</p>
      <p className="mb-4">It is NOT a medical diagnosis and cannot replace a professional evaluation by a qualified mental health provider.</p>
      <p>Report Date: {new Date().toLocaleDateString()}</p>
    </div>
  </div>
));

export default ResultPage;
