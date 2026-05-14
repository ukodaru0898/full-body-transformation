const NUTRITION_DB = {
  chicken: { label: 'Chicken Breast', calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, pieceGrams: 120 },
  egg: { label: 'Egg', calories: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0, pieceGrams: 50 },
  rice: { label: 'Rice (Cooked)', calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, cupGrams: 158 },
  oats: { label: 'Oats', calories: 389, protein: 16.9, carbs: 66, fat: 6.9, fiber: 10.6, cupGrams: 80 },
  paneer: { label: 'Paneer', calories: 265, protein: 18.3, carbs: 1.2, fat: 20.8, fiber: 0, pieceGrams: 50 },
  tofu: { label: 'Tofu', calories: 144, protein: 17.3, carbs: 3, fat: 8.7, fiber: 0.9, pieceGrams: 85 },
  milk: { label: 'Milk', calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3, fiber: 0, cupGrams: 244 },
  banana: { label: 'Banana', calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3, fiber: 2.6, pieceGrams: 118 },
  apple: { label: 'Apple', calories: 52, protein: 0.3, carbs: 13.8, fat: 0.2, fiber: 2.4, pieceGrams: 182 },
  almonds: { label: 'Almonds', calories: 579, protein: 21.2, carbs: 21.6, fat: 49.9, fiber: 12.5, pieceGrams: 1.2 },
  'peanut butter': { label: 'Peanut Butter', calories: 588, protein: 25, carbs: 20, fat: 50, fiber: 6, tbspGrams: 16 },
  lentils: { label: 'Lentils (Cooked)', calories: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 8, cupGrams: 198 },
  dal: { label: 'Dal (Cooked)', calories: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 8, cupGrams: 198 },
  chickpeas: { label: 'Chickpeas (Cooked)', calories: 164, protein: 8.9, carbs: 27.4, fat: 2.6, fiber: 7.6, cupGrams: 164 },
  yogurt: { label: 'Yogurt', calories: 61, protein: 3.5, carbs: 4.7, fat: 3.3, fiber: 0, cupGrams: 245 },
  potato: { label: 'Potato', calories: 77, protein: 2, carbs: 17, fat: 0.1, fiber: 2.2, pieceGrams: 173 },
  broccoli: { label: 'Broccoli', calories: 34, protein: 2.8, carbs: 6.6, fat: 0.4, fiber: 2.6, cupGrams: 91 },
  spinach: { label: 'Spinach', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, cupGrams: 30 },
  'olive oil': { label: 'Olive Oil', calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, tbspGrams: 13.5 },
  roti: { label: 'Roti', calories: 297, protein: 9.6, carbs: 53, fat: 3.7, fiber: 4.5, pieceGrams: 40 },
}

function roundTo(value, digits = 1) {
  const p = 10 ** digits
  return Math.round(value * p) / p
}

function normalizeIngredientName(name) {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(chopped|boiled|raw|cooked|fresh|medium|large|small)\b/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function findIngredientKey(name) {
  const normalized = normalizeIngredientName(name)
  if (!normalized) return null

  if (NUTRITION_DB[normalized]) return normalized

  const keys = Object.keys(NUTRITION_DB)
  const exactWord = keys.find((key) => normalized.split(' ').includes(key))
  if (exactWord) return exactWord

  const partial = keys.find((key) => normalized.includes(key) || key.includes(normalized))
  return partial || null
}

function computeWeightInGrams(quantity, unit, item) {
  const q = quantity || 1
  const normalizedUnit = (unit || '').toLowerCase()

  if (normalizedUnit === 'g' || normalizedUnit === 'gram' || normalizedUnit === 'grams') return q
  if (normalizedUnit === 'kg') return q * 1000
  if (normalizedUnit === 'ml') return q
  if (normalizedUnit === 'cup' || normalizedUnit === 'cups') return q * (item.cupGrams || 240)
  if (normalizedUnit === 'tbsp') return q * (item.tbspGrams || 15)
  if (normalizedUnit === 'tsp') return q * 5
  if (normalizedUnit === 'piece' || normalizedUnit === 'pieces' || normalizedUnit === 'egg' || normalizedUnit === 'eggs') {
    return q * (item.pieceGrams || 50)
  }

  if (quantity) {
    if (quantity > 10) return quantity
    return quantity * (item.pieceGrams || 100)
  }

  return 100
}

function parseIngredientLine(line) {
  const clean = line.trim()
  if (!clean) return null

  const match = clean.match(/^(\d*\.?\d+)?\s*(kg|g|gram|grams|ml|cup|cups|tbsp|tsp|piece|pieces|egg|eggs)?\s*(.*)$/i)
  if (!match) return { quantity: null, unit: '', name: clean }

  const quantity = match[1] ? parseFloat(match[1]) : null
  const unit = match[2] || ''
  const name = (match[3] || clean).trim()

  return { quantity, unit, name }
}

export function analyzeIngredientsText(text) {
  const lines = text
    .split(/[\n,]+/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (!lines.length) {
    return { error: 'Please enter at least one ingredient.' }
  }

  const entries = []
  const unknown = []
  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, weightGrams: 0 }

  lines.forEach((line) => {
    const parsed = parseIngredientLine(line)
    if (!parsed) return

    const key = findIngredientKey(parsed.name)
    if (!key) {
      unknown.push(parsed.name)
      return
    }

    const item = NUTRITION_DB[key]
    const grams = computeWeightInGrams(parsed.quantity, parsed.unit, item)
    const scale = grams / 100

    const current = {
      input: line,
      matched: item.label,
      grams: roundTo(grams, 0),
      calories: roundTo(item.calories * scale, 1),
      protein: roundTo(item.protein * scale, 1),
      carbs: roundTo(item.carbs * scale, 1),
      fat: roundTo(item.fat * scale, 1),
      fiber: roundTo(item.fiber * scale, 1),
    }

    totals.calories += current.calories
    totals.protein += current.protein
    totals.carbs += current.carbs
    totals.fat += current.fat
    totals.fiber += current.fiber
    totals.weightGrams += current.grams
    entries.push(current)
  })

  if (!entries.length) {
    return { error: 'Could not recognize ingredients. Try names like: egg, oats, paneer, chicken, rice.' }
  }

  return {
    entries,
    unknown,
    totals: {
      calories: roundTo(totals.calories, 1),
      protein: roundTo(totals.protein, 1),
      carbs: roundTo(totals.carbs, 1),
      fat: roundTo(totals.fat, 1),
      fiber: roundTo(totals.fiber, 1),
      weightGrams: roundTo(totals.weightGrams, 0),
    },
  }
}
