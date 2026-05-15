import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { generateShoppingRecommendations } from '../utils/aiPlanner'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Separator } from '../components/ui/separator'

const BUY_LINK_PROVIDERS = [
  { label: 'Amazon US', buildUrl: (term) => `https://www.amazon.com/s?k=${encodeURIComponent(term)}` },
  { label: 'Walmart', buildUrl: (term) => `https://www.walmart.com/search?q=${encodeURIComponent(term)}` },
  { label: 'Target', buildUrl: (term) => `https://www.target.com/s?searchTerm=${encodeURIComponent(term)}` },
  { label: 'iHerb', buildUrl: (term) => `https://www.iherb.com/search?kw=${encodeURIComponent(term)}` },
]

function buildShoppingLinks(searchTerm) {
  return BUY_LINK_PROVIDERS.map((provider) => ({ label: provider.label, url: provider.buildUrl(searchTerm) }))
}

export default function ShopPage() {
  const navigate = useNavigate()
  const { currentUser, userProfile } = useAuth()
  const onboardingAnswers = userProfile?.onboardingAnswers
  const plan = userProfile?.personalizedPlan

  const fallbackShopItems = useMemo(() => {
    const goalText = onboardingAnswers?.fitnessGoal || 'overall fitness'
    return [
      {
        category: 'supplement',
        name: 'Whey Protein Isolate',
        why: `Helps support daily protein targets for ${goalText.toLowerCase()}.`,
        usage: 'Use 1 scoop post-workout or to complete your daily protein intake.',
        buySearchTerm: 'best whey isolate unflavored usa',
        priority: 'high',
      },
      {
        category: 'gym',
        name: 'Adjustable Dumbbells',
        why: 'Makes progressive overload easy for home and travel training.',
        usage: 'Use 3-4 sessions per week for presses, rows, squats, and accessory lifts.',
        buySearchTerm: 'adjustable dumbbell set home gym usa',
        priority: 'high',
      },
      {
        category: 'skin',
        name: 'Broad Spectrum SPF 50 Sunscreen',
        why: `Protects ${onboardingAnswers?.skinType || 'all skin'} skin from UV damage and pigmentation.`,
        usage: 'Apply every morning and reapply when outdoors.',
        buySearchTerm: 'spf 50 face sunscreen usa dermatologist',
        priority: 'high',
      },
      {
        category: 'hair',
        name: 'Sulfate-Free Shampoo',
        why: `Better scalp support for ${onboardingAnswers?.hairType || 'your hair type'} with less dryness.`,
        usage: 'Use 2-3 times per week, focusing on scalp cleanse.',
        buySearchTerm: 'sulfate free shampoo usa',
        priority: 'medium',
      },
    ]
  }, [onboardingAnswers])

  const [shopRecommendations, setShopRecommendations] = useState({ items: [], notes: [] })
  const [shopLoading, setShopLoading] = useState(false)
  const [shopError, setShopError] = useState('')

  const refreshShopRecommendations = async () => {
    if (!onboardingAnswers || !currentUser?.uid) return
    setShopLoading(true)
    setShopError('')
    try {
      const aiRecommendations = await generateShoppingRecommendations({ onboardingAnswers, personalizedPlan: plan })
      const normalized = {
        items: Array.isArray(aiRecommendations?.items) ? aiRecommendations.items : fallbackShopItems,
        notes: Array.isArray(aiRecommendations?.notes) ? aiRecommendations.notes : [],
      }
      setShopRecommendations(normalized)
      localStorage.setItem(`fitness-shop-recommendations-${currentUser.uid}`, JSON.stringify(normalized))
    } catch {
      setShopError('Could not refresh recommendations right now. Please try again.')
    } finally {
      setShopLoading(false)
    }
  }

  useEffect(() => {
    const uid = currentUser?.uid
    if (!uid || !onboardingAnswers) return

    const cacheKey = `fitness-shop-recommendations-${uid}`
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null')
      if (cached?.items?.length) {
        setShopRecommendations(cached)
        return
      }
    } catch {
      // ignore cache parse issues
    }

    let ignore = false
    const load = async () => {
      setShopLoading(true)
      setShopError('')
      try {
        const aiRecommendations = await generateShoppingRecommendations({ onboardingAnswers, personalizedPlan: plan })
        if (ignore) return
        const normalized = {
          items: Array.isArray(aiRecommendations?.items) ? aiRecommendations.items : fallbackShopItems,
          notes: Array.isArray(aiRecommendations?.notes) ? aiRecommendations.notes : [],
        }
        setShopRecommendations(normalized)
        localStorage.setItem(cacheKey, JSON.stringify(normalized))
      } catch {
        if (ignore) return
        const fallback = { items: fallbackShopItems, notes: ['Using fallback product list. AI recommendations were unavailable.'] }
        setShopRecommendations(fallback)
        setShopError('Could not load AI product recommendations right now. Showing fallback list.')
      } finally {
        if (!ignore) setShopLoading(false)
      }
    }

    load()
    return () => { ignore = true }
  }, [currentUser?.uid, onboardingAnswers, plan, fallbackShopItems])

  return (
    <div className="app-shell">
      <Card className="page-hero-card">
        <CardHeader className="page-hero-header">
          <div className="page-hero-topline">
            <Badge variant="secondary">Personalized Shop</Badge>
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>← Dashboard</Button>
          </div>
          <CardTitle>Personalized Shop Recommendations</CardTitle>
          <CardDescription>US-focused product suggestions based on your goals, skin type, and hair type.</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <div className="section-head">
            <CardTitle>Product List</CardTitle>
            <Button variant="outline" size="sm" onClick={refreshShopRecommendations} disabled={shopLoading}>
              {shopLoading ? 'Refreshing...' : 'Refresh with AI'}
            </Button>
          </div>
          <CardDescription>
            Compare products from US stores and use the short notes to understand why each one is recommended.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {shopError && (
            <Alert variant="destructive" style={{ marginBottom: '1rem' }}>
              <AlertTitle>Shop recommendations issue</AlertTitle>
              <AlertDescription>{shopError}</AlertDescription>
            </Alert>
          )}
          {shopLoading && shopRecommendations.items.length === 0 && (
            <p className="nutrition-hint">Generating personalized products...</p>
          )}

          {shopRecommendations.items.length > 0 && (
            <div className="shop-grid">
              {shopRecommendations.items.map((item, idx) => (
                <article className="shop-item-card" key={`${item.name}-${idx}`}>
                  <div className="shop-item-head">
                    <span className="shop-item-category">{item.category}</span>
                    <span className={`shop-priority ${item.priority || 'medium'}`}>{item.priority || 'medium'}</span>
                  </div>
                  <h4>{item.name}</h4>
                  <p><strong>Why:</strong> {item.why}</p>
                  <p><strong>How to use:</strong> {item.usage}</p>
                  <div className="shop-links">
                    {buildShoppingLinks(item.buySearchTerm || item.name).map((link) => (
                      <a key={`${item.name}-${link.label}`} href={link.url} target="_blank" rel="noreferrer" className="shop-link-btn">
                        Buy on {link.label}
                      </a>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}

          {shopRecommendations.notes?.length > 0 && (
            <>
              <Separator />
              <div className="shop-notes">
                {shopRecommendations.notes.map((note, idx) => <p key={`${note}-${idx}`}>• {note}</p>)}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
