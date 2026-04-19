import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

export default function MeetPoint({ viewMode = false }) {
  const navigate = useNavigate()
  const { meet_id } = useParams()
  
  const [gpsData, setGpsData] = useState({ lat: 0, lng: 0 })
  const [landmarkLabel, setLandmarkLabel] = useState('')
  const [creating, setCreating] = useState(false)
  const [mapObj, setMapObj] = useState(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const [mapsReady, setMapsReady] = useState(!!window.google)
  
  const [shareData, setShareData] = useState(null)
  const [copied, setCopied] = useState(false)

  // View mode states
  const [meetData, setMeetData] = useState(null)
  const [viewLoading, setViewLoading] = useState(viewMode)
  const [viewError, setViewError] = useState('')
  const [distInfo, setDistInfo] = useState('')

  // Listen for Google Maps ready event
  useEffect(() => {
    if (window.google) {
      setMapsReady(true)
      return
    }
    const handleMapsReady = () => setMapsReady(true)
    window.addEventListener('google-maps-ready', handleMapsReady)
    return () => window.removeEventListener('google-maps-ready', handleMapsReady)
  }, [])

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      pos => { setGpsData({ lat: pos.coords.latitude, lng: pos.coords.longitude }) },
      () => setGpsData({ lat: 19.033, lng: 73.029 }) // fallback to Navi Mumbai approx
    )
  }, [])

  const initMap = useCallback((lat, lng, isPreview = false, targetLat = null, targetLng = null) => {
    if (!mapRef.current || !window.google) return
    const map = new window.google.maps.Map(mapRef.current, {
      center: targetLat ? { lat: (lat + targetLat)/2, lng: (lng + targetLng)/2 } : { lat, lng },
      zoom: isPreview ? 17 : 16,
      disableDefaultUI: true,
      styles: [
        { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
      ]
    })
    setMapObj(map)

    if (isPreview) {
      markerRef.current = new window.google.maps.Marker({
        position: { lat, lng },
        map,
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: '#FF2D2D', fillOpacity: 1, strokeColor: 'white', strokeWeight: 2 }
      })
    } else {
      // View mode markers
      new window.google.maps.Marker({
        position: { lat: targetLat, lng: targetLng },
        map,
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: '#FF2D2D', fillOpacity: 1, strokeColor: 'white', strokeWeight: 2 }
      })
      new window.google.maps.Marker({
        position: { lat, lng },
        map,
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 5, fillColor: '#3B82F6', fillOpacity: 1, strokeColor: 'white', strokeWeight: 2 }
      })
      const path = new window.google.maps.Polyline({
        path: [{ lat, lng }, { lat: targetLat, lng: targetLng }],
        geodesic: true, strokeColor: '#3B82F6', strokeOpacity: 0, strokeWeight: 2,
        icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 2 }, offset: '0', repeat: '10px' }]
      })
      path.setMap(map)
    }
  }, [])

  useEffect(() => {
    if (viewMode && meet_id) {
      fetchMeetPoint()
    } else if (!viewMode && mapsReady && gpsData.lat) {
      initMap(gpsData.lat, gpsData.lng, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, meet_id, gpsData, mapsReady])

  const updatePin = (latOff, lngOff, label) => {
    const newLat = gpsData.lat + latOff
    const newLng = gpsData.lng + lngOff
    setGpsData({ lat: newLat, lng: newLng })
    setLandmarkLabel(label)
    if (mapObj) {
      mapObj.panTo({ lat: newLat, lng: newLng })
      if (markerRef.current) markerRef.current.setPosition({ lat: newLat, lng: newLng })
    }
  }

  const handleCreate = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/meetpoint/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venue_id: (localStorage.getItem('mb_venue_name') || 'stadium').toLowerCase().replace(/\s+/g,'-'),
          created_by: localStorage.getItem('mb_user_name') || 'A Fan',
          pin_lat: gpsData.lat,
          pin_lng: gpsData.lng,
          landmark_label: landmarkLabel
        })
      })
      if (res.ok) {
        const data = await res.json()
        setShareData(data)
      }
    } catch (e) {
      console.warn("Failed to create meetpoint")
    }
    setCreating(false)
  }

  const fetchMeetPoint = async () => {
    setViewLoading(true)
    try {
      const res = await fetch(`/api/meetpoint/${meet_id}`)
      if (res.ok) {
        const data = await res.json()
        setMeetData(data)
        
        // dist calculation
        const R = 6371000
        const userLt = gpsData.lat || 19.033
        const userLg = gpsData.lng || 73.029
        const dLat = (data.pin_lat - userLt) * Math.PI / 180
        const dLng = (data.pin_lng - userLg) * Math.PI / 180
        const a = Math.sin(dLat/2)**2 + Math.cos(userLt*Math.PI/180) * Math.cos(data.pin_lat*Math.PI/180) * Math.sin(dLng/2)**2
        const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
        const distStr = d > 1000 ? `~${(d/1000).toFixed(1)} km away` : `~${Math.round(d)} m away`
        setDistInfo(`${distStr} · ${Math.ceil(d/80)} min walk`)

        if (mapsReady) {
          setTimeout(() => initMap(userLt, userLg, false, data.pin_lat, data.pin_lng), 100)
        }
      } else if (res.status === 410) {
        setViewError("This meet point has expired.")
      } else {
        setViewError("Meet point not found. Ask your group to resend.")
      }
    } catch (e) {
      setViewError("Error loading meet point.")
    }
    setViewLoading(false)
  }

  const shareUrlFull = shareData ? `${window.location.origin}${shareData.share_url}` : ""
  
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Meet me here — MatchBuddy',
        text: `Meet me at ${shareData.landmark_label}`,
        url: shareUrlFull
      })
    } else {
      copyLink()
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrlFull)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (viewMode) {
    if (viewLoading) return <div className="min-h-screen bg-stadium flex justify-center items-center"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
    
    if (viewError) return (
      <div className="min-h-screen bg-stadium flex flex-col justify-center items-center p-5 text-white text-center">
        <div className="text-6xl mb-4">😔</div>
        <p className="text-xl font-bold mb-8">{viewError}</p>
        <button onClick={() => navigate('/')} className="bg-blue-500 px-6 py-3 rounded-xl font-bold">Go to Home</button>
      </div>
    )

    return (
      <div className="bg-stadium min-h-screen text-white p-5 flex flex-col pt-12">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">📍 Meet Point</h1>
        </div>

        <div className="bg-surface rounded-2xl p-5 mb-5 border border-gray-800">
          <div className="text-[12px] text-gray-400 uppercase font-bold tracking-wider mb-1">Meet me at:</div>
          <div className="text-[24px] font-bold text-white mb-2">{meetData.landmark_label}</div>
          <div className="text-sm text-gray-400 mb-4">Set by {meetData.created_by}</div>
          <div className="text-[12px] text-gray-500">Link expires at {new Date(meetData.expires_at * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
        </div>

        <div 
          ref={mapRef} 
          className="h-[320px] rounded-2xl overflow-hidden mb-6 bg-gray-800 flex items-center justify-center font-bold text-gray-500"
        >
          {!mapsReady && "Map loading..."}
        </div>

        <div className="text-center text-gray-300 font-medium mb-6">
          {distInfo}
        </div>

        <button 
          onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${meetData.pin_lat},${meetData.pin_lng}&travelmode=walking`, '_blank')}
          className="mt-auto w-full bg-blue-500 h-[56px] rounded-2xl font-bold text-lg touch-active"
        >
          🗺 Navigate Here
        </button>
      </div>
    )
  }

  // Normal Create Mode
  return (
    <div className="bg-stadium min-h-screen text-white p-5 flex flex-col">
      <div className="flex items-center mb-6">
        <button onClick={() => navigate('/')} className="text-gray-400 mr-4" aria-label="Back">←</button>
        <div>
          <h1 className="text-2xl font-bold">Set Meet Point</h1>
          <p className="text-xs text-gray-400">Pick a spot. Share the link. Reunite.</p>
        </div>
      </div>

      <div className="mb-6">
        <div className="text-[13px] text-gray-400 mb-3">Quick select a landmark</div>
        <div className="flex overflow-x-auto gap-2 scrollbar-hide pb-2">
          {[
            {label: 'Main Gate North', lo: 0.003, lg: 0},
            {label: 'Main Gate South', lo: -0.003, lg: 0},
            {label: 'Parking Lot A', lo: 0.002, lg: 0.002},
            {label: 'Parking Lot B', lo: -0.002, lg: 0.002},
            {label: 'First Aid Post', lo: 0.001, lg: 0.001},
            {label: 'Fan Zone', lo: -0.001, lg: -0.001}
          ].map(p => (
            <button 
              key={p.label}
              onClick={() => updatePin(p.lo, p.lg, p.label)}
              className={`flex-shrink-0 px-4 py-2 rounded-full border text-sm touch-active whitespace-nowrap ${landmarkLabel === p.label ? 'bg-blue-600 text-white border-blue-500' : 'bg-transparent text-gray-300 border-gray-700'}`}
            >
              📌 {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="h-px bg-gray-800 flex-1"></div>
        <div className="text-[11px] text-gray-500 uppercase tracking-wider font-bold">or set custom</div>
        <div className="h-px bg-gray-800 flex-1"></div>
      </div>

      <div className="space-y-4 mb-6">
        <input 
          type="text" 
          placeholder="Describe meeting spot (e.g. Near Gate 3)" 
          value={landmarkLabel} 
          onChange={e => setLandmarkLabel(e.target.value)}
          className="w-full h-[56px] bg-[#1E1E1E] rounded-2xl px-4 text-white focus:outline-none focus:border-2 focus:border-blue-500 placeholder-gray-500"
        />
        <button 
          onClick={() => { updatePin(0,0, landmarkLabel || 'Current Location') }}
          className="w-full h-[48px] rounded-xl border border-gray-600 bg-transparent text-sm font-bold active:bg-gray-800 touch-active"
        >
          📍 Use My Current GPS Location
        </button>
      </div>

      <div 
        ref={mapRef} 
        className="h-[240px] rounded-2xl overflow-hidden bg-gray-800 mb-6 flex items-center justify-center text-gray-500"
      >
        {!mapsReady && "Map loading..."}
      </div>

      <button 
        disabled={!landmarkLabel || creating}
        onClick={handleCreate}
        className="mt-auto w-full bg-blue-500 h-[56px] rounded-2xl font-bold text-lg disabled:opacity-50 touch-active flex items-center justify-center gap-2"
      >
        {creating ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : '📤'}
        {creating ? 'Creating...' : 'Generate Meet Link'}
      </button>

      {/* SHARE CARD SHEET */}
      {shareData && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
          <div className="bg-surface w-full rounded-t-3xl p-5 slide-up border-t border-gray-800">
            <div className="text-green-500 font-bold mb-2">✓ Meet Point Created!</div>
            <div className="text-[20px] font-bold text-white mb-6">{shareData.landmark_label}</div>
            
            <div 
              onClick={copyLink}
              className="bg-stadium border border-gray-800 font-mono text-sm p-4 rounded-xl mb-6 text-gray-300 break-all active:bg-gray-900 cursor-pointer"
            >
              {shareUrlFull}
            </div>

            <div className="flex gap-3 mb-6">
              <button onClick={copyLink} className="flex-1 bg-surface-2 border border-gray-700 py-3 rounded-xl font-bold text-sm touch-active">
                {copied ? '✓ Copied!' : '📋 Copy Link'}
              </button>
              {navigator.share && (
                <button onClick={handleShare} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold text-sm touch-active">
                  📱 Share via...
                </button>
              )}
            </div>

            <div className="text-center text-gray-500 text-xs mb-4">This link expires in 4 hours</div>
            
            <button onClick={() => navigate('/')} className="w-full text-gray-400 font-bold py-3 uppercase text-sm tracking-wider">Done</button>
          </div>
        </div>
      )}
    </div>
  )
}
