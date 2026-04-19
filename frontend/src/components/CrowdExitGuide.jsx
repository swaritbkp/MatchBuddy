import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function CrowdExitGuide() {
  const navigate = useNavigate()
  const [gates, setGates] = useState([])
  const [advice, setAdvice] = useState('')
  const [loading, setLoading] = useState(true)
  const [adviceLoading, setAdviceLoading] = useState(false)

  const venueName = localStorage.getItem('mb_venue_name') || 'Stadium'
  const seatZone = localStorage.getItem('mb_seat_zone') || 'Section A'

  useEffect(() => {
    const fetchDensity = async () => {
      setLoading(true)
      let resolvedGates = []
      try {
        const slug = venueName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        const res = await fetch(`/api/crowd/density/${slug}`)
        if (res.ok) {
          const data = await res.json()
          resolvedGates = data.gates || []
        }
      } catch (e) {
        console.warn('Failed to fetch crowd density')
      }

      // Use fallback demo data if no live reports exist
      if (resolvedGates.length === 0) {
        resolvedGates = [
          { gate_id: 'Gate 4 South', density: 'low' },
          { gate_id: 'Gate 2 East', density: 'moderate' },
          { gate_id: 'Main Concourse', density: 'high' },
        ]
      }
      setGates(resolvedGates)
      setLoading(false)

      // Fetch AI exit advice from Gemini
      fetchExitAdvice(resolvedGates)
    }

    fetchDensity()
  }, [venueName])

  const fetchExitAdvice = async (gateList) => {
    setAdviceLoading(true)
    try {
      const densityPayload = gateList.map(g => ({
        gate_id: g.gate_id,
        density: g.density,
      }))
      const res = await fetch('/api/crowd/exit-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seat_zone: seatZone,
          venue_name: venueName,
          gate_density: densityPayload,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setAdvice(data.gemini_advice || '')
      }
    } catch (e) {
      console.warn('Failed to fetch exit advice')
    }
    setAdviceLoading(false)
  }

  return (
    <div className="bg-surface-dim text-on-surface min-h-screen flex flex-col pt-16 pb-24 overflow-x-hidden">
        {/* TopAppBar */}
        <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-[#131313] bg-gradient-to-b from-[#1C1B1B] to-transparent shadow-[0px_0px_32px_rgba(173,198,255,0.06)]">
            <button onClick={() => navigate('/')} className="text-[#ADC6FF] hover:bg-[#2A2A2A] transition-colors active:scale-95 duration-200 p-2 rounded-full">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
            </button>
            <h1 className="font-['Inter'] font-black tracking-tight uppercase text-xl text-[#ADC6FF] bg-clip-text text-transparent bg-gradient-to-br from-[#ADC6FF] to-[#4D8EFF]">MATCHBUDDY</h1>
            <button className="w-8 h-8 rounded-full bg-surface-container-highest overflow-hidden hover:bg-[#2A2A2A] transition-colors active:scale-95 duration-200">
                <img alt="User Avatar" className="w-full h-full object-cover" src="/images/cat_mascot_icon.png"/>
            </button>
        </header>

        {/* Main Content Canvas */}
        <main className="flex-grow flex flex-col w-full max-w-4xl mx-auto px-4 sm:px-6 relative gap-6 mt-4">
            
            {/* Header Section */}
            <div className="flex flex-col gap-1 z-10">
                <h2 className="text-3xl font-black tracking-tighter text-on-surface uppercase mb-1">Evacuation <span className="text-primary opacity-80">Routing</span></h2>
                <p className="text-on-surface-variant text-sm font-medium tracking-wide">Stadium Crowd Density & Optimal Exits</p>
            </div>

            {/* AI Exit Advice Banner */}
            {(advice || adviceLoading) && (
              <div className="bg-surface-container-low rounded-xl p-4 border border-primary/20 shadow-[0_0_24px_rgba(173,198,255,0.08)]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                  <span className="text-xs font-bold text-primary tracking-widest uppercase">Gemini AI Advice</span>
                </div>
                {adviceLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm text-on-surface-variant">Analysing crowd patterns...</span>
                  </div>
                ) : (
                  <p className="text-sm text-on-surface font-medium leading-relaxed">{advice}</p>
                )}
              </div>
            )}

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 auto-rows-min">
                
                {/* Interactive Map Card */}
                <div className="md:col-span-8 bg-surface-container-low rounded-xl p-1 relative overflow-hidden flex flex-col shadow-[0_0_32px_rgba(173,198,255,0.06)] h-[400px] md:h-auto min-h-[400px]">
                    <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-start pointer-events-none">
                        <div className="bg-surface-container-highest/80 backdrop-blur-xl rounded-lg p-3 pointer-events-auto shadow-[0_4px_24px_rgba(0,0,0,0.5)] border border-outline-variant/15">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse"></div>
                                <span className="text-xs font-bold tracking-widest text-on-surface uppercase">Live Tracking</span>
                            </div>
                        </div>
                        <div className="bg-surface-container-highest/80 backdrop-blur-xl rounded-lg p-2 flex flex-col gap-2 pointer-events-auto border border-outline-variant/15">
                            <div className="flex items-center gap-2 text-xs font-medium text-on-surface-variant">
                                <div className="w-3 h-3 rounded-full bg-green-500/80 border border-green-400"></div> Low
                            </div>
                            <div className="flex items-center gap-2 text-xs font-medium text-on-surface-variant">
                                <div className="w-3 h-3 rounded-full bg-yellow-500/80 border border-yellow-400"></div> Med
                            </div>
                            <div className="flex items-center gap-2 text-xs font-medium text-on-surface-variant">
                                <div className="w-3 h-3 rounded-full bg-red-500/80 border border-red-400"></div> High
                            </div>
                        </div>
                    </div>

                    <div className="flex-grow bg-surface-container-lowest rounded-lg relative overflow-hidden flex items-center justify-center inset-0">
                        <div className="absolute w-[80%] h-[70%] border-4 border-outline-variant/20 rounded-[4rem] flex items-center justify-center">
                            <div className="w-[70%] h-[60%] border-2 border-outline-variant/10 rounded-[3rem]"></div>
                            
                            <div className="absolute top-0 left-1/4 w-1/2 h-1/4 bg-red-500/20 blur-xl rounded-full"></div>
                            <div className="absolute top-1/4 right-0 w-1/4 h-1/2 bg-yellow-500/20 blur-xl rounded-full"></div>
                            <div className="absolute top-1/4 left-0 w-1/4 h-1/2 bg-green-500/20 blur-xl rounded-full"></div>
                            <div className="absolute bottom-0 left-1/4 w-1/2 h-1/4 bg-green-500/10 blur-xl rounded-full"></div>

                            <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
                                <path className="animate-dash" d="M 50 30 C 50 50, 20 50, 20 80" fill="none" stroke="url(#routeGradient)" strokeDasharray="4,4" strokeWidth="2"></path>
                                <defs>
                                    <linearGradient id="routeGradient" x1="0%" x2="0%" y1="0%" y2="100%">
                                        <stop offset="0%" stopColor="#adc6ff"></stop>
                                        <stop offset="100%" stopColor="#4d8eff"></stop>
                                    </linearGradient>
                                </defs>
                            </svg>

                            <div className="absolute top-[30%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full shadow-[0_0_16px_rgba(173,198,255,0.8)] z-10 border-2 border-surface-container-lowest"></div>
                            
                            <div className="absolute bottom-[20%] left-[20%] -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
                                <div className="bg-surface-container-highest px-3 py-1 rounded-full border border-green-500/50 mb-1">
                                    <span className="text-[10px] font-bold text-green-400">{gates[0] ? gates[0].gate_id : 'EXIT A'}</span>
                                </div>
                                <span className="material-symbols-outlined text-green-400" style={{ fontVariationSettings: "'FILL' 1" }}>logout</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Side Panel (Routing Info) */}
                <div className="md:col-span-4 flex flex-col gap-4">
                    <div className="bg-surface-container-low rounded-xl p-4 shadow-[0_0_32px_rgba(173,198,255,0.04)] border border-outline-variant/10 relative overflow-hidden group hover:bg-surface-container-high transition-colors duration-300">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-2xl rounded-full pointer-events-none"></div>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <span className="text-xs font-bold text-primary tracking-widest uppercase mb-1 block">Optimal Route</span>
                                <h3 className="text-lg font-black text-on-surface">{gates.length > 0 ? gates[0].gate_id : 'Gate 4 South'}</h3>
                            </div>
                            <div className="bg-surface-container-lowest p-2 rounded-lg border border-outline-variant/20">
                                <span className="text-xl font-bold text-on-surface">4<span className="text-sm text-on-surface-variant font-medium ml-1">min</span></span>
                            </div>
                        </div>
                        
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-surface-container-lowest flex items-center justify-center border border-outline-variant/20">
                                    <span className="material-symbols-outlined text-sm text-on-surface-variant">directions_walk</span>
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-medium text-on-surface">Clear Path</div>
                                    <div className="text-xs text-on-surface-variant">Low density concourse</div>
                                </div>
                                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                            </div>
                            
                            <div className="w-full h-[1px] bg-outline-variant/15"></div>
                            <button className="w-full py-3 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary-container font-bold text-sm hover:opacity-90 active:scale-95 transition-all shadow-[0_0_24px_rgba(173,198,255,0.2)]">
                                START NAVIGATION
                            </button>
                        </div>
                    </div>

                    <div className="px-2 pt-2">
                        <h4 className="text-xs font-bold text-on-surface-variant tracking-widest uppercase">Alternatives</h4>
                    </div>

                    {gates.slice(1).map((gate, i) => {
                        const isMod = gate.density === 'moderate'
                        return (
                            <div key={gate.gate_id} className={`bg-surface-container-lowest rounded-xl p-3 border border-outline-variant/10 flex items-center justify-between hover:bg-surface-container-low transition-colors cursor-pointer ${!isMod ? 'opacity-70' : ''}`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center">
                                        <span className="material-symbols-outlined text-on-surface-variant">{isMod ? 'door_open' : 'door_front'}</span>
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-on-surface">{gate.gate_id}</div>
                                        <div className={`text-xs ${isMod ? 'text-yellow-500' : 'text-red-500'} font-medium flex items-center gap-1`}>
                                            <span className="material-symbols-outlined text-[10px]">{isMod ? 'warning' : 'block'}</span> {isMod ? 'Moderate Traffic' : 'Heavy Congestion'}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-base font-bold text-on-surface">{isMod ? '8' : '15'}<span className="text-xs text-on-surface-variant ml-1">min</span></span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </main>
    </div>
  )
}
