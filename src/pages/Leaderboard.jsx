import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'

const MEDALS = ['🥇', '🥈', '🥉']

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([])
  const [tab, setTab] = useState('steps')
  const [loading, setLoading] = useState(true)
  const { currentUser } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchLeaders() {
      setLoading(true)
      try {
        const q = query(collection(db, 'users'), orderBy(`healthData.${tab}`, 'desc'), limit(20))
        const snap = await getDocs(q)
        setLeaders(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      } catch {
        setLeaders([])
      }
      setLoading(false)
    }
    fetchLeaders()
  }, [tab])

  const TABS = [
    { key: 'steps', label: '👣 Steps' },
    { key: 'calories', label: '🔥 Calories' },
    { key: 'workoutMinutes', label: '🏋️ Workout' },
    { key: 'water', label: '💧 Water' },
  ]

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-left">
          <span className="brand-icon-sm">💪</span>
          <div>
            <p className="app-name">2-Month Transformation</p>
            <h2 className="greeting">🏆 Leaderboard</h2>
          </div>
        </div>
        <button className="logout-btn" onClick={() => navigate('/dashboard')}>← Dashboard</button>
      </header>

      <div className="lb-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`lb-tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="lb-list">
        {loading ? (
          <p className="lb-empty">Loading…</p>
        ) : leaders.length === 0 ? (
          <p className="lb-empty">No data yet. Start logging your health metrics!</p>
        ) : (
          leaders.map((user, i) => {
            const val = user.healthData?.[tab] ?? 0
            const isMe = user.id === currentUser?.uid
            const unit = tab === 'steps' ? ' steps' : tab === 'calories' ? ' kcal' : tab === 'workoutMinutes' ? ' min' : ' glasses'
            return (
              <div key={user.id} className={`lb-row ${isMe ? 'lb-me' : ''}`}>
                <span className="lb-rank">{MEDALS[i] || `#${i + 1}`}</span>
                <div className="lb-avatar">{(user.photoURL
                  ? <img src={user.photoURL} alt="" />
                  : <span>{(user.name || 'U')[0].toUpperCase()}</span>
                )}</div>
                <div className="lb-info">
                  <p className="lb-name">{user.name || 'Anonymous'} {isMe && <span className="lb-you">You</span>}</p>
                  <p className="lb-joined">Joined {new Date(user.createdAt).toLocaleDateString()}</p>
                </div>
                <span className="lb-val">{val.toLocaleString()}{unit}</span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
