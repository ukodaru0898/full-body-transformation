import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function AuthPage() {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }))

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
      const msg = err.message
        .replace('Firebase: ', '')
        .replace(/\(auth\/.*?\)\.?/, '')
        .trim()
      setError(msg || 'Something went wrong. Please try again.')
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
          {mode === 'login' ? 'Welcome Back' : 'Start Your Journey'}
        </h1>
        <p className="auth-subhead">
          {mode === 'login'
            ? 'Log in to track your transformation, health metrics, and daily schedule.'
            : 'Create your account and build your camera-ready physique in 8 weeks.'}
        </p>

        <div className="auth-tabs">
          <button
            type="button"
            className={mode === 'login' ? 'active' : ''}
            onClick={() => { setMode('login'); setError('') }}
          >
            Login
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'active' : ''}
            onClick={() => { setMode('register'); setError('') }}
          >
            Register
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
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
            <input
              type="password"
              placeholder="Minimum 6 characters"
              value={form.password}
              onChange={set('password')}
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="primary-btn" disabled={busy}>
            {busy
              ? 'Please wait…'
              : mode === 'login'
              ? 'Login →'
              : 'Create Account →'}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
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
