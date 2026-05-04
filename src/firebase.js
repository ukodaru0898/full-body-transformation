import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getAnalytics, isSupported as analyticsSupported } from 'firebase/analytics'
import { getMessaging, isSupported as messagingSupported } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const requiredKeys = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
]

export const firebaseConfigReady = requiredKeys.every((key) => Boolean(firebaseConfig[key]))

if (!firebaseConfigReady) {
  console.error('Firebase config is missing. Create .env with VITE_FIREBASE_* values.')
}

const app = firebaseConfigReady ? initializeApp(firebaseConfig) : null
export const auth = app ? getAuth(app) : null
export const db = app ? getFirestore(app) : null
let _storage = null
try { if (app) _storage = getStorage(app) } catch { /* Storage not enabled yet */ }
export const storage = _storage

// Analytics — only in browser (not SSR/service worker)
export let analytics = null
if (app) {
  analyticsSupported().then((ok) => {
    if (ok) analytics = getAnalytics(app)
  })
}

// FCM Messaging — only in supported browsers
export let messaging = null
if (app) {
  messagingSupported().then((ok) => {
    if (ok) messaging = getMessaging(app)
  })
}
export default app
