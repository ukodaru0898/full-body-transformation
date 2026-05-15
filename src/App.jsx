import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import SchedulePage from './pages/SchedulePage'
import Leaderboard from './pages/Leaderboard'
import OnboardingPage from './pages/OnboardingPage'
import './App.css'

function ProtectedRoute({ children }) {
  const { currentUser, userProfile } = useAuth()
  if (!currentUser) return <Navigate to="/" replace />
  // Redirect new users to onboarding if they haven't completed it
  if (userProfile && !userProfile.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />
  }
  return children
}

function OnboardingRoute({ children }) {
  const { currentUser, userProfile } = useAuth()
  if (!currentUser) return <Navigate to="/" replace />
  // If already onboarded, go straight to dashboard
  if (userProfile?.onboardingCompleted) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AuthPage />} />
          <Route
            path="/onboarding"
            element={
              <OnboardingRoute>
                <OnboardingPage />
              </OnboardingRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/schedule/:pageId"
            element={
              <ProtectedRoute>
                <SchedulePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute>
                <Leaderboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
