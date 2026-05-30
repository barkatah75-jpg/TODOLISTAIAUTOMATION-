import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Find all family links for this user's parents
    const { data: myLinks } = await supabase
      .from('family_links')
      .select('parent_id')
      .eq('child_id', user.id)

    if (!myLinks || myLinks.length === 0) {
      return NextResponse.json({ leaderboard: [], myRank: null })
    }

    const parentIds = myLinks.map(l => l.parent_id)

    // Get all siblings (children of same parents)
    const { data: siblingLinks } = await supabase
      .from('family_links')
      .select('child_id')
      .in('parent_id', parentIds)

    const siblingIds = [...new Set(siblingLinks?.map(l => l.child_id) || [])]

    if (siblingIds.length === 0) {
      return NextResponse.json({ leaderboard: [], myRank: null })
    }

    // Fetch profiles and rewards for all siblings
    const [profilesRes, rewardsRes] = await Promise.all([
      supabase.from('profiles').select('id, name, display_name, avatar_url').in('id', siblingIds),
      supabase.from('rewards').select('user_id, total_xp, level, streak_days, tasks_completed').in('user_id', siblingIds),
    ])

    const leaderboard = (profilesRes.data || [])
      .map(profile => ({
        profile,
        rewards: rewardsRes.data?.find(r => r.user_id === profile.id) || {
          user_id: profile.id, total_xp: 0, level: 1, streak_days: 0, tasks_completed: 0,
        },
        isMe: profile.id === user.id,
      }))
      .sort((a, b) => b.rewards.total_xp - a.rewards.total_xp)

    const myRank = leaderboard.findIndex(e => e.profile.id === user.id) + 1

    return NextResponse.json({
      leaderboard,
      myRank: myRank > 0 ? myRank : null,
      total: leaderboard.length,
    })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 })
  }
}
