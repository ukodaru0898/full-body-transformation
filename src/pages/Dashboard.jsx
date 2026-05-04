import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

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
  const { currentUser, userProfile, logout, saveCompletedTasks, saveHealthData } = useAuth()
  const navigate = useNavigate()

  const health = userProfile?.healthData || {
    steps: 0, calories: 0, heartRate: 72, sleep: 7.5, water: 0, weight: 65, workoutMinutes: 0,
  }

  const completed = userProfile?.completedTasks || {}
  const doneToday = TODAY_SCHEDULE.filter((_, i) => completed[`today-${i}`]).length
  const [logField, setLogField] = useState(null)
  const [logValue, setLogValue] = useState('')
  const [syncMsg, setSyncMsg] = useState('')

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
          <span className="brand-icon">💪</span>
          <div>
            <p className="kicker">2-Month Transformation</p>
            <h2>Welcome back, {firstName}</h2>
          </div>
        </div>
        <div className="dash-header-right">
          <p className="dash-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <button className="ghost-btn" onClick={() => logout().then(() => navigate('/'))}>Logout</button>
        </div>
      </header>

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
