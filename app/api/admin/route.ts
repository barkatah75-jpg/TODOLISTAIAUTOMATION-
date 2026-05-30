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

// GET /api/admin — platform-wide stats
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const user = await requireAdmin(supabase)
    if (!user) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

    const admin = getSupabaseAdmin()

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const weekStart = new Date(now.setDate(now.getDate() - 7)).toISOString()

    const [
      totalUsersRes,
      rolesRes,
      subsRes,
      todosMonthRes,
      aiChatsRes,
      storiesRes,
      schoolsRes,
      paymentsRes,
      newUsersWeekRes,
      activeUsersRes,
    ] = await Promise.all([
      admin.from('profiles').select('id', { count: 'exact', head: true }),
      admin.from('profiles').select('role'),
      admin.from('subscriptions').select('plan, status'),
      admin.from('todos').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
      admin.from('ai_conversations').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
      admin.from('ai_stories').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
      admin.from('schools').select('id', { count: 'exact', head: true }),
      admin.from('payments').select('amount, currency, status').eq('status', 'completed'),
      admin.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', weekStart),
      admin.from('rewards').select('user_id').gte('updated_at', weekStart),
    ])

    const roles = rolesRes.data || []
    const subs = subsRes.data || []
    const payments = paymentsRes.data || []

    const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0)

    const planBreakdown = subs.reduce((acc: Record<string, number>, s) => {
      acc[s.plan] = (acc[s.plan] || 0) + 1
      return acc
    }, {})

    return NextResponse.json({
      stats: {
        totalUsers: totalUsersRes.count || 0,
        children: roles.filter((r) => r.role === 'child').length,
        parents: roles.filter((r) => r.role === 'parent').length,
        admins: roles.filter((r) => r.role === 'admin').length,
        proUsers: subs.filter((s) => s.plan !== 'free' && s.status === 'active').length,
        activeSubscriptions: subs.filter((s) => s.status === 'active').length,
        todosThisMonth: todosMonthRes.count || 0,
        aiChatsThisMonth: aiChatsRes.count || 0,
        storiesThisMonth: storiesRes.count || 0,
        schools: schoolsRes.count || 0,
        totalRevenue,
        newUsersThisWeek: newUsersWeekRes.count || 0,
        activeUsersThisWeek: new Set((activeUsersRes.data || []).map((r) => r.user_id)).size,
        planBreakdown,
      },
    })
  } catch (err) {
    console.error('Admin stats error:', err)
    return NextResponse.json({ error: 'Failed to fetch admin stats' }, { status: 500 })
  }
}
