import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, ShieldCheck, UserPlus, Stethoscope, Briefcase, CalendarClock, ArrowLeft, CheckCircle2, CalendarCheck, XCircle, Clock, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DoctorPortal = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    type: 'Clinical Psychologist',
    specialized: ['Mild'],
    availability: 'Available Today'
  });
  const [registered, setRegistered] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('register'); // 'register' | 'dashboard' | 'appointments'
  const [patientHistory, setPatientHistory] = useState([]);
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('registeredDoctors') || '[]');
    setRegistered(stored);
    const history = JSON.parse(localStorage.getItem('adhd_assessment_history') || '[]');
    setPatientHistory(history.reverse());
    const appts = JSON.parse(localStorage.getItem('adhd_appointments') || '[]');
    setAppointments(appts.reverse());
  }, []);

  const updateAppointmentStatus = (id, status) => {
    const all = JSON.parse(localStorage.getItem('adhd_appointments') || '[]');
    const updated = all.map(a => a.id === id ? { ...a, status } : a);
    localStorage.setItem('adhd_appointments', JSON.stringify(updated));
    setAppointments(updated.reverse());
  };

  const handleSpecializedChange = (level) => {
    setFormData(prev => {
      const current = prev.specialized;
      if (current.includes(level)) {
        // Prevent deselecting if it's the only one
        if (current.length === 1) return prev;
        return { ...prev, specialized: current.filter(l => l !== level) };
      }
      return { ...prev, specialized: [...current, level] };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    const newDoc = {
      id: Date.now(),
      name: `Dr. ${formData.name}`,
      type: formData.type,
      specialized: formData.specialized,
      availability: formData.availability
    };

    const updated = [newDoc, ...registered];
    localStorage.setItem('registeredDoctors', JSON.stringify(updated));
    setRegistered(updated);
    setShowSuccess(true);
    setFormData(prev => ({ ...prev, name: '' }));

    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 py-12 px-4 selection:bg-indigo-500/20 selection:text-indigo-900 relative overflow-hidden"
    >
      {/* Background Orbs */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden fixed">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-300/20 blur-[100px] animate-float-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-emerald-300/20 blur-[120px] animate-float-medium animation-delay-2000" />
      </div>

      <div className="max-w-4xl mx-auto space-y-10 relative z-10">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-center justify-between glass-card-dark p-8 rounded-[2.5rem] relative overflow-hidden group border-t-white border-l-white">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-400/10 blur-[50px] pointer-events-none group-hover:bg-indigo-400/20 transition-colors duration-700" />
          <div className="flex items-center gap-8 relative z-10">
            <button 
              onClick={() => navigate(-1)} 
              className="group/btn flex items-center gap-3 text-indigo-600 hover:text-indigo-800 transition-all font-black uppercase tracking-widest text-xs cursor-pointer"
            >
              <div className="p-3 bg-indigo-50/80 rounded-2xl group-hover/btn:bg-indigo-100 group-hover/btn:shadow-md transition-all">
                <ArrowLeft className="w-5 h-5" />
              </div>
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="h-12 w-px bg-indigo-100 hidden md:block" />
            <div className="flex items-center gap-5">
              <div className="p-4 bg-emerald-600 rounded-2xl shadow-[0_10px_30px_rgba(16,185,129,0.3)]">
                <Stethoscope className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">Specialist Portal</h1>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.4em] mt-2">Clinical Provider Access</p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 bg-indigo-50/50 p-1.5 rounded-2xl border border-indigo-100 z-10 mt-6 md:mt-0">
            <button 
              onClick={() => setActiveTab('register')}
              className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'register' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-indigo-600'}`}
            >
              Registration
            </button>
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-indigo-600'}`}
            >
              Patients
            </button>
            <button 
              onClick={() => setActiveTab('appointments')}
              className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'appointments' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-indigo-600'}`}
            >
              <CalendarCheck className="w-3 h-3" /> Appointments
              {appointments.filter(a => a.status === 'confirmed').length > 0 && (
                <span className="w-5 h-5 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                  {appointments.filter(a => a.status === 'confirmed').length}
                </span>
              )}
            </button>
          </div>
        </div>

        {activeTab === 'register' ? (
          <>
            {/* REGISTRATION FORM */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card-dark p-10 md:p-14 rounded-[3rem] relative overflow-hidden border-t-white border-l-white"
        >
          <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-emerald-400/10 blur-[60px] pointer-events-none" />
          
          <div className="mb-10 relative z-10">
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Join the Network</h2>
            <p className="text-slate-500 font-medium mt-2">Register your clinical services to receive AI-triaged patient bookings.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
            
            <div className="space-y-3">
              <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                <UserPlus className="w-3 h-3" /> Provider Name
              </label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Dr.</span>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-white/50 backdrop-blur-md border border-slate-200 pl-14 pr-5 py-4 rounded-2xl font-black text-slate-900 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  placeholder="Jane Doe"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                  <Briefcase className="w-3 h-3" /> Specialization
                </label>
                <select 
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                  className="w-full bg-white/50 backdrop-blur-md border border-slate-200 px-5 py-4 rounded-2xl font-bold text-slate-700 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer"
                >
                  <option>Clinical Psychologist</option>
                  <option>Psychiatrist & Neurologist</option>
                  <option>Behavioral Therapist</option>
                  <option>Neurodevelopmental Pediatrician</option>
                  <option>ADHD Specialist</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                  <CalendarClock className="w-3 h-3" /> Current Availability
                </label>
                <select 
                  value={formData.availability}
                  onChange={e => setFormData({...formData, availability: e.target.value})}
                  className="w-full bg-white/50 backdrop-blur-md border border-slate-200 px-5 py-4 rounded-2xl font-bold text-slate-700 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer"
                >
                  <option>Available Today</option>
                  <option>Next Available: Tomorrow</option>
                  <option>Available in 2 Days</option>
                  <option>Available Next Week</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="w-3 h-3" /> Severity Levels Handled
              </label>
              <div className="flex flex-wrap gap-3">
                {['Mild', 'Moderate', 'High'].map(level => {
                  const isActive = formData.specialized.includes(level);
                  return (
                    <button
                      type="button"
                      key={level}
                      onClick={() => handleSpecializedChange(level)}
                      className={`px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs border transition-all ${
                        isActive ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-white/50 border-slate-200 text-slate-500 hover:border-indigo-300'
                      }`}
                    >
                      {level}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="pt-4 flex items-center gap-6">
              <button 
                type="submit"
                className="bg-slate-900 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-slate-800 transition-all shadow-xl active:scale-95 flex items-center gap-3"
              >
                <ShieldCheck className="w-5 h-5" /> Enlist in Network
              </button>
              
              {showSuccess && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 text-emerald-600 font-bold"
                >
                  <CheckCircle2 className="w-5 h-5" /> Registration Successful!
                </motion.div>
              )}
            </div>
          </form>
        </motion.div>

        {/* LIST OF DOCTORS */}
        {registered.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6 pb-20"
          >
            <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase px-4 flex items-center gap-3">
              <Activity className="w-5 h-5 text-indigo-600" /> New Local Providers
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              {registered.map((doc) => (
                <div key={doc.id} className="glass-card-dark p-6 rounded-[2rem] border-t-white border-l-white flex items-center justify-between group">
                  <div>
                     <h4 className="font-black text-slate-900 text-lg tracking-tight">{doc.name}</h4>
                     <p className="text-[10px] text-indigo-600 font-black tracking-widest uppercase mt-1 mb-3">{doc.type}</p>
                     <div className="flex gap-2 mb-3">
                        {doc.specialized.map(s => (
                          <span key={s} className="px-2 py-1 bg-slate-100 rounded-md text-[9px] font-bold text-slate-500 uppercase">{s}</span>
                        ))}
                     </div>
                     <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                       <p className="text-xs text-slate-500 font-bold">{doc.availability}</p>
                     </div>
                  </div>
                </div>
              ))}
            </div>
            </motion.div>
          )}
        </>
        ) : (
          /* PATIENT DASHBOARD */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 pb-20"
          >
            <div className="flex items-center justify-between px-4">
               <div>
                 <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Incoming Assessments</h2>
                 <p className="text-sm text-slate-500 font-medium mt-1">Review AI-triaged patient data securely.</p>
               </div>
               <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-indigo-100 flex items-center gap-2">
                 <ShieldCheck className="w-4 h-4" /> HIPAA Compliant View
               </div>
            </div>

            {patientHistory.length === 0 ? (
              <div className="glass-card-dark p-12 rounded-[3rem] text-center border border-slate-200">
                <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-black text-slate-900">No Patients in Queue</h3>
                <p className="text-slate-500 mt-2">When users complete the assessment, their data will appear here.</p>
              </div>
            ) : (
              <div className="grid lg:grid-cols-2 gap-8">
                {patientHistory.map((patient, idx) => {
                  const severity = patient.result?.severity || 'Unknown';
                  const color = severity === 'High' ? 'rose' : severity === 'Moderate' ? 'amber' : 'emerald';
                  
                  return (
                    <div key={idx} className="glass-card-dark p-8 rounded-[2.5rem] border-t-white border-l-white relative group overflow-hidden">
                      <div className={`absolute top-0 right-0 w-32 h-32 bg-${color}-400/10 blur-[40px] pointer-events-none transition-colors duration-700`} />
                      
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                            {new Date(patient.date).toLocaleDateString()} &bull; {new Date(patient.date).toLocaleTimeString()}
                          </p>
                          <h4 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Patient #{idx + 1042}</h4>
                        </div>
                        <div className={`px-4 py-2 rounded-xl border font-black uppercase tracking-widest text-[10px] ${
                          severity === 'High' ? 'bg-rose-50 text-rose-600 border-rose-200' : 
                          severity === 'Moderate' ? 'bg-amber-50 text-amber-600 border-amber-200' : 
                          'bg-emerald-50 text-emerald-600 border-emerald-200'
                        }`}>
                          {severity} Risk
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 mb-6">
                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Confidence</p>
                          <p className="text-lg font-black text-slate-800">{Math.round((patient.result?.confidence || 0) * 100)}%</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Focus State</p>
                          <p className="text-sm font-black text-indigo-600 truncate">{patient.inputData?.tracked_expression || 'N/A'}</p>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Age / Sex</p>
                          <p className="text-lg font-black text-slate-800">{patient.inputData?.age || '--'}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1">
                          <Activity className="w-3 h-3" /> Telemetry Data
                        </p>
                        <div className="text-xs font-semibold text-slate-600 bg-white/50 p-4 rounded-2xl border border-slate-100 flex gap-4">
                           <div className="flex-1">
                              <span className="text-slate-400 block mb-1">Fidget Index</span>
                              <span className="text-slate-800 font-black">{patient.inputData?.fidget_index?.toFixed(1) || '0.0'}/10</span>
                           </div>
                           <div className="w-px bg-slate-200" />
                           <div className="flex-1">
                              <span className="text-slate-400 block mb-1">Gaze Deviation</span>
                              <span className="text-slate-800 font-black">{patient.inputData?.gaze_deviation?.toFixed(1) || '0.0'}/10</span>
                           </div>
                        </div>
                      </div>

                      <button className="w-full mt-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-indigo-600 text-white hover:bg-indigo-700 shadow-md transition-all">
                        View Full Clinical Report
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ====== APPOINTMENTS TAB ====== */}
        {activeTab === 'appointments' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 pb-20"
          >
            <div className="flex items-center justify-between px-4">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Scheduled Appointments</h2>
                <p className="text-sm text-slate-500 font-medium mt-1">Manage patient bookings and consultations.</p>
              </div>
              <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-2">
                <CalendarCheck className="w-4 h-4" /> {appointments.length} Total
              </div>
            </div>

            {appointments.length === 0 ? (
              <div className="glass-card-dark p-12 rounded-[3rem] text-center border border-slate-200">
                <CalendarCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-black text-slate-900">No Appointments Yet</h3>
                <p className="text-slate-500 mt-2">When patients book slots, their appointments will appear here.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {appointments.map((appt) => {
                  const statusColors = {
                    confirmed: 'bg-amber-50 text-amber-600 border-amber-200',
                    accepted: 'bg-emerald-50 text-emerald-600 border-emerald-200',
                    cancelled: 'bg-rose-50 text-rose-600 border-rose-200',
                  };
                  return (
                    <div key={appt.id} className="glass-card-dark p-7 rounded-[2rem] border-t-white border-l-white relative group overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-400/10 blur-[40px] pointer-events-none" />
                      
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h4 className="text-xl font-black text-slate-900 tracking-tight">{appt.patientId}</h4>
                            <span className={`px-3 py-1 rounded-lg border font-black uppercase tracking-widest text-[9px] ${statusColors[appt.status] || statusColors.confirmed}`}>
                              {appt.status}
                            </span>
                            {appt.severity && (
                              <span className={`px-3 py-1 rounded-lg border font-black uppercase tracking-widest text-[9px] ${
                                appt.severity === 'High' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                                appt.severity === 'Moderate' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                'bg-emerald-50 text-emerald-600 border-emerald-200'
                              }`}>
                                {appt.severity} Risk
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-6 text-sm">
                            <div className="flex items-center gap-2 text-slate-600">
                              <CalendarClock className="w-4 h-4 text-indigo-500" />
                              <span className="font-bold">{new Date(appt.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-600">
                              <Clock className="w-4 h-4 text-indigo-500" />
                              <span className="font-bold">{appt.time}</span>
                            </div>
                          </div>

                          {appt.notes && (
                            <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 font-medium leading-relaxed">
                              <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block mb-1">Patient Note:</span>
                              {appt.notes}
                            </p>
                          )}

                          <p className="text-[9px] text-slate-400 font-bold">
                            Booking ID: <span className="font-mono text-indigo-500">{appt.id}</span> &bull; Booked {new Date(appt.createdAt).toLocaleDateString()}
                          </p>
                        </div>

                        {appt.status === 'confirmed' && (
                          <div className="flex flex-wrap gap-2.5 shrink-0">
                            <button
                              onClick={() => navigate(`/consultation/${appt.id}`, {
                                state: {
                                  appointment: appt,
                                  isDoctor: true,
                                },
                              })}
                              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] transition-all shadow-md flex items-center gap-1.5"
                            >
                              <Video className="w-3.5 h-3.5" /> Call Now
                            </button>
                            <button
                              onClick={() => updateAppointmentStatus(appt.id, 'accepted')}
                              className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] hover:bg-emerald-700 transition-all shadow-md flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Accept
                            </button>
                            <button
                              onClick={() => updateAppointmentStatus(appt.id, 'cancelled')}
                              className="px-4 py-2.5 rounded-xl bg-white text-rose-600 border border-rose-200 font-black uppercase tracking-widest text-[10px] hover:bg-rose-50 transition-all flex items-center gap-1.5"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Cancel
                            </button>
                          </div>
                        )}

                        {appt.status === 'accepted' && (
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="flex items-center gap-1.5 text-emerald-600 font-black text-xs uppercase tracking-widest">
                              <CheckCircle2 className="w-4 h-4" /> Accepted
                            </div>
                            <button
                              onClick={() => navigate(`/consultation/${appt.id}`, {
                                state: {
                                  appointment: appt,
                                  isDoctor: true,
                                },
                              })}
                              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black uppercase tracking-widest text-[10px] transition-all shadow-md flex items-center gap-2"
                            >
                              <Video className="w-3.5 h-3.5" /> Start Video Consultation
                            </button>
                          </div>
                        )}

                        {appt.status === 'cancelled' && (
                          <div className="flex items-center gap-2 text-rose-500 font-black text-xs uppercase tracking-widest shrink-0">
                            <XCircle className="w-5 h-5" /> Cancelled
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

      </div>
    </motion.div>
  );
};

export default DoctorPortal;
