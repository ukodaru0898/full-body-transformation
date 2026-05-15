import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { generatePersonalizedPlan } from '../utils/aiPlanner'

const STEPS = [
  {
    id: 'goal',
    title: 'What is your primary fitness goal? 🎯',
    subtitle: "We'll build your entire plan around this.",
    field: 'fitnessGoal',
    type: 'choice',
    options: [
      { value: 'Lose fat and get lean', label: '🔥 Lose fat & get lean', desc: 'Burn fat, reduce body weight' },
      { value: 'Build muscle and gain strength', label: '💪 Build muscle & strength', desc: 'Increase mass and power' },
      { value: 'Improve overall fitness', label: '⚡ Improve overall fitness', desc: 'Balanced health and endurance' },
      { value: 'Improve flexibility and mobility', label: '🧘 Flexibility & mobility', desc: 'Yoga, stretching, movement' },
      { value: 'Athletic performance', label: '🏃 Athletic performance', desc: 'Speed, agility, sport-specific' },
    ],
  },
  {
    id: 'body',
    title: 'Tell us about your body 📏',
    subtitle: 'This helps us calculate accurate nutrition and workout targets.',
    type: 'form',
    fields: [
      { field: 'age', label: 'Age', type: 'number', placeholder: '25', min: 10, max: 100 },
      { field: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Non-binary', 'Prefer not to say'] },
      { field: 'height', label: 'Height (cm)', type: 'number', placeholder: '175', min: 100, max: 250 },
      { field: 'weight', label: 'Weight (kg)', type: 'number', placeholder: '70', min: 30, max: 300 },
      {
        field: 'activityLevel',
        label: 'Activity Level',
        type: 'select',
        options: ['Sedentary (desk job, little movement)', 'Lightly active (1-3 workouts/week)', 'Moderately active (3-5 workouts/week)', 'Very active (6-7 workouts/week)', 'Extremely active (athlete/physical job)'],
      },
    ],
  },
  {
    id: 'diet',
    title: 'What is your diet preference? 🥗',
    subtitle: 'AI will generate meals that match your dietary style.',
    field: 'dietPreference',
    type: 'choice',
    options: [
      { value: 'Vegetarian', label: '🥦 Vegetarian', desc: 'No meat, includes dairy & eggs' },
      { value: 'Non-vegetarian', label: '🍗 Non-vegetarian', desc: 'Includes all proteins' },
      { value: 'Vegan', label: '🌱 Vegan', desc: 'Plant-based only' },
      { value: 'Keto', label: '🥑 Keto', desc: 'Low-carb, high-fat diet' },
      { value: 'Intermittent fasting', label: '⏰ Intermittent fasting', desc: 'Time-restricted eating' },
      { value: 'No restriction', label: '🍽️ No restriction', desc: 'Flexible, balanced eating' },
    ],
  },
  {
    id: 'skin',
    title: 'What is your skin type? 🧴',
    subtitle: "We'll personalize your face care routine for you.",
    field: 'skinType',
    type: 'choice',
    options: [
      { value: 'Oily', label: '✨ Oily', desc: 'Shiny, prone to acne and pores' },
      { value: 'Dry', label: '🏜️ Dry', desc: 'Tight, flaky, needs hydration' },
      { value: 'Combination', label: '⚖️ Combination', desc: 'Oily T-zone, dry cheeks' },
      { value: 'Sensitive', label: '🌸 Sensitive', desc: 'Reacts easily, prone to redness' },
      { value: 'Normal', label: '😊 Normal', desc: 'Balanced, few issues' },
    ],
  },
  {
    id: 'hair',
    title: 'What is your hair type? 💇',
    subtitle: "We'll create a hair care routine tailored to your hair.",
    field: 'hairType',
    type: 'choice',
    options: [
      { value: 'Oily scalp', label: '💧 Oily scalp', desc: 'Gets greasy quickly' },
      { value: 'Dry and frizzy', label: '🌵 Dry & frizzy', desc: 'Lacks moisture, rough texture' },
      { value: 'Normal', label: '😊 Normal', desc: 'Balanced, healthy scalp' },
      { value: 'Curly or wavy', label: '🌀 Curly / wavy', desc: 'Needs moisture and definition' },
      { value: 'Straight and fine', label: '📏 Straight & fine', desc: 'Flat, lacks volume' },
      { value: 'Damaged or color-treated', label: '⚠️ Damaged / color-treated', desc: 'Chemical or heat damage' },
    ],
  },
  {
    id: 'experience',
    title: 'What is your fitness experience level? 🏋️',
    subtitle: 'This helps set the right intensity for your workout plan.',
    field: 'experienceLevel',
    type: 'choice',
    options: [
      { value: 'Beginner (new to fitness)', label: '🌱 Beginner', desc: 'Just getting started' },
      { value: 'Intermediate (6+ months training)', label: '⚡ Intermediate', desc: '6+ months consistent training' },
      { value: 'Advanced (2+ years training)', label: '🔥 Advanced', desc: '2+ years dedicated training' },
      { value: 'Athlete or ex-athlete', label: '🏆 Athlete', desc: 'Sport-specific performance history' },
    ],
  },
]

const STEP_COUNT = STEPS.length

const DEFAULT_ANSWERS = {
  fitnessGoal: '',
  age: '',
  gender: '',
  height: '',
  weight: '',
  activityLevel: '',
  dietPreference: '',
  skinType: '',
  hairType: '',
  experienceLevel: '',
  additionalNotes: '',
}

export default function OnboardingPage() {
  const { currentUser, saveOnboardingData } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState(DEFAULT_ANSWERS)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')

  const currentStep = STEPS[step]

  function handleChoice(field, value) {
    setAnswers((prev) => ({ ...prev, [field]: value }))
  }

  function handleFormField(field, value) {
    setAnswers((prev) => ({ ...prev, [field]: value }))
  }

  function isStepComplete() {
    if (currentStep.type === 'choice') {
      return !!answers[currentStep.field]
    }
    if (currentStep.type === 'form') {
      return currentStep.fields.every((f) => answers[f.field] !== '')
    }
    return true
  }

  function goNext() {
    if (step < STEP_COUNT - 1) {
      setStep((s) => s + 1)
    } else {
      handleGenerate()
    }
  }

  function goBack() {
    if (step > 0) setStep((s) => s - 1)
  }

  async function handleGenerate() {
    setGenerating(true)
    setError('')
    try {
      setProgress('Analyzing your profile...')
      await new Promise((r) => setTimeout(r, 800))
      setProgress('Connecting to AI coach...')
      const plan = await generatePersonalizedPlan(answers)
      setProgress('Saving your personalized plan...')
      await saveOnboardingData(answers, plan)
      setProgress('Done! Loading your dashboard...')
      await new Promise((r) => setTimeout(r, 600))
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
      setGenerating(false)
      setProgress('')
    }
  }

  if (generating) {
    return (
      <div className="onboarding-overlay">
        <div className="onboarding-generating">
          <div className="onboarding-spinner" />
          <h2>Building Your Plan</h2>
          <p className="onboarding-progress-text">{progress}</p>
          <div className="onboarding-steps-mini">
            <div className="mini-step done">✓ Profile collected</div>
            <div className={`mini-step ${progress.includes('AI') || progress.includes('Saving') || progress.includes('Done') ? 'done' : 'active'}`}>
              {progress.includes('AI') ? '⏳' : progress.includes('Saving') || progress.includes('Done') ? '✓' : '⏳'} Generating AI plan
            </div>
            <div className={`mini-step ${progress.includes('Saving') || progress.includes('Done') ? 'done' : ''}`}>
              {progress.includes('Done') ? '✓' : '⏳'} Saving to your account
            </div>
          </div>
          {error && (
            <div className="onboarding-error">
              <p>{error}</p>
              <button className="primary-btn" onClick={() => { setGenerating(false); setError(''); setProgress('') }}>
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="onboarding-page">
      <div className="onboarding-card">
        {/* Header */}
        <div className="onboarding-header">
          <div className="onboarding-logo">✨ FitAI</div>
          <p className="onboarding-welcome">
            Welcome{currentUser?.displayName ? `, ${currentUser.displayName.split(' ')[0]}` : ''}! Let's personalize your plan.
          </p>
        </div>

        {/* Progress bar */}
        <div className="onboarding-progress-bar">
          <div
            className="onboarding-progress-fill"
            style={{ width: `${((step + 1) / STEP_COUNT) * 100}%` }}
          />
        </div>
        <p className="onboarding-step-count">Step {step + 1} of {STEP_COUNT}</p>

        {/* Step content */}
        <div className="onboarding-step">
          <h2 className="onboarding-step-title">{currentStep.title}</h2>
          <p className="onboarding-step-subtitle">{currentStep.subtitle}</p>

          {currentStep.type === 'choice' && (
            <div className="onboarding-choices">
              {currentStep.options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`onboarding-choice ${answers[currentStep.field] === opt.value ? 'selected' : ''}`}
                  onClick={() => handleChoice(currentStep.field, opt.value)}
                >
                  <span className="choice-label">{opt.label}</span>
                  <span className="choice-desc">{opt.desc}</span>
                </button>
              ))}
            </div>
          )}

          {currentStep.type === 'form' && (
            <div className="onboarding-form">
              {currentStep.fields.map((f) => (
                <div key={f.field} className="onboarding-field">
                  <label className="onboarding-label">{f.label}</label>
                  {f.type === 'select' ? (
                    <select
                      className="onboarding-select"
                      value={answers[f.field]}
                      onChange={(e) => handleFormField(f.field, e.target.value)}
                    >
                      <option value="">Select {f.label.toLowerCase()}...</option>
                      {f.options.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="onboarding-input"
                      type={f.type}
                      placeholder={f.placeholder}
                      min={f.min}
                      max={f.max}
                      value={answers[f.field]}
                      onChange={(e) => handleFormField(f.field, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Notes on last step */}
          {step === STEP_COUNT - 1 && (
            <div className="onboarding-notes">
              <label className="onboarding-label">Anything else? (optional)</label>
              <textarea
                className="onboarding-textarea"
                rows={3}
                placeholder="Any injuries, health conditions, time constraints, specific preferences..."
                value={answers.additionalNotes}
                onChange={(e) => setAnswers((prev) => ({ ...prev, additionalNotes: e.target.value }))}
              />
            </div>
          )}
        </div>

        {error && <p className="auth-error onboarding-error-inline">{error}</p>}

        {/* Navigation */}
        <div className="onboarding-nav">
          {step > 0 && (
            <button type="button" className="ghost-btn onboarding-back-btn" onClick={goBack}>
              ← Back
            </button>
          )}
          <button
            type="button"
            className="primary-btn onboarding-next-btn"
            onClick={goNext}
            disabled={!isStepComplete()}
          >
            {step === STEP_COUNT - 1 ? '🚀 Generate My Plan' : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  )
}
