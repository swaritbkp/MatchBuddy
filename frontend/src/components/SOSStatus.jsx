import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db, ref, onValue, off } from '../firebase'

export default function SOSStatus() {
  const alertId = localStorage.getItem('mb_alert_id')
  const [alertData, setAlertData] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!alertId) {
      navigate('/')
      return
    }

    const alertRef = ref(db, `/sos_alerts/${alertId}`)
    const unsubscribe = onValue(alertRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setAlertData(data)
      }
    })

    return () => off(alertRef)
  }, [alertId, navigate])

  if (!alertData) {
    return (
      <div className="bg-stadium min-h-screen flex items-center justify-center text-white" role="status" aria-label="Loading...">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="sr-only">Loading...</span>
      </div>
    )
  }

  const { status, fan_message } = alertData

  if (status === 'resolved') {
    return (
      <div className="bg-green-600 min-h-screen text-white flex flex-col items-center justify-center p-5 fade-in">
        <div className="text-7xl mb-6">✅</div>
        <h2 className="text-3xl font-bold mb-4 text-center">You're safe. Alert closed.</h2>
        <p className="text-center opacity-90 mb-10 max-w-xs">All your personal data has been deleted from the active dashboard.</p>
        <button 
          onClick={() => {
            localStorage.removeItem('mb_alert_id')
            navigate('/')
          }}
          className="w-full bg-white text-green-700 h-14 rounded-2xl font-bold text-lg shadow-lg touch-active"
        >
          Back to Home
        </button>
      </div>
    )
  }

  return (
    <div className="bg-stadium min-h-screen text-white p-5 flex flex-col">
      <div className="flex items-center mb-8">
        <button onClick={() => navigate('/')} className="text-gray-400 mr-4" aria-label="Back">←</button>
        <h1 className="text-2xl font-bold">SOS Status</h1>
      </div>

      <div className="pl-4 border-l-2 border-gray-800 space-y-8 mb-10 relative">
        <div className="relative">
          <div className="absolute -left-[21px] top-1 w-4 h-4 rounded-full bg-green-500 ring-4 ring-stadium flex justify-center items-center">
            <span className="text-[10px]">✓</span>
          </div>
          <div>
            <div className="font-bold">Alert Sent</div>
          </div>
        </div>

        <div className="relative">
          <div className={`absolute -left-[21px] top-1 w-4 h-4 rounded-full flex justify-center items-center ring-4 ring-stadium ${['acknowledged', 'dispatched'].includes(status) ? 'bg-green-500' : (status === 'active' ? 'bg-blue-500 dot-pulse' : 'bg-gray-700')}`}>
            {['acknowledged', 'dispatched'].includes(status) && <span className="text-[10px]">✓</span>}
          </div>
          <div>
            <div className={`font-bold ${status === 'active' ? 'text-white' : (['acknowledged', 'dispatched'].includes(status) ? 'text-gray-400' : 'text-gray-600')}`}>Security Notified</div>
            {status === 'active' && <div className="text-sm text-blue-400 mt-1">Responder is being assigned...</div>}
            {status === 'acknowledged' && <div className="text-sm text-amber-500 mt-1">Preparing to dispatch...</div>}
          </div>
        </div>

        <div className="relative">
          <div className={`absolute -left-[21px] top-1 w-4 h-4 rounded-full flex justify-center items-center ring-4 ring-stadium ${status === 'dispatched' ? 'bg-blue-500 dot-pulse' : 'bg-gray-700'}`}>
          </div>
          <div>
            <div className={`font-bold ${status === 'dispatched' ? 'text-white' : 'text-gray-600'}`}>Responder En Route</div>
            {status === 'dispatched' && <div className="text-sm text-blue-400 mt-1 bg-blue-900/30 p-2 rounded inline-block mt-2">A responder is on the way to you</div>}
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-[21px] top-1 w-4 h-4 rounded-full bg-gray-700 ring-4 ring-stadium"></div>
          <div>
            <div className="font-bold text-gray-600">Help Arrived</div>
          </div>
        </div>
      </div>

      <div className="border-l-4 border-sos-red bg-surface p-5 rounded-r-2xl mb-auto">
        <h2 className="text-[16px] font-bold mb-2">Help Message</h2>
        <p className="text-gray-300 text-sm leading-relaxed">{fan_message}</p>
      </div>

      <div className="bg-surface border border-gray-800 rounded-2xl p-5 mt-6 mb-2 text-center text-sm">
        <p className="mb-2"><strong>Stay at:</strong> {alertData.seat_zone}</p>
        <p className="text-amber-500 mb-4">Keep this screen visible to responders</p>
        <p className="text-gray-500 text-xs">Case ID: {alertData.alert_id}</p>
      </div>

    </div>
  )
}
