import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { z } from 'zod'

// Start session when child opens app
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const action = body.action // 'start' | 'end'

    if (action === 'start') {
      const { data } = await supabase.from('screen_time_sessions').insert({
        user_id: user.id,
        date: new Date().toISOString().split('T')[0],
      }).select().single()
      return NextResponse.json({ sessionId: data?.id })
    }

    if (action === 'end' && body.sessionId) {
      const { data: session } = await supabase.from('screen_time_sessions')
        .select('started_at').eq('id', body.sessionId).single()
      if (session) {
        const durationMins = Math.round((Date.now() - new Date(session.started_at).getTime()) / 60000)
        await supabase.from('screen_time_sessions').update({
          ended_at: new Date().toISOString(),
          duration_mins: durationMins,
        }).eq('id', body.sessionId)
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// Get screen time stats + check limits
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const childId = searchParams.get('childId') || user.id

    // Verify access
    if (childId !== user.id) {
      const { data: link } = await supabase.from('family_links').select('id')
        .eq('parent_id', user.id).eq('child_id', childId).single()
      if (!link) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const today = new Date().toISOString().split('T')[0]
    const isWeekend = [0, 6].includes(new Date().getDay())

    const [sessionsRes, limitsRes] = await Promise.all([
      supabase.from('screen_time_sessions').select('duration_mins, started_at')
        .eq('user_id', childId).eq('date', today),
      supabase.from('screen_time_limits').select('*').eq('child_id', childId).single(),
    ])

    const todayMinutes = (sessionsRes.data || []).reduce((s, r) => s + (r.duration_mins || 0), 0)
    const limit = limitsRes.data
    const dailyLimit = limit
      ? (isWeekend ? limit.daily_limit_mins + (limit.weekend_extra_mins || 0) : limit.daily_limit_mins)
      : 120

    // Check bedtime
    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    const isBedtime = limit?.bedtime_start && limit?.bedtime_end
      ? (currentTime >= limit.bedtime_start || currentTime < limit.bedtime_end)
      : false

    const withinLimit = todayMinutes < dailyLimit
    const remainingMins = Math.max(0, dailyLimit - todayMinutes)
    const usagePercent = Math.min(Math.round((todayMinutes / dailyLimit) * 100), 100)

    return NextResponse.json({
      todayMinutes,
      dailyLimit,
      remainingMins,
      usagePercent,
      withinLimit,
      isBedtime,
      limit,
      warning: remainingMins <= 15 && remainingMins > 0,
      blocked: !withinLimit || isBedtime,
    })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch screen time' }, { status: 500 })
  }
}
