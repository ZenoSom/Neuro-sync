import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Clock, Target, Play, Zap, AlertCircle, RefreshCw } from 'lucide-react';

const QUIZ_STAGES = {
  INTRO: 'intro',
  REACTION: 'reaction',
  GONO: 'gono',
  MEMORY: 'memory',
  DONE: 'done'
};

const CognitiveQuiz = ({ onComplete }) => {
  const [stage, setStage] = useState(QUIZ_STAGES.INTRO);
  const [scores, setScores] = useState({
    reaction: null,
    gono: null,
    memory: null
  });

  const handleStageComplete = (stageName, resultPayload) => {
    // resultPayload is { score, metrics } or just score (for backward compatibility if missing)
    const score = typeof resultPayload === 'object' && resultPayload !== null ? resultPayload.score : resultPayload;
    const metrics = typeof resultPayload === 'object' && resultPayload !== null ? resultPayload.metrics : null;
    
    setScores(prev => {
      const newScores = { ...prev, [stageName]: { score, metrics } };
      if (stageName === QUIZ_STAGES.MEMORY) {
        // Calculate final blended score
        const reactionScore = newScores.reaction?.score ?? 0.5;
        const gonoScore = newScores.gono?.score ?? 0.5;
        const memoryScore = newScores.memory?.score ?? 0.5;

        const reactionRisk = Math.max(0, 1 - reactionScore);
        const gonoRisk = gonoScore; 
        const memoryRisk = Math.max(0, 1 - memoryScore);
        
        const finalQuizScore = (reactionRisk * 0.3) + (gonoRisk * 0.4) + (memoryRisk * 0.3);
        onComplete({ score: finalQuizScore, metrics: { reaction: newScores.reaction?.metrics, gono: newScores.gono?.metrics, memory: newScores.memory?.metrics } });
      }
      return newScores;
    });

    if (stageName === QUIZ_STAGES.REACTION) setStage(QUIZ_STAGES.GONO);
    else if (stageName === QUIZ_STAGES.GONO) setStage(QUIZ_STAGES.MEMORY);
    else if (stageName === QUIZ_STAGES.MEMORY) setStage(QUIZ_STAGES.DONE);
  };

  const skipQuiz = () => {
    onComplete({ score: 0.5, metrics: null });
  };

  return (
    <div className="rounded-3xl glass-neural overflow-hidden border border-slate-200 flex flex-col md:flex-row min-h-[450px]">
      {/* Sidebar Navigation */}
      <div className="md:w-64 bg-slate-50 border-r border-slate-200 p-6 flex flex-col hidden md:flex">
        <h3 className="font-bold text-slate-900 mb-6">Cognitive Tasks</h3>
        <div className="space-y-2 flex-1">
          <SidebarItem 
            icon={Clock} 
            title="Reaction Speed" 
            active={stage === QUIZ_STAGES.REACTION} 
            done={scores.reaction !== null} 
          />
          <SidebarItem 
            icon={Target} 
            title="Impulse Control" 
            active={stage === QUIZ_STAGES.GONO} 
            done={scores.gono !== null} 
          />
          <SidebarItem 
            icon={Zap} 
            title="Working Memory" 
            active={stage === QUIZ_STAGES.MEMORY} 
            done={scores.memory !== null} 
          />
        </div>
        <button onClick={skipQuiz} className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest text-left mt-6 flex items-center gap-2">
          Skip Quizzes
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative flex flex-col">
        <AnimatePresence mode="wait">
          {stage === QUIZ_STAGES.INTRO && (
            <IntroScreen key="intro" onStart={() => setStage(QUIZ_STAGES.REACTION)} />
          )}
          {stage === QUIZ_STAGES.REACTION && (
            <ReactionTask key="reaction" onComplete={(s) => handleStageComplete(QUIZ_STAGES.REACTION, s)} />
          )}
          {stage === QUIZ_STAGES.GONO && (
            <GoNoGoTask key="gono" onComplete={(s) => handleStageComplete(QUIZ_STAGES.GONO, s)} />
          )}
          {stage === QUIZ_STAGES.MEMORY && (
            <MemoryTask key="memory" onComplete={(s) => handleStageComplete(QUIZ_STAGES.MEMORY, s)} />
          )}
          {stage === QUIZ_STAGES.DONE && (
            <DoneScreen key="done" />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const SidebarItem = ({ icon: Icon, title, active, done }) => (
  <div className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${active ? 'bg-indigo-50 text-indigo-700' : done ? 'text-emerald-600' : 'text-slate-400'}`}>
    <div className={`p-2 rounded-lg ${active ? 'bg-indigo-100 text-indigo-600' : done ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
      <Icon className="w-4 h-4" />
    </div>
    <span className={`text-sm font-bold ${active ? 'text-indigo-900' : done ? 'text-slate-700' : 'text-slate-500'}`}>{title}</span>
  </div>
);

// ── Components ──────────────────────────────────────────────────────────────

const IntroScreen = ({ onStart }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-12 text-center space-y-6">
    <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <Brain className="w-10 h-10 text-indigo-600" />
    </div>
    <h3 className="text-2xl font-bold text-slate-900">Cognitive Mini-Quizzes</h3>
    <p className="text-slate-600 max-w-lg mx-auto">
      These three short interactive tasks measure your sustained attention, impulse control, and working memory objectively. 
      It takes about 3 minutes total.
    </p>
    <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto py-6">
      <div className="bg-white/50 rounded-xl p-4 text-center">
        <Clock className="w-6 h-6 text-cyan-500 mx-auto mb-2" />
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Speed</div>
      </div>
      <div className="bg-white/50 rounded-xl p-4 text-center">
        <Target className="w-6 h-6 text-rose-500 mx-auto mb-2" />
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Control</div>
      </div>
      <div className="bg-white/50 rounded-xl p-4 text-center">
        <Zap className="w-6 h-6 text-fuchsia-500 mx-auto mb-2" />
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Memory</div>
      </div>
    </div>
    <button
      onClick={onStart}
      className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-full font-bold uppercase tracking-widest text-xs transition-colors"
    >
      Start First Task
    </button>
  </motion.div>
);


const ReactionTask = ({ onComplete }) => {
  const [gameState, setGameState] = useState('ready'); // ready, waiting, active, done
  const [results, setResults] = useState([]);
  const [startTime, setStartTime] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const timeoutRef = useRef(null);
  const timerIntervalRef = useRef(null);
  
  const TOTAL_TRIALS = 12;

  const startTrial = useCallback(() => {
    setGameState('waiting');
    const delay = 500 + Math.random() * 1500; // 0.5-2 seconds
    timeoutRef.current = setTimeout(() => {
      setGameState('active');
      setStartTime(performance.now());
    }, delay);
  }, []);

  const startGame = () => {
    setGameState('waiting');
    startTrial();
    timerIntervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          setGameState('done');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      clearTimeout(timeoutRef.current);
      clearInterval(timerIntervalRef.current);
    };
  }, []);

  const handleTap = useCallback((e) => {
    if (e && e.type === 'keydown' && e.code !== 'Space') return;
    if (e && e.type === 'keydown') e.preventDefault(); // prevent space scrolling

    if (gameState === 'waiting') {
      clearTimeout(timeoutRef.current);
      startTrial();
    } else if (gameState === 'active') {
      const rt = performance.now() - startTime;
      const newResults = [...results, rt];
      setResults(newResults);
      if (newResults.length >= TOTAL_TRIALS) {
        clearInterval(timerIntervalRef.current);
        setGameState('done');
      } else {
        startTrial();
      }
    }
  }, [gameState, results, startTime, startTrial]);

  useEffect(() => {
    const handleKeyDown = (e) => handleTap(e);
    if (gameState === 'waiting' || gameState === 'active') {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, handleTap]);

  const finish = () => {
    const avg = results.length > 0 ? results.reduce((a, b) => a + b, 0) / results.length : 600;
    let variance = 0;
    if (results.length > 0) {
      variance = results.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / results.length;
    }
    const variability = Math.sqrt(variance);
    // Normal human RT range: ~200ms (fast) to ~700ms (slow). Neutral baseline = 450ms.
    // score = 1.0 at 200ms, 0.5 at 450ms, 0.0 at 700ms+
    const score = Math.max(0, Math.min(1, 1 - ((avg - 200) / 500)));
    onComplete({ score, metrics: { avgRT: avg, variability, raw: results } });
  };

  const skipTask = () => onComplete({ score: 0.5, metrics: null });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-[400px] flex flex-col">
      <div className="p-6 border-b border-slate-200 flex justify-between items-center">
        <div>
          <h4 className="font-bold text-slate-900">Task 1: Reaction Speed</h4>
          <p className="text-xs text-slate-500">Tap/Click or press SPACE when green.</p>
        </div>
        <div className="text-right flex flex-col items-end gap-1">
          <div className="text-sm font-bold text-slate-400">{results.length} / {TOTAL_TRIALS}</div>
          {gameState !== 'ready' && gameState !== 'done' && (
            <div className={`text-xs font-bold ${timeLeft <= 5 ? 'text-rose-500' : 'text-slate-400'}`}>{timeLeft}s left</div>
          )}
          <button onClick={skipTask} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest border-b border-transparent hover:border-slate-400 transition-colors">Skip Task</button>
        </div>
      </div>
      
      <div className="flex-1 flex items-center justify-center bg-slate-50 cursor-pointer" onClick={gameState !== 'ready' && gameState !== 'done' ? handleTap : undefined}>
        {gameState === 'waiting' && <div className="w-32 h-32 rounded-full bg-rose-500 flex items-center justify-center text-white font-bold text-sm">WAIT</div>}
        {gameState === 'active' && <div className="w-32 h-32 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm shadow-[0_0_30px_rgba(16,185,129,0.5)]">TAP!</div>}
        {gameState === 'ready' && (
          <button onClick={startGame} className="text-indigo-600 font-bold uppercase tracking-widest flex flex-col items-center gap-2">
            <Play className="w-12 h-12" />
            Click or Space to Begin
          </button>
        )}
        {gameState === 'done' && (
          <div className="text-center space-y-4">
            <div className="font-bold text-2xl text-slate-900">{results.length > 0 ? Math.round(results.reduce((a, b) => a + b, 0) / results.length) : '---'} ms</div>
            <p className="text-xs text-slate-500 uppercase tracking-widest">Average Reaction Time</p>
            <p className="text-xs text-slate-400">{results.length} taps recorded</p>
            <button onClick={finish} className="bg-indigo-600 text-white px-6 py-2 rounded-full font-bold uppercase text-xs mt-4">Next Task</button>
          </div>
        )}
      </div>
    </motion.div>
  );
};


const GoNoGoTask = ({ onComplete }) => {
  const [gameState, setGameState] = useState('ready'); 
  const [currentStimulus, setCurrentStimulus] = useState(null); 
  const [errors, setErrors] = useState(0);
  const [trials, setTrials] = useState(0);
  const [timeLeft, setTimeLeft] = useState(12);
  const timeoutRef = useRef(null);
  const hideRef = useRef(null);
  const timerIntervalRef = useRef(null);

  const TOTAL_TRIALS = 10; 

  const nextTrial = useCallback(() => {
    if (trials >= TOTAL_TRIALS) {
      setGameState('done');
      return;
    }
    
    setGameState('waiting');
    setCurrentStimulus(null);
    
    timeoutRef.current = setTimeout(() => {
      const isGo = Math.random() > 0.5; // 50% go, 50% no-go for single trial fairness
      setCurrentStimulus(isGo ? 'go' : 'nogo');
      setGameState('active');
      setTrials(t => t + 1);

      // Auto hide after 800ms if no click
      hideRef.current = setTimeout(() => {
        if (!isGo) {
          // Success 
        } else {
          // Missed go (omission error)
          setErrors(e => e + 1);
        }
        nextTrial();
      }, 800);

    }, 200 + Math.random() * 500); 
  }, [trials]);

  const startGame = () => {
    setGameState('waiting');
    nextTrial();
    timerIntervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          setGameState('done');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      clearTimeout(timeoutRef.current);
      clearTimeout(hideRef.current);
      clearInterval(timerIntervalRef.current);
    };
  }, []);

  const handleTap = useCallback((e) => {
    if (e && e.type === 'keydown' && e.code !== 'Space') return;
    if (e && e.type === 'keydown') e.preventDefault(); 

    if (gameState === 'active' && currentStimulus) {
      clearTimeout(hideRef.current);
      if (currentStimulus === 'nogo') {
        // Commission error
        setErrors(e => e + 1); 
      }
      nextTrial();
    }
  }, [gameState, currentStimulus, nextTrial]);

  useEffect(() => {
    const handleKeyDown = (e) => handleTap(e);
    if (gameState === 'active') {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, handleTap]);

  const finish = () => {
    const errorRate = Math.min(1.0, errors / TOTAL_TRIALS);
    onComplete({ score: errorRate, metrics: { errors, trials } });
  };
  
  const skipTask = () => onComplete({ score: 0.5, metrics: null });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-[400px] flex flex-col">
      <div className="p-6 border-b border-slate-200 flex justify-between items-center">
        <div>
          <h4 className="font-bold text-slate-900">Task 2: Impulse Control</h4>
          <p className="text-xs text-slate-500">Tap/SPACE for GREEN. Do <span className="text-rose-500 font-bold">NOT</span> tap for RED.</p>
        </div>
        <div className="text-right flex flex-col items-end gap-1">
          <div className="text-sm font-bold text-slate-400">{Math.min(trials, TOTAL_TRIALS)} / {TOTAL_TRIALS}</div>
          {gameState !== 'ready' && gameState !== 'done' && (
            <div className={`text-xs font-bold ${timeLeft <= 3 ? 'text-rose-500' : 'text-slate-400'}`}>{timeLeft}s left</div>
          )}
          <button onClick={skipTask} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest border-b border-transparent hover:border-slate-400 transition-colors">Skip Task</button>
        </div>
      </div>
      
      <div className="flex-1 flex items-center justify-center bg-slate-50 cursor-pointer" onClick={gameState === 'active' ? handleTap : undefined}>
        {gameState === 'active' && currentStimulus === 'go' && <div className="w-32 h-32 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold shadow-[0_0_30px_rgba(16,185,129,0.5)]">TAP</div>}
        {gameState === 'active' && currentStimulus === 'nogo' && <div className="w-32 h-32 bg-rose-500 flex items-center justify-center text-white font-bold transform rotate-45 shadow-[0_0_30px_rgba(244,63,94,0.5)]"><div className="transform -rotate-45">STOP</div></div>}
        
        {gameState === 'ready' && (
          <button onClick={startGame} className="text-indigo-600 font-bold uppercase tracking-widest flex flex-col items-center gap-2">
            <Play className="w-12 h-12" />
            Click or Space to Begin
          </button>
        )}
        
        {gameState === 'done' && (
          <div className="text-center space-y-4">
            <h2 className="font-black text-3xl text-slate-900">Task Complete</h2>
            <p className="text-xs text-slate-500 uppercase tracking-widest">{errors} errors recorded</p>
            <button onClick={finish} className="bg-indigo-600 text-white px-6 py-2 rounded-full font-bold uppercase text-xs mt-4">Next Task</button>
          </div>
        )}
      </div>
    </motion.div>
  );
};


const MemoryTask = ({ onComplete }) => {
  const [gameState, setGameState] = useState('ready');
  const [sequence, setSequence] = useState([]);
  const [displayIndex, setDisplayIndex] = useState(-1);
  const [userInput, setUserInput] = useState('');
  const [level, setLevel] = useState(4); // Start with 4 digits
  const [fails, setFails] = useState(0);
  
  const generateSequence = (len) => Array.from({length: len}, () => Math.floor(Math.random() * 10));

  const startLevel = useCallback(() => {
    const seq = generateSequence(level);
    setSequence(seq);
    setUserInput('');
    setGameState('showing');
    setDisplayIndex(0);
  }, [level]);

  useEffect(() => {
    if (gameState === 'showing') {
      if (displayIndex < sequence.length) {
        const timer = setTimeout(() => setDisplayIndex(d => d + 1), 1000);
        return () => clearTimeout(timer);
      } else {
        setGameState('input');
      }
    }
  }, [gameState, displayIndex, sequence]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (userInput === sequence.join('')) {
      setLevel(l => l + 1);
      setFails(0);
      setGameState('success');
      setTimeout(() => setGameState('done'), 1500);
    } else {
      setFails(1);
      setGameState('fail');
      setTimeout(() => setGameState('done'), 1500);
    }
  };

  const finish = () => {
    // One round only: 1.0 if correct, 0.0 if missed
    const score = fails === 0 ? 1.0 : 0.0;
    onComplete({ score, metrics: { fails, level } });
  };

  const skipTask = () => onComplete({ score: 0.5, metrics: null });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-[400px] flex flex-col">
      <div className="p-6 border-b border-slate-200 flex justify-between items-center">
        <div>
          <h4 className="font-bold text-slate-900">Task 3: Working Memory</h4>
          <p className="text-xs text-slate-500">Remember the digits in order.</p>
        </div>
        <div className="text-right flex flex-col items-end gap-1">
          <div className="text-sm font-bold text-slate-400">Level {level}</div>
          <button onClick={skipTask} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest border-b border-transparent hover:border-slate-400 transition-colors">Skip Task</button>
        </div>
      </div>
      
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        {gameState === 'ready' && (
          <button onClick={startLevel} className="text-indigo-600 font-bold uppercase tracking-widest flex flex-col items-center gap-2">
            <Play className="w-12 h-12" />
            Click to Begin
          </button>
        )}
        
        {gameState === 'showing' && displayIndex < sequence.length && (
          <div className="text-6xl font-bold text-slate-800 tracking-widest">{sequence[displayIndex]}</div>
        )}
        
        {gameState === 'showing' && displayIndex >= sequence.length && (
          <div className="w-8 h-8 rounded-full border-4 border-slate-300 border-t-indigo-600 animate-spin" />
        )}

        {gameState === 'input' && (
          <form onSubmit={handleSubmit} className="text-center space-y-6">
            <input 
              type="text" 
              value={userInput} 
              onChange={e => setUserInput(e.target.value.replace(/\D/g,''))} 
              autoFocus
              className="text-3xl font-bold tracking-widest text-center bg-white border-2 border-indigo-200 rounded-2xl px-6 py-4 w-64 outline-none focus:border-indigo-500"
              placeholder="Enter digits"
            />
            <div>
              <button type="submit" className="bg-indigo-600 text-white px-8 py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-indigo-700">Submit</button>
            </div>
          </form>
        )}

        {gameState === 'success' && <div className="text-emerald-500 font-bold text-2xl uppercase tracking-widest flex items-center gap-2"><Target /> Correct!</div>}
        {gameState === 'fail' && <div className="text-rose-500 font-bold text-2xl uppercase tracking-widest flex items-center gap-2"><AlertCircle /> Incorrect!</div>}
        
        {gameState === 'done' && (
          <div className="text-center space-y-4">
            <div className="font-bold text-2xl text-slate-900">Span: {level - 1}</div>
            <button onClick={finish} className="bg-indigo-600 text-white px-6 py-2 rounded-full font-bold uppercase text-xs mt-4">Finish Quizzes</button>
          </div>
        )}
      </div>
    </motion.div>
  );
};


const DoneScreen = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-12 text-center space-y-4 bg-emerald-50 h-[400px] flex flex-col items-center justify-center">
    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
      <Target className="w-10 h-10 text-emerald-600" />
    </div>
    <h3 className="text-2xl font-bold text-slate-900">Quizzes Complete</h3>
    <p className="text-slate-600 max-w-sm">Your cognitive metrics have been recorded and will be factored into your assessment.</p>
  </motion.div>
);

export default CognitiveQuiz;
