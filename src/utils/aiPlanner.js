const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY

function assertOpenRouterKey() {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key not configured. Add VITE_OPENROUTER_API_KEY to .env')
  }
}

async function callOpenRouter({ systemPrompt, userPrompt, model = 'openai/gpt-4o-mini', temperature = 0.6 }) {
  assertOpenRouterKey()

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Fitness Transformation App',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`AI request failed (${response.status}): ${errText}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('No response received from AI. Please try again.')

  try {
    return JSON.parse(content)
  } catch {
    throw new Error('AI returned an invalid response. Please try again.')
  }
}

const PLAN_SYSTEM_PROMPT = `You are a personalized wellness and fitness coach. Based on the user's profile, generate a complete personalized wellness plan.

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  "dailySchedule": [
    {"time": "6:00 AM", "task": "Task description here", "category": "food"}
  ],
  "navPages": [
    {"id": "face", "label": "🧴 Face", "color": "#ff9a5a"},
    {"id": "hair", "label": "💇 Hair", "color": "#58b8ff"},
    {"id": "food", "label": "🥗 Food", "color": "#65e0a3"},
    {"id": "gym", "label": "🏋️ Gym", "color": "#ff6b6b"},
    {"id": "wellness", "label": "🌙 Wellness", "color": "#b48eff"}
  ],
  "schedulePages": {
    "face": {
      "title": "Face Care Schedule",
      "subtitle": "Personalized skin routine subtitle",
      "color": "sunrise",
      "accentColor": "#ff9a5a",
      "tasks": [
        {"time": "6:30 AM · Daily", "title": "Task title", "detail": "Detailed instructions for this task"}
      ]
    },
    "hair": {
      "title": "Hair Care Schedule",
      "subtitle": "Personalized hair routine subtitle",
      "color": "coastal",
      "accentColor": "#58b8ff",
      "tasks": []
    },
    "food": {
      "title": "Nutrition Schedule",
      "subtitle": "Personalized nutrition subtitle",
      "color": "meadow",
      "accentColor": "#65e0a3",
      "tasks": []
    },
    "gym": {
      "title": "Gym Schedule",
      "subtitle": "Personalized workout subtitle",
      "color": "ember",
      "accentColor": "#ff6b6b",
      "tasks": []
    },
    "wellness": {
      "title": "Wellness & Recovery",
      "subtitle": "Personalized wellness subtitle",
      "color": "indigo",
      "accentColor": "#b48eff",
      "tasks": []
    }
  },
  "macroGoals": {
    "calories": 2200,
    "protein": 140,
    "carbs": 250,
    "fat": 70
  },
  "tips": {
    "skinSummary": "One-line personalized skin tip",
    "hairSummary": "One-line personalized hair tip",
    "nutritionSummary": "One-line personalized nutrition tip",
    "workoutSummary": "One-line personalized workout tip"
  }
}

Rules:
- Include 10-12 items in dailySchedule spanning the full day from morning to night.
- Include 6-9 tasks per schedule page.
- Category values MUST be one of: food, face, hair, gym, wellness.
- Tailor the plan completely to the user's specific goals, body type, hair type, skin type, diet, and experience.
- Macro goals must be realistic for the user's weight, goal, and activity level.
- All tasks should be actionable and specific to the user's profile.`

export async function generatePersonalizedPlan(onboardingAnswers) {
  const userPrompt = `Generate a fully personalized wellness and fitness plan for this user:

Fitness Goal: ${onboardingAnswers.fitnessGoal}
Age: ${onboardingAnswers.age} years
Gender: ${onboardingAnswers.gender}
Height: ${onboardingAnswers.height} cm
Weight: ${onboardingAnswers.weight} kg
Activity Level: ${onboardingAnswers.activityLevel}
Diet Preference: ${onboardingAnswers.dietPreference}
Skin Type: ${onboardingAnswers.skinType}
Hair Type: ${onboardingAnswers.hairType}
Experience Level: ${onboardingAnswers.experienceLevel}
Additional Notes: ${onboardingAnswers.additionalNotes || 'None'}

Create a complete, highly personalized plan tailored specifically to this person. Be specific about products, foods, and exercises that suit their profile.`

  return callOpenRouter({
    systemPrompt: PLAN_SYSTEM_PROMPT,
    userPrompt,
    model: 'openai/gpt-4o-mini',
    temperature: 0.7,
  })
}

export async function analyzeMealWithAI({ ingredientText, localResult, profile }) {
  const systemPrompt = `You are an expert sports nutritionist and calorie analyst.

Return ONLY valid JSON with this shape:
{
  "entries": [
    {
      "input": "2 eggs",
      "matched": "Egg",
      "grams": 100,
      "calories": 155,
      "protein": 13,
      "carbs": 1.1,
      "fat": 11,
      "fiber": 0,
      "confidence": "high"
    }
  ],
  "unknown": ["items that are still unknown"],
  "totals": {
    "calories": 0,
    "protein": 0,
    "carbs": 0,
    "fat": 0,
    "fiber": 0,
    "weightGrams": 0
  },
  "notes": ["short note 1", "short note 2"]
}

Rules:
- Estimate nutrition as accurately as possible from common food database knowledge.
- Infer missing quantities using realistic defaults.
- Keep all numeric fields as numbers (not strings).
- confidence must be one of: high, medium, low.
- If an item is unclear, still estimate best effort and set confidence low.
- Keep notes short and practical.`

  const userPrompt = `Analyze this meal and compute accurate macros.

User profile:
${JSON.stringify(profile || {}, null, 2)}

Ingredient text input:
${ingredientText}

Local parser baseline result (improve this with better estimates):
${JSON.stringify(localResult || {}, null, 2)}

Return improved nutrition estimates in the JSON schema.`

  return callOpenRouter({
    systemPrompt,
    userPrompt,
    model: 'openai/gpt-4o-mini',
    temperature: 0.25,
  })
}

export async function generateShoppingRecommendations({ onboardingAnswers, personalizedPlan }) {
  const systemPrompt = `You are a fitness + grooming product advisor.

Return ONLY valid JSON with this schema:
{
  "items": [
    {
      "category": "supplement|gym|hair|skin|wellness",
      "name": "Product name",
      "why": "Why this user needs it",
      "usage": "How to use it briefly",
      "buySearchTerm": "best whey isolate 1kg india",
      "priority": "high|medium|low"
    }
  ],
  "notes": ["short safety note"]
}

Rules:
- Return 10-14 items total.
- Ensure recommendations are personalized to user goal, skin type, hair type, and experience level.
- Prefer practical and commonly available products.
- Include at least: 3 gym items, 2 supplements, 2 skin items, 2 hair items, 1 recovery/wellness item.
- Avoid medical claims.`

  const userPrompt = `Generate personalized shopping recommendations.

Onboarding:
${JSON.stringify(onboardingAnswers || {}, null, 2)}

Plan summary:
${JSON.stringify(personalizedPlan?.tips || {}, null, 2)}

Return data only in the requested JSON format.`

  return callOpenRouter({
    systemPrompt,
    userPrompt,
    model: 'openai/gpt-4o-mini',
    temperature: 0.55,
  })
}
