import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Onboarding from './components/Onboarding'
import Home from './components/Home'
import SOSFlow from './components/SOSFlow'
import SOSStatus from './components/SOSStatus'
import FindMyRide from './components/FindMyRide'
import CrowdExitGuide from './components/CrowdExitGuide'
import MeetPoint from './components/MeetPoint'
import AdminDashboard from './components/AdminDashboard'

function App() {
  // Reactive state — updates when onboarding completes and sets localStorage
  const [isOnboarded, setIsOnboarded] = useState(
    () => !!localStorage.getItem('mb_user_name')
  )

  // Listen for storage changes (from Onboarding completing)
  useEffect(() => {
    const onStorage = () => {
      setIsOnboarded(!!localStorage.getItem('mb_user_name'))
    }
    window.addEventListener('storage', onStorage)
    // Also listen for a custom event dispatched after onboarding
    window.addEventListener('mb-onboarded', onStorage)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('mb-onboarded', onStorage)
    }
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/onboard" element={<Onboarding />} />
        <Route path="/" element={
          isOnboarded
            ? <Home />
            : <Navigate to="/onboard" replace />
        } />
        <Route path="/sos" element={<SOSFlow />} />
        <Route path="/sos/status" element={<SOSStatus />} />
        <Route path="/vehicle" element={<FindMyRide />} />
        <Route path="/crowd" element={<CrowdExitGuide />} />
        <Route path="/meet" element={<MeetPoint />} />
        <Route path="/meet/:meet_id" element={<MeetPoint viewMode />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
