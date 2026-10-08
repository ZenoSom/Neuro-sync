import React from 'react'
import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import AssessmentPage from './pages/AssessmentPage'
import ResultPage from './pages/ResultPage'
import ProgressPage from './pages/ProgressPage'
import TrackerPage from './pages/TrackerPage'
import DoctorPortal from './pages/DoctorPortal'
import VirtualClinic from './pages/VirtualClinic'
import ConsultationRoom from './pages/ConsultationRoom'
import { AuthProvider } from './context/AuthContext'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/assessment" element={<AssessmentPage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/tracker" element={<TrackerPage />} />
        <Route path="/doctor-portal" element={<DoctorPortal />} />
        <Route path="/clinic" element={<VirtualClinic />} />
        <Route path="/consultation/:roomId" element={<ConsultationRoom />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
