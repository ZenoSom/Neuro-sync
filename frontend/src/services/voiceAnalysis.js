// ============================================================
// voiceAnalysis.js — Web Speech API + Emotion Detection Service
// Emotions detected here are sent to backend NLP with journal text
// ============================================================

const ADHD_EMOTION_LEXICON = {
  anxious:    ['anxious', 'anxiety', 'nervous', 'worried', 'worry', 'scared', 'fear', 'panic', 'panicking', 'dread', 'uneasy', 'tense'],
  frustrated: ['frustrated', 'frustrating', 'frustration', 'annoyed', 'irritated', 'angry', 'mad', 'furious', 'stuck', 'hopeless', 'useless'],
  scattered:  ['scattered', 'distracted', 'jumbled', 'confused', 'chaotic', 'mess', 'everywhere', 'overwhelmed', 'lost', 'forget', 'forgot', 'forgot', 'disorganized'],
  exhausted:  ['exhausted', 'tired', 'drained', 'fatigued', 'burnt', 'burnout', 'sleepy', 'no energy', 'depleted'],
  impulsive:  ['impulsive', 'impulsivity', 'spontaneous', 'random', 'sudden', 'interrupt', 'blurt', 'reactive'],
  calm:       ['calm', 'peaceful', 'relaxed', 'serene', 'composed', 'steady', 'grounded', 'clear', 'present'],
  focused:    ['focused', 'concentrated', 'productive', 'on track', 'organized', 'clear headed', 'efficient', 'completed', 'accomplished'],
  hopeful:    ['hopeful', 'better', 'improving', 'progress', 'optimistic', 'motivated', 'determined', 'trying', 'working on'],
};

const EMOTION_META = {
  anxious:    { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', emoji: '😰', label: 'Anxious',    risk: true },
  frustrated: { color: '#ef4444', bg: '#fef2f2', border: '#fecaca', emoji: '😤', label: 'Frustrated', risk: true },
  scattered:  { color: '#a855f7', bg: '#faf5ff', border: '#e9d5ff', emoji: '🌀', label: 'Scattered',  risk: true },
  exhausted:  { color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe', emoji: '😴', label: 'Exhausted',  risk: true },
  impulsive:  { color: '#f97316', bg: '#fff7ed', border: '#fed7aa', emoji: '⚡', label: 'Impulsive',  risk: true },
  calm:       { color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0', emoji: '😌', label: 'Calm',       risk: false },
  focused:    { color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe', emoji: '🎯', label: 'Focused',    risk: false },
  hopeful:    { color: '#06b6d4', bg: '#ecfeff', border: '#a5f3fc', emoji: '🌱', label: 'Hopeful',    risk: false },
};

/**
 * Detect emotions from text using the ADHD emotion lexicon.
 * Returns an array of detected emotion keys sorted by match count.
 */
export function detectEmotions(text) {
  if (!text || text.trim().length < 3) return [];
  const lower = text.toLowerCase();
  const scores = {};
  for (const [emotion, keywords] of Object.entries(ADHD_EMOTION_LEXICON)) {
    const count = keywords.filter(kw => lower.includes(kw)).length;
    if (count > 0) scores[emotion] = count;
  }
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([emotion]) => emotion);
}

/**
 * Returns the display meta for an emotion key.
 */
export function getEmotionMeta(emotionKey) {
  return EMOTION_META[emotionKey] || null;
}

/**
 * Builds a human-readable emotion summary string to append to journal text
 * before sending to the backend NLP pipeline.
 */
export function buildEmotionNarrative(emotions) {
  if (!emotions || emotions.length === 0) return '';
  const labels = emotions.map(e => EMOTION_META[e]?.label || e);
  return `\n\n[Voice Emotion Signals Detected: ${labels.join(', ')}]`;
}

// ────────────────────────────────────────────────────────
//  SpeechRecognition wrapper
// ────────────────────────────────────────────────────────

let _recognition = null;
let _isListening = false;

/**
 * Check if browser supports Web Speech API.
 */
export function isSpeechSupported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * Start listening via Web Speech API.
 * @param {function} onTranscript  - called with (partialText, isFinal)
 * @param {function} onError       - called with error message string
 * @param {function} onEnd         - called when recognition ends
 */
export function startListening({ onTranscript, onError, onEnd }) {
  if (!isSpeechSupported()) {
    onError?.('Speech recognition is not supported in this browser. Try Chrome or Edge.');
    return;
  }
  if (_isListening) stopListening();

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  _recognition = new SpeechRecognition();
  _recognition.continuous = true;
  _recognition.interimResults = true;
  _recognition.lang = 'en-US';
  _recognition.maxAlternatives = 1;

  _recognition.onresult = (event) => {
    let interim = '';
    let finalText = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalText += transcript + ' ';
      } else {
        interim += transcript;
      }
    }
    if (finalText) onTranscript?.(finalText, true);
    else if (interim) onTranscript?.(interim, false);
  };

  _recognition.onerror = (event) => {
    const messages = {
      'no-speech':        'No speech detected. Please try again.',
      'audio-capture':    'Microphone not found. Please check your audio settings.',
      'not-allowed':      'Microphone access denied. Please allow microphone permissions.',
      'network':          'Network error during speech recognition.',
      'aborted':          null, // user stopped — silent
    };
    const msg = messages[event.error];
    if (msg) onError?.(msg);
    _isListening = false;
  };

  _recognition.onend = () => {
    _isListening = false;
    onEnd?.();
  };

  _recognition.start();
  _isListening = true;
}

/**
 * Stop the active speech recognition session.
 */
export function stopListening() {
  if (_recognition) {
    _recognition.stop();
    _recognition = null;
  }
  _isListening = false;
}

export function getIsListening() {
  return _isListening;
}
