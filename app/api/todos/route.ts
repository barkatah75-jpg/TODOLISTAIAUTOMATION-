import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/utils/rateLimit'
import { checkSubscriptionLimit } from '@/lib/utils/subscription'
import { z } from 'zod'

const todoSchema = z.object({
  text: z.string().min(1).max(500).trim(),
  description: z.string().max(2000).optional().nullable(),
  category: z.enum(['homework','chores','reading','exercise','creative','social','personal','custom']).default('custom'),
  emoji: z.string().default('✅'),
  points: z.number().int().min(1).max(1000).default(10),
  due_date: z.string().datetime().optional().nullable(),
  priority: z.number().int().min(1).max(3).default(1),
  recurring: z.string().optional().nullable(),
  assigned_by: z.string().uuid().optional().nullable(),
})

// GET /api/todos — fetch todos with optional filters
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const completed = searchParams.get('completed')
    const category = searchParams.get('category')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const childId = searchParams.get('childId') // parent viewing child todos

    let targetUserId = user.id

    // If parent requesting child's todos, verify family link
    if (childId && childId !== user.id) {
      const { data: link } = await supabase
        .from('family_links')
        .select('id')
        .eq('parent_id', user.id)
        .eq('child_id', childId)
        .single()
      if (!link) return NextResponse.json({ error: 'Not authorized to view this child' }, { status: 403 })
      targetUserId = childId
    }

    let query = supabase
      .from('todos')
      .select('*', { count: 'exact' })
      .eq('user_id', targetUserId)

    if (completed !== null) query = query.eq('completed', completed === 'true')
    if (category) query = query.eq('category', category)
    if (dateFrom) query = query.gte('created_at', dateFrom)
    if (dateTo) query = query.lte('created_at', dateTo)

    query = query
      .order('completed', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('priority', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ todos: data || [], count: count || 0, limit, offset })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/todos — create a new todo
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Rate limit: 30 creates per minute
    const rl = await checkRateLimit(`todo:create:${user.id}`, 30, '1 m')
    if (!rl.success) return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 })

    const body = await req.json()
    const parsed = todoSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

    // Check subscription limits (free = 10 tasks/day)
    const limitCheck = await checkSubscriptionLimit(user.id, 'daily_todos')
    if (!limitCheck.allowed) {
      return NextResponse.json({
        error: `Daily limit of ${limitCheck.limit} tasks reached. Upgrade to Pro for unlimited tasks! 🚀`,
        upgrade: true,
      }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('todos')
      .insert({ ...parsed.data, user_id: user.id })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ todo: data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/todos — bulk update (reorder)
export async function PATCH(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()

    // Bulk reorder
    if (body.reorder && Array.isArray(body.todoIds)) {
      const updates = (body.todoIds as string[]).map((id, index) => ({
        id,
        sort_order: index,
        user_id: user.id,
      }))
      const { error } = await supabase.from('todos').upsert(updates)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid operation' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
