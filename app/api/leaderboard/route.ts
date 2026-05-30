import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'

// GET /api/leaderboard — weekly/all-time leaderboard
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const scope = searchParams.get('scope') || 'global'   // 'global' | 'school' | 'family'
    const period = searchParams.get('period') || 'weekly' // 'weekly' | 'all_time'
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

    let query = supabase
      .from('rewards')
      .select(`
        user_id, total_xp, level, streak_days, tasks_completed,
        profile:profiles!rewards_user_id_fkey(id, name, display_name, avatar_url, role)
      `)
      .order('total_xp', { ascending: false })
      .limit(limit)

    // Only show children
    query = query.not('user_id', 'is', null)

    const { data: allData, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Filter to children only
    const entries = (allData || []).filter((d) => {
      const profile = d.profile as { role?: string } | null
      return profile?.role === 'child'
    })

    // Find current user's rank
    const myRank = entries.findIndex((e) => e.user_id === user.id) + 1

    return NextResponse.json({
      leaderboard: entries,
      myRank: myRank || null,
      scope,
      period,
    })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 })
  }
}
