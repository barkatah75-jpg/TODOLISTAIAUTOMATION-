import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function requireAdmin(supabase: ReturnType<typeof getSupabaseServer>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return user
}

// GET /api/admin/analytics — detailed analytics for admin dashboard
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const user = await requireAdmin(supabase)
    if (!user) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

    const admin = getSupabaseAdmin()
    const { searchParams } = new URL(req.url)
    const range = searchParams.get('range') || '30d' // '7d' | '30d' | '90d'

    const days = range === '7d' ? 7 : range === '90d' ? 90 : 30
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const [
      signupsRes,
      todosRes,
      paymentsRes,
      plansRes,
      topChildrenRes,
      moodDistRes,
    ] = await Promise.all([
      // Daily signups trend
      admin.from('profiles')
        .select('created_at, role')
        .gte('created_at', startDate)
        .order('created_at'),

      // Daily todos completed trend
      admin.from('todos')
        .select('created_at, completed')
        .gte('created_at', startDate)
        .eq('completed', true),

      // Revenue trend
      admin.from('payments')
        .select('amount, currency, created_at, plan, status')
        .gte('created_at', startDate)
        .eq('status', 'completed'),

      // Plan distribution
      admin.from('subscriptions').select('plan, status'),

      // Top children by XP
      admin.from('rewards')
        .select('user_id, total_xp, level, tasks_completed, streak_days')
        .order('total_xp', { ascending: false })
        .limit(10),

      // Mood distribution
      admin.from('mood_entries')
        .select('mood')
        .gte('checked_in_at', startDate),
    ])

    // Process daily signups
    const signupsByDay = groupByDay(signupsRes.data || [], 'created_at')
    const todosByDay = groupByDay(todosRes.data || [], 'created_at')

    // Revenue by day
    const revenueByDay = (paymentsRes.data || []).reduce((acc: Record<string, number>, p) => {
      const day = p.created_at.split('T')[0]
      acc[day] = (acc[day] || 0) + (p.amount || 0)
      return acc
    }, {})

    // Mood counts
    const moodCounts = (moodDistRes.data || []).reduce((acc: Record<string, number>, m) => {
      acc[m.mood] = (acc[m.mood] || 0) + 1
      return acc
    }, {})

    // Plan breakdown
    const planBreakdown = (plansRes.data || []).reduce((acc: Record<string, number>, s) => {
      acc[s.plan] = (acc[s.plan] || 0) + 1
      return acc
    }, {})

    // Enrich top children with profile names
    const topChildrenIds = (topChildrenRes.data || []).map((c) => c.user_id)
    const { data: topProfiles } = topChildrenIds.length > 0
      ? await admin.from('profiles').select('id, name, display_name, avatar_url').in('id', topChildrenIds)
      : { data: [] }

    const topChildren = (topChildrenRes.data || []).map((c) => ({
      ...c,
      profile: (topProfiles || []).find((p) => p.id === c.user_id),
    }))

    return NextResponse.json({
      range,
      signupsByDay,
      todosByDay,
      revenueByDay,
      planBreakdown,
      moodDistribution: moodCounts,
      topChildren,
      summary: {
        totalSignups: signupsRes.data?.length || 0,
        totalTodosCompleted: todosRes.data?.length || 0,
        totalRevenue: (paymentsRes.data || []).reduce((s, p) => s + (p.amount || 0), 0),
      },
    })
  } catch (err) {
    console.error('Admin analytics error:', err)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}

function groupByDay(records: Array<Record<string, string>>, dateField: string) {
  return records.reduce((acc: Record<string, number>, r) => {
    const day = r[dateField]?.split('T')[0]
    if (day) acc[day] = (acc[day] || 0) + 1
    return acc
  }, {})
}
