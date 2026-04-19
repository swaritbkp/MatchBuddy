# 🛡️ MatchBuddy — Stadium Safety & Mobility OS

> **Your guardian in the crowd.**
> Built for India's largest events — IPL, concerts, Kumbh Mela.

[![Live Demo](https://img.shields.io/badge/Live-Demo-blue)](#)
[![Built with Gemini](https://img.shields.io/badge/Built%20with-Gemini%201.5%20Flash-orange)](https://ai.google.dev)
[![Firebase](https://img.shields.io/badge/Realtime-Firebase-yellow)](https://firebase.google.com)
[![Cloud Run](https://img.shields.io/badge/Deployed-Cloud%20Run-blue)](https://cloud.google.com/run)

---

## 🎥 Demo Video
[▶ Watch 60-second demo]([Insert your YouTube Demo URL here])

## 🌐 Live App
[matchbuddy.app]([Deploy and paste your Cloud Run URL here])

---

## The Problem

Every year, 500 million people attend large-scale events in India.
At a packed IPL stadium:

- A fan collapses — security has no idea where they are
- 50,000 people exit simultaneously — parking lots become chaos
- Families separate in the crowd — no coordinated way to reunite
- All apps stop working — stadium network is completely jammed
- Every safety app solves ONE piece — fans need to switch between
  4 different apps in a moment of panic

**MatchBuddy solves all of this. One app. One tap.**

---

## The Solution

MatchBuddy is a **Stadium Safety and Mobility OS** —
a Progressive Web App that gives every fan four critical tools:

### 🆘 SOS+
One tap triggers a Gemini-powered emergency triage.
Security gets a real-time Firebase alert with your exact location.
Your family gets a push notification instantly.
Works even when the network is weak — queues locally and retries.

### 🚗 FindMyRide
Snap a photo when you park. Gemini Vision reads it and saves
"Near blue pillar, Level 2, Zone D" so you never forget.
After the match, Google Maps walks you back to your vehicle.
The app tells you which gate saves the most time using
live traffic data from the Directions API.

### 🚦 Crowd Exit Intelligence
Live gate crowd density — reported by fans, for fans.
Gemini reads the data and gives you a personalized exit
recommendation based on your seat zone and parking location.

### 📍 MeetPoint
Drop a pin. Generate a shareable link.
Your family taps it — Google Maps takes them there.
No account. No download required for recipients.
Link expires in 4 hours automatically.

---

## 🗺 Architecture
┌─────────────────────────────────────────────────────┐
│ FRONTEND │
│ React 18 + Vite + Tailwind CSS │  
│ PWA — installable on Android / iOS │
│ Dark mode — stadium night theme │
│ Routes: / (fan) | /admin (security) │
└──────────────────────┬──────────────────────────────┘
│ HTTPS / REST
┌──────────────────────▼──────────────────────────────┐
│ BACKEND │
│ Python FastAPI on Google Cloud Run │
│ Stateless — auto-scales, scales to zero │
│ Serves frontend dist/ as static files │
└───┬──────────────┬─────────────┬────────────────────┘
│ │ │
┌───▼────┐ ┌──────▼──────┐ ┌──▼───────────────────┐
│Gemini │ │ Firebase │ │ Google Maps APIs │
│1.5 │ │ RT DB │ │ JS API │
│Flash + │ │ FCM │ │ Directions API │
│Vision │ │ Storage │ │ (traffic routing) │    
└────────┘ └─────────────┘ └──────────────────────┘

---

## ⚡ Google Services Used

| Service | Role in MatchBuddy |
|---|---|
| **Gemini 1.5 Flash** | SOS triage — generates specific first-response instruction for fan + security alert |
| **Gemini Vision (multimodal)** | Reads parking photo → auto-generates zone label ("Near blue pillar, Level 2") |
| **Gemini 1.5 Flash** | Crowd exit advice — personalized gate recommendation per fan |
| **Google Maps JavaScript API** | Walking navigation to saved vehicle, meet point map preview |
| **Google Maps Directions API** | Real-time traffic-aware gate exit suggestion with time estimates |
| **Firebase Realtime Database** | Sub-100ms SOS alert delivery to security dashboard, live status sync |
| **Firebase Cloud Messaging** | Family SOS push notification, pre-match vehicle reminder |
| **Firebase Storage** | Compressed parking photo storage per session |
| **Google Cloud Run** | Serverless deployment — single container serves frontend + backend |

**Total: 9 distinct Google services — all used meaningfully.**

---

## 🚀 Setup & Run Locally

### Prerequisites
- Node.js 18+
- Python 3.11+
- Google Cloud project with billing enabled
- Firebase project (Realtime DB + Storage + FCM enabled)
- Gemini API key from [Google AI Studio](https://aistudio.google.com)
- Google Maps API key (Maps JS + Directions enabled)

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/matchbuddy.git
cd matchbuddy
```

### 2. Set up environment variables
```bash
cp .env.example .env
# Edit .env and fill in all API keys
```

### 3. Run the backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8080
# API available at http://localhost:8080
# Docs at http://localhost:8080/docs
```

### 4. Run the frontend
```bash
cd frontend
npm install
npm run dev
# App available at http://localhost:5173
```

---

## 🐳 Deploy to Google Cloud Run

### Step 1 — Build frontend
```bash
cd frontend
npm run build
# Creates frontend/dist/
```

### Step 2 — Build Docker image
```bash
cd ..  # back to matchbuddy root
docker build -t matchbuddy .
```

### Step 3 — Push to Google Artifact Registry
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

gcloud artifacts repositories create matchbuddy \
  --repository-format=docker \
  --location=asia-south1

gcloud builds submit \
  --tag asia-south1-docker.pkg.dev/YOUR_PROJECT_ID/matchbuddy/matchbuddy:latest
```

### Step 4 — Deploy to Cloud Run
```bash
gcloud run deploy matchbuddy \
  --image asia-south1-docker.pkg.dev/YOUR_PROJECT_ID/matchbuddy/matchbuddy:latest \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --set-env-vars "GEMINI_API_KEY=YOUR_KEY,GOOGLE_MAPS_API_KEY=YOUR_KEY,FIREBASE_DATABASE_URL=YOUR_URL,FIREBASE_STORAGE_BUCKET=YOUR_BUCKET,FIREBASE_FCM_SERVER_KEY=YOUR_KEY,FIREBASE_SERVICE_ACCOUNT_JSON=YOUR_JSON"
```

### Step 5 — Get your Cloud Run URL
```bash
gcloud run services describe matchbuddy \
  --region asia-south1 \
  --format "value(status.url)"
```
Copy this URL — this is your hackathon submission URL.

---

## 📱 How It Works — Feature Walkthrough

### SOS+ Flow
1. Fan taps the large red SOS button on home screen
2. Selects emergency type: Medical / Security / Lost Person / Fire
3. 5-second countdown with cancel option (prevents false triggers)
4. Gemini 1.5 Flash generates:
   - Fan message: specific, calm, actionable
   - Security alert: concise location + type for dashboard
5. Firebase Realtime DB updates security dashboard in <1 second
6. Firebase FCM sends push to pre-registered family contact
7. Fan sees live status updates: Dispatched → En Route → Resolved

### FindMyRide Flow
1. Fan taps "Save My Parking" on arrival
2. Camera opens — fan snaps photo of their spot
3. Gemini Vision analyzes image, generates zone label
4. GPS coordinates saved to Firebase with photo URL
5. Post-match: fan taps "Find My Car"
6. Google Maps Directions API calculates fastest exit gate
7. Gemini explains the recommendation in plain language
8. Google Maps navigation launches to saved pin

### Crowd Exit Flow
1. Gate density feed shows crowd levels reported by fans
2. Fan can report their gate level with one tap
3. Gemini reads all gate density data + fan's seat zone
4. Generates personalized exit recommendation in plain English

### MeetPoint Flow
1. Fan selects a landmark or drops a custom pin
2. Firebase stores the pin
3. Shareable link generated
4. Recipient opens link → Google Maps navigation to the pin

---

## 🔒 Security & Privacy

- No user account required — session-based UUID only
- All SOS personal data auto-deleted on resolve
- Meet points auto-deleted after 4 hours
- Parking data deleted on session end or manual clear
- No third-party metadata analytics or tracking scripts
- HTTPS enforced via Cloud Run TLS termination

---

## ♿ Accessibility

- All touch targets minimum 56×56px
- WCAG AA color contrast on all text
- aria-live regions for SOS status updates
- aria-label on all icon-only buttons
- Respects prefers-reduced-motion
- Font scaling via em units

---

## 🔭 Roadmap (v2 — Beyond the Hackathon)

- [ ] **Offline Bluetooth mesh relay** — SOS hops device-to-device.
- [ ] **AR vehicle navigation** — using WebXR API.
- [ ] **Multi-language support** — via Gemini translation layer.
- [ ] **Predictive crowd modeling** — ML model trained on historical data.

---

## 👤 Team

**Swarit Sharma**
Product · Engineering · Design
[LinkedIn]([Insert your LinkedIn Profile URL here])

---

## 📄 License
MIT — open source, free to use and adapt.
