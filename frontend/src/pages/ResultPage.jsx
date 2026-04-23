import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, RadialBarChart, RadialBar } from 'recharts';
import { 
  ArrowLeft, AlertCircle, Sparkles, AlertTriangle, ShieldCheck, 
  Activity, Leaf, Wind, Sun, Moon, Sparkle, Heart, 
  Dna, Fingerprint, Microscope, ClipboardCheck, Download, Zap, Loader2
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

  const doctorsList = [
    { id: 1, name: "Dr. Sarah Jenkins", type: "Clinical Psychologist", specialized: ["Mild", "Moderate"], availability: "Available Today" },
    { id: 2, name: "Dr. Robert Chen", type: "Psychiatrist & Neurologist", specialized: ["Moderate", "High"], availability: "Next Available: Tomorrow" },
    { id: 3, name: "Dr. Emily Torres", type: "Behavioral Therapist", specialized: ["Mild", "Moderate"], availability: "Available Today" },
    { id: 4, name: "Dr. Michael Okafor", type: "ADHD Specialist", specialized: ["High"], availability: "Available in 2 Days" },
    { id: 5, name: "Dr. Lisa Ray", type: "Neurodevelopmental Pediatrician", specialized: ["High", "Moderate"], availability: "Available Next Week" }
  ];

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

  const handleSavePDF = () => {
    window.print();
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
        age: parseInt(adjustedInput.age, 10),
        sleep_hours: parseFloat(adjustedInput.sleep_hours),
        screen_time: parseFloat(adjustedInput.screen_time),
        focus_level: parseFloat(adjustedInput.focus_level),
        hyperactivity: parseFloat(adjustedInput.hyperactivity),
        impulsiveness: parseFloat(adjustedInput.impulsiveness),
        stress_level: parseFloat(adjustedInput.stress_level),
        attention_span: parseFloat(adjustedInput.attention_span),
        task_completion: parseFloat(adjustedInput.task_completion),
        journal_text: adjustedInput.journal_text || '',
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
    { subject: 'Attention', A: inputData.attention_span, fullMark: 10 },
    { subject: 'Focus', A: inputData.focus_level, fullMark: 10 },
    { subject: 'Hyperactivity', A: inputData.hyperactivity, fullMark: 10 },
    { subject: 'Impulsivity', A: inputData.impulsiveness, fullMark: 10 },
    { subject: 'Stress', A: inputData.stress_level, fullMark: 10 },
    { subject: 'Completion', A: inputData.task_completion, fullMark: 10 },
  ];

  const gaugeData = [
    { 
      name: 'Probability', 
      value: result.confidence * 100, 
      fill: result.severity === 'High' ? '#dc2626' : result.severity === 'Moderate' ? '#d97706' : '#2563eb' 
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-white py-12 px-4 z-10 selection:bg-amber-700/20 selection:text-cyan-900"
    >
      <div className="max-w-6xl mx-auto space-y-10">

        {/* --- PREMIUM HUD HEADER --- */}
        <div className="flex flex-col md:flex-row items-center justify-between bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.1)] no-print">
          <div className="flex items-center gap-8">
            <button 
              onClick={() => navigate('/assessment')} 
              className="group flex items-center gap-3 text-indigo-600 hover:text-indigo-800 transition-all font-black uppercase tracking-widest text-xs cursor-pointer"
            >
              <div className="p-3 bg-indigo-50/50 rounded-2xl group-hover:bg-indigo-100 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </div>
              <span className="hidden sm:inline">New Analysis</span>
            </button>
            <div className="h-12 w-px bg-indigo-100 hidden md:block" />
            <div className="flex items-center gap-5">
              <div className="p-4 bg-indigo-600 rounded-2xl shadow-[0_10px_30px_rgba(79,70,229,0.3)]">
                <Microscope className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">Diagnostic Summary</h1>
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em] mt-2">Neural Analysis Report v1.2.4</p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 md:mt-0 flex items-center gap-4">
             <div className="text-right hidden sm:block mr-2">
                <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none mb-1">Authenticated Node</div>
                <div className="text-xs font-bold text-slate-500 tabular-nums">ID# {Math.random().toString(36).substr(2, 8).toUpperCase()}</div>
             </div>
             <button 
                onClick={() => navigate('/progress')}
                className="bg-indigo-50/50 text-indigo-700 border border-indigo-100 px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-100 transition-all shadow-md flex items-center gap-2 active:scale-95 no-print"
             >
                <Activity className="w-4 h-4" /> History
             </button>
             <button 
                onClick={handleSavePDF}
                className="bg-indigo-600 text-white px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all shadow-xl flex items-center gap-2 active:scale-95 no-print"
             >
                <Download className="w-4 h-4" /> Export
             </button>
          </div>
        </div>

        {/* --- MAIN ANALYTICS HUD --- */}
        <div className="grid lg:grid-cols-4 gap-8">
          
          {/* 1. Primary Classification Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-3 p-12 rounded-[3rem] relative overflow-hidden flex flex-col justify-between min-h-[450px] border border-slate-200 bg-white shadow-[0_28px_70px_-40px_rgba(0,0,0,0.1)]"
          >
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <Fingerprint className="w-5 h-5 text-indigo-600" />
                <h3 className="text-indigo-600 font-black uppercase tracking-[0.3em] text-[10px]">AI-assisted Analysis</h3>
              </div>
              
              <div className="flex flex-col md:flex-row md:items-end gap-x-10 gap-y-6 mb-10">
                <div className="space-y-2">
                  <div className="text-6xl md:text-8xl font-black text-slate-900 tracking-tighter leading-none">
                    {result.prediction.split(' ')[0]} 
                    <span className="text-slate-500">{result.prediction.split(' ')[1] ? ' ' + result.prediction.split(' ')[1] : ''}</span>
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
          <div className="p-10 rounded-[2rem] flex flex-col items-center justify-center text-center bg-white border border-slate-200 shadow-sm">
            <Dna className="w-10 h-10 text-indigo-600 absolute top-8 right-8 opacity-30" />
            <h4 className="text-indigo-600 font-black mb-8 text-[10px] uppercase tracking-[0.4em]">Confidence Score</h4>
            
            <div className="w-full h-64 relative">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="75%" outerRadius="100%" barSize={24} data={gaugeData} startAngle={180} endAngle={0}>
                  <RadialBar minAngle={15} background dataKey="value" cornerRadius={16} fill={gaugeData[0].fill} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pt-12">
                <span className="text-6xl font-black text-slate-900 tracking-tighter">
                    {Math.round(result.confidence * 100)}<span className="text-2xl text-slate-500">%</span>
                </span>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-4">Composite Score</span>
              </div>
            </div>

            {result.analysis_details && (
              <div className="w-full mt-8 space-y-6 pt-10 border-t border-slate-200">
                <ProgressDetail label="Behavior Pattern" value={result.analysis_details.behavioral_proba} color="bg-indigo-600" textColor="text-indigo-600" />
                <ProgressDetail label="Writing Pattern" value={result.analysis_details.text_proba} color="bg-indigo-600" textColor="text-indigo-600" />
              </div>
            )}
          </div>
        </div>

        {/* --- CLINICIAN COPILOT + WHAT-IF LAB --- */}
        <div className="grid lg:grid-cols-2 gap-8">
<div className="p-10 rounded-[3rem] border border-slate-200 space-y-8 bg-white shadow-[0_24px_60px_-30px_rgba(0,0,0,0.05)]">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600">GenAI Clinician Co-Pilot</p>
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

          <div className="p-10 rounded-[3rem] border border-slate-200 space-y-8 bg-white shadow-[0_24px_60px_-30px_rgba(0,0,0,0.05)]">
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600">What-if Simulator</p>
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
                  <DeltaCell label="Before" value={`${Math.round(scenarioResult.before * 100)}%`} />
                  <DeltaCell label="After" value={`${Math.round(scenarioResult.after * 100)}%`} />
                  <DeltaCell
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
        </div>

        <GenAIImpactNetwork
          result={result}
          copilotBrief={copilotBrief}
          scenarioResult={scenarioResult}
        />

        {/* --- IKS WISDOM ENGINE SECTION --- */}
        {!recommendations ? (
          <motion.div 
            whileHover={{ scale: 1.01 }}
            className="bg-white p-14 rounded-[3.5rem] border border-slate-200 shadow-[0_30px_90px_-40px_rgba(0,0,0,0.1)] flex flex-col md:flex-row items-center justify-between gap-12 group overflow-hidden relative"
          >
            <div className="space-y-6 max-w-2xl text-center md:text-left relative z-10">
              <div className="inline-flex items-center gap-3 px-5 py-2 bg-indigo-50/50 rounded-full text-indigo-600 font-black text-[10px] uppercase tracking-widest border border-indigo-100">
                <Sparkles className="w-4 h-4 text-indigo-600" /> IKS Intelligence Integration
              </div>
              <h3 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600 tracking-tight leading-tight">Improve your well-being with <span className="text-indigo-600 italic">Ancient Wisdom.</span></h3>
              <p className="text-slate-600 font-medium text-lg leading-relaxed">
                Connect your unique profile with natural wellness steps from traditional Yoga and Ayurveda.
              </p>
            </div>
            <button
              onClick={handleGetRecommendations}
              disabled={recLoading}
              className={`group flex items-center gap-5 bg-indigo-600 hover:bg-indigo-700 text-white px-12 py-7 rounded-[2.5rem] font-black text-xl shadow-xl transition-all transform active:scale-95 z-10 ${recLoading ? 'opacity-50 grayscale cursor-wait' : ''}`}
            >
              {recLoading ? (
                <div className="flex items-center gap-4">
                  <div className="w-7 h-7 border-4 border-white border-t-transparent rounded-full animate-spin" />
                  Synthesizing...
                </div>
              ) : (
                <>Generate Wellness Guide <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" /></>
              )}
            </button>
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-50/50 rounded-full blur-[100px] -mr-20 -mt-20 group-hover:opacity-100 opacity-50 transition-opacity" />
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
          </div>
        )}

        {/* --- SECONDARY ANALYTICS GRID --- */}
        <div className="grid lg:grid-cols-2 gap-10 pt-10">

          {/* Radar Visualization */}
          <div className="p-12 rounded-[3.5rem] border border-slate-200 bg-white shadow-[0_25px_70px_-40px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between mb-12 px-4">
                <h4 className="text-slate-900 font-black text-2xl tracking-tighter uppercase flex items-center gap-4">
                    <Activity className="w-8 h-8 text-indigo-600" /> Behavioral Habits
                </h4>
                <div className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">Habit breakdown</div>
            </div>
            <div className="w-full h-[400px]">
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
          <div className="p-12 rounded-[3.5rem] shadow-[0_25px_70px_-40px_rgba(0,0,0,0.05)] bg-white text-slate-900 relative overflow-hidden flex flex-col justify-between border border-slate-200">
            <div className="relative z-10 space-y-10 text-center md:text-left">
              <h4 className="font-black text-4xl tracking-tighter leading-none uppercase">Technical <br /><span className="text-indigo-600 italic">Disclosures</span></h4>
              
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

              <div className="pt-10">
                 <button onClick={handleSavePDF} className="w-full h-20 bg-indigo-600 text-white rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all no-print shadow-2xl active:scale-[0.98]">
                    Generate Certified Report (PDF)
                 </button>
              </div>
            </div>

            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-50/50 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 text-slate-300 font-black text-[150px] leading-none select-none pointer-events-none -mb-16 -ml-16 uppercase">
              ADHD
            </div>
          </div>
        </div>

        <footer className="max-w-6xl mx-auto mt-24 pt-10 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-6 text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">
          <div>&copy; 2024 ADHD Vision Lab &bull; v1.2.4 Production Build</div>
          <div className="flex gap-10">
              <span className="hover:text-blue-500 cursor-pointer transition-colors">Privacy Protocol</span>
              <span className="hover:text-blue-500 cursor-pointer transition-colors">Lab Hub</span>
          </div>
        </footer>
      </div>

      {/* --- DOCTORS MODAL OVERLAY --- */}
      {showDoctorsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4">
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
                      alert(`Booking request initiated! Setting up consultation with ${doc.name}.`);
                      setShowDoctorsModal(false);
                  }} className="px-6 py-3 bg-white text-slate-900 border border-indigo-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-colors group-hover:shadow-md shrink-0">
                    Book Now
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
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

const DeltaCell = ({ label, value, tone = 'neutral' }) => {
  const tones = {
    improved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    worsened: 'bg-rose-50 text-rose-700 border-rose-200',
    neutral: 'bg-slate-50 text-slate-700 border-slate-200',
  };

  return (
    <div className={`rounded-2xl border p-4 ${tones[tone] || tones.neutral}`}>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`text-lg font-black mt-1 ${
        tone === 'improved' ? 'text-emerald-900' : 
        tone === 'worsened' ? 'text-rose-900' : 'text-slate-900'
      }`}>{value}</p>
    </div>
  );
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

export default ResultPage;
