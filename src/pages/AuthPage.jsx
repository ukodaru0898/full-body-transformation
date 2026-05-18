import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function toFriendlyAuthError(err) {
  const code = err?.code || ''
  if (code === 'auth/email-already-in-use') return 'This email is already registered. Try logging in instead.'
  if (code === 'auth/invalid-credential') return 'Invalid email or password.'
  if (code === 'auth/invalid-email') return 'Please enter a valid email address.'
  if (code === 'auth/weak-password') return 'Password is too weak. Use at least 6 characters.'
  if (code === 'auth/popup-closed-by-user') return 'Google sign-in popup was closed before completing.'
  if (code === 'auth/popup-blocked') return 'Popup was blocked. Please allow popups for this site and try again.'
  if (code === 'auth/operation-not-supported-in-this-environment') return 'Google sign-in popup is not supported here. Redirect login will be used instead.'
  if (code === 'auth/unauthorized-domain') return 'This domain is not authorized for Google sign-in. Please contact support.'
  if (code === 'auth/user-not-found') return 'No account found with this email. Please register first.'
  if (code === 'auth/wrong-password') return 'Incorrect password. Try again or use Forgot password.'
  if (code === 'auth/too-many-requests') return 'Too many attempts. Please wait a few minutes and try again.'

  const cleaned = (err?.message || '')
    .replace('Firebase: ', '')
    .replace(/\(auth\/.*?\)\.?/, '')
    .trim()

  if (!cleaned || cleaned.toLowerCase() === 'error') {
    return 'Authentication failed. Please try again.'
  }
  return cleaned
}

export default function AuthPage() {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const { login, register, loginWithGoogle, forgotPassword, authError, clearAuthError } = useAuth()
  const navigate = useNavigate()

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }))

  useEffect(() => {
    if (authError) {
      setError(toFriendlyAuthError(authError))
      setBusy(false)
    }
  }, [authError])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'register') {
        if (form.name.trim().length < 2) throw new Error('Name must be at least 2 characters.')
        await register(form.email, form.password, form.name.trim())
      } else {
        await login(form.email, form.password)
      }
      navigate('/dashboard')
    } catch (err) {
      setError(toFriendlyAuthError(err))
    }
    setBusy(false)
  }

  return (
    <div className="auth-shell">
      <div className="aurora aurora-one" />
      <div className="aurora aurora-two" />
      <div className="aurora aurora-three" />

      <section className="auth-panel">
        <div className="auth-brand">
          <span className="brand-icon">💪</span>
          <p className="kicker">2-Month Transformation Blueprint</p>
        </div>

        <h1 className="auth-title">
          {mode === 'login' ? 'Welcome Back' : mode === 'forgot' ? 'Reset Password' : 'Start Your Journey'}
        </h1>
        <p className="auth-subhead">
          {mode === 'login'
            ? 'Log in to track your transformation, health metrics, and daily schedule.'
            : mode === 'forgot'
            ? 'Enter your email and we\'ll send you a reset link.'
            : 'Create your account and build your camera-ready physique in 8 weeks.'}
        </p>

        <div className="auth-tabs">
          <button
            type="button"
            className={mode === 'login' ? 'active' : ''}
            onClick={() => { setMode('login'); setError(''); setResetSent(false); clearAuthError() }}
          >
            Login
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'active' : ''}
            onClick={() => { setMode('register'); setError(''); setResetSent(false); clearAuthError() }}
          >
            Register
          </button>
        </div>

        <form className="auth-form" onSubmit={mode === 'forgot' ? async (e) => {
          e.preventDefault(); setError(''); setBusy(true)
          try {
            await forgotPassword(form.email)
            setResetSent(true)
          } catch (err) {
            setError(toFriendlyAuthError(err))
          }
          setBusy(false)
        } : handleSubmit}>
          {mode === 'register' && (
            <label>
              Full Name
              <input
                type="text"
                placeholder="e.g. Uday Kiran"
                value={form.name}
                onChange={set('name')}
                required
                autoComplete="name"
              />
            </label>
          )}

          <label>
            Email Address
            <input
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={set('email')}
              required
              autoComplete="email"
            />
          </label>

          <label>
            Password
            <div className="pwd-wrap">
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder="Minimum 6 characters"
                value={form.password}
                onChange={set('password')}
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button type="button" className="pwd-toggle" onClick={() => setShowPwd(p => !p)}>
                {showPwd ? '🙈' : '👁️'}
              </button>
            </div>
          </label>

          {error && <p className="auth-error">{error}</p>}
          {resetSent && <p className="auth-success">✅ Reset email sent! Check your inbox.</p>}

          <button type="submit" className="primary-btn" disabled={busy}>
            {busy
              ? 'Please wait…'
              : mode === 'login'
              ? 'Login →'
              : mode === 'forgot'
              ? 'Send Reset Email →'
              : 'Create Account →'}
          </button>
        </form>

        {mode === 'login' && (
          <p className="auth-forgot">
            <button type="button" onClick={() => { setMode('forgot'); setError(''); setResetSent(false); clearAuthError() }}>
              Forgot password?
            </button>
          </p>
        )}

        <div className="auth-divider"><span>or</span></div>

        <button
          type="button"
          className="google-btn"
          disabled={busy}
          onClick={async () => {
            setError('')
            clearAuthError()
            setBusy(true)
            try {
              const user = await loginWithGoogle()
              // Popup flow returns user immediately; redirect flow returns null and resumes after reload.
              if (user) navigate('/dashboard')
            } catch (err) {
              setError(toFriendlyAuthError(err))
            }
            setBusy(false)
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </button>

        <p className="auth-switch">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setResetSent(false); clearAuthError() }}
          >
            {mode === 'login' ? 'Register for free' : 'Log in'}
          </button>
        </p>

        <div className="auth-features">
          <span>🏋️ Workout tracker</span>
          <span>🍎 Nutrition plan</span>
          <span>⌚ Apple Health sync</span>
          <span>💤 Sleep insights</span>
        </div>
      </section>
    </div>
  )
}
