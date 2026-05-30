import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase/server'
import { z } from 'zod'

const assignSchema = z.object({
  childId: z.string().uuid(),
  missionId: z.string().uuid().optional(),
  assignedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).default(() => new Date().toISOString().split('T')[0]),
})

const createMissionSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional().nullable(),
  emoji: z.string().default('⭐'),
  mission_type: z.enum(['daily', 'weekly', 'special']).default('daily'),
  target_count: z.number().int().min(1).max(100).default(1),
  xp_reward: z.number().int().min(1).max(500).default(50),
})

// POST /api/missions/assign — assign missions to a child for today
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const action = body.action || 'assign'

    // Auto-assign today's missions for a child (called by cron or on login)
    if (action === 'auto') {
      const parsed = assignSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

      // Verify user is parent of this child OR is the child themselves
      if (parsed.data.childId !== user.id) {
        const { data: link } = await supabase
          .from('family_links').select('id')
          .eq('parent_id', user.id).eq('child_id', parsed.data.childId).single()
        if (!link) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
      }

      // Get available missions
      const { data: missions } = await supabase
        .from('missions')
        .select('*')
        .eq('active', true)
        .eq('mission_type', 'daily')
        .order('created_at')
        .limit(3)

      if (!missions?.length) return NextResponse.json({ message: 'No missions available', assigned: 0 })

      // Check which already assigned today
      const { data: existing } = await supabase
        .from('user_missions')
        .select('mission_id')
        .eq('user_id', parsed.data.childId)
        .eq('assigned_date', parsed.data.assignedDate)

      const existingIds = new Set((existing || []).map((m) => m.mission_id))
      const toAssign = missions.filter((m) => !existingIds.has(m.id))

      if (!toAssign.length) return NextResponse.json({ message: 'Missions already assigned', assigned: 0 })

      const insertData = toAssign.map((m) => ({
        user_id: parsed.data.childId,
        mission_id: m.id,
        assigned_date: parsed.data.assignedDate,
        progress: 0,
        completed: false,
      }))

      const { error } = await supabase.from('user_missions').insert(insertData)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      return NextResponse.json({ success: true, assigned: toAssign.length, missions: toAssign })
    }

    // Manual assign: parent assigns specific mission to child
    if (action === 'manual') {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'parent' && profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Only parents can manually assign missions' }, { status: 403 })
      }

      const parsed = assignSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })
      if (!parsed.data.missionId) return NextResponse.json({ error: 'missionId required for manual assign' }, { status: 400 })

      const { data: link } = await supabase
        .from('family_links').select('id')
        .eq('parent_id', user.id).eq('child_id', parsed.data.childId).single()
      if (!link) return NextResponse.json({ error: 'Not authorized for this child' }, { status: 403 })

      const { data, error } = await supabase
        .from('user_missions')
        .upsert({
          user_id: parsed.data.childId,
          mission_id: parsed.data.missionId,
          assigned_date: parsed.data.assignedDate,
          progress: 0,
          completed: false,
        }, { onConflict: 'user_id,mission_id,assigned_date', ignoreDuplicates: true })
        .select()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, data })
    }

    // Create custom mission (parent)
    if (action === 'create') {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role !== 'parent' && profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Only parents can create missions' }, { status: 403 })
      }

      const parsed = createMissionSchema.safeParse(body.mission)
      if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

      const { data, error } = await supabase
        .from('missions')
        .insert({ ...parsed.data, active: true })
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ mission: data }, { status: 201 })
    }

    return NextResponse.json({ error: 'Invalid action. Use: auto | manual | create' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/missions/assign — get available missions to assign
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'daily'

    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .eq('active', true)
      .eq('mission_type', type)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ missions: data || [] })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch missions' }, { status: 500 })
  }
}
