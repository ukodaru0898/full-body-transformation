import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getToken } from 'firebase/messaging'
import { messaging } from '../firebase'
import { analyzeIngredientsText } from '../utils/nutritionAssistant'
import { jsPDF } from 'jspdf'
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

const NAV_PAGES = [
  { id: 'face', label: '🧴 Face', color: '#ff9a5a' },
  { id: 'hair', label: '💇 Hair', color: '#58b8ff' },
  { id: 'food', label: '🥗 Food', color: '#65e0a3' },
  { id: 'gym', label: '🏋️ Gym', color: '#ff6b6b' },
  { id: 'wellness', label: '🌙 Wellness', color: '#b48eff' },
]

const TODAY_SCHEDULE = [
  { time: '6:00 AM', task: 'Warm lemon water + soaked almonds + fruit', category: 'food' },
  { time: '6:30 AM', task: 'Cleanse → Vitamin C serum → Moisturize → SPF', category: 'face' },
  { time: '7:00 AM', task: 'High-protein breakfast (oats / idli / paneer bhurji + whey)', category: 'food' },
  { time: '10:00 AM', task: 'Mid-morning snack: fruit + buttermilk', category: 'food' },
  { time: '1:00 PM', task: 'Balanced lunch: roti, dal, sabzi, paneer/tofu, curd', category: 'food' },
  { time: '4:30 PM', task: 'Pre-workout snack: banana + black coffee', category: 'food' },
  { time: '5:00 PM', task: "Today's gym session (check Gym page)", category: 'gym' },
  { time: '6:15 PM', task: 'Post-workout: whey shake or sprouts + banana', category: 'food' },
  { time: '8:00 PM', task: 'Dinner: roti, dal, vegetables', category: 'food' },
  { time: '8:30 PM', task: 'Night cleanse → retinol (2-3x/week) → moisturize → beard oil', category: 'face' },
  { time: '9:30 PM', task: 'Warm milk → plan tomorrow → gratitude journal', category: 'wellness' },
  { time: '10:00 PM', task: 'Sleep — aim for 7-8 hours', category: 'wellness' },
]

const CATEGORY_COLORS = {
  food: '#65e0a3',
  face: '#ff9a5a',
  gym: '#ff6b6b',
  hair: '#58b8ff',
  wellness: '#b48eff',
}

const DEFAULT_MACRO_GOALS = {
  calories: 2200,
  protein: 140,
  carbs: 250,
  fat: 70,
}

const ZERO_MACROS = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
}

function to24Hour(timeLabel) {
  const m = timeLabel.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!m) return '08:00'
  let hour = parseInt(m[1], 10)
  const minute = m[2]
  const meridian = m[3].toUpperCase()
  if (meridian === 'PM' && hour !== 12) hour += 12
  if (meridian === 'AM' && hour === 12) hour = 0
  return `${String(hour).padStart(2, '0')}:${minute}`
}

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

function RecenterMap({ center }) {
  const map = useMap()

  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true })
  }, [center, map])

  return null
}

function RingProgress({ value, max, color, size = 80, label, sublabel }) {
  const r = (size - 12) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.min(value / max, 1)
  const dash = pct * circ

  return (
    <div className="ring-wrap">
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth={10} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fontSize="13" fontWeight="700" fill="#1f2d44">
          {label}
        </text>
      </svg>
      <p className="ring-label">{sublabel}</p>
    </div>
  )
}

function HealthCard({ icon, title, value, unit, color, max, onClick }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className="health-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className="hc-top">
        <span className="hc-icon">{icon}</span>
        <span className="hc-title">{title}</span>
      </div>
      <p className="hc-value">
        {value.toLocaleString()} <span>{unit}</span>
      </p>
      <div className="hc-bar">
        <div className="hc-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function parseAppleHealthXML(xmlText) {
  const parser = new DOMParser()
  const xml = parser.parseFromString(xmlText, 'application/xml')
  const records = Array.from(xml.querySelectorAll('Record'))

  const today = new Date().toISOString().slice(0, 10)

  let steps = 0, calories = 0, heartRates = [], waterMl = 0, weight = 0, workoutMins = 0

  records.forEach((r) => {
    const type = r.getAttribute('type') || ''
    const start = (r.getAttribute('startDate') || '').slice(0, 10)
    const val = parseFloat(r.getAttribute('value') || '0')

    if (start !== today) return

    if (type === 'HKQuantityTypeIdentifierStepCount') steps += val
    if (type === 'HKQuantityTypeIdentifierActiveEnergyBurned') calories += val
    if (type === 'HKQuantityTypeIdentifierHeartRate') heartRates.push(val)
    if (type === 'HKQuantityTypeIdentifierDietaryWater') waterMl += val
    if (type === 'HKQuantityTypeIdentifierBodyMass') weight = val
  })

  const workouts = Array.from(xml.querySelectorAll('Workout'))
  workouts.forEach((w) => {
    const start = (w.getAttribute('startDate') || '').slice(0, 10)
    if (start !== today) return
    const dur = parseFloat(w.getAttribute('duration') || '0')
    const unit = w.getAttribute('durationUnit') || 'min'
    workoutMins += unit === 'min' ? dur : dur / 60
  })

  return {
    steps: Math.round(steps),
    calories: Math.round(calories),
    heartRate: heartRates.length ? Math.round(heartRates.reduce((a, b) => a + b) / heartRates.length) : 0,
    water: Math.round(waterMl / 250),
    weight: weight || 0,
    workoutMinutes: Math.round(workoutMins),
  }
}

export default function Dashboard() {
  const { currentUser, userProfile, logout, saveCompletedTasks, saveHealthData, uploadProfilePhoto } = useAuth()
  const navigate = useNavigate()

  const health = userProfile?.healthData || {
    steps: 0, calories: 0, heartRate: 72, sleep: 7.5, water: 0, weight: 65, workoutMinutes: 0,
  }

  const completed = userProfile?.completedTasks || {}
  const doneToday = TODAY_SCHEDULE.filter((_, i) => completed[`today-${i}`]).length
  const [logField, setLogField] = useState(null)
  const [logValue, setLogValue] = useState('')
  const [syncMsg, setSyncMsg] = useState('')
  const [photoUploading, setPhotoUploading] = useState(false)
  const [notifStatus, setNotifStatus] = useState('')
  const [userCoords, setUserCoords] = useState(null)
  const [mapStatus, setMapStatus] = useState('Finding your location...')
  const [ingredientText, setIngredientText] = useState('2 eggs\n100g paneer\n1 cup rice\n1 banana')
  const [nutritionResult, setNutritionResult] = useState(null)
  const [nutritionError, setNutritionError] = useState('')
  const [remindersEnabled, setRemindersEnabled] = useState(() => (
    typeof window !== 'undefined' && localStorage.getItem('fitness-reminders-enabled') === 'true'
  ))
  const [reminders, setReminders] = useState(() => {
    if (typeof window === 'undefined') return []
    try {
      return JSON.parse(localStorage.getItem('fitness-reminders') || '[]')
    } catch {
      return []
    }
  })
  const [reminderTime, setReminderTime] = useState('18:00')
  const [reminderTask, setReminderTask] = useState('Workout session')
  const reminderTimersRef = useRef([])
  const todayKey = new Date().toISOString().slice(0, 10)
  const [dailyMacros, setDailyMacros] = useState(() => {
    if (typeof window === 'undefined') return ZERO_MACROS
    try {
      const stored = JSON.parse(localStorage.getItem('daily-macro-totals') || 'null')
      if (stored?.date === new Date().toISOString().slice(0, 10) && stored?.totals) return stored.totals
      return ZERO_MACROS
    } catch {
      return ZERO_MACROS
    }
  })
  const [macroGoals, setMacroGoals] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_MACRO_GOALS
    try {
      return JSON.parse(localStorage.getItem('daily-macro-goals') || 'null') || DEFAULT_MACRO_GOALS
    } catch {
      return DEFAULT_MACRO_GOALS
    }
  })

  const mapCenter = userCoords || [17.385, 78.4867]
  const nearbySpots = useMemo(() => {
    if (!userCoords) {
      return [
        { name: 'City Fitness Club', kind: 'Gym', coords: [17.3872, 78.4893] },
        { name: 'Run Track Point', kind: 'Track', coords: [17.383, 78.4832] },
        { name: 'Yoga Studio', kind: 'Yoga', coords: [17.3898, 78.482] },
      ]
    }

    const [lat, lng] = userCoords
    return [
      { name: 'Nearby Gym', kind: 'Gym', coords: [lat + 0.0045, lng + 0.0032] },
      { name: 'Open Park Track', kind: 'Track', coords: [lat - 0.0038, lng + 0.0045] },
      { name: 'Yoga & Mobility Studio', kind: 'Yoga', coords: [lat + 0.002, lng - 0.0042] },
    ]
  }, [userCoords])

  const suggestedReminders = useMemo(() => {
    return TODAY_SCHEDULE
      .filter((item) => ['food', 'gym', 'wellness'].includes(item.category))
      .map((item) => ({ time: to24Hour(item.time), task: item.task }))
      .filter((suggestion) => !reminders.some((r) => r.time === suggestion.time && r.task === suggestion.task))
  }, [reminders])

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setMapStatus('Location unavailable in this browser. Showing default city map.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords([pos.coords.latitude, pos.coords.longitude])
        setMapStatus('Showing spots near your current location.')
      },
      () => {
        setMapStatus('Location permission denied. Showing default city map.')
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }, [])

  const clearReminderTimers = () => {
    reminderTimersRef.current.forEach((id) => window.clearTimeout(id))
    reminderTimersRef.current = []
  }

  const scheduleReminder = (reminder) => {
    const [hour, minute] = reminder.time.split(':').map((v) => parseInt(v, 10))
    const now = new Date()
    const trigger = new Date()
    trigger.setHours(hour, minute, 0, 0)
    if (trigger <= now) trigger.setDate(trigger.getDate() + 1)

    const delay = trigger.getTime() - now.getTime()
    const timerId = window.setTimeout(() => {
      new Notification('Fitness Reminder', {
        body: reminder.task,
        tag: `fitness-reminder-${reminder.id}`,
      })
      scheduleReminder(reminder)
    }, delay)

    reminderTimersRef.current.push(timerId)
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem('fitness-reminders-enabled', String(remindersEnabled))
  }, [remindersEnabled])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem('fitness-reminders', JSON.stringify(reminders))
  }, [reminders])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem('daily-macro-goals', JSON.stringify(macroGoals))
  }, [macroGoals])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem('daily-macro-totals', JSON.stringify({ date: todayKey, totals: dailyMacros }))
  }, [dailyMacros, todayKey])

  useEffect(() => {
    clearReminderTimers()
    if (!remindersEnabled || !reminders.length) return undefined
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return undefined

    reminders.forEach(scheduleReminder)
    return () => clearReminderTimers()
  }, [remindersEnabled, reminders])

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPhotoUploading(true)
    try {
      await uploadProfilePhoto(file)
    } catch {
      // silent fail
    }
    setPhotoUploading(false)
    e.target.value = ''
  }

  const requestNotifications = async () => {
    try {
      if (typeof Notification === 'undefined') {
        setNotifStatus('This browser does not support notifications.')
        return
      }

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setNotifStatus('Notifications blocked.'); return }

      let status = '✅ Local notifications enabled!'
      if (messaging && import.meta.env.VITE_FIREBASE_VAPID_KEY) {
        const token = await getToken(messaging, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY })
        if (token) status = '✅ Push + local notifications enabled!'
      }
      setNotifStatus(status)
    } catch {
      setNotifStatus('Could not enable notifications.')
    }
    setTimeout(() => setNotifStatus(''), 4000)
  }

  const toggleReminders = async () => {
    const nextValue = !remindersEnabled
    if (!nextValue) {
      setRemindersEnabled(false)
      setNotifStatus('Daily reminders turned off.')
      setTimeout(() => setNotifStatus(''), 3000)
      return
    }

    if (typeof Notification === 'undefined') {
      setNotifStatus('This browser does not support notifications.')
      setTimeout(() => setNotifStatus(''), 4000)
      return
    }

    let permission = Notification.permission
    if (permission !== 'granted') permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      setNotifStatus('Enable notifications in browser to use reminders.')
      setTimeout(() => setNotifStatus(''), 4000)
      return
    }

    setRemindersEnabled(true)
    setNotifStatus('✅ Daily reminders enabled!')
    setTimeout(() => setNotifStatus(''), 3000)
  }

  const addReminder = () => {
    if (!reminderTime || !reminderTask.trim()) return
    const duplicate = reminders.some((r) => r.time === reminderTime && r.task.toLowerCase() === reminderTask.trim().toLowerCase())
    if (duplicate) {
      setNotifStatus('Reminder already exists for this time/task.')
      setTimeout(() => setNotifStatus(''), 2500)
      return
    }

    const reminder = {
      id: `${Date.now()}`,
      time: reminderTime,
      task: reminderTask.trim(),
    }
    setReminders((prev) => [...prev, reminder])
    setReminderTask('')
  }

  const deleteReminder = (id) => {
    setReminders((prev) => prev.filter((r) => r.id !== id))
  }

  const addSuggestedReminder = (time, task) => {
    const duplicate = reminders.some((r) => r.time === time && r.task === task)
    if (duplicate) return
    setReminders((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, time, task }])
  }

  const addAllSuggestedReminders = () => {
    suggestedReminders.forEach((item) => addSuggestedReminder(item.time, item.task))
  }

  const runNutritionAnalysis = () => {
    const result = analyzeIngredientsText(ingredientText)
    if (result.error) {
      setNutritionError(result.error)
      setNutritionResult(null)
      return
    }
    setNutritionError('')
    setNutritionResult(result)
  }

  const exportMealReportPDF = () => {
    if (!nutritionResult) return
    const doc = new jsPDF()
    const generatedAt = new Date().toLocaleString()

    doc.setFontSize(18)
    doc.text('Meal Nutrition Report', 14, 18)
    doc.setFontSize(10)
    doc.text(`Generated: ${generatedAt}`, 14, 25)

    let y = 34
    doc.setFontSize(12)
    nutritionResult.entries.forEach((entry, i) => {
      if (y > 270) {
        doc.addPage()
        y = 20
      }
      doc.text(`${i + 1}. ${entry.matched} (${entry.grams} g)`, 14, y)
      y += 6
      doc.setFontSize(10)
      doc.text(`Calories: ${entry.calories} kcal | Protein: ${entry.protein} g | Carbs: ${entry.carbs} g | Fat: ${entry.fat} g`, 18, y)
      y += 9
      doc.setFontSize(12)
    })

    y += 4
    doc.setFontSize(13)
    doc.text('Totals', 14, y)
    y += 8
    doc.setFontSize(11)
    doc.text(`Calories: ${nutritionResult.totals.calories} kcal`, 14, y)
    y += 6
    doc.text(`Protein: ${nutritionResult.totals.protein} g`, 14, y)
    y += 6
    doc.text(`Carbs: ${nutritionResult.totals.carbs} g`, 14, y)
    y += 6
    doc.text(`Fat: ${nutritionResult.totals.fat} g`, 14, y)

    doc.save(`meal-report-${todayKey}.pdf`)
  }

  const addMealToDailyProgress = () => {
    if (!nutritionResult) return
    setDailyMacros((prev) => ({
      calories: +(prev.calories + nutritionResult.totals.calories).toFixed(1),
      protein: +(prev.protein + nutritionResult.totals.protein).toFixed(1),
      carbs: +(prev.carbs + nutritionResult.totals.carbs).toFixed(1),
      fat: +(prev.fat + nutritionResult.totals.fat).toFixed(1),
    }))
    setNotifStatus('✅ Meal added to daily macro tracker.')
    setTimeout(() => setNotifStatus(''), 2500)
  }

  const resetDailyMacros = () => {
    setDailyMacros(ZERO_MACROS)
    setNotifStatus('Daily macro tracker reset.')
    setTimeout(() => setNotifStatus(''), 2500)
  }

  const updateMacroGoal = (field, value) => {
    setMacroGoals((prev) => ({ ...prev, [field]: Math.max(0, Number(value) || 0) }))
  }
  const toggleToday = async (i) => {
    const key = `today-${i}`
    const updated = { ...completed, [key]: !completed[key] }
    await saveCompletedTasks(updated)
  }

  const openLog = (field) => {
    setLogField(field)
    setLogValue(health[field] || '')
  }

  const submitLog = async () => {
    if (!logField) return
    const updated = { ...health, [logField]: parseFloat(logValue) || 0 }
    await saveHealthData(updated)
    setLogField(null)
  }

  const handleHealthImport = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const parsed = parseAppleHealthXML(ev.target.result)
        const updated = { ...health, ...parsed }
        await saveHealthData(updated)
        setSyncMsg('Apple Health data synced successfully!')
        setTimeout(() => setSyncMsg(''), 4000)
      } catch {
        setSyncMsg('Could not parse file. Please export a valid Apple Health XML.')
        setTimeout(() => setSyncMsg(''), 4000)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const firstName = currentUser?.displayName?.split(' ')[0] || userProfile?.name?.split(' ')[0] || 'Champion'

  return (
    <div className="app-shell">
      {/* ── HEADER ── */}
      <header className="dash-header">
        <div className="dash-header-left">
          <label className="avatar-wrap" title="Change photo">
            {(userProfile?.photoURL || currentUser?.photoURL)
              ? <img src={userProfile?.photoURL || currentUser?.photoURL} alt="avatar" className="avatar-img" />
              : <span className="avatar-initials">{firstName[0]}</span>}
            {photoUploading && <span className="avatar-uploading">…</span>}
            <input type="file" accept="image/*" hidden onChange={handlePhotoUpload} />
          </label>
          <div>
            <p className="kicker">2-Month Transformation</p>
            <h2>Welcome back, {firstName}</h2>
          </div>
        </div>
        <div className="dash-header-right">
          <p className="dash-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <button className="ghost-btn-sm" onClick={() => navigate('/leaderboard')}>🏆 Leaderboard</button>
          <button className="ghost-btn-sm" onClick={requestNotifications} title="Enable push notifications">🔔</button>
          <button className="ghost-btn" onClick={() => logout().then(() => navigate('/'))}>Logout</button>
        </div>
      </header>

      {/* ── EMAIL VERIFICATION BANNER ── */}
      {currentUser && !currentUser.emailVerified && (
        <div className="verify-banner">
          📧 Please verify your email address. Check your inbox for the verification link.
        </div>
      )}
      {notifStatus && <div className="verify-banner notif-banner">{notifStatus}</div>}

      {/* ── NAV ── */}
      <nav className="dash-nav">
        {NAV_PAGES.map((p) => (
          <button
            key={p.id}
            className="slide-pill"
            style={{ '--pill-color': p.color }}
            onClick={() => navigate(`/schedule/${p.id}`)}
          >
            {p.label}
          </button>
        ))}
      </nav>

      {/* ── HEALTH METRICS ── */}
      <section className="section-card">
        <div className="section-head">
          <h3>⌚ Health Metrics</h3>
          <div className="health-sync-row">
            {syncMsg && <span className="sync-msg">{syncMsg}</span>}
            <label className="import-btn">
              Import Apple Health
              <input type="file" accept=".xml" onChange={handleHealthImport} hidden />
            </label>
            <button className="ghost-btn-sm" onClick={() => {}}>
              <a
                href="https://support.apple.com/guide/iphone/share-your-health-data-iph5ede58c3d/ios"
                target="_blank"
                rel="noreferrer"
              >
                How to export?
              </a>
            </button>
          </div>
        </div>

        <p className="health-hint">
          ⌚ Tap any card to manually log a value · Import your Apple Health export (from iPhone → Health → Profile → Export All Health Data) to sync real data.
        </p>

        <div className="health-rings">
          <RingProgress value={health.steps} max={10000} color="#ff9a5a" label={health.steps >= 1000 ? `${(health.steps / 1000).toFixed(1)}k` : health.steps} sublabel="Steps" />
          <RingProgress value={health.calories} max={600} color="#ff6b6b" label={health.calories} sublabel="Cal" />
          <RingProgress value={health.workoutMinutes} max={60} color="#65e0a3" label={`${health.workoutMinutes}m`} sublabel="Active" />
          <RingProgress value={health.sleep} max={9} color="#b48eff" label={`${health.sleep}h`} sublabel="Sleep" />
        </div>

        <div className="health-grid">
          <HealthCard icon="👣" title="Steps" value={health.steps} unit="/ 10k" color="#ff9a5a" max={10000} onClick={() => openLog('steps')} />
          <HealthCard icon="🔥" title="Calories" value={health.calories} unit="kcal" color="#ff6b6b" max={600} onClick={() => openLog('calories')} />
          <HealthCard icon="❤️" title="Heart Rate" value={health.heartRate} unit="BPM" color="#ff4d6d" max={180} onClick={() => openLog('heartRate')} />
          <HealthCard icon="💤" title="Sleep" value={health.sleep} unit="hrs" color="#b48eff" max={9} onClick={() => openLog('sleep')} />
          <HealthCard icon="💧" title="Water" value={health.water} unit="glasses" color="#58b8ff" max={12} onClick={() => openLog('water')} />
          <HealthCard icon="⚖️" title="Weight" value={health.weight} unit="kg" color="#65e0a3" max={80} onClick={() => openLog('weight')} />
        </div>

        {logField && (
          <div className="log-modal-overlay" onClick={() => setLogField(null)}>
            <div className="log-modal" onClick={(e) => e.stopPropagation()}>
              <h4>Log {logField.charAt(0).toUpperCase() + logField.slice(1)}</h4>
              <input
                type="number"
                value={logValue}
                onChange={(e) => setLogValue(e.target.value)}
                autoFocus
                min={0}
              />
              <div className="log-modal-actions">
                <button className="primary-btn" onClick={submitLog}>Save</button>
                <button className="ghost-btn" onClick={() => setLogField(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── APPLE WATCH INFO ── */}
      <section className="section-card watch-card">
        <div className="watch-left">
          <span style={{ fontSize: '2.5rem' }}>⌚</span>
          <div>
            <h3>Apple Watch Integration</h3>
            <p>
              Direct real-time Apple Watch connection requires a native iOS companion app. For now, sync your data by exporting from your iPhone:
              <strong> Health app → your profile photo → Export All Health Data → upload the XML file above.</strong>
            </p>
          </div>
        </div>
        <div className="watch-steps">
          <div className="watch-step"><span>1</span> Open Health app on iPhone</div>
          <div className="watch-step"><span>2</span> Tap your profile photo → Export All Health Data</div>
          <div className="watch-step"><span>3</span> Save the ZIP, extract export.xml</div>
          <div className="watch-step"><span>4</span> Click "Import Apple Health" above</div>
        </div>
      </section>

      {/* ── FREE MAP (OPENSTREETMAP) ── */}
      <section className="section-card">
        <div className="section-head">
          <h3>🗺️ Nearby Fitness Spots (Free Map)</h3>
          <span className="badge">OpenStreetMap</span>
        </div>
        <p className="map-hint">{mapStatus}</p>

        <div className="map-wrap">
          <MapContainer center={mapCenter} zoom={13} scrollWheelZoom={false} className="fitness-map">
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <RecenterMap center={mapCenter} />

            {userCoords && (
              <>
                <Marker position={userCoords}>
                  <Popup>You are here</Popup>
                </Marker>
                <Circle center={userCoords} radius={1200} pathOptions={{ color: '#2d7ef7', fillColor: '#2d7ef7', fillOpacity: 0.14 }} />
              </>
            )}

            {nearbySpots.map((spot) => (
              <Marker key={spot.name} position={spot.coords}>
                <Popup>
                  <strong>{spot.name}</strong>
                  <br />
                  {spot.kind}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </section>

      {/* ── AI NUTRITION ASSISTANT ── */}
      <section className="section-card">
        <div className="section-head">
          <h3>🤖 AI Nutrition Assistant</h3>
          <span className="badge">Ingredient Analyzer</span>
        </div>
        <p className="nutrition-hint">Enter ingredients with quantity (e.g. 2 eggs, 100g paneer, 1 cup rice). The assistant estimates calories, protein, carbs, fat, and fiber.</p>

        <div className="nutrition-input-row">
          <textarea
            className="nutrition-input"
            rows={5}
            value={ingredientText}
            onChange={(e) => setIngredientText(e.target.value)}
            placeholder="2 eggs\n100g chicken\n1 cup rice"
          />
          <div className="nutrition-actions">
            <button className="primary-btn nutrition-btn" onClick={runNutritionAnalysis}>Analyze Meal</button>
            <button className="ghost-btn nutrition-btn" onClick={addMealToDailyProgress} disabled={!nutritionResult}>Add To Daily</button>
            <button className="ghost-btn nutrition-btn" onClick={exportMealReportPDF} disabled={!nutritionResult}>Export PDF</button>
          </div>
        </div>

        {nutritionError && <p className="auth-error nutrition-error">{nutritionError}</p>}

        {nutritionResult && (
          <div className="nutrition-result">
            <div className="nutrition-totals">
              <div className="nutrition-total-card"><span>Calories</span><strong>{nutritionResult.totals.calories} kcal</strong></div>
              <div className="nutrition-total-card"><span>Protein</span><strong>{nutritionResult.totals.protein} g</strong></div>
              <div className="nutrition-total-card"><span>Carbs</span><strong>{nutritionResult.totals.carbs} g</strong></div>
              <div className="nutrition-total-card"><span>Fat</span><strong>{nutritionResult.totals.fat} g</strong></div>
            </div>

            <div className="nutrition-list">
              {nutritionResult.entries.map((entry) => (
                <div key={`${entry.input}-${entry.matched}`} className="nutrition-item">
                  <p><strong>{entry.matched}</strong> ({entry.grams} g)</p>
                  <p>{entry.calories} kcal · P {entry.protein} g · C {entry.carbs} g · F {entry.fat} g</p>
                </div>
              ))}
            </div>

            {nutritionResult.unknown.length > 0 && (
              <p className="nutrition-unknown">Not recognized: {nutritionResult.unknown.join(', ')}</p>
            )}
          </div>
        )}

        <div className="macro-section">
          <div className="section-head macro-head">
            <h3>🎯 Daily Macro Target Progress</h3>
            <button className="ghost-btn-sm" onClick={resetDailyMacros}>Reset Today</button>
          </div>

          <div className="macro-goals-grid">
            <label>
              Calories Goal
              <input type="number" min="0" value={macroGoals.calories} onChange={(e) => updateMacroGoal('calories', e.target.value)} />
            </label>
            <label>
              Protein Goal (g)
              <input type="number" min="0" value={macroGoals.protein} onChange={(e) => updateMacroGoal('protein', e.target.value)} />
            </label>
            <label>
              Carbs Goal (g)
              <input type="number" min="0" value={macroGoals.carbs} onChange={(e) => updateMacroGoal('carbs', e.target.value)} />
            </label>
            <label>
              Fat Goal (g)
              <input type="number" min="0" value={macroGoals.fat} onChange={(e) => updateMacroGoal('fat', e.target.value)} />
            </label>
          </div>

          <div className="macro-progress-list">
            {[
              { key: 'calories', label: 'Calories', unit: 'kcal' },
              { key: 'protein', label: 'Protein', unit: 'g' },
              { key: 'carbs', label: 'Carbs', unit: 'g' },
              { key: 'fat', label: 'Fat', unit: 'g' },
            ].map((m) => {
              const consumed = dailyMacros[m.key]
              const target = macroGoals[m.key] || 1
              const pct = Math.min((consumed / target) * 100, 100)
              return (
                <div key={m.key} className="macro-progress-item">
                  <div className="macro-progress-top">
                    <p>{m.label}</p>
                    <p>{consumed} / {target} {m.unit}</p>
                  </div>
                  <div className="macro-progress-track">
                    <div className="macro-progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── SMART REMINDERS ── */}
      <section className="section-card">
        <div className="section-head">
          <h3>⏰ Smart Daily Reminders</h3>
          <button className="ghost-btn-sm" onClick={toggleReminders}>
            {remindersEnabled ? 'Turn Off' : 'Turn On'}
          </button>
        </div>
        <p className="map-hint">Reminders trigger only when you turn them on and allow browser notifications.</p>

        <div className="reminder-form">
          <input type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} />
          <input
            type="text"
            value={reminderTask}
            onChange={(e) => setReminderTask(e.target.value)}
            placeholder="What should we remind you about?"
          />
          <button className="primary-btn" onClick={addReminder}>Add Reminder</button>
        </div>

        <div className="reminder-list">
          {reminders.length === 0 && <p className="nutrition-hint">No reminders yet. Add your first reminder above.</p>}
          {reminders.map((reminder) => (
            <div key={reminder.id} className="reminder-item">
              <p><strong>{reminder.time}</strong> · {reminder.task}</p>
              <button className="ghost-btn-sm" onClick={() => deleteReminder(reminder.id)}>Remove</button>
            </div>
          ))}
        </div>

        <div className="reminder-suggestions">
          <div className="section-head reminder-suggestion-head">
            <h3>✨ Auto Suggestions From Today Schedule</h3>
            <button className="ghost-btn-sm" onClick={addAllSuggestedReminders} disabled={suggestedReminders.length === 0}>Add All</button>
          </div>
          {suggestedReminders.length === 0 && <p className="nutrition-hint">All suggested reminders already added.</p>}
          <div className="reminder-suggestion-list">
            {suggestedReminders.map((item) => (
              <div className="reminder-item" key={`${item.time}-${item.task}`}>
                <p><strong>{item.time}</strong> · {item.task}</p>
                <button className="ghost-btn-sm" onClick={() => addSuggestedReminder(item.time, item.task)}>Add</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TODAY'S SCHEDULE ── */}
      <section className="section-card">
        <div className="section-head">
          <h3>📅 Today's Full Schedule</h3>
          <span className="badge">{doneToday} / {TODAY_SCHEDULE.length} done</span>
        </div>
        <div className="today-progress-track">
          <div className="today-progress-fill" style={{ width: `${(doneToday / TODAY_SCHEDULE.length) * 100}%` }} />
        </div>

        <div className="today-list">
          {TODAY_SCHEDULE.map((item, i) => {
            const done = Boolean(completed[`today-${i}`])
            return (
              <div
                key={i}
                className={`today-item ${done ? 'done' : ''}`}
                onClick={() => toggleToday(i)}
                style={{ '--cat-color': CATEGORY_COLORS[item.category] }}
              >
                <div className="today-check">{done ? '✓' : ''}</div>
                <div>
                  <p className="today-time">{item.time}</p>
                  <p className="today-task">{item.task}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="app-footer">
        <p>Goal: 72–75 kg · Protein: 110–120g/day · Water: 3–4 L/day · Sleep: 10 PM–6 AM</p>
        <div className="footer-links">
          {NAV_PAGES.map((p) => (
            <button key={p.id} className="ghost-btn-sm" onClick={() => navigate(`/schedule/${p.id}`)}>
              {p.label}
            </button>
          ))}
        </div>
      </footer>
    </div>
  )
}
