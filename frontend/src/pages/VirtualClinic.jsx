import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, CalendarDays, Clock, Stethoscope, ShieldCheck,
  CheckCircle2, Sparkles, FileText, ChevronRight, User, MessageSquare,
  ArrowRight, Clipboard, BadgeCheck, Video
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

// ============================================================
// APPOINTMENT SCHEDULING PAGE
// 3-Step Flow: Select Slot → Review & Confirm → Success
// ============================================================

const TIMES = [
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
  '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
  '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
];

const generateDates = () => {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d);
  }
  return dates;
};

const formatDateLabel = (date) => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { weekday: 'short' });
};

const formatDateFull = (date) =>
  date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

const generateBookingId = () =>
  'BK-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase();

const VirtualClinic = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { doctor, severity } = location.state || {};

  const [step, setStep] = useState('select'); // 'select' | 'confirm' | 'done'
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [patientNotes, setPatientNotes] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [isBooking, setIsBooking] = useState(false);

  const dates = useMemo(() => generateDates(), []);

  // Get already-booked slots to grey them out
  const bookedSlots = useMemo(() => {
    const appointments = JSON.parse(localStorage.getItem('adhd_appointments') || '[]');
    const map = {};
    appointments.forEach(a => {
      const key = `${a.date}_${a.time}`;
      if (!map[a.doctorName]) map[a.doctorName] = new Set();
      map[a.doctorName].add(key);
    });
    return map;
  }, []);

  const isSlotBooked = (date, time) => {
    if (!doctor) return false;
    const dateStr = date.toISOString().split('T')[0];
    const key = `${dateStr}_${time}`;
    return bookedSlots[doctor.name]?.has(key) || false;
  };

  // If no doctor data was passed, show a fallback
  if (!doctor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card-dark p-12 rounded-[3rem] text-center max-w-md"
        >
          <Stethoscope className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-2">No Doctor Selected</h2>
          <p className="text-slate-500 mb-8">Please go back to your results and select a specialist first.</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all"
          >
            Go Back
          </button>
        </motion.div>
      </div>
    );
  }

  const handleConfirmBooking = () => {
    setIsBooking(true);

    const newBooking = {
      id: generateBookingId(),
      doctorId: doctor.id,
      doctorName: doctor.name,
      doctorType: doctor.type,
      patientId: `Patient #${Math.floor(1000 + Math.random() * 9000)}`,
      date: selectedDate.toISOString().split('T')[0],
      time: selectedTime,
      notes: patientNotes,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      severity: severity || 'Unknown',
    };

    setTimeout(() => {
      const existing = JSON.parse(localStorage.getItem('adhd_appointments') || '[]');
      existing.push(newBooking);
      localStorage.setItem('adhd_appointments', JSON.stringify(existing));
      setBookingId(newBooking.id);
      setIsBooking(false);
      setStep('done');
    }, 1500);
  };

  const stagger = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 py-10 px-4 selection:bg-indigo-500/20 selection:text-indigo-900 relative overflow-hidden"
    >
      {/* Background Orbs */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden fixed">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-300/15 blur-[100px] animate-float-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-emerald-300/15 blur-[120px] animate-float-medium animation-delay-2000" />
      </div>

      <div className="max-w-3xl mx-auto relative z-10">

        {/* Header */}
        <motion.div {...stagger} className="flex items-center justify-between mb-10">
          <button
            onClick={() => navigate(-1)}
            className="group flex items-center gap-3 text-indigo-600 hover:text-indigo-800 transition-all font-black uppercase tracking-widest text-xs"
          >
            <div className="p-3 bg-indigo-50/80 rounded-2xl group-hover:bg-indigo-100 group-hover:shadow-md transition-all">
              <ArrowLeft className="w-5 h-5" />
            </div>
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100">
            <ShieldCheck className="w-4 h-4" /> Secure Booking
          </div>
        </motion.div>

        {/* Progress Steps */}
        <motion.div {...stagger} transition={{ delay: 0.1 }} className="flex items-center justify-center gap-3 mb-12">
          {['Select Slot', 'Review', 'Confirmed'].map((label, i) => {
            const stepMap = { 'select': 0, 'confirm': 1, 'done': 2 };
            const current = stepMap[step];
            const isActive = i <= current;
            return (
              <React.Fragment key={label}>
                {i > 0 && (
                  <div className={`h-px w-10 transition-colors duration-500 ${isActive ? 'bg-indigo-500' : 'bg-slate-200'}`} />
                )}
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-500 ${
                    isActive ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {i < current ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest hidden sm:inline ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                    {label}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </motion.div>

        <AnimatePresence mode="wait">
          {/* ============================== */}
          {/* STEP 1: SELECT SLOT            */}
          {/* ============================== */}
          {step === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="space-y-8"
            >
              {/* Doctor Card */}
              <div className="glass-card-dark p-8 rounded-[2.5rem] relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-400/10 blur-[50px] pointer-events-none" />
                <div className="flex items-center gap-6 relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
                    <Stethoscope className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tighter">{doctor.name}</h2>
                    <p className="text-[10px] text-indigo-600 font-black tracking-widest uppercase mt-1">{doctor.type}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <p className="text-xs text-slate-500 font-bold">{doctor.availability}</p>
                    </div>
                  </div>
                  {severity && (
                    <div className={`px-4 py-2 rounded-xl border font-black uppercase tracking-widest text-[10px] shrink-0 ${
                      severity === 'High' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                      severity === 'Moderate' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                      'bg-emerald-50 text-emerald-600 border-emerald-200'
                    }`}>
                      {severity} Case
                    </div>
                  )}
                </div>

                {/* Instant Quick Video Call Option */}
                <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Need an immediate consultation right now?</span>
                  </div>
                  <button
                    onClick={() => {
                      const instantId = generateBookingId();
                      navigate(`/consultation/${instantId}`, {
                        state: {
                          appointment: {
                            id: instantId,
                            doctorName: doctor.name,
                            doctorType: doctor.type,
                            date: 'Today',
                            time: 'Instant Call',
                            severity: severity || 'Moderate',
                            patientId: `Patient #${Math.floor(1000 + Math.random() * 9000)}`,
                          },
                          doctor: doctor,
                          isDoctor: false,
                        },
                      });
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-700 hover:text-white border border-emerald-500/20 font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Video className="w-3.5 h-3.5" /> Start Instant Quick Call
                  </button>
                </div>
              </div>

              {/* Date Selection */}
              <div className="glass-card-dark p-8 rounded-[2.5rem]">
                <div className="flex items-center gap-3 mb-6">
                  <CalendarDays className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Select Date</h3>
                </div>
                <div className="grid grid-cols-7 gap-3">
                  {dates.map((date) => {
                    const isSelected = selectedDate?.toDateString() === date.toDateString();
                    return (
                      <button
                        key={date.toISOString()}
                        onClick={() => { setSelectedDate(date); setSelectedTime(null); }}
                        className={`p-4 rounded-2xl flex flex-col items-center gap-1 transition-all duration-300 border ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/30 scale-105'
                            : 'bg-white/50 text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50'
                        }`}
                      >
                        <span className={`text-[10px] font-black uppercase tracking-wider ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                          {formatDateLabel(date)}
                        </span>
                        <span className="text-2xl font-black">{date.getDate()}</span>
                        <span className={`text-[9px] font-bold uppercase ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                          {date.toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Selection */}
              {selectedDate && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card-dark p-8 rounded-[2.5rem]"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <Clock className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Select Time</h3>
                    <span className="text-[10px] text-slate-400 font-bold ml-auto">{formatDateFull(selectedDate)}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {TIMES.map((time) => {
                      const booked = isSlotBooked(selectedDate, time);
                      const isSelected = selectedTime === time;
                      return (
                        <button
                          key={time}
                          disabled={booked}
                          onClick={() => setSelectedTime(time)}
                          className={`py-3 px-4 rounded-xl font-bold text-sm transition-all duration-300 border ${
                            booked
                              ? 'bg-slate-100 text-slate-300 border-slate-100 cursor-not-allowed line-through'
                              : isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/30 scale-105'
                                : 'bg-white/50 text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50'
                          }`}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Patient Notes */}
              {selectedTime && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card-dark p-8 rounded-[2.5rem]"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <MessageSquare className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Notes for Doctor</h3>
                    <span className="text-[10px] text-slate-400 font-bold ml-auto">Optional</span>
                  </div>
                  <textarea
                    value={patientNotes}
                    onChange={(e) => setPatientNotes(e.target.value)}
                    placeholder="Briefly describe your concerns or symptoms you'd like to discuss..."
                    rows={3}
                    className="w-full bg-white/50 backdrop-blur-md border border-slate-200 px-5 py-4 rounded-2xl font-medium text-slate-900 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none text-sm"
                  />
                </motion.div>
              )}

              {/* Proceed Button */}
              {selectedDate && selectedTime && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-end"
                >
                  <button
                    onClick={() => setStep('confirm')}
                    className="group bg-slate-900 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-xl active:scale-95 flex items-center gap-3"
                  >
                    Review Booking
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ============================== */}
          {/* STEP 2: REVIEW & CONFIRM       */}
          {/* ============================== */}
          {step === 'confirm' && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="space-y-8"
            >
              <div className="glass-card-dark p-10 rounded-[2.5rem] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-400/10 blur-[60px] pointer-events-none" />

                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-8">
                    <Clipboard className="w-5 h-5 text-indigo-600" />
                    <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Booking Summary</h2>
                  </div>

                  <div className="space-y-6">
                    {/* Doctor */}
                    <div className="flex items-center gap-5 p-5 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
                        <Stethoscope className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Specialist</p>
                        <p className="text-lg font-black text-slate-900 tracking-tight">{doctor.name}</p>
                        <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest">{doctor.type}</p>
                      </div>
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Date</p>
                        <div className="flex items-center gap-2">
                          <CalendarDays className="w-4 h-4 text-indigo-600" />
                          <p className="text-sm font-black text-slate-900">{formatDateFull(selectedDate)}</p>
                        </div>
                      </div>
                      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Time</p>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-indigo-600" />
                          <p className="text-sm font-black text-slate-900">{selectedTime}</p>
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    {patientNotes && (
                      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Patient Notes</p>
                        <p className="text-sm text-slate-700 font-medium leading-relaxed">{patientNotes}</p>
                      </div>
                    )}

                    {/* Severity */}
                    {severity && (
                      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Diagnostic Severity</p>
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border font-black uppercase tracking-widest text-[10px] mt-1 ${
                          severity === 'High' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                          severity === 'Moderate' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                          'bg-emerald-50 text-emerald-600 border-emerald-200'
                        }`}>
                          <Sparkles className="w-3 h-3" /> {severity} Risk Profile
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep('select')}
                  className="text-indigo-600 font-black uppercase tracking-widest text-xs flex items-center gap-2 hover:text-indigo-800 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Edit Slot
                </button>
                <button
                  onClick={handleConfirmBooking}
                  disabled={isBooking}
                  className="bg-indigo-600 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all shadow-xl active:scale-95 flex items-center gap-3 disabled:opacity-60"
                >
                  {isBooking ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <BadgeCheck className="w-5 h-5" />
                      Confirm Booking
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* ============================== */}
          {/* STEP 3: SUCCESS                */}
          {/* ============================== */}
          {step === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="space-y-8"
            >
              <div className="glass-card-dark p-12 rounded-[3rem] text-center relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-emerald-400/20 blur-[60px] animate-float-slow" />
                  <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-indigo-400/20 blur-[50px] animate-float-medium" />
                </div>

                <div className="relative z-10">
                  {/* Animated Checkmark */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                    className="w-24 h-24 rounded-full bg-emerald-500 mx-auto mb-8 flex items-center justify-center shadow-xl shadow-emerald-500/30"
                  >
                    <motion.div
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 0.5, duration: 0.5 }}
                    >
                      <CheckCircle2 className="w-12 h-12 text-white" />
                    </motion.div>
                  </motion.div>

                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-3"
                  >
                    Booking Confirmed!
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-slate-500 font-medium mb-8"
                  >
                    Your appointment has been successfully scheduled.
                  </motion.p>

                  {/* Booking Details Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="bg-white/60 backdrop-blur-md border border-slate-200 rounded-2xl p-6 max-w-sm mx-auto text-left space-y-4"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Booking ID</span>
                      <span className="text-sm font-black text-indigo-600 font-mono">{bookingId}</span>
                    </div>
                    <div className="h-px bg-slate-200" />
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Specialist</span>
                      <span className="text-sm font-black text-slate-900">{doctor.name}</span>
                    </div>
                    <div className="h-px bg-slate-200" />
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</span>
                      <span className="text-sm font-bold text-slate-700">{formatDateFull(selectedDate)}</span>
                    </div>
                    <div className="h-px bg-slate-200" />
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Time</span>
                      <span className="text-sm font-bold text-slate-700">{selectedTime}</span>
                    </div>
                    <div className="h-px bg-slate-200" />
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</span>
                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 uppercase tracking-widest">Confirmed</span>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <button
                  onClick={() => navigate(`/consultation/${bookingId}`, {
                    state: {
                      appointment: {
                        id: bookingId,
                        doctorName: doctor.name,
                        doctorType: doctor.type,
                        date: formatDateFull(selectedDate),
                        time: selectedTime,
                        severity: severity || 'Moderate',
                        notes: patientNotes,
                        patientId: `Patient #${Math.floor(1000 + Math.random() * 9000)}`,
                      },
                      doctor: doctor,
                      isDoctor: false,
                    },
                  })}
                  className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
                >
                  <Video className="w-4 h-4" /> Join Video Consultation Now
                </button>
                <button
                  onClick={() => navigate(-1)}
                  className="w-full sm:w-auto bg-white text-slate-900 border border-slate-200 px-7 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-50 transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Results
                </button>
                <button
                  onClick={() => navigate('/doctor-portal')}
                  className="w-full sm:w-auto bg-indigo-600 text-white px-7 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all shadow-xl flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" /> View in Portal
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default VirtualClinic;
