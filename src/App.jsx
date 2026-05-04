import { useEffect, useMemo, useState } from 'react'
import './App.css'

const pages = [
  {
    id: 'face',
    title: 'Face Care Schedule',
    subtitle: 'Skin first: clean, hydrate, protect, glow',
    color: 'sunrise',
    tasks: [
      {
        id: 'face-1',
        time: '6:30 AM',
        title: 'Cleanse + Vitamin C',
        detail: 'Gentle cleanser followed by vitamin C serum on dry skin.',
      },
      {
        id: 'face-2',
        time: '6:35 AM',
        title: 'Moisturize + SPF 30+',
        detail: 'Use ceramide moisturizer and broad-spectrum sunscreen.',
      },
      {
        id: 'face-3',
        time: '8:30 PM',
        title: 'Night cleanse + retinol',
        detail: 'Retinol 2 to 3 nights per week, then seal with moisturizer.',
      },
      {
        id: 'face-4',
        time: 'Saturday',
        title: 'Exfoliation / Clay mask',
        detail: 'Gentle exfoliation twice weekly and one weekly clay mask.',
      },
    ],
  },
  {
    id: 'hair',
    title: 'Hair & Beard Schedule',
    subtitle: 'Strong scalp, clean edges, camera-ready look',
    color: 'coastal',
    tasks: [
      {
        id: 'hair-1',
        time: 'Monday',
        title: 'Shampoo + conditioner',
        detail: 'Massage scalp gently with sulfate-free shampoo.',
      },
      {
        id: 'hair-2',
        time: 'Tuesday',
        title: 'Leave-in or light oil',
        detail: 'Hydrate hair shafts and avoid heavy styling products.',
      },
      {
        id: 'hair-3',
        time: 'Thursday',
        title: 'Second wash day',
        detail: 'Repeat wash routine and air dry when possible.',
      },
      {
        id: 'hair-4',
        time: 'Saturday',
        title: 'Deep conditioning + beard trim check',
        detail: 'Use deep conditioner and tidy beard lines every 3 to 4 weeks.',
      },
    ],
  },
  {
    id: 'food',
    title: 'Nutrition Schedule',
    subtitle: '110 to 120g protein target with vegetarian variety',
    color: 'meadow',
    tasks: [
      {
        id: 'food-1',
        time: '6:00 AM',
        title: 'Hydration + nuts + fruit',
        detail: 'Warm lemon water, soaked almonds/walnuts, and one fruit.',
      },
      {
        id: 'food-2',
        time: '7:00 AM',
        title: 'Protein breakfast',
        detail: 'Choose oats+milk, idli+sambar, or paneer bhurji with whey.',
      },
      {
        id: 'food-3',
        time: '1:00 PM',
        title: 'Balanced lunch plate',
        detail: 'Roti/rice, dal, sabzi, paneer/tofu, and curd.',
      },
      {
        id: 'food-4',
        time: '6:15 PM',
        title: 'Post-workout protein',
        detail: 'Whey or sprouts with banana immediately after training.',
      },
      {
        id: 'food-5',
        time: '9:30 PM',
        title: 'Pre-sleep recovery',
        detail: 'Warm milk and prep hydration for next day.',
      },
    ],
  },
  {
    id: 'gym',
    title: 'Gym Schedule',
    subtitle: 'Hypertrophy split with progressive overload',
    color: 'ember',
    tasks: [
      {
        id: 'gym-1',
        time: 'Monday 5:00 PM',
        title: 'Chest + Triceps',
        detail: 'Bench, incline press, flys, dips, rope pushdowns.',
      },
      {
        id: 'gym-2',
        time: 'Tuesday 5:00 PM',
        title: 'Back + Biceps',
        detail: 'Pull-ups, rows, lat pull-downs, curls.',
      },
      {
        id: 'gym-3',
        time: 'Wednesday 5:00 PM',
        title: 'Leg Day',
        detail: 'Squat, RDL, leg press, lunges, calves.',
      },
      {
        id: 'gym-4',
        time: 'Thursday 5:00 PM',
        title: 'Shoulders + Abs',
        detail: 'Overhead press, lateral raises, rear delts, core.',
      },
      {
        id: 'gym-5',
        time: 'Friday 5:00 PM',
        title: 'Full body + functional',
        detail: 'Heavy deadlift, row, bench, overhead squat, swings.',
      },
      {
        id: 'gym-6',
        time: 'Saturday',
        title: 'Active recovery',
        detail: '30 minutes brisk walk/jog plus mobility or yoga.',
      },
    ],
  },
  {
    id: 'more',
    title: 'Sleep, Wellness & Presence',
    subtitle: 'Recovery and confidence systems',
    color: 'indigo',
    tasks: [
      {
        id: 'more-1',
        time: '10:00 PM to 6:00 AM',
        title: 'Sleep window lock',
        detail: 'Maintain 7 to 9 hours with fixed bedtime and wake time.',
      },
      {
        id: 'more-2',
        time: 'Daily 9:00 PM',
        title: 'Screen cutoff + winddown',
        detail: 'No screens 1 hour before bed. Stretch, read, or meditate.',
      },
      {
        id: 'more-3',
        time: 'Sunday check-in',
        title: 'Weekly progress review',
        detail: 'Track weight, lifts, sleep quality, and next-week adjustments.',
      },
      {
        id: 'more-4',
        time: 'Anytime',
        title: 'On-camera practice',
        detail: '10 to 20 minutes: posture, expression, diction, confidence.',
      },
    ],
  },
]

function App() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [activePage, setActivePage] = useState('face')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [completedTasks, setCompletedTasks] = useState(() => {
    const saved = localStorage.getItem('transform-completed-tasks')
    return saved ? JSON.parse(saved) : {}
  })

  useEffect(() => {
    localStorage.setItem('transform-completed-tasks', JSON.stringify(completedTasks))
  }, [completedTasks])

  const currentPage = pages.find((page) => page.id === activePage) ?? pages[0]
  const allTasks = useMemo(() => pages.flatMap((page) => page.tasks), [])
  const completedCount = allTasks.filter((task) => completedTasks[task.id]).length
  const progress = Math.round((completedCount / allTasks.length) * 100)

  const handleLogin = (event) => {
    event.preventDefault()
    if (form.name.trim().length < 2 || form.password.trim().length < 4) {
      return
    }
    setLoggedIn(true)
  }

  const toggleTask = (taskId) => {
    setCompletedTasks((previous) => ({
      ...previous,
      [taskId]: !previous[taskId],
    }))
  }

  if (!loggedIn) {
    return (
      <div className="login-shell">
        <div className="aurora aurora-one"></div>
        <div className="aurora aurora-two"></div>

        <section className="login-panel">
          <p className="kicker">2-Month Transformation Blueprint</p>
          <h1>Build Your Camera-Ready Routine</h1>
          <p className="subhead">
            Track face care, hair care, food, gym sessions, and recovery in one
            interactive system.
          </p>

          <form className="login-form" onSubmit={handleLogin}>
            <label>
              Full Name
              <input
                type="text"
                placeholder="Your name"
                value={form.name}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, name: event.target.value }))
                }
                required
              />
            </label>

            <label>
              Email
              <input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, email: event.target.value }))
                }
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                placeholder="Minimum 4 characters"
                value={form.password}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    password: event.target.value,
                  }))
                }
                required
              />
            </label>

            <button type="submit" className="primary-btn">
              Start My Transformation
            </button>
          </form>
        </section>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="hero-banner">
        <div>
          <p className="kicker">Welcome, {form.name.split(' ')[0] || 'Champion'}</p>
          <h2>2-Month Transformation Dashboard</h2>
          <p>
            Goal: 72 to 75 kg, high-protein vegetarian plan, strong sleep, and
            polished on-camera presence.
          </p>
        </div>
        <div className="progress-wrap" aria-label="overall progress">
          <p>
            Tasks Completed: <strong>{completedCount}</strong> / {allTasks.length}
          </p>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <span>{progress}% consistency score</span>
        </div>
      </header>

      <nav className="slide-nav" aria-label="schedule slides">
        {pages.map((page) => (
          <button
            key={page.id}
            type="button"
            className={`slide-pill ${activePage === page.id ? 'active' : ''}`}
            onClick={() => setActivePage(page.id)}
          >
            {page.title.replace(' Schedule', '')}
          </button>
        ))}
      </nav>

      <main className={`task-page ${currentPage.color}`} key={currentPage.id}>
        <div className="page-head">
          <h3>{currentPage.title}</h3>
          <p>{currentPage.subtitle}</p>
        </div>

        <div className="task-grid">
          {currentPage.tasks.map((task, index) => {
            const done = Boolean(completedTasks[task.id])

            return (
              <article
                key={task.id}
                className={`task-card ${done ? 'done' : ''}`}
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <div>
                  <p className="task-time">{task.time}</p>
                  <h4>{task.title}</h4>
                  <p className="task-detail">{task.detail}</p>
                </div>

                <button
                  type="button"
                  onClick={() => toggleTask(task.id)}
                  className={`complete-btn ${done ? 'done' : ''}`}
                >
                  {done ? 'Completed' : 'Mark Complete'}
                </button>
              </article>
            )
          })}
        </div>
      </main>

      <footer className="app-footer">
        <p>Hydration target: 3 to 4 liters daily | Protein target: 110 to 120g daily</p>
        <button
          type="button"
          className="ghost-btn"
          onClick={() => {
            setCompletedTasks({})
            setActivePage('face')
          }}
        >
          Reset Week
        </button>
      </footer>
    </div>
  )
}

export default App
