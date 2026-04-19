import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Onboarding() {
  const [step, setStep] = useState(1)
  const [userName, setUserName] = useState('')
  const [seatZone, setSeatZone] = useState('')
  const [venueName, setVenueName] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [hasFamily, setHasFamily] = useState(false)
  const navigate = useNavigate()

  const handleNext = () => {
    if (step < 4) setStep(step + 1)
  }
  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleFinish = () => {
    localStorage.setItem('mb_user_name', userName)
    localStorage.setItem('mb_seat_zone', seatZone)
    localStorage.setItem('mb_venue_name', venueName)
    localStorage.setItem('mb_contact_name', contactName)
    localStorage.setItem('mb_contact_phone', contactPhone)
    localStorage.setItem('mb_has_family', hasFamily.toString())
    localStorage.setItem('mb_onboarded', 'true')
    // Notify App.jsx that onboarding is complete
    window.dispatchEvent(new Event('mb-onboarded'))
    navigate('/')
  }

  return (
    <div className="flex flex-col h-screen bg-stadium text-white px-5 py-8">
      {/* Progress Dots — 4 steps */}
      <div className="flex justify-center gap-2 mb-8">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`w-2 h-2 rounded-full transition-colors duration-300 ${step >= i ? 'bg-white' : 'bg-gray-700'}`} />
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide pb-20">
        {step === 1 && (
          <div className="flex flex-col items-center justify-center h-full fade-in">
            <div className="text-6xl mb-4">🛡️</div>
            <h1 className="text-3xl font-black mb-2 text-center">Your guardian in the crowd</h1>
            <p className="text-gray-400 text-center mb-10">Takes 30 seconds. Works when you need it most.</p>
            <button 
              onClick={handleNext} 
              className="w-full bg-blue-500 rounded-2xl h-14 font-bold text-lg touch-active"
              role="button"
              aria-label="Get Started"
            >
              Get Started
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="fade-in">
            <button onClick={handleBack} className="text-gray-400 mb-6" aria-label="Back">← Back</button>
            <h2 className="text-2xl font-bold mb-6">Your Details</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Full Name" value={userName} onChange={e => setUserName(e.target.value)} className="w-full h-14 bg-[#1E1E1E] rounded-2xl px-4 text-white focus:outline-none focus:border-2 focus:border-blue-500" aria-label="Full Name"/>
              <input type="text" placeholder="Seat / Zone (e.g. Section C, Row 12)" value={seatZone} onChange={e => setSeatZone(e.target.value)} className="w-full h-14 bg-[#1E1E1E] rounded-2xl px-4 text-white focus:outline-none focus:border-2 focus:border-blue-500" aria-label="Seat or Zone"/>
              <input type="text" placeholder="Venue Name (e.g. DY Patil Stadium)" value={venueName} onChange={e => setVenueName(e.target.value)} className="w-full h-14 bg-[#1E1E1E] rounded-2xl px-4 text-white focus:outline-none focus:border-2 focus:border-blue-500" aria-label="Venue Name"/>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="fade-in">
             <button onClick={handleBack} className="text-gray-400 mb-6" aria-label="Back">← Back</button>
            <h2 className="text-2xl font-bold mb-2">Emergency Contact</h2>
            <p className="text-gray-400 mb-6 text-sm">This person gets notified if you trigger SOS.</p>
            <div className="space-y-4 mb-6">
              <input type="text" placeholder="Contact Name" value={contactName} onChange={e => setContactName(e.target.value)} className="w-full h-14 bg-[#1E1E1E] rounded-2xl px-4 text-white focus:outline-none focus:border-2 focus:border-blue-500" aria-label="Contact Name"/>
              <input type="tel" placeholder="Contact Phone" value={contactPhone} onChange={e => setContactPhone(e.target.value)} className="w-full h-14 bg-[#1E1E1E] rounded-2xl px-4 text-white focus:outline-none focus:border-2 focus:border-blue-500" aria-label="Contact Phone"/>
            </div>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={hasFamily} onChange={e => setHasFamily(e.target.checked)} className="w-6 h-6 rounded bg-[#1E1E1E] border-none" aria-label="I am here with family or children"/>
              <span className="text-sm">I am here with family / children</span>
            </label>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col items-center justify-center h-full fade-in relative">
            <button onClick={handleBack} className="absolute top-0 left-0 text-gray-400" aria-label="Back">← Back</button>
            <div className="text-6xl mb-4 text-green-500 transform transition-transform scale-100 slide-up">✅</div>
            <h2 className="text-2xl font-bold mb-2 text-center">You're all set, {userName}</h2>
            <p className="text-gray-400 text-center mb-8">MatchBuddy is active. SOS is one tap away.</p>
            <button 
              onClick={handleFinish} 
              className="w-full bg-blue-500 rounded-2xl h-14 font-bold text-lg touch-active"
              role="button"
              aria-label="Enter Stadium"
            >
              Enter Stadium
            </button>
          </div>
        )}
      </div>

      {(step === 2 || step === 3) && (
        <div className="fixed bottom-0 left-0 w-full p-5 bg-stadium z-10">
          <button 
            onClick={handleNext} 
            disabled={step === 2 ? (!userName || !seatZone || !venueName) : (!contactName || !contactPhone)}
            className="w-full bg-blue-500 rounded-2xl h-14 font-bold text-lg touch-active disabled:opacity-50 disabled:bg-gray-600 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
            role="button"
            aria-label="Next Step"
          >
            Next
          </button>
        </div>
      )}

      <div className="fixed bottom-2 left-0 w-full flex justify-center items-center gap-2 text-blue-300 opacity-40 pointer-events-none z-0">
        <div className="font-['Inter'] text-[9px] font-black uppercase tracking-[0.2em]">Made with Love by BilotaAI</div>
        <span className="text-sm">🐾</span>
      </div>
    </div>
  )
}
