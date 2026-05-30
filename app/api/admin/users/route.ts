import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase/server'
import { z } from 'zod'

async function requireAdmin(supabase: ReturnType<typeof getSupabaseServer>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return user
}

// GET /api/admin/users — list all users with pagination and search
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const user = await requireAdmin(supabase)
    if (!user) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

    const admin = getSupabaseAdmin()
    const { searchParams } = new URL(req.url)

    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = (page - 1) * limit
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const plan = searchParams.get('plan') || ''
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const order = searchParams.get('order') || 'desc'

    let query = admin
      .from('profiles')
      .select(`
        id, email, name, display_name, avatar_url, role, onboarded, created_at,
        subscriptions (plan, status, current_period_end),
        rewards (total_xp, level, streak_days, tasks_completed)
      `, { count: 'exact' })

    if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    if (role) query = query.eq('role', role)

    query = query
      .order(sortBy as 'created_at' | 'name' | 'email', { ascending: order === 'asc' })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Filter by plan if needed (post-filter since it's nested)
    const filtered = plan
      ? (data || []).filter((u: { subscriptions: Array<{ plan: string }> | { plan: string } }) => {
          const sub = Array.isArray(u.subscriptions) ? u.subscriptions[0] : u.subscriptions
          return sub?.plan === plan
        })
      : data || []

    return NextResponse.json({
      users: filtered,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (err) {
    console.error('Admin users error:', err)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

// PATCH /api/admin/users — update user role or plan
export async function PATCH(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const adminUser = await requireAdmin(supabase)
    if (!adminUser) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

    const admin = getSupabaseAdmin()
    const body = await req.json()

    const schema = z.object({
      userId: z.string().uuid(),
      action: z.enum(['set_role', 'set_plan', 'ban', 'unban', 'reset_streak']),
      role: z.enum(['child', 'parent', 'admin']).optional(),
      plan: z.enum(['free', 'pro', 'family', 'school']).optional(),
    })

    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

    const { userId, action, role, plan } = parsed.data

    // Prevent self-modification
    if (userId === adminUser.id) {
      return NextResponse.json({ error: 'Cannot modify your own admin account' }, { status: 400 })
    }

    if (action === 'set_role' && role) {
      const { error } = await admin.from('profiles').update({ role }).eq('id', userId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, message: `Role updated to ${role}` })
    }

    if (action === 'set_plan' && plan) {
      const maxChildren = plan === 'family' || plan === 'school' ? 5 : plan === 'free' ? 0 : 1
      const aiEnabled = plan !== 'free'
      const { error } = await admin.from('subscriptions').upsert({
        user_id: userId,
        plan,
        status: 'active',
        max_children: maxChildren,
        ai_enabled: aiEnabled,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }, { onConflict: 'user_id' })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, message: `Plan updated to ${plan}` })
    }

    if (action === 'reset_streak') {
      const { error } = await admin.from('rewards').update({ streak_days: 0 }).eq('user_id', userId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, message: 'Streak reset' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

// DELETE /api/admin/users?userId=xxx — hard delete a user
export async function DELETE(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const adminUser = await requireAdmin(supabase)
    if (!adminUser) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
    if (userId === adminUser.id) return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })

    const admin = getSupabaseAdmin()

    // Delete from auth (cascades to all tables via RLS)
    const { error } = await admin.auth.admin.deleteUser(userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, message: 'User deleted' })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
