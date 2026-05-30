import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { z } from 'zod'

const moodSchema = z.object({
  mood: z.enum(['great', 'good', 'okay', 'tired', 'sad', 'stressed']),
  note: z.string().max(500).optional(),
  energy_level: z.number().int().min(1).max(5).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const parsed = moodSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid mood data' }, { status: 400 })

    const today = new Date().toISOString().split('T')[0]

    // Count tasks completed today for context
    const { count: tasksToday } = await supabase
      .from('todos').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('completed', true)
      .gte('completed_at', `${today}T00:00:00Z`)

    // Upsert today's mood
    const { data, error } = await supabase
      .from('mood_entries')
      .upsert({
        user_id: user.id,
        mood: parsed.data.mood,
        note: parsed.data.note || null,
        energy_level: parsed.data.energy_level || null,
        tasks_before: tasksToday || 0,
        date: today,
        checked_in_at: new Date().toISOString(),
      }, { onConflict: 'user_id,date' })
      .select()
      .single()

    if (error) throw error

    // Check mood patterns and create parent alerts if needed
    await supabase.rpc('check_mood_alerts', { p_user_id: user.id })

    // Give small XP bonus for checking in
    await supabase.rpc('award_xp', {
      p_user_id: user.id,
      p_amount: 5,
      p_reason: 'Daily mood check-in',
    })

    return NextResponse.json({ success: true, entry: data, xpBonus: 5 })
  } catch (err: unknown) {
    return NextResponse.json({ error: 'Failed to save mood' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const days = Math.min(parseInt(searchParams.get('days') || '30'), 90)
    const childId = searchParams.get('childId')

    // Parents can view child mood
    const targetId = childId || user.id
    if (childId && childId !== user.id) {
      const { data: link } = await supabase
        .from('family_links').select('id').eq('parent_id', user.id).eq('child_id', childId).single()
      if (!link) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase
      .from('mood_entries').select('*')
      .eq('user_id', targetId)
      .gte('checked_in_at', since)
      .order('checked_in_at', { ascending: false })

    // Calculate mood stats
    const entries = data || []
    const moodCounts = entries.reduce((acc, e) => {
      acc[e.mood] = (acc[e.mood] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const todayEntry = entries.find(e => e.date === new Date().toISOString().split('T')[0])
    const avgEnergy = entries.filter(e => e.energy_level)
      .reduce((sum, e, _, arr) => sum + (e.energy_level || 0) / arr.length, 0)

    return NextResponse.json({
      entries,
      stats: { moodCounts, avgEnergy: Math.round(avgEnergy * 10) / 10, totalEntries: entries.length },
      todayEntry,
    })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch mood data' }, { status: 500 })
  }
}
