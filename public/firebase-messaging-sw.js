importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

// This file is served from /public — it cannot read .env variables.
// The config here is safe to be public (it's already in your HTML bundle).
firebase.initializeApp({
  apiKey: 'AIzaSyCncaSyYkmZjuHJCm_JDf2IJXashykzmLQ',
  authDomain: 'months-transformation.firebaseapp.com',
  projectId: 'months-transformation',
  storageBucket: 'months-transformation.firebasestorage.app',
  messagingSenderId: '364726701774',
  appId: '1:364726701774:web:eaec0d9d5c77b9f1868a9f',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {}
  self.registration.showNotification(title || '2-Month Transformation', {
    body: body || 'Time to crush your goals! 💪',
    icon: icon || '/vite.svg',
  })
})
