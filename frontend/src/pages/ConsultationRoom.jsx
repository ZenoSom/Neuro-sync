import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video, Mic, MicOff, VideoOff, PhoneOff, MessageSquare, Send,
  ShieldCheck, Clock, User, Stethoscope, AlertTriangle, FileText,
  ChevronRight, Sparkles, CheckCircle2, Copy, Check, Maximize2, Minimize2,
  Share2, Volume2, Info
} from 'lucide-react';

const ConsultationRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve appointment context from state or localStorage
  const stateData = location.state || {};
  const [appointment, setAppointment] = useState(() => {
    if (stateData.appointment) return stateData.appointment;
    if (stateData.doctor) {
      return {
        doctorName: stateData.doctor.name,
        doctorType: stateData.doctor.type,
        severity: stateData.severity || 'Moderate',
        patientId: 'Patient #7821',
        time: 'Active Session',
        date: 'Today',
      };
    }
    const all = JSON.parse(localStorage.getItem('adhd_appointments') || '[]');
    const matched = all.find((a) => a.id === roomId);
    return matched || {
      doctorName: 'Dr. Sarah Jenkins',
      doctorType: 'Clinical Psychologist',
      severity: 'Moderate',
      patientId: 'Patient #9124',
      time: 'Live Consultation',
      date: 'Today',
    };
  });

  const isDoctorMode = stateData.isDoctor || false;
  const userName = isDoctorMode ? (appointment.doctorName || 'Dr. Specialist') : (appointment.patientId || 'Patient');

  // Video calling states
  const jitsiContainerRef = useRef(null);
  const jitsiApiRef = useRef(null);
  const [jitsiLoading, setJitsiLoading] = useState(true);
  const [useFallbackWebcam, setUseFallbackWebcam] = useState(false);
  const fallbackVideoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // Call timer
  const [callDuration, setCallDuration] = useState(0);

  // Chat and Sidebar state
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'summary'
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatMessages, setChatMessages] = useState(() => {
    const saved = localStorage.getItem(`chat_${roomId}`);
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 1,
        sender: 'system',
        text: 'Consultation room connected. Audio and video streams are end-to-end encrypted.',
        time: 'Just now',
      },
      {
        id: 2,
        sender: appointment.doctorName || 'Doctor',
        text: `Hello! I am ready to review your ADHD assessment results and discuss your personalized care plan.`,
        time: 'Just now',
      },
    ];
  });
  const [newMessage, setNewMessage] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Session duration timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Initialize Jitsi Meet or Fallback Webcam
  useEffect(() => {
    const sanitizedRoom = `NeuroSync_${(roomId || 'live-meet').replace(/[^a-zA-Z0-9]/g, '')}`;

    const initJitsi = () => {
      if (window.JitsiMeetExternalAPI && jitsiContainerRef.current) {
        try {
          // Clear container
          jitsiContainerRef.current.innerHTML = '';

          const domain = 'meet.jit.si';
          const options = {
            roomName: sanitizedRoom,
            width: '100%',
            height: '100%',
            parentNode: jitsiContainerRef.current,
            userInfo: {
              displayName: userName,
            },
            configOverwrite: {
              startWithAudioMuted: false,
              startWithVideoMuted: false,
              prejoinPageEnabled: false,
              disableDeepLinking: true,
              enableWelcomePage: false,
            },
            interfaceConfigOverwrite: {
              TOOLBAR_BUTTONS: [
                'microphone', 'camera', 'desktop', 'chat', 'raisehand',
                'videoquality', 'filmstrip', 'tileview', 'settings'
              ],
              SHOW_JITSI_WATERMARK: false,
              SHOW_WATERMARK_FOR_GUESTS: false,
            },
          };

          const api = new window.JitsiMeetExternalAPI(domain, options);
          jitsiApiRef.current = api;
          setJitsiLoading(false);

          api.addEventListener('videoConferenceLeft', () => {
            handleEndCall();
          });
          return;
        } catch (err) {
          console.warn('Jitsi init error, falling back to local webcam preview:', err);
        }
      }

      // If Jitsi script is not available or blocked, activate native WebRTC webcam preview
      setUseFallbackWebcam(true);
      setJitsiLoading(false);
    };

    // Give script a moment to load if needed
    if (window.JitsiMeetExternalAPI) {
      initJitsi();
    } else {
      const timeout = setTimeout(() => {
        initJitsi();
      }, 1000);
      return () => clearTimeout(timeout);
    }

    return () => {
      if (jitsiApiRef.current) {
        try {
          jitsiApiRef.current.dispose();
        } catch (e) {
          // cleanup
        }
      }
    };
  }, [roomId, userName]);

  // Native webcam stream setup for fallback mode
  useEffect(() => {
    if (!useFallbackWebcam) return;
    let localStream = null;

    navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        localStream = stream;
        if (fallbackVideoRef.current) {
          fallbackVideoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.warn('Webcam permission not granted or unavailable:', err);
      });

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [useFallbackWebcam]);

  const toggleMute = () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleAudio');
    }
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleVideo');
    }
    setIsVideoOff(!isVideoOff);
  };

  const handleEndCall = () => {
    if (jitsiApiRef.current) {
      try {
        jitsiApiRef.current.dispose();
      } catch (e) {}
    }
    if (isDoctorMode) {
      navigate('/doctor-portal');
    } else {
      navigate('/clinic');
    }
  };

  const handleSendMessage = (e) => {
    if (e) e.preventDefault();
    if (!newMessage.trim()) return;

    const msg = {
      id: Date.now(),
      sender: userName,
      text: newMessage.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updated = [...chatMessages, msg];
    setChatMessages(updated);
    localStorage.setItem(`chat_${roomId}`, JSON.stringify(updated));
    setNewMessage('');
  };

  const handleQuickPrompt = (prompt) => {
    const msg = {
      id: Date.now(),
      sender: userName,
      text: prompt,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    const updated = [...chatMessages, msg];
    setChatMessages(updated);
    localStorage.setItem(`chat_${roomId}`, JSON.stringify(updated));
  };

  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden font-sans select-none">
      {/* Top Consultation Control Header */}
      <header className="h-16 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm sm:text-base text-white tracking-tight">
                {appointment.doctorName}
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              {appointment.doctorType} &bull; ID: <span className="font-mono text-indigo-400">{roomId}</span>
            </p>
          </div>
        </div>

        {/* Center Timer */}
        <div className="hidden md:flex items-center gap-2 bg-slate-800/80 border border-slate-700/60 px-4 py-1.5 rounded-full text-xs font-mono font-bold text-slate-200">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          <span>{formatTimer(callDuration)}</span>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={copyRoomLink}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all border border-slate-700"
            title="Copy consultation invite link"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Copied' : 'Share Link'}</span>
          </button>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-2.5 rounded-xl text-xs font-bold transition-all border ${
              sidebarOpen
                ? 'bg-indigo-600 text-white border-indigo-500'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Toggle Clinical Sidebar & Chat"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          <button
            onClick={handleEndCall}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-rose-600/30"
          >
            <PhoneOff className="w-4 h-4" />
            <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
      </header>

      {/* Main Call Layout: Video Center + Sidebar */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Video Call Workspace */}
        <div className="flex-1 flex flex-col p-3 sm:p-6 relative bg-slate-950 overflow-hidden">
          <div className="flex-1 w-full h-full rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-800/80 bg-slate-900/60 shadow-2xl relative">
            {/* Jitsi Video Frame Container */}
            <div
              ref={jitsiContainerRef}
              className={`w-full h-full ${useFallbackWebcam ? 'hidden' : 'block'}`}
            />

            {/* Fallback Native WebRTC Stream View */}
            {useFallbackWebcam && (
              <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-900">
                {/* Peer (Doctor / Patient avatar) */}
                <div className="relative rounded-2xl bg-slate-800/80 border border-slate-700 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-2xl mb-4">
                    <Stethoscope className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">{appointment.doctorName}</h3>
                  <p className="text-xs text-indigo-400 font-semibold">{appointment.doctorType}</p>
                  <div className="mt-4 flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/30">
                    <Volume2 className="w-3.5 h-3.5 animate-pulse" /> Audio Stream Connected
                  </div>
                </div>

                {/* Local Camera */}
                <div className="relative rounded-2xl bg-black border border-slate-700 overflow-hidden flex items-center justify-center">
                  <video
                    ref={fallbackVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold text-white border border-white/10">
                    You ({userName})
                  </div>
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {jitsiLoading && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 z-10">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                <h3 className="text-lg font-bold text-white mb-1">Connecting to Tele-Consultation Node...</h3>
                <p className="text-xs text-slate-400">Negotiating WebRTC peer audio/video handshake</p>
              </div>
            )}
          </div>

          {/* Quick Floating Controls (Especially handy for mobile / fallback mode) */}
          <div className="mt-3 flex justify-center items-center gap-3">
            <button
              onClick={toggleMute}
              className={`p-3.5 rounded-2xl border transition-all ${
                isMuted
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <button
              onClick={toggleVideo}
              className={`p-3.5 rounded-2xl border transition-all ${
                isVideoOff
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
              title={isVideoOff ? 'Enable Camera' : 'Disable Camera'}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>

            <button
              onClick={handleEndCall}
              className="p-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white transition-all shadow-lg shadow-rose-600/30"
              title="End Consultation"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Collapsible Clinical HUD & Chat Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 360, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="h-full bg-slate-900/95 border-l border-slate-800/80 flex flex-col shrink-0 overflow-hidden z-10"
            >
              {/* Tab Selector */}
              <div className="flex border-b border-slate-800 p-2 gap-1 bg-slate-950/40">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                    activeTab === 'chat'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" /> In-Call Chat
                </button>
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                    activeTab === 'summary'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" /> Clinical Profile
                </button>
              </div>

              {/* TAB 1: Real-time In-Call Chat */}
              {activeTab === 'chat' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Messages list */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar">
                    {chatMessages.map((msg) => {
                      const isMe = msg.sender === userName;
                      const isSystem = msg.sender === 'system';

                      if (isSystem) {
                        return (
                          <div
                            key={msg.id}
                            className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-[11px] text-slate-400 text-center flex items-center justify-center gap-2"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{msg.text}</span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 px-1">
                            {msg.sender} &bull; {msg.time}
                          </span>
                          <div
                            className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                              isMe
                                ? 'bg-indigo-600 text-white rounded-tr-none'
                                : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                            }`}
                          >
                            {msg.text}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Quick Clinical Suggestions */}
                  <div className="p-2.5 border-t border-slate-800 bg-slate-950/30 overflow-x-auto flex gap-2 no-scrollbar">
                    {[
                      'Can you hear me clearly?',
                      'Reviewing assessment data.',
                      'Prescription sent to portal.',
                      'Please share journal details.',
                    ].map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => handleQuickPrompt(prompt)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 whitespace-nowrap border border-slate-700/80 transition-all"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>

                  {/* Chat Input */}
                  <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-slate-900 flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a clinical note or message..."
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl transition-all"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 2: Diagnostic & Patient Profile Summary */}
              {activeTab === 'summary' && (
                <div className="flex-1 p-5 overflow-y-auto space-y-5 custom-scrollbar text-xs">
                  {/* Severity Badge */}
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                      Assessment Classification
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-black text-white">ADHD Likelihood</span>
                      <span
                        className={`px-3 py-1 rounded-lg border font-black uppercase text-[10px] ${
                          appointment.severity === 'High'
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                            : appointment.severity === 'Moderate'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {appointment.severity || 'Moderate'} Severity
                      </span>
                    </div>
                  </div>

                  {/* Consultation Specifics */}
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                    <div className="flex justify-between items-center text-slate-300">
                      <span className="text-slate-500 font-bold">Patient Reference:</span>
                      <span className="font-mono text-white">{appointment.patientId}</span>
                    </div>
                    <div className="h-px bg-slate-800" />
                    <div className="flex justify-between items-center text-slate-300">
                      <span className="text-slate-500 font-bold">Scheduled Slot:</span>
                      <span className="text-white">{appointment.time || '10:00 AM'}</span>
                    </div>
                    <div className="h-px bg-slate-800" />
                    <div className="flex justify-between items-center text-slate-300">
                      <span className="text-slate-500 font-bold">Status:</span>
                      <span className="text-emerald-400 font-bold uppercase text-[10px]">Active Consultation</span>
                    </div>
                  </div>

                  {/* Patient Clinical Notes */}
                  {appointment.notes && (
                    <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-900/40">
                      <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400 block mb-2">
                        Patient Symptoms / Initial Notes
                      </span>
                      <p className="text-slate-300 leading-relaxed italic">
                        "{appointment.notes}"
                      </p>
                    </div>
                  )}

                  {/* Copilot Clinical Recommendations */}
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold text-[11px]">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Copilot Suggested Actions</span>
                    </div>
                    <ul className="space-y-2 text-slate-400 text-[11px] list-disc list-inside">
                      <li>Review diurnal attention variation and sleep hygiene</li>
                      <li>Evaluate environmental distractions during deep work</li>
                      <li>Consider IKS lifestyle protocols (Pranayama, Ashwagandha)</li>
                    </ul>
                  </div>
                </div>
              )}
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ConsultationRoom;
