import React from 'react'
import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import AssessmentPage from './pages/AssessmentPage'
import ResultPage from './pages/ResultPage'
import ProgressPage from './pages/ProgressPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/assessment" element={<AssessmentPage />} />
      <Route path="/result" element={<ResultPage />} />
      <Route path="/progress" element={<ProgressPage />} />
    </Routes>
  )
}

export default App
