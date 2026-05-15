import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { analyzeIngredientsText } from '../utils/nutritionAssistant'
import { analyzeMealWithAI } from '../utils/aiPlanner'
import { useAuth } from '../contexts/AuthContext'

const ZERO_MACROS = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
}

const DEFAULT_GOALS = {
  calories: 2200,
  protein: 140,
  carbs: 250,
  fat: 70,
}

export default function NutritionAIPage() {
  const navigate = useNavigate()
  const { userProfile } = useAuth()
  const [ingredientText, setIngredientText] = useState('2 eggs\n150g chicken\n1 cup rice\n1 banana')
  const [nutritionResult, setNutritionResult] = useState(null)
  const [nutritionError, setNutritionError] = useState('')
  const [nutritionLoading, setNutritionLoading] = useState(false)
  const [nutritionSource, setNutritionSource] = useState('local')
  const [nutritionNotes, setNutritionNotes] = useState([])
  const [dailyMacros, setDailyMacros] = useState(ZERO_MACROS)

  const macroGoals = userProfile?.personalizedPlan?.macroGoals || DEFAULT_GOALS

  const runNutritionAnalysis = async () => {
    const localResult = analyzeIngredientsText(ingredientText)
    if (localResult.error) {
      setNutritionError(localResult.error)
      setNutritionResult(null)
      return
    }

    setNutritionError('')
    setNutritionLoading(true)
    try {
      const aiResult = await analyzeMealWithAI({
        ingredientText,
        localResult,
        profile: {
          onboarding: userProfile?.onboardingAnswers,
          planTips: userProfile?.personalizedPlan?.tips,
        },
      })
      const normalized = {
        entries: Array.isArray(aiResult?.entries) && aiResult.entries.length ? aiResult.entries : localResult.entries,
        unknown: Array.isArray(aiResult?.unknown) ? aiResult.unknown : localResult.unknown,
        totals: aiResult?.totals || localResult.totals,
      }
      setNutritionResult(normalized)
      setNutritionSource('ai')
      setNutritionNotes(Array.isArray(aiResult?.notes) ? aiResult.notes : [])
    } catch {
      setNutritionResult(localResult)
      setNutritionSource('local')
      setNutritionNotes(['AI meal analysis was unavailable, so local nutrition estimates are shown.'])
      setNutritionError('AI is temporarily unavailable. Showing local nutrition estimate.')
    } finally {
      setNutritionLoading(false)
    }
  }

  const addMealToDailyProgress = () => {
    if (!nutritionResult) return
    setDailyMacros((prev) => ({
      calories: +(prev.calories + nutritionResult.totals.calories).toFixed(1),
      protein: +(prev.protein + nutritionResult.totals.protein).toFixed(1),
      carbs: +(prev.carbs + nutritionResult.totals.carbs).toFixed(1),
      fat: +(prev.fat + nutritionResult.totals.fat).toFixed(1),
    }))
  }

  return (
    <div className="app-shell">
      <header className="page-header">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>← Dashboard</button>
        <div>
          <h2>AI Nutrition Assistant</h2>
          <p>Accurate calories and macros, including unknown food estimation via AI.</p>
        </div>
        <div className="page-badge">{nutritionSource === 'ai' ? 'AI' : 'Local'} mode</div>
      </header>

      <section className="section-card">
        <div className="section-head">
          <h3>Analyze Meal</h3>
          <span className="badge">{nutritionSource === 'ai' ? 'AI + DB' : 'Nutrition DB'}</span>
        </div>

        <div className="nutrition-input-row">
          <textarea
            className="nutrition-input"
            rows={6}
            value={ingredientText}
            onChange={(e) => setIngredientText(e.target.value)}
            placeholder="2 eggs\n100g salmon\n1 cup rice"
          />
          <div className="nutrition-actions">
            <button className="primary-btn nutrition-btn" onClick={runNutritionAnalysis} disabled={nutritionLoading}>
              {nutritionLoading ? 'Analyzing with AI...' : 'Analyze Meal'}
            </button>
            <button className="ghost-btn nutrition-btn" onClick={addMealToDailyProgress} disabled={!nutritionResult}>Add To Daily</button>
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
                  {entry.confidence && <p className="nutrition-confidence">Confidence: {entry.confidence}</p>}
                </div>
              ))}
            </div>

            {nutritionResult.unknown.length > 0 && (
              <p className="nutrition-unknown">Not recognized: {nutritionResult.unknown.join(', ')}</p>
            )}

            {nutritionNotes.length > 0 && (
              <div className="nutrition-notes">
                {nutritionNotes.map((note, idx) => (
                  <p key={`${note}-${idx}`}>• {note}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="section-card">
        <div className="section-head">
          <h3>Daily Macro Progress</h3>
          <span className="badge">Targets</span>
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
      </section>
    </div>
  )
}
