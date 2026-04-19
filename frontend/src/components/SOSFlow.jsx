import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const EMERGENCY_TYPES = [
  { id: 'medical', label: 'Medical Emergency', icon: 'medical_services' },
  { id: 'security', label: 'Security Issue', icon: 'security' },
  { id: 'fire', label: 'Fire Hazard', icon: 'local_fire_department' },
  { id: 'lost_person', label: 'Lost Person', icon: 'person_search' },
]

const COUNTDOWN_SECONDS = 5
const SOS_QUEUE_KEY = 'mb_sos_queue'

/**
 * Flush any queued SOS payloads that were saved offline.
 * Called on component mount when the device is online.
 */
async function flushOfflineQueue() {
  const queue = JSON.parse(localStorage.getItem(SOS_QUEUE_KEY) || '[]')
  if (queue.length === 0) return

  const remaining = []
  for (const payload of queue) {
    try {
      const res = await fetch('/api/sos/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) remaining.push(payload)
    } catch {
      remaining.push(payload)
    }
  }

  if (remaining.length > 0) {
    localStorage.setItem(SOS_QUEUE_KEY, JSON.stringify(remaining))
  } else {
    localStorage.removeItem(SOS_QUEUE_KEY)
  }
}

export default function SOSFlow() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1: Type Select, 2: Countdown, 3: Dispatching
  const [type, setType] = useState(null)
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)

  // Flush offline queue on mount if online
  useEffect(() => {
    if (navigator.onLine) flushOfflineQueue()
  }, [])

  const cancelSOS = useCallback(() => navigate('/'), [navigate])

  const triggerSOS = useCallback(async () => {
    setStep(3)

    // Attempt GPS capture with timeout
    const gpsLocation = await new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve({ lat: 0, lng: 0 }),
        { timeout: 5000 }
      )
    })

    // Build payload matching backend SOSTriggerRequest exactly
    const payload = {
      user_name: localStorage.getItem('mb_user_name') || 'Unknown',
      seat_zone: localStorage.getItem('mb_seat_zone') || 'Unknown',
      gps_lat: gpsLocation.lat,
      gps_lng: gpsLocation.lng,
      emergency_type: type,
      contact_phone: localStorage.getItem('mb_contact_phone') || '0000000000',
      venue_name: localStorage.getItem('mb_venue_name') || 'Stadium',
    }

    try {
      const res = await fetch('/api/sos/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const data = await res.json()
        localStorage.setItem('mb_alert_id', data.alert_id)
        setTimeout(() => navigate('/sos/status'), 800)
      } else {
        const errBody = await res.json().catch(() => ({}))
        console.error('SOS trigger failed:', res.status, errBody)
        alert('Failed to reach dispatch. Please call local emergency: 112')
        navigate('/')
      }
    } catch (e) {
      // Network failure — queue the SOS for retry when back online
      console.error('SOS network error — queuing for retry:', e)
      const queue = JSON.parse(localStorage.getItem(SOS_QUEUE_KEY) || '[]')
      queue.push(payload)
      localStorage.setItem(SOS_QUEUE_KEY, JSON.stringify(queue))
      alert('SOS queued. It will be sent automatically when network returns. Please call 112 for immediate help.')
      navigate('/')
    }
  }, [type, navigate])

  // Countdown timer
  useEffect(() => {
    if (step !== 2) return
    if (countdown <= 0) {
      triggerSOS()
      return
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [step, countdown, triggerSOS])

  // ─── Step 1: Emergency Type Selection ───
  if (step === 1) {
    return (
      <div className="bg-surface-dim text-on-surface min-h-screen p-6 flex flex-col items-center justify-center relative">
        <h1 className="text-3xl font-headline font-black uppercase mb-2 text-center bg-clip-text text-transparent bg-gradient-to-br from-error to-error-container block">
          SOS TRIGGER
        </h1>
        <p className="text-on-surface-variant font-body mb-8 text-center">
          Tap the nature of your emergency.
        </p>

        <div className="w-full max-w-sm grid grid-cols-2 gap-4 auto-rows-fr">
          {EMERGENCY_TYPES.map((et) => (
            <button
              key={et.id}
              onClick={() => setType(et.id)}
              className={`p-6 rounded-2xl flex flex-col items-center justify-center border-2 transition-all active:scale-95 duration-200 ${
                type === et.id
                  ? 'border-error bg-error/10'
                  : 'border-outline-variant/30 bg-surface-container-lowest'
              }`}
            >
              <span
                className="material-symbols-outlined text-4xl mb-3"
                style={{
                  fontVariationSettings: "'FILL' 1",
                  color: type === et.id ? '#ffb4ab' : '#c2c6d6',
                }}
              >
                {et.icon}
              </span>
              <span
                className={`font-headline font-bold text-center text-sm ${
                  type === et.id ? 'text-error' : 'text-on-surface'
                }`}
              >
                {et.label}
              </span>
            </button>
          ))}
        </div>

        <div className="w-full max-w-sm mt-8 flex flex-col gap-4">
          <button
            disabled={!type}
            onClick={() => setStep(2)}
            className="w-full h-[60px] bg-gradient-to-br from-[#db0418] to-[#93000a] disabled:opacity-50 disabled:from-surface-container-high disabled:to-surface-container-high font-black uppercase tracking-widest rounded-2xl active:scale-95 transition-all text-white"
          >
            CONFIRM EMERGENCY
          </button>
          <button
            onClick={cancelSOS}
            className="w-full h-12 bg-surface-container-highest text-on-surface-variant rounded-full font-bold uppercase tracking-wide border border-outline-variant/30 active:scale-95"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // ─── Step 2: Countdown ───
  if (step === 2) {
    const progress = countdown / COUNTDOWN_SECONDS
    const circumference = 2 * Math.PI * 45 // r=45
    const dashOffset = circumference * (1 - progress)

    return (
      <div
        className="text-on-surface h-screen w-full flex flex-col items-center justify-between overflow-hidden select-none"
        style={{
          background:
            'radial-gradient(circle at center, rgba(147, 0, 10, 0.2) 0%, rgba(14, 14, 14, 1) 70%)',
        }}
      >
        <div className="h-24 w-full" />

        <div className="flex-1 flex flex-col items-center justify-center w-full px-6 z-10">
          <div className="flex items-center space-x-2 text-error mb-8">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              emergency
            </span>
            <span className="font-label text-sm font-medium tracking-widest uppercase">
              Emergency Protocol
            </span>
          </div>

          <div className="relative flex items-center justify-center w-64 h-64 mb-10">
            <svg className="absolute inset-0 w-full h-full rotate-[-90deg]" viewBox="0 0 100 100">
              <circle
                className="stroke-surface-container-high"
                cx="50" cy="50" fill="none" r="45" strokeWidth="4"
              />
              <circle
                className="stroke-error transition-all duration-1000 ease-linear"
                cx="50" cy="50" fill="none" r="45"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round" strokeWidth="6"
              />
            </svg>

            <div className="animate-sos-pulse bg-error-container rounded-[50%] w-48 h-48 flex items-center justify-center shadow-[0_0_64px_rgba(255,180,171,0.2)] border border-error/20">
              <span className="font-headline text-[120px] font-black leading-none text-error tracking-tighter tabular-nums drop-shadow-[0_0_12px_rgba(255,180,171,0.5)]">
                {countdown}
              </span>
            </div>
          </div>

          <div className="text-center space-y-2">
            <h2 className="font-headline text-2xl font-bold text-on-surface tracking-tight">
              Sending emergency signal...
            </h2>
            <p className="font-body text-base text-on-surface-variant max-w-xs mx-auto">
              Alerting MatchBuddy security and local authorities.
            </p>
          </div>
        </div>

        <div className="w-full px-6 pb-12 z-10">
          <button
            onClick={cancelSOS}
            className="w-full bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/30 text-on-surface font-headline text-xl font-bold py-6 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] active:scale-95 transition-all duration-300 flex items-center justify-center space-x-3 group"
          >
            <span className="material-symbols-outlined text-outline group-hover:text-on-surface transition-colors">
              close
            </span>
            <span className="tracking-widest uppercase">CANCEL</span>
          </button>
          <p className="text-center font-label text-xs text-outline mt-4">
            Tap to abort dispatch sequence
          </p>
        </div>
      </div>
    )
  }

  // ─── Step 3: Dispatching ───
  return (
    <div className="bg-surface-dim text-on-surface min-h-screen p-6 flex flex-col items-center justify-center relative">
      <div className="animate-sos-pulse bg-error-container rounded-full w-40 h-40 flex items-center justify-center mb-8 border border-error/20 shadow-[0_0_50px_rgba(147,0,10,0.4)]">
        <span className="material-symbols-outlined text-error text-6xl" style={{ fontVariationSettings: "'FILL' 1" }}>
          wifi_tethering
        </span>
      </div>
      <h2 className="font-headline text-2xl font-black text-on-surface tracking-tight mb-2">
        Dispatching...
      </h2>
      <p className="text-on-surface-variant font-body text-center animate-pulse">
        Contacting central security systems via Firebase real-time bridge.
      </p>
    </div>
  )
}
