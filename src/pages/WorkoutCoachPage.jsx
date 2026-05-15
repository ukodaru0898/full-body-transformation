import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Progress } from '../components/ui/progress'
import { Separator } from '../components/ui/separator'

const WORKOUT_MEDIA_LIBRARY = [
  {
    key: ['bench press', 'chest press'],
    title: 'Bench Press',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=80',
    howTo: 'Lie flat, keep feet grounded, lower bar to mid-chest, and press up while bracing your core.',
  },
  {
    key: ['squat', 'leg press'],
    title: 'Squat',
    image: 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?auto=format&fit=crop&w=900&q=80',
    howTo: 'Keep chest up, push hips back, lower until thighs are parallel, and drive through your heels.',
  },
  {
    key: ['deadlift', 'romanian deadlift'],
    title: 'Deadlift',
    image: 'https://images.unsplash.com/photo-1599058917765-a780eda07a3e?auto=format&fit=crop&w=900&q=80',
    howTo: 'Hinge at hips, keep spine neutral, pull bar close to legs, and lock out by squeezing glutes.',
  },
  {
    key: ['pull up', 'lat pull-down', 'pulldown'],
    title: 'Pull-Up / Lat Pull-Down',
    image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80',
    howTo: 'Lead with elbows, pull chest toward bar, and lower under control without swinging.',
  },
  {
    key: ['overhead press', 'shoulder press'],
    title: 'Overhead Press',
    image: 'https://images.unsplash.com/photo-1534368786749-b63e0eaf8f70?auto=format&fit=crop&w=900&q=80',
    howTo: 'Start at shoulder level, press straight up, and keep ribs down to avoid over-arching.',
  },
  {
    key: ['row', 'seated cable row'],
    title: 'Row',
    image: 'https://images.unsplash.com/photo-1549476464-37392f717541?auto=format&fit=crop&w=900&q=80',
    howTo: 'Pull handle toward lower ribs, keep shoulders packed, and squeeze back at the end.',
  },
  {
    key: ['plank', 'core', 'crunch'],
    title: 'Core Stability',
    image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80',
    howTo: 'Brace abs, keep body in a straight line, and focus on controlled breathing.',
  },
]

const WORKOUT_FALLBACK_MEDIA = {
  title: 'Functional Training',
  image: 'https://images.unsplash.com/photo-1593476123561-9516f2097158?auto=format&fit=crop&w=900&q=80',
  howTo: 'Use controlled reps, full range of motion, and progressive overload week to week.',
}

function pickWorkoutMedia(rawText) {
  const text = (rawText || '').toLowerCase()
  if (!text) return WORKOUT_FALLBACK_MEDIA
  const match = WORKOUT_MEDIA_LIBRARY.find((item) => item.key.some((k) => text.includes(k)))
  return match || WORKOUT_FALLBACK_MEDIA
}

function getWorkoutExerciseCards(task) {
  const chunks = `${task.title || ''}. ${task.detail || ''}`
    .split(/[.,;·]|and/i)
    .map((x) => x.trim())
    .filter((x) => x.length > 2)

  const cards = []
  const seen = new Set()
  chunks.forEach((chunk) => {
    const media = pickWorkoutMedia(chunk)
    if (seen.has(media.title)) return
    seen.add(media.title)
    cards.push({ name: media.title, image: media.image, howTo: media.howTo, focus: chunk })
  })

  if (!cards.length) {
    const media = pickWorkoutMedia(task.title)
    cards.push({ name: media.title, image: media.image, howTo: media.howTo, focus: task.title })
  }

  return cards.slice(0, 6)
}

export default function WorkoutCoachPage() {
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const gymTasks = userProfile?.personalizedPlan?.schedulePages?.gym?.tasks || []
  const workoutDays = useMemo(() => gymTasks.map((task) => ({ ...task, exerciseCards: getWorkoutExerciseCards(task) })), [gymTasks])
  const [selectedWorkoutDay, setSelectedWorkoutDay] = useState(0)
  const selectedWorkout = workoutDays[selectedWorkoutDay] || null
  const completionValue = workoutDays.length ? Math.round(((selectedWorkoutDay + 1) / workoutDays.length) * 100) : 0

  return (
    <div className="app-shell">
      <Card className="page-hero-card">
        <CardHeader className="page-hero-header">
          <div className="page-hero-topline">
            <Badge variant="secondary">Workout Coach</Badge>
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>← Dashboard</Button>
          </div>
          <CardTitle>Interactive Workout Coach</CardTitle>
          <CardDescription>Daily workout pages with visual guidance and exercise instructions.</CardDescription>
        </CardHeader>
      </Card>

      {!workoutDays.length && (
        <Card>
          <CardContent>
            <p className="nutrition-hint">No personalized gym schedule found yet. Complete onboarding again to generate your workout plan.</p>
          </CardContent>
        </Card>
      )}

      {workoutDays.length > 0 && (
        <Card className="workout-coach-card">
          <CardHeader>
            <div className="section-head">
              <CardTitle>Training Days</CardTitle>
              <Badge variant="success">{workoutDays.length} days</Badge>
            </div>
            <CardDescription>Tap a day to see the workout and the exercise visuals for that session.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="workout-selector-head">
              <Progress value={completionValue} />
              <p className="workout-selector-label">Selected day {selectedWorkoutDay + 1} of {workoutDays.length}</p>
            </div>

            <div className="workout-day-tabs">
              {workoutDays.map((day, idx) => (
                <button
                  key={`${day.time}-${idx}`}
                  type="button"
                  className={`workout-day-tab ${selectedWorkoutDay === idx ? 'active' : ''}`}
                  onClick={() => setSelectedWorkoutDay(idx)}
                >
                  <span>{day.time}</span>
                  <strong>{day.title}</strong>
                </button>
              ))}
            </div>

            {selectedWorkout && (
              <>
                <Separator />
                <div className="workout-day-summary">
                  <h4>{selectedWorkout.title}</h4>
                  <p>{selectedWorkout.detail}</p>
                </div>

                <div className="workout-exercise-grid">
                  {selectedWorkout.exerciseCards.map((exercise, idx) => (
                    <article key={`${exercise.name}-${idx}`} className="workout-exercise-card">
                      <img src={exercise.image} alt={exercise.name} loading="lazy" />
                      <div className="workout-exercise-copy">
                        <p className="exercise-name">{exercise.name}</p>
                        <p className="exercise-focus">From your plan: {exercise.focus}</p>
                        <p className="exercise-howto">How to do it: {exercise.howTo}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
