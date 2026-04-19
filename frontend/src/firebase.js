import { initializeApp } from 'firebase/app'
import { getDatabase, ref, set, get, update, remove, onValue, off, enableLogging } from 'firebase/database'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "mock_api_key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mock-app.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://mock-app.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mock-app",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mock-app.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:000000000000:web:000000000000"
}

const app = initializeApp(firebaseConfig)
const db = getDatabase(app)

// persistence is enabled by default in web SDK v9+
// enableLogging(true);

let messaging = null
try {
  messaging = getMessaging(app)
} catch (e) {
  console.warn('FCM not supported in this browser')
}

export { db, messaging, ref, set, get, update, remove, onValue, off, getToken, onMessage }
