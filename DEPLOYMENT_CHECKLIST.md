# 🚀 MatchBuddy Deployment Checklist

This is a step-by-step guide to run MatchBuddy locally or deploy it live in under 5 minutes. The application requires Google Services to function properly.

## 🔑 Phase 1: Obtaining the Required API Keys

**1. Google Maps API Key**
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project.
3. Enable **Maps JavaScript API** and **Directions API**.
4. Go to **APIs & Services > Credentials** and copy your API Key.

**2. Gemini API Key**
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Create a new API key.

**3. Firebase Credentials**
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Create a project and enable **Realtime Database** and **Storage**.
3. **Frontend Keys:** Under Project Settings > General, register a Web App. Copy the `firebaseConfig` object values.
4. **Backend Account:** Under Project Settings > Service Accounts, click "Generate new private key". Open the downloaded JSON and copy the entire text.
5. **FCM Key:** Google is pushing HTTP v1, but for standard legacy FCM, grab the Server Key from the Cloud Messaging API tab.

---

## 💻 Phase 2: Local Setup (Testing)

**1. Clone the repository**
```bash
git clone https://github.com/swaritbkp/MatchBuddy.git
cd matchbuddy
```

**2. Configure the Environment**
Create a `.env` file at the root of the project:
```bash
cp .env.example .env
```
Open `.env` and fill out ALL the required placeholder variables with the keys you gathered in Phase 1.

**3. Build the Frontend**
```bash
cd frontend
npm install
npm run build
cd ..
```
*(The backend needs the frontend to be pre-built in order to serve it statically.)*

**4. Start the Backend**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8080
```

**5. View the App**
Open your browser and navigate to: **[http://localhost:8080](http://localhost:8080)**

*(Note: Without API keys in `.env`, the app launches in demo mode and API calls will safely error internally.)*

---

## ☁️ Phase 3: Cloud Run Deployment

To deploy this straight to a live URL using Google Cloud:

**1. Build and Submit the Image**
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

gcloud artifacts repositories create matchbuddy \
  --repository-format=docker \
  --location=asia-south1

gcloud builds submit \
  --tag asia-south1-docker.pkg.dev/YOUR_PROJECT_ID/matchbuddy/matchbuddy:latest
```

**2. Deploy to Cloud Run**
Make sure to paste your actual `.env` file values into the `--set-env-vars` flag below so the container has secure access:
```bash
gcloud run deploy matchbuddy \
  --image asia-south1-docker.pkg.dev/YOUR_PROJECT_ID/matchbuddy/matchbuddy:latest \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars "GEMINI_API_KEY=YOUR_KEY,GOOGLE_MAPS_API_KEY=YOUR_KEY,FIREBASE_DATABASE_URL=YOUR_URL,FIREBASE_STORAGE_BUCKET=YOUR_BUCKET,FIREBASE_FCM_SERVER_KEY=YOUR_KEY,FIREBASE_SERVICE_ACCOUNT_JSON=YOUR_JSON"
```

**3. Grab your Live URL!**
Once deployed, the terminal outputs a URL (e.g., `https://matchbuddy-xyz.run.app`). Copy this link, test it on your phone, and paste it into the hackathon submission form!
