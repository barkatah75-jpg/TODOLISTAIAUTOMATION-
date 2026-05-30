import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getAdaptiveSuggestions } from '@/lib/adaptive/engine'
import { checkRateLimit } from '@/lib/utils/rateLimit'

export const dynamic = 'force-dynamic'

// GET /api/ai/suggest — get AI-powered task suggestions based on learning profile
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Rate limit: 20 suggestion requests per hour
    const rl = await checkRateLimit(`ai:suggest:${user.id}`, 20, '1 h')
    if (!rl.success) return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 })

    // Check subscription (AI suggestions need pro plan)
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan, ai_enabled')
      .eq('user_id', user.id)
      .single()

    if (!sub?.ai_enabled && sub?.plan === 'free') {
      return NextResponse.json({
        error: 'AI suggestions require a Pro plan. Upgrade to unlock!',
        upgrade: true,
      }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const count = Math.min(parseInt(searchParams.get('count') || '3'), 6)

    const suggestions = await getAdaptiveSuggestions(user.id, count)
    return NextResponse.json({ suggestions })
  } catch (err) {
    console.error('AI suggest error:', err)
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 })
  }
}
