import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showHelp, setShowHelp] = useState(false)
  const [gates, setGates] = useState([])
  const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
  
  const venueName = localStorage.getItem('mb_venue_name') || ''
  const seatZone = localStorage.getItem('mb_seat_zone') || ''
  const hasSavedParking = !!localStorage.getItem('mb_parking_saved')

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    const fetchGates = async () => {
      const slug = venueName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      try {
        const res = await fetch(`/api/crowd/density/${slug}`)
        if (res.ok) {
          const data = await res.json()
          setGates(data.gates || [])
        }
      } catch (e) {
        console.warn('Failed to fetch gate density')
      }
    }
    fetchGates()
  }, [venueName])

  const reportGate = async (gate_id) => {
    const slug = venueName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    try {
      await fetch('/api/crowd/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gate_id, density: 'moderate', venue_id: slug })
      })
      setGates(gates.map(g => g.gate_id === gate_id ? { ...g, density: 'moderate' } : g))
    } catch (e) {
      console.warn('Failed to report gate')
    }
  }

  const navigateAction = (path) => {
    navigate(path)
  }

  return (
    <div className="bg-surface-dim text-on-surface min-h-screen antialiased flex flex-col pt-16 pb-24">
      {/* TopAppBar */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-[#131313] bg-gradient-to-b from-[#1C1B1B] to-transparent shadow-[0px_0px_32px_rgba(173,198,255,0.06)]">
        <button className="text-[#ADC6FF] hover:bg-[#2A2A2A] transition-colors active:scale-95 duration-200 p-2 rounded-full flex items-center justify-center" aria-label="Open Menu">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">shield</span>
        </button>
        <div className="font-['Inter'] font-black tracking-tight uppercase text-xl text-[#ADC6FF] bg-clip-text text-transparent bg-gradient-to-br from-[#ADC6FF] to-[#4D8EFF]">
            MATCHBUDDY
        </div>
        <button className="text-[#ADC6FF] hover:bg-[#2A2A2A] transition-colors active:scale-95 duration-200 p-1 rounded-full flex items-center justify-center overflow-hidden w-8 h-8 relative" aria-label="User Profile">
          <img alt="User Profile" className="w-full h-full object-cover" src="/images/cat_mascot_icon.png"/>
          <div className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} aria-label={isOnline ? "Online" : "Offline"}></div>
        </button>
      </header>

      <main className="flex-1 flex flex-col px-6 py-6 gap-8 overflow-y-auto">
        {/* Hero SOS Section */}
        <section className="flex flex-col items-center">
          <div onClick={() => navigateAction('/sos')} onKeyDown={(e) => e.key === 'Enter' && navigateAction('/sos')} role="button" tabIndex="0" aria-label="Trigger Emergency SOS" className="cursor-pointer w-full max-w-md bg-surface-container-lowest rounded-2xl p-4 shadow-[inset_0px_0px_20px_rgba(147,0,10,0.1)]">
            <button className="w-full relative flex items-center justify-center bg-error-container rounded-xl py-6 overflow-hidden active:scale-95 transition-transform duration-300 shadow-[0_0_32px_rgba(255,180,171,0.2)]" tabIndex="-1">
              <div className="absolute inset-0 bg-error opacity-10 blur-md"></div>
              <div className="relative z-10 flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-4xl text-error drop-shadow-[0_0_10px_rgba(255,180,171,0.5)]" style={{ fontVariationSettings: "'FILL' 1" }}>sos</span>
                <span className="font-headline font-black tracking-widest text-lg text-error">EMERGENCY SOS</span>
              </div>
            </button>
          </div>
        </section>

        {/* 2x2 Feature Grid */}
        <section className="grid grid-cols-2 gap-4">
          <div onClick={() => navigateAction('/vehicle')} onKeyDown={(e) => e.key === 'Enter' && navigateAction('/vehicle')} role="button" tabIndex="0" aria-label="Find My Car" className="cursor-pointer bg-surface-container-low rounded-xl p-5 flex flex-col gap-3 active:scale-95 transition-transform duration-200 border border-outline-variant/10 shadow-[0_4px_20px_rgba(0,0,0,0.2)] relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center border border-outline-variant/20 shadow-[0_0_15px_rgba(173,198,255,0.05)]">
              <span className="material-symbols-outlined text-primary-fixed-dim" style={{ fontVariationSettings: "'FILL' 1" }}>directions_car</span>
            </div>
            <div>
              <h3 className="font-headline font-bold text-on-surface text-base">Find My Car</h3>
              <p className="font-body text-xs text-on-surface-variant mt-1">Locate parked vehicle</p>
            </div>
          </div>
          
          <div onClick={() => navigateAction('/crowd')} onKeyDown={(e) => e.key === 'Enter' && navigateAction('/crowd')} role="button" tabIndex="0" aria-label="Exit Smart Routing" className="cursor-pointer bg-surface-container-low rounded-xl p-5 flex flex-col gap-3 active:scale-95 transition-transform duration-200 border border-outline-variant/10 shadow-[0_4px_20px_rgba(0,0,0,0.2)] relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-tertiary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center border border-outline-variant/20 shadow-[0_0_15px_rgba(255,183,134,0.05)]">
              <span className="material-symbols-outlined text-tertiary-fixed-dim" style={{ fontVariationSettings: "'FILL' 1" }}>traffic</span>
            </div>
            <div>
              <h3 className="font-headline font-bold text-on-surface text-base">Exit Smart</h3>
              <p className="font-body text-xs text-on-surface-variant mt-1">Fastest routes out</p>
            </div>
          </div>

          <div onClick={() => navigateAction('/meet')} onKeyDown={(e) => e.key === 'Enter' && navigateAction('/meet')} role="button" tabIndex="0" aria-label="Meet Point" className="cursor-pointer bg-surface-container-low rounded-xl p-5 flex flex-col gap-3 active:scale-95 transition-transform duration-200 border border-outline-variant/10 shadow-[0_4px_20px_rgba(0,0,0,0.2)] relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center border border-outline-variant/20 shadow-[0_0_15px_rgba(173,198,255,0.05)]">
              <span className="material-symbols-outlined text-primary-fixed-dim" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
            </div>
            <div>
              <h3 className="font-headline font-bold text-on-surface text-base">Meet Point</h3>
              <p className="font-body text-xs text-on-surface-variant mt-1">Set family reunion</p>
            </div>
          </div>

          <div onClick={() => setShowHelp(true)} onKeyDown={(e) => e.key === 'Enter' && setShowHelp(true)} role="button" tabIndex="0" aria-label="Venue Info" className="cursor-pointer bg-surface-container-low rounded-xl p-5 flex flex-col gap-3 active:scale-95 transition-transform duration-200 border border-outline-variant/10 shadow-[0_4px_20px_rgba(0,0,0,0.2)] relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center border border-outline-variant/20 shadow-[0_0_15px_rgba(173,198,255,0.05)]">
              <span className="material-symbols-outlined text-primary-fixed-dim" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
            </div>
            <div>
              <h3 className="font-headline font-bold text-on-surface text-base">Venue Info</h3>
              <p className="font-body text-xs text-on-surface-variant mt-1">Facilities & rules</p>
            </div>
          </div>
        </section>

        {/* Gate Crowd Density */}
        <section className="flex flex-col gap-4 mt-4">
          <div className="flex justify-between items-center">
            <h2 className="font-headline font-bold text-sm tracking-wide text-on-surface uppercase">Gate Crowd Density</h2>
            <button onClick={() => navigateAction('/crowd')} className="text-primary text-xs font-medium hover:text-primary-container transition-colors" aria-label="View Crowd Map">View Map</button>
          </div>
          
          <div className="flex overflow-x-auto gap-3 pb-4 -mx-6 px-6 snap-x hide-scrollbar" style={{scrollbarWidth: 'none'}}>
            {gates.length > 0 ? gates.map(gate => {
              const bgMap = {
                low: 'bg-[#22C55E] shadow-[0_0_8px_rgba(34,197,94,0.6)]',
                moderate: 'bg-tertiary shadow-[0_0_8px_rgba(255,183,134,0.6)]',
                high: 'bg-error shadow-[0_0_8px_rgba(255,180,171,0.6)]'
              }
              const densityTitle = gate.density === "low" ? "Low" : (gate.density === "moderate" ? "Med" : "High")
              const waitMap = { low: '2 mins', moderate: '12 mins', high: '25+ mins' }
              return (
                <div key={gate.gate_id} onClick={() => reportGate(gate.gate_id)} className="cursor-pointer snap-start flex-shrink-0 w-48 bg-surface-container-lowest rounded-xl p-4 flex flex-col gap-3 border border-outline-variant/10 shadow-[inset_0_2px_10px_rgba(255,255,255,0.02)]">
                  <div className="flex justify-between items-start">
                    <span className="font-headline font-bold text-on-surface text-lg">{gate.gate_id}</span>
                    <div className="bg-surface-container-highest px-2 py-1 rounded-full flex items-center gap-1.5 border border-outline-variant/20 shadow-sm">
                      <div className={`w-1.5 h-1.5 rounded-full ${bgMap[gate.density] || bgMap.low}`}></div>
                      <span className="font-label text-[10px] font-bold text-on-surface uppercase tracking-wider">{densityTitle}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-sm">groups</span>
                    <span className="font-label text-xs">Est. wait: {waitMap[gate.density] || 'Unknown'}</span>
                  </div>
                </div>
              )
            }) : (
              <div className="text-sm text-on-surface-variant py-2">No gate reports yet — be the first to report check-in!</div>
            )}
          </div>
        </section>

        <div className="mt-8 mb-4 flex justify-center items-center gap-2 text-[#ADC6FF] opacity-60">
          <div className="font-['Inter'] text-[10px] font-black uppercase tracking-[0.2em]">Made with Love by BilotaAI</div>
          <span className="text-sm">🐾</span>
        </div>
      </main>

      {/* BottomNavBar */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-3 bg-[#0E0E0E]/80 backdrop-blur-xl rounded-t-[1.5rem] border-t border-[#424754]/15 shadow-[0_-8px_32px_rgba(0,0,0,0.5)] md:hidden">
        <button onClick={() => navigateAction('/')} className="flex flex-col items-center justify-center text-[#ADC6FF] bg-[#2A2A2A] rounded-xl px-4 py-1 hover:text-[#ADC6FF] hover:opacity-100 active:scale-90 transition-all duration-300 ease-[spring(1,100,20,0)]" aria-label="Home">
          <span className="material-symbols-outlined text-xl mb-1" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden="true">home</span>
          <span className="font-['Inter'] text-[10px] font-medium uppercase tracking-widest">Home</span>
        </button>
        <button onClick={() => navigateAction('/vehicle')} className="flex flex-col items-center justify-center text-[#C2C6D6] opacity-60 hover:text-[#ADC6FF] hover:opacity-100 active:scale-90 transition-all duration-300 ease-[spring(1,100,20,0)] px-4 py-1" aria-label="Navigate">
          <span className="material-symbols-outlined text-xl mb-1">near_me</span>
          <span className="font-['Inter'] text-[10px] font-medium uppercase tracking-widest">Nav</span>
        </button>
        <button onClick={() => navigateAction('/crowd')} className="flex flex-col items-center justify-center text-[#C2C6D6] opacity-60 hover:text-[#ADC6FF] hover:opacity-100 active:scale-90 transition-all duration-300 ease-[spring(1,100,20,0)] px-4 py-1" aria-label="Crowd Map">
          <span className="material-symbols-outlined text-xl mb-1" aria-hidden="true">groups</span>
          <span className="font-['Inter'] text-[10px] font-medium uppercase tracking-widest">Crowd</span>
        </button>
        <button className="flex flex-col items-center justify-center text-[#C2C6D6] opacity-60 hover:text-[#ADC6FF] hover:opacity-100 active:scale-90 transition-all duration-300 ease-[spring(1,100,20,0)] px-4 py-1">
          <span className="material-symbols-outlined text-xl mb-1">person</span>
          <span className="font-['Inter'] text-[10px] font-medium uppercase tracking-widest">Profile</span>
        </button>
      </nav>

      {/* HELP BOTTOM SHEET */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
          <div className="bg-surface-container-highest w-full rounded-t-3xl p-6 slide-up">
            <h2 className="text-xl font-bold mb-4 font-headline text-on-surface">Venue Help</h2>
            <div className="space-y-4 text-on-surface-variant font-body mb-8">
              <p><strong>Emergency:</strong> 100 (Police), 108 (Ambulance), 101 (Fire)</p>
              <p><strong>Security:</strong> Contact nearest security post</p>
            </div>
            <button 
              onClick={() => setShowHelp(false)}
              className="w-full bg-gradient-to-br from-primary to-primary-container text-on-primary-container font-bold h-14 rounded-2xl touch-active"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
