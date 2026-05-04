import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth'
import {
  sendEmailVerification,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { doc, setDoc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { auth, db, storage, firebaseConfigReady } from '../firebase'
import { logEvent } from 'firebase/analytics'
import { analytics } from '../firebase'

const AuthContext = createContext()

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  function assertFirebaseReady() {
    if (!firebaseConfigReady || !auth || !db) {
      throw new Error('Firebase is not configured. Add VITE_FIREBASE_* values in .env and restart dev server.')
    }
  }

  async function register(email, password, name) {
    assertFirebaseReady()
    const { user } = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(user, { displayName: name })
    await sendEmailVerification(user)
    const profile = {
      name,
      email,
      createdAt: new Date().toISOString(),
      completedTasks: {},
      healthData: {
        steps: 0,
        calories: 0,
        heartRate: 72,
        sleep: 7.5,
        water: 0,
        weight: 65,
        workoutMinutes: 0,
      },
    }
    await setDoc(doc(db, 'users', user.uid), profile)
    setUserProfile(profile)
    if (analytics) logEvent(analytics, 'sign_up', { method: 'email' })
    return user
  }

  async function login(email, password) {
    assertFirebaseReady()
    const { user } = await signInWithEmailAndPassword(auth, email, password)
    const snap = await getDoc(doc(db, 'users', user.uid))
    if (snap.exists()) setUserProfile(snap.data())
    if (analytics) logEvent(analytics, 'login', { method: 'email' })
    return user
  }

  async function saveCompletedTasks(tasks) {
    assertFirebaseReady()
    if (!currentUser) return
    await updateDoc(doc(db, 'users', currentUser.uid), { completedTasks: tasks })
    setUserProfile((prev) => ({ ...prev, completedTasks: tasks }))
  }

  async function saveHealthData(healthData) {
    assertFirebaseReady()
    if (!currentUser) return
    await updateDoc(doc(db, 'users', currentUser.uid), { healthData })
    setUserProfile((prev) => ({ ...prev, healthData }))
  }

  async function loginWithGoogle() {
    assertFirebaseReady()
    const provider = new GoogleAuthProvider()
    const { user } = await signInWithPopup(auth, provider)
    const snap = await getDoc(doc(db, 'users', user.uid))
    if (snap.exists()) {
      setUserProfile(snap.data())
    } else {
      const profile = {
        name: user.displayName || 'User',
        email: user.email,
        createdAt: new Date().toISOString(),
        completedTasks: {},
        healthData: {
          steps: 0, calories: 0, heartRate: 72,
          sleep: 7.5, water: 0, weight: 65, workoutMinutes: 0,
        },
      }
      await setDoc(doc(db, 'users', user.uid), profile)
      setUserProfile(profile)
    }
    if (analytics) logEvent(analytics, 'login', { method: 'google' })
    return user
  }

  async function forgotPassword(email) {
    assertFirebaseReady()
    await sendPasswordResetEmail(auth, email)
  }

  async function uploadProfilePhoto(file) {
    assertFirebaseReady()
    if (!currentUser || !storage) return
    const storageRef = ref(storage, `avatars/${currentUser.uid}`)
    await uploadBytes(storageRef, file)
    const url = await getDownloadURL(storageRef)
    await updateProfile(currentUser, { photoURL: url })
    await updateDoc(doc(db, 'users', currentUser.uid), { photoURL: url })
    setUserProfile((prev) => ({ ...prev, photoURL: url }))
    return url
  }

  function logout() {
    assertFirebaseReady()
    setUserProfile(null)
    return signOut(auth)
  }

  useEffect(() => {
    if (!firebaseConfigReady || !auth || !db) {
      setLoading(false)
      return undefined
    }

    let profileUnsub = null

    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
      if (profileUnsub) { profileUnsub(); profileUnsub = null }
      if (user) {
        // Realtime listener — profile updates instantly across tabs/devices
        profileUnsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
          if (snap.exists()) setUserProfile(snap.data())
        })
      }
      setLoading(false)
    })
    return () => { unsub(); if (profileUnsub) profileUnsub() }
  }, [])

  return (
    <AuthContext.Provider
      value={{ currentUser, userProfile, register, login, loginWithGoogle, forgotPassword, uploadProfilePhoto, logout, saveCompletedTasks, saveHealthData }}
    >
      {!loading && children}
    </AuthContext.Provider>
  )
}
