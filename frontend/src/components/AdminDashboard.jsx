import React, { useState, useEffect } from 'react'
import { db, ref, onValue, off, update } from '../firebase'

export default function AdminDashboard() {
  const [alerts, setAlerts] = useState([])
  const [gates, setGates] = useState([])
  const venueId = 'dy-patil-stadium' // Hardcoded for demo
  const [timeNow, setTimeNow] = useState(Date.now())

  useEffect(() => {
    const alertsRef = ref(db, '/sos_alerts')
    const unsubscribe = onValue(alertsRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list = Object.values(data).sort((a,b) => (b.created_at || 0) - (a.created_at || 0))
        setAlerts(list)
      } else {
        setAlerts([])
      }
    })
    
    // time ticker for relative times
    const timer = setInterval(() => setTimeNow(Date.now()), 30000)
    
    return () => {
      off(alertsRef)
      clearInterval(timer)
    }
  }, [])

  const fetchGates = async () => {
    try {
      const res = await fetch(`/api/crowd/density/${venueId}`)
      if (res.ok) {
        const data = await res.json()
        setGates(data.gates || [])
      }
    } catch (e) {}
  }

  useEffect(() => {
    fetchGates()
    const interval = setInterval(fetchGates, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleStatusUpdate = async (alertId, newStatus) => {
    try {
      await fetch(`/api/sos/${alertId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
    } catch (e) {
      console.error(e)
    }
  }

  const handleOverrideGate = async (gate_id) => {
    try {
      await fetch('/api/crowd/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gate_id, density: 'high', venue_id: venueId })
      })
      alert(`Gate ${gate_id} marked as HIGH density`)
      fetchGates()
    } catch (e) {}
  }

  const _getTimeElapsed = (createdAtSec) => {
    if (!createdAtSec) return 'unknown'
    const mins = Math.floor((timeNow - (createdAtSec * 1000)) / 60000)
    if (mins <= 0) return 'just now'
    return `${mins} min ago`
  }

  const borderColors = {
    medical: 'border-red-500',
    security: 'border-orange-500',
    lost_person: 'border-blue-500',
    fire: 'border-red-700'
  }

  // Admin dashboard uses light theme
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] admin-mode md:flex">
      {/* MAIN FEED */}
      <div className="flex-1 p-4 md:p-8 md:pr-[320px]">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-black mb-1">Security Dashboard</h1>
            <p className="text-gray-500">Live active emergencies</p>
          </div>
          <div className="text-sm font-medium text-gray-500">
            {new Date(timeNow).toLocaleTimeString()}
          </div>
        </div>

        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-20 text-center">
            <div className="text-green-500 text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold mb-2">All clear</h2>
            <p className="text-gray-500">No active emergencies</p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map(al => {
               const resolved = al.status === 'resolved'
               // Null-safe: resolved_at may be null if alert was just created
               const resolvedAtMs = al.resolved_at ? al.resolved_at * 1000 : 0
               if (resolved && resolvedAtMs > 0 && (timeNow - resolvedAtMs > 30000)) return null
               
               return (
                 <article 
                   key={al.alert_id} 
                   className={`bg-white rounded-xl shadow-sm border-l-[6px] ${borderColors[al.emergency_type] || 'border-gray-500'} p-5 transition-opacity ${resolved ? 'opacity-50' : 'opacity-100'}`}
                   aria-label={`${al.emergency_type} alert from ${al.user_name || 'unknown'}`}
                 >
                   <div className="flex justify-between items-start mb-3">
                     <span className="bg-gray-100 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider text-gray-800">
                       {(al.emergency_type || '').replace('_', ' ')}
                     </span>
                     <div className="flex items-center gap-3">
                       <span className="text-xs text-gray-500">{_getTimeElapsed(al.created_at)}</span>
                       {al.status === 'active' && <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold dot-pulse">ACTIVE</span>}
                       {al.status === 'acknowledged' && <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-bold">ACKNOWLEDGED</span>}
                       {al.status === 'dispatched' && <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold dot-pulse">DISPATCHED</span>}
                       {al.status === 'resolved' && <span className="text-green-600 font-bold text-xs">✓ RESOLVED — DATA CLEARED</span>}
                     </div>
                   </div>

                   {!resolved ? (
                     <>
                       <div className="mb-3">
                         <h2 className="text-[18px] font-bold text-[#0F172A]">{al.user_name}</h2>
                         <div className="text-[14px] text-[#475569]">{al.seat_zone}</div>
                         <div className="text-[13px] text-[#94A3B8]">{al.venue_name}</div>
                       </div>
                       
                       <div className="bg-[#F8FAFC] rounded-lg p-3 text-[14px] text-[#374151] italic mb-3">
                         {al.security_alert}
                       </div>

                       <div className="mb-4">
                         <a href={`https://maps.google.com/?q=${al.gps_lat},${al.gps_lng}`} target="_blank" rel="noreferrer" className="text-blue-600 text-sm hover:underline flex items-center gap-1">
                           <span>📍</span> {al.gps_lat}, {al.gps_lng}
                         </a>
                       </div>

                       <div className="flex gap-2">
                         {al.status === 'active' && (
                           <button onClick={() => handleStatusUpdate(al.alert_id, 'acknowledged')} className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-bold">
                             ✓ Acknowledge
                           </button>
                         )}
                         {al.status === 'acknowledged' && (
                           <button onClick={() => handleStatusUpdate(al.alert_id, 'dispatched')} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold">
                             🚨 Mark Dispatched
                           </button>
                         )}
                         {al.status === 'dispatched' && (
                           <button onClick={() => handleStatusUpdate(al.alert_id, 'resolved')} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold">
                             ✅ Mark Resolved
                           </button>
                         )}
                       </div>
                     </>
                   ) : null}
                 </article>
               )
            })}
          </div>
        )}
      </div>

      {/* RIGHT SIDEBAR - DESKTOP */}
      <div className="hidden md:block fixed right-0 top-0 bottom-0 w-[280px] bg-[#F1F5F9] border-l border-gray-200 p-5 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-base font-bold text-[#0F172A]">Gate Status</h2>
            <p className="text-xs text-gray-500">Live fan reports</p>
          </div>
          <button onClick={fetchGates} className="text-gray-500 hover:text-black">🔄</button>
        </div>

        <div className="space-y-6">
          {gates.map(gate => {
             const fw = gate.density === 'low' ? 'w-1/3 bg-green-500' : (gate.density === 'moderate' ? 'w-2/3 bg-amber-500' : 'w-full bg-red-600')
             return (
               <div key={gate.gate_id} className="bg-white p-3 rounded-lg shadow-sm">
                 <div className="flex justify-between mb-2">
                   <span className="text-sm font-bold">{gate.gate_id}</span>
                   <span className="text-[11px] text-gray-500">{gate.last_updated || 'recently'} · {gate.reports || 0} reps</span>
                 </div>
                 <div className="h-2 w-full bg-[#E2E8F0] rounded-full overflow-hidden mb-3">
                   <div className={`h-full ${fw} transition-all`}></div>
                 </div>
                 <button onClick={() => handleOverrideGate(gate.gate_id)} className="w-full border border-gray-300 rounded text-xs py-1 text-gray-600 hover:bg-gray-50 active:bg-red-100">
                   🔴 Close Gate
                 </button>
               </div>
             )
          })}
        </div>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 w-full bg-[#1E3A5F] text-white p-3 text-[13px] text-center font-medium z-50">
        Security Dashboard — View on tablet/desktop for Gate controls
      </div>
    </div>
  )
}
