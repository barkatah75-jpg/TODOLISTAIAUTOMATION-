import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { z } from 'zod'

const startSchema = z.object({
  action: z.literal('start'),
  duration_mins: z.number().int().min(5).max(120).default(25),
  break_mins: z.number().int().min(1).max(30).default(5),
  todo_id: z.string().uuid().optional().nullable(),
  subject: z.string().max(100).optional().nullable(),
})

const endSchema = z.object({
  action: z.literal('end'),
  sessionId: z.string().uuid(),
  status: z.enum(['completed', 'abandoned']),
  completed_cycles: z.number().int().min(0).default(0),
})

// POST /api/focus — start or end a focus session
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()

    if (body.action === 'start') {
      const parsed = startSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

      // Close any active sessions first
      await supabase.from('focus_sessions')
        .update({ status: 'abandoned', completed_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('status', 'active')

      const { data, error } = await supabase.from('focus_sessions').insert({
        user_id: user.id,
        todo_id: parsed.data.todo_id || null,
        subject: parsed.data.subject || null,
        duration_mins: parsed.data.duration_mins,
        break_mins: parsed.data.break_mins,
        status: 'active',
        completed_cycles: 0,
        xp_bonus: 0,
      }).select().single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ session: data }, { status: 201 })
    }

    if (body.action === 'end') {
      const parsed = endSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

      const { data: session } = await supabase.from('focus_sessions')
        .select('duration_mins, completed_cycles')
        .eq('id', parsed.data.sessionId)
        .eq('user_id', user.id)
        .single()

      if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

      // Calculate XP bonus: 10 XP per completed pomodoro cycle
      const xpBonus = parsed.data.status === 'completed'
        ? parsed.data.completed_cycles * 10
        : 0

      const { data, error } = await supabase.from('focus_sessions').update({
        status: parsed.data.status,
        completed_cycles: parsed.data.completed_cycles,
        xp_bonus: xpBonus,
        completed_at: new Date().toISOString(),
      }).eq('id', parsed.data.sessionId).eq('user_id', user.id).select().single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      // Award bonus XP
      if (xpBonus > 0) {
        await supabase.rpc('award_xp', {
          p_user_id: user.id,
          p_amount: xpBonus,
          p_reason: `Focus session: ${parsed.data.completed_cycles} pomodoro cycles`,
        }).catch(() => {})
      }

      return NextResponse.json({ session: data, xpBonus })
    }

    return NextResponse.json({ error: 'Invalid action. Use: start | end' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/focus — get recent focus sessions
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(20)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const totalCompletedCycles = (data || []).reduce((s, d) => s + (d.status === 'completed' ? d.completed_cycles : 0), 0)
    const totalFocusMinutes = (data || []).reduce((s, d) => s + (d.status === 'completed' ? d.duration_mins * d.completed_cycles : 0), 0)

    return NextResponse.json({
      sessions: data || [],
      stats: { totalCompletedCycles, totalFocusMinutes },
    })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
