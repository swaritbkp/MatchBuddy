import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

export default function FindMyRide() {
  const navigate = useNavigate()
  const [hasSaved, setHasSaved] = useState(!!localStorage.getItem('mb_parking_saved'))
  
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsData, setGpsData] = useState(null)
  const [gpsError, setGpsError] = useState(false)
  const [photo, setPhoto] = useState(null)
  const [manualNote, setManualNote] = useState('')
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef(null)

  const [gateLoading, setGateLoading] = useState(false)
  const [gateAdvice, setGateAdvice] = useState(null)

  useEffect(() => {
    if (!hasSaved) {
      setGpsLoading(true)
      navigator.geolocation.getCurrentPosition(
        pos => { setGpsData({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsLoading(false) },
        err => { setGpsError(true); setGpsData({ lat: 0.0, lng: 0.0 }); setGpsLoading(false) },
        { timeout: 5000 }
      )
    }
  }, [hasSaved])

  useEffect(() => {
    if (hasSaved) {
      fetchGateAdvice()
    }
    // eslint-disable-next-line
  }, [hasSaved])

  const fetchGateAdvice = async () => {
    setGateLoading(true)
    const user_gps = await new Promise((res) => {
      navigator.geolocation.getCurrentPosition(pos => res({ lat: pos.coords.latitude, lng: pos.coords.longitude }), () => res({ lat: 0, lng: 0 }))
    })
    const vehicle_lat = parseFloat(localStorage.getItem('mb_parking_lat')) || 0
    const vehicle_lng = parseFloat(localStorage.getItem('mb_parking_lng')) || 0

    try {
      const res = await fetch('/api/vehicle/gate-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_gps_lat: user_gps.lat,
          user_gps_lng: user_gps.lng,
          vehicle_gps_lat: vehicle_lat,
          vehicle_gps_lng: vehicle_lng,
          venue_name: localStorage.getItem('mb_venue_name') || 'Stadium',
          gates: [
             { gate_id: "Gate 1", exit_lat: user_gps.lat + 0.002, exit_lng: user_gps.lng + 0.001 },
             { gate_id: "Gate 2", exit_lat: user_gps.lat - 0.001, exit_lng: user_gps.lng + 0.002 },
             { gate_id: "Gate 3", exit_lat: user_gps.lat + 0.001, exit_lng: user_gps.lng - 0.002 },
             { gate_id: "Gate 4 (East)", exit_lat: user_gps.lat - 0.002, exit_lng: user_gps.lng - 0.002 }
          ]
        })
      })
      if (res.ok) {
          const data = await res.json()
          if (!data.recommended_gate) data.recommended_gate = "Gate 4 (East)"
          setGateAdvice(data)
      }
    } catch (e) {
      console.warn("Gate advice failed")
    }
    setGateLoading(false)
  }

  const handleSave = async () => {
    if (!photo && !manualNote) return
    setSaving(true)
    
    const formData = new FormData()
    formData.append('user_id', localStorage.getItem('mb_user_id'))
    formData.append('gps_lat', gpsData?.lat || 0)
    formData.append('gps_lng', gpsData?.lng || 0)
    formData.append('venue_name', localStorage.getItem('mb_venue_name'))
    formData.append('manual_note', manualNote)
    if (photo) formData.append('photo', photo)

    try {
      const res = await fetch('/api/vehicle/save', {
        method: 'POST',
        body: formData
      })
      if (res.ok) {
        const data = await res.json()
        localStorage.setItem('mb_parking_saved', 'true')
        localStorage.setItem('mb_parking_id', data.parking_id)
        localStorage.setItem('mb_parking_lat', data.gps_lat.toString())
        localStorage.setItem('mb_parking_lng', data.gps_lng.toString())
        localStorage.setItem('mb_parking_label', data.gemini_zone_label)
        localStorage.setItem('mb_parking_note', manualNote)
        setTimeout(() => setHasSaved(true), 2500)
      }
    } catch (e) {
      console.error(e)
      setSaving(false)
    }
  }

  const handleClear = () => {
    if (window.confirm("Replace saved parking location?")) {
      localStorage.removeItem('mb_parking_saved')
      localStorage.removeItem('mb_parking_id')
      localStorage.removeItem('mb_parking_lat')
      localStorage.removeItem('mb_parking_lng')
      localStorage.removeItem('mb_parking_label')
      localStorage.removeItem('mb_parking_note')
      setHasSaved(false)
      setPhoto(null)
      setManualNote('')
      setSaving(false)
    }
  }

  if (hasSaved) {
    const lat = localStorage.getItem('mb_parking_lat')
    const lng = localStorage.getItem('mb_parking_lng')
    return (
      <div className="bg-surface-dim text-on-surface min-h-screen flex flex-col pt-16 pb-24 overflow-hidden">
        {/* TopAppBar */}
        <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-[#131313] bg-gradient-to-b from-[#1C1B1B] to-transparent shadow-[0px_0px_32px_rgba(173,198,255,0.06)]">
          <button onClick={() => navigate('/')} className="text-[#ADC6FF] hover:bg-[#2A2A2A] transition-colors active:scale-95 transition-transform duration-200 p-2 rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
          </button>
          <h1 className="font-['Inter'] font-black tracking-tight uppercase text-xl text-[#ADC6FF] bg-clip-text text-transparent bg-gradient-to-br from-[#ADC6FF] to-[#4D8EFF]">MATCHBUDDY</h1>
          <button className="text-[#ADC6FF] hover:bg-[#2A2A2A] transition-colors active:scale-95 transition-transform duration-200 p-2 rounded-xl flex items-center justify-center">
            <img alt="User profile avatar" className="w-8 h-8 rounded-full object-cover border border-outline-variant/30" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBJDdbkZQxHFGhQ69A_Iby22aageF2LxMCAw7a_uC0235FUM70m4bp8mJCuTGdAfJWdrbb9vPc-AdH2tAC4cPRpHEKzfqLmyWGNPLXeAO75vgn9lsm-UWxkhA6mhBxeNe9zkrRxNU73cGeSBE2TuwkkwH-nh-5I4dSMzn923ujla9X9lyDLXxrUgcQv5IEz-rrMRDRKZ8QFVMqD1zJWQyE9JrFvjhotAYljHZgc-xLjTMnbf9amoYbwnxMlQqyDwKcye02gkCmseug"/>
          </button>
        </header>

        {/* Main Content Area: Map Canvas */}
        <main className="flex-1 relative w-full h-full">
          {/* Live Map Overlay */}
          <div className="absolute inset-0 z-0 bg-surface-container-lowest">
            <img alt="Dark Map" className="w-full h-full object-cover opacity-40 mix-blend-luminosity filter contrast-125 brightness-75" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB-i3A_e2cNe9FUeRgetMbicFLjU8PV4nEY6jeDgEQgJrODMikdesdvpRjV5gkJ8Y35t1mtHQJPdzBfrqkY2m9FWIam8hpHtptzaFqrZUFlDCDd5abHf8BnAfisZQzy8Bf7OQhGNvYHvK7dN_czuP3eJ3X1fqd26nnYD-vWtrIifgh3W7QB9RJafDVSwJKeVMARM65YbAME5uBLeJzIDGkQXd5d1QkY0mGLImiayNCK72y4znRYJbFfry5LzzAd4xhnkrJ8RbNBc2k"/>
            {/* Glowing Path */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 800">
              <path className="drop-shadow-[0_0_8px_rgba(173,198,255,0.6)]" d="M 200,600 Q 180,500 250,400 T 150,250" fill="none" stroke="url(#pathGradient)" strokeDasharray="10 10" strokeLinecap="round" strokeLinejoin="round" strokeWidth="6"></path>
              <defs>
                <linearGradient id="pathGradient" x1="0%" x2="0%" y1="100%" y2="0%">
                  <stop offset="0%" stopColor="#adc6ff" stopOpacity="0.3"></stop>
                  <stop offset="100%" stopColor="#4d8eff"></stop>
                </linearGradient>
              </defs>
            </svg>
            {/* User Pin */}
            <div className="absolute bottom-[25%] left-[50%] transform -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center animate-pulse shadow-[0_0_32px_rgba(173,198,255,0.2)]">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary-container shadow-[0_0_16px_rgba(173,198,255,0.8)] border-2 border-surface-container-lowest"></div>
              </div>
            </div>
            {/* Car Pin */}
            <div className="absolute top-[30%] left-[35%] transform -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
              <div className="bg-surface-container-highest px-3 py-1.5 rounded-lg mb-2 shadow-[0_0_24px_rgba(219,4,24,0.15)] border border-outline-variant/20 backdrop-blur-md">
                <span className="text-xs font-bold tracking-wider text-secondary">{localStorage.getItem('mb_parking_label') || "Vehicle"}</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-secondary-container/20 flex items-center justify-center shadow-[0_0_24px_rgba(255,180,171,0.3)]">
                <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>directions_car</span>
              </div>
            </div>
          </div>

          <div className="relative z-20 flex flex-col h-full justify-between p-4 pointer-events-none">
            {/* Infos */}
            <div className="space-y-4 pointer-events-auto mt-2">
              <div className="bg-surface-container-low/80 backdrop-blur-xl border border-outline-variant/15 rounded-xl p-3 flex items-center justify-between shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center">
                    <span className="material-symbols-outlined text-tertiary-fixed-dim text-sm">exit_to_app</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-on-surface-variant uppercase tracking-widest">Recommended Route</p>
                    <p className="text-sm font-bold text-on-surface">Best exit: {gateAdvice?.recommended_gate || 'Gate 4'}</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant text-sm">chevron_right</span>
              </div>

              <div className="bg-surface-container-highest/90 backdrop-blur-2xl rounded-[2.5rem] border border-outline-variant/20 p-4 shadow-[0_16px_48px_rgba(0,0,0,0.5)] overflow-hidden relative">
                <div className="flex items-start gap-4 relative z-10">
                  <div className="w-24 h-24 rounded-lg overflow-hidden shrink-0 border border-outline-variant/30 shadow-inner">
                    <img alt="Car photo" className="w-full h-full object-cover grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all duration-500" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCGs_IR0rIaNr9YDMAKzMIZKZfTFax66oUYkbgNWOvAioTnbSmXyG1Sgl8-Na3ihiIVl6YdbAdeLLNt-2sa7hn90o6YZx6gQlcJVqikoDFVA8SeP8fR0esEPVxCgDKIaCMEk-PKfB8bP-k8CP-xVRbJGQcBFI5OFDYuU2YaSKwDDVCPxs41x9EPXkrE4UIZib9_dXnRIL03rPLQrzCSCtGUxWJ58OGEcfqqE4mi45U4LnDWN_WGMD3ZdFn1sg81gYqG-5nKgpY_uU8"/>
                  </div>
                  <div className="flex-1 py-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_#22c55e]"></span>
                      <span className="text-[10px] font-bold text-success uppercase tracking-widest">Saved Location</span>
                    </div>
                    <h2 className="text-2xl font-black tracking-tight text-on-surface mb-1">{localStorage.getItem('mb_parking_label') || "Vehicle"}</h2>
                    <p className="text-sm text-on-surface-variant font-medium flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">layers</span> {localStorage.getItem('mb_parking_note') || "Level 2"}
                    </p>
                    <div className="mt-3 inline-flex items-center gap-2 bg-surface-container-lowest px-2 py-1 rounded-md border border-outline-variant/10">
                      <span className="material-symbols-outlined text-[14px] text-primary">schedule</span>
                      <span className="text-[10px] text-on-surface-variant">Parked recently</span>
                    </div>
                  </div>
                </div>
                {/* Decorative gradient accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pointer-events-auto pb-4">
              <button 
                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`, '_blank')}
                className="w-full h-14 bg-gradient-to-br from-primary to-primary-container rounded-xl flex items-center justify-center gap-2 shadow-[0_0_32px_rgba(173,198,255,0.15)] active:scale-[0.98] transition-transform duration-300 ease-[spring(1,100,20,0)] border border-primary-fixed/20"
              >
                <span className="material-symbols-outlined text-on-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>navigation</span>
                <span className="font-bold text-on-primary-container tracking-wide">Navigate to Car</span>
              </button>
              <div className="mt-3 flex justify-center gap-6">
                <button className="flex items-center gap-1.5 text-xs font-medium text-on-surface-variant hover:text-on-surface transition-colors">
                  <span className="material-symbols-outlined text-[16px]">share</span> Share
                </button>
                <button onClick={handleClear} className="flex items-center gap-1.5 text-xs font-medium text-secondary hover:text-secondary-fixed transition-colors">
                  <span className="material-symbols-outlined text-[16px]">delete</span> Forget
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="bg-surface-dim text-on-surface min-h-screen p-5 flex flex-col pt-20 pb-20">
      <header className="fixed top-0 left-0 w-full z-50 flex items-center px-6 h-16 bg-[#131313] bg-gradient-to-b from-[#1C1B1B] to-transparent">
        <button onClick={() => navigate('/')} className="text-[#ADC6FF] hover:bg-[#2A2A2A] transition-colors p-2 rounded-xl flex items-center justify-center">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="font-headline font-black uppercase text-xl text-[#ADC6FF] ml-4">Save Parking</h1>
      </header>

      <div className="flex-1 overflow-y-auto hide-scrollbar pt-4">
        <div className="text-on-surface-variant font-body mb-6">Take a photo or write a note to remember your spot. Gemini AI will automatically label your photo.</div>
        
        {gpsError && <div className="text-tertiary text-sm mb-4">⚠️ Location unavailable — manual note will be used</div>}
        
        <div className="mb-6">
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            ref={fileInputRef}
            className="hidden" 
            onChange={e => setPhoto(e.target.files[0])} 
            aria-label="Take Photo"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-32 border-2 border-dashed border-outline-variant/30 rounded-2xl flex flex-col items-center justify-center bg-surface-container-low transition-colors hover:bg-surface-container-high"
          >
            <span className="text-3xl mb-2">📸</span>
            <span className="text-on-surface-variant font-medium">{photo ? photo.name : 'Take a photo of your zone / spot'}</span>
          </button>
        </div>

        <div className="mb-8">
          <label className="block text-on-surface-variant text-sm mb-2 ml-2 font-medium">Manual Note (optional)</label>
          <input 
            type="text" 
            placeholder="e.g. Near pillar A4, level 2" 
            value={manualNote} 
            onChange={e => setManualNote(e.target.value)} 
            className="w-full h-14 bg-surface-container-lowest rounded-2xl px-4 text-on-surface focus:outline-none focus:border-2 focus:border-primary border border-outline-variant/10"
            aria-label="Manual parking note"
          />
        </div>

        {saving && (
          <div className="flex flex-col items-center justify-center mt-6">
            <div className="w-8 h-8 border-4 border-success border-t-transparent rounded-full animate-spin mb-4"></div>
            <div className="text-success font-bold slide-up">Saving and analyzing photo...</div>
          </div>
        )}
      </div>

      {!saving && (
        <button 
          disabled={!photo && !manualNote}
          onClick={handleSave}
          className="w-full mt-auto bg-gradient-to-br from-success/90 to-green-700 h-[56px] rounded-2xl font-bold text-lg disabled:opacity-50 disabled:bg-surface-container-high transition-transform active:scale-95 text-white shadow-[0_0_24px_rgba(34,197,94,0.15)]"
        >
          Save My Parking Spot
        </button>
      )}
    </div>
  )
}
