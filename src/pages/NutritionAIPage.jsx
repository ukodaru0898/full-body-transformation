import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { analyzeIngredientsText } from '../utils/nutritionAssistant'
import { analyzeMealWithAI } from '../utils/aiPlanner'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Progress } from '../components/ui/progress'
import { Separator } from '../components/ui/separator'
import { Textarea } from '../components/ui/textarea'

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
  const nutritionModeLabel = useMemo(() => (nutritionSource === 'ai' ? 'AI + Nutrition DB' : 'Nutrition DB'), [nutritionSource])

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
      <Card className="page-hero-card">
        <CardHeader className="page-hero-header">
          <div className="page-hero-topline">
            <Badge variant="secondary">Nutrition AI</Badge>
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>← Dashboard</Button>
          </div>
          <CardTitle>AI Nutrition Assistant</CardTitle>
          <CardDescription>
            Accurate calories and macros, with AI estimation for ingredients the local database does not recognize.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="nutrition-page-grid">
        <Card>
          <CardHeader>
            <div className="section-head">
              <CardTitle>Analyze Meal</CardTitle>
              <Badge variant="outline">{nutritionModeLabel}</Badge>
            </div>
            <CardDescription>
              Enter your meal ingredients and let the assistant estimate calories, protein, carbs, fat, and fiber.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="nutrition-input-row">
              <Textarea
                value={ingredientText}
                onChange={(e) => setIngredientText(e.target.value)}
                placeholder="2 eggs\n100g salmon\n1 cup rice"
                rows={8}
              />
              <div className="nutrition-actions">
                <Button onClick={runNutritionAnalysis} disabled={nutritionLoading}>
                  {nutritionLoading ? 'Analyzing with AI...' : 'Analyze Meal'}
                </Button>
                <Button variant="outline" onClick={addMealToDailyProgress} disabled={!nutritionResult}>
                  Add To Daily
                </Button>
              </div>
            </div>

            {nutritionError && (
              <Alert variant="destructive" style={{ marginTop: '1rem' }}>
                <AlertTitle>Nutrition analysis issue</AlertTitle>
                <AlertDescription>{nutritionError}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="section-head">
              <CardTitle>Daily Macro Progress</CardTitle>
              <Badge variant="success">Targets</Badge>
            </div>
            <CardDescription>Track your calories and macros against your personalized daily targets.</CardDescription>
          </CardHeader>
          <CardContent>
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
                    <Progress value={pct} />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {nutritionResult && (
        <Card className="nutrition-results-card">
          <CardHeader>
            <div className="section-head">
              <CardTitle>Meal Breakdown</CardTitle>
              <Badge variant="secondary">{nutritionSource === 'ai' ? 'AI Enhanced' : 'Local Estimate'}</Badge>
            </div>
            <CardDescription>
              The result below combines ingredient parsing with AI correction for unknown foods.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="nutrition-totals">
              <div className="nutrition-total-card"><span>Calories</span><strong>{nutritionResult.totals.calories} kcal</strong></div>
              <div className="nutrition-total-card"><span>Protein</span><strong>{nutritionResult.totals.protein} g</strong></div>
              <div className="nutrition-total-card"><span>Carbs</span><strong>{nutritionResult.totals.carbs} g</strong></div>
              <div className="nutrition-total-card"><span>Fat</span><strong>{nutritionResult.totals.fat} g</strong></div>
            </div>

            <Separator />

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
          </CardContent>
        </Card>
      )}
    </div>
  )
}
