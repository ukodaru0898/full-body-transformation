import { createContext, useContext, useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'

const AuthContext = createContext()

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function register(email, password, name) {
    const { user } = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(user, { displayName: name })
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
    return user
  }

  async function login(email, password) {
    const { user } = await signInWithEmailAndPassword(auth, email, password)
    const snap = await getDoc(doc(db, 'users', user.uid))
    if (snap.exists()) setUserProfile(snap.data())
    return user
  }

  async function saveCompletedTasks(tasks) {
    if (!currentUser) return
    await updateDoc(doc(db, 'users', currentUser.uid), { completedTasks: tasks })
    setUserProfile((prev) => ({ ...prev, completedTasks: tasks }))
  }

  async function saveHealthData(healthData) {
    if (!currentUser) return
    await updateDoc(doc(db, 'users', currentUser.uid), { healthData })
    setUserProfile((prev) => ({ ...prev, healthData }))
  }

  function logout() {
    setUserProfile(null)
    return signOut(auth)
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user)
      if (user) {
        const snap = await getDoc(doc(db, 'users', user.uid))
        if (snap.exists()) setUserProfile(snap.data())
      }
      setLoading(false)
    })
    return unsub
  }, [])

  return (
    <AuthContext.Provider
      value={{ currentUser, userProfile, register, login, logout, saveCompletedTasks, saveHealthData }}
    >
      {!loading && children}
    </AuthContext.Provider>
  )
}
