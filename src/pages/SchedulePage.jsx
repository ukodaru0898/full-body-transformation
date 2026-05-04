import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const PAGES = {
  face: {
    title: 'Face Care Schedule',
    subtitle: 'Skin-first routine: cleanse, hydrate, protect, glow',
    color: 'sunrise',
    accentColor: '#ff9a5a',
    tasks: [
      { time: '6:30 AM · Daily', title: 'Morning Cleanse', detail: 'Use gentle pH-balanced cleanser. Wash with lukewarm water. Pat dry — do not rub.' },
      { time: '6:33 AM · Daily', title: 'Vitamin C Serum', detail: 'Apply The Ordinary Vitamin C Suspension to damp skin. Protects against free radicals.' },
      { time: '6:35 AM · Daily', title: 'Ceramide Moisturizer', detail: 'Apply CeraVe or Neutrogena Hydro Boost while skin is still damp to lock in moisture.' },
      { time: '6:38 AM · Daily', title: 'SPF 30+ Sunscreen', detail: 'Broad-spectrum SPF every morning — even indoors or cloudy days. La Roche-Posay SPF 60 recommended.' },
      { time: '8:30 PM · Daily', title: 'Evening Cleanse', detail: 'Remove dirt, sweat, and sunscreen. Use warm (not hot) water and the same gentle cleanser.' },
      { time: '8:33 PM · 2–3×/week', title: 'Retinol Treatment', detail: 'Apply The Ordinary Retinol 0.5% in Squalane. Skip if skin is sensitive; alternate nights.' },
      { time: '8:36 PM · Daily', title: 'Night Moisturizer', detail: 'Use a slightly heavier cream at night to support overnight skin repair.' },
      { time: 'Twice/week', title: 'Exfoliation', detail: 'Gentle face scrub or salicylic/glycolic acid exfoliant. Remove dead skin cells.' },
      { time: 'Once/week', title: 'Clay Mask (Multani Mitti)', detail: 'Apply for 15 minutes to absorb excess oil and deep clean pores.' },
    ],
  },
  hair: {
    title: 'Hair & Beard Schedule',
    subtitle: 'Strong scalp, clean edges, camera-ready style',
    color: 'coastal',
    accentColor: '#58b8ff',
    tasks: [
      { time: 'Monday', title: 'Shampoo + Deep Conditioner', detail: 'Sulfate-free shampoo — massage scalp gently for 2 minutes. Follow with conditioner on the lengths.' },
      { time: 'Tuesday', title: 'Leave-in or Light Hair Oil', detail: 'Apply light argan or coconut oil to damp hair. Helps retain moisture between washes.' },
      { time: 'Wednesday', title: 'No-wash Style Day', detail: 'Use minimal matte wax or pomade for shape. Let scalp breathe.' },
      { time: 'Thursday', title: 'Second Shampoo + Conditioner', detail: 'Repeat the wash routine. Air-dry whenever possible — avoid hot dryers.' },
      { time: 'Friday', title: 'Co-wash (Conditioner Only)', detail: 'Skip shampoo — use conditioner only to hydrate without stripping protective oils.' },
      { time: 'Saturday', title: 'Deep Conditioning Mask', detail: 'Apply hair mask, leave on for 30 minutes, rinse. Improves shine and strength.' },
      { time: 'Saturday', title: 'Hair Oil Scalp Massage', detail: 'Warm coconut or castor oil. Massage for 10 min. Stimulates follicle health.' },
      { time: 'Sunday', title: 'Rest Day — No Products', detail: 'Let scalp breathe naturally. No oils, sprays, or styling products.' },
      { time: 'Every 3–4 weeks', title: 'Beard + Hairline Trim', detail: 'Tidy edges with trimmer. Wash beard with gentle cleanser. Apply beard oil to hydrate.' },
    ],
  },
  food: {
    title: 'Nutrition Schedule',
    subtitle: '110–120g protein daily · 50% carbs · 25% protein · 25% fats',
    color: 'meadow',
    accentColor: '#65e0a3',
    tasks: [
      { time: '6:00 AM', title: 'Early Morning Hydration + Nuts', detail: 'Warm water with lemon. 6–8 soaked almonds + 2 walnuts. One seasonal fruit (banana or apple).' },
      { time: '7:00 AM', title: 'High-Protein Breakfast', detail: 'Choose: oats + milk + peanut butter + chia seeds · OR · idli + sambar + curd · OR · paneer bhurji + whole-grain roti. Add 1 scoop whey protein.' },
      { time: '10:00 AM', title: 'Mid-Morning Snack', detail: 'One fruit + 200ml buttermilk or coconut water. Supports digestion and hydration.' },
      { time: '1:00 PM', title: 'Balanced Lunch Plate', detail: '2–3 rotis or 1 cup rice · dal · mixed vegetable sabzi · 100–150g paneer or tofu · serving of curd.' },
      { time: '4:30 PM', title: 'Pre-Workout Fuel', detail: 'Banana for fast carbs. Black coffee or green tea (optional) for a clean energy boost.' },
      { time: '6:15 PM', title: 'Post-Workout Protein', detail: 'Whey protein shake (20–25g protein) or sprouted moong/chickpeas. Add a banana for glycogen replenishment.' },
      { time: '7:00 PM', title: 'Evening Snack', detail: 'Roasted peanuts · makhana (fox nuts) · or roasted chickpeas. Healthy fats and protein.' },
      { time: '8:00 PM', title: 'Dinner', detail: '2 rotis · dal · light vegetable curry. Avoid high-fat or heavy foods. Keep it digestible.' },
      { time: '9:30 PM', title: 'Pre-Sleep Recovery Drink', detail: 'Warm milk (casein protein for overnight muscle repair). Prepare water bottle for morning.' },
    ],
  },
  gym: {
    title: 'Gym Schedule',
    subtitle: 'Hypertrophy split · 10+ sets/muscle/week · Progressive overload',
    color: 'ember',
    accentColor: '#ff6b6b',
    tasks: [
      { time: 'Monday 5:00 PM', title: 'Chest + Triceps', detail: 'Bench press · Incline dumbbell press · Cable flys · Tricep dips · Rope pushdowns. 3–4 sets, 8–12 reps. Last 2 reps should be challenging.' },
      { time: 'Tuesday 5:00 PM', title: 'Back + Biceps', detail: 'Pull-ups · Bent-over barbell rows · Lat pull-downs · Seated cable rows · Barbell curls · Hammer curls. Focus on full range of motion.' },
      { time: 'Wednesday 5:00 PM', title: 'Leg Day', detail: 'Squats · Romanian deadlifts · Leg press · Walking lunges · Calf raises. Heavy compound lifts for strength and mass.' },
      { time: 'Thursday 5:00 PM', title: 'Shoulders + Abs', detail: 'Overhead press · Lateral raises · Rear-delt flys · Face pulls · Planks · Hanging leg raises · Cable crunches.' },
      { time: 'Friday 5:00 PM', title: 'Full Body + Functional', detail: 'Heavy deadlifts · Barbell rows · Bench press · Overhead squat · Kettlebell swings. Mix explosive movements for power.' },
      { time: 'Saturday 5:00 PM', title: 'Active Recovery', detail: '30-min brisk walk or light jog. Mobility work or yoga. Improves blood flow and flexibility.' },
      { time: 'Sunday', title: 'Rest + Recovery', detail: 'Complete rest. Muscle growth happens during recovery. Focus on sleep and nutrition.' },
      { time: 'Monday & Thursday', title: 'Cardio Block', detail: '15–20 minutes moderate cardio after lifting (cycling or jogging). Supports cardiovascular health and lean appearance.' },
    ],
  },
  wellness: {
    title: 'Sleep, Wellness & Presence',
    subtitle: 'Recovery systems, mental clarity, on-camera confidence',
    color: 'indigo',
    accentColor: '#b48eff',
    tasks: [
      { time: '10:00 PM', title: 'Fixed Bedtime', detail: 'Consistent sleep time — even on weekends. Regulates hormones and maximizes recovery.' },
      { time: '6:00 AM', title: 'Fixed Wake Time', detail: 'Rise at 6 AM daily. Consistency is more important than total hours for circadian rhythm.' },
      { time: '9:00 PM', title: 'Screen Cutoff', detail: 'No phones/tablets 1 hour before bed. Read, stretch, or meditate instead. Blue light disrupts melatonin.' },
      { time: 'Bedroom Setup', title: 'Sleep Environment', detail: 'Keep room cool (18–20°C), dark, and quiet. Use blackout curtains or sleep mask if needed.' },
      { time: 'Daily 5 min', title: 'Morning Meditation', detail: 'Sit quietly for 5 minutes at 6:00 AM. Breathe deeply. Set one intention for the day.' },
      { time: 'Daily', title: '3–4 Litres Water', detail: 'Carry a water bottle everywhere. Hydration supports muscle growth, skin health, and energy.' },
      { time: 'Daily 10–20 min', title: 'On-Camera Practice', detail: 'Stand in front of a mirror or camera. Work on posture, eye contact, facial expressions, and diction.' },
      { time: 'Sunday', title: 'Weekly Progress Check-in', detail: 'Record weight. Review lifts from the week. Assess sleep quality. Adjust diet or training for next week.' },
      { time: 'Anytime', title: 'Supplement Checklist', detail: 'Multivitamin · Vitamin B12 (vegetarian essential) · Omega-3 algal oil. Consult a doctor before starting.' },
    ],
  },
}

export default function SchedulePage() {
  const { pageId } = useParams()
  const navigate = useNavigate()
  const { userProfile, saveCompletedTasks } = useAuth()

  const page = PAGES[pageId] || PAGES.face
  const completed = userProfile?.completedTasks || {}

  const toggle = async (key) => {
    const updated = { ...completed, [key]: !completed[key] }
    await saveCompletedTasks(updated)
  }

  const doneCount = page.tasks.filter((_, i) => completed[`${pageId}-${i}`]).length

  const navPages = Object.entries(PAGES)

  return (
    <div className="app-shell">
      <header className="page-header" style={{ '--accent': page.accentColor }}>
        <button className="back-btn" onClick={() => navigate('/dashboard')}>← Dashboard</button>
        <div>
          <h2>{page.title}</h2>
          <p>{page.subtitle}</p>
        </div>
        <div className="page-badge">
          {doneCount} / {page.tasks.length} tasks
        </div>
      </header>

      <nav className="dash-nav">
        {navPages.map(([id, p]) => (
          <button
            key={id}
            className={`slide-pill ${pageId === id ? 'active' : ''}`}
            style={{ '--pill-color': p.accentColor }}
            onClick={() => navigate(`/schedule/${id}`)}
          >
            {id === 'face' ? '🧴' : id === 'hair' ? '💇' : id === 'food' ? '🥗' : id === 'gym' ? '🏋️' : '🌙'} {p.title.split(' ')[0]}
          </button>
        ))}
      </nav>

      <section className={`task-page ${page.color}`}>
        <div className="today-progress-track" style={{ marginBottom: '20px' }}>
          <div
            className="today-progress-fill"
            style={{
              width: `${(doneCount / page.tasks.length) * 100}%`,
              background: page.accentColor,
            }}
          />
        </div>

        <div className="task-grid">
          {page.tasks.map((task, i) => {
            const key = `${pageId}-${i}`
            const done = Boolean(completed[key])
            return (
              <article
                key={key}
                className={`task-card ${done ? 'done' : ''}`}
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <div>
                  <p className="task-time">{task.time}</p>
                  <h4>{task.title}</h4>
                  <p className="task-detail">{task.detail}</p>
                </div>
                <button
                  type="button"
                  className={`complete-btn ${done ? 'done' : ''}`}
                  style={done ? { background: page.accentColor } : {}}
                  onClick={() => toggle(key)}
                >
                  {done ? '✓ Completed' : 'Mark Complete'}
                </button>
              </article>
            )
          })}
        </div>
      </section>

      <footer className="app-footer">
        <p>Tap any card to mark it complete. Progress saves instantly to your account.</p>
        <button className="ghost-btn" onClick={() => navigate('/dashboard')}>← Back to Dashboard</button>
      </footer>
    </div>
  )
}
