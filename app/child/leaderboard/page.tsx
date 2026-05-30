import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { LeaderboardClient } from '@/components/child/LeaderboardClient'

export const metadata = { title: 'Leaderboard' }

export default async function LeaderboardPage() {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [profileRes, rewardsRes, familyLinksRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('rewards').select('*').eq('user_id', user.id).single(),
    // Find siblings (children linked to same parent)
    supabase.from('family_links').select('parent_id').eq('child_id', user.id),
  ])

  let familyLeaderboard: Array<{ profile: { id: string; name: string; display_name: string | null; avatar_url: string | null }; rewards: { total_xp: number; level: number; streak_days: number } }> = []

  if (familyLinksRes.data && familyLinksRes.data.length > 0) {
    const parentIds = familyLinksRes.data.map(l => l.parent_id)
    // Get all siblings
    const { data: siblingLinks } = await supabase
      .from('family_links').select('child_id').in('parent_id', parentIds)
    const siblingIds = [...new Set(siblingLinks?.map(l => l.child_id) || [])]

    if (siblingIds.length > 0) {
      const [siblingsRes, siblingRewardsRes] = await Promise.all([
        supabase.from('profiles').select('id, name, display_name, avatar_url').in('id', siblingIds),
        supabase.from('rewards').select('user_id, total_xp, level, streak_days').in('user_id', siblingIds),
      ])
      familyLeaderboard = (siblingsRes.data || []).map(p => ({
        profile: p,
        rewards: siblingRewardsRes.data?.find(r => r.user_id === p.id) || { total_xp: 0, level: 1, streak_days: 0 },
      })).sort((a, b) => b.rewards.total_xp - a.rewards.total_xp)
    }
  }

  return (
    <LeaderboardClient
      profile={profileRes.data!}
      myRewards={rewardsRes.data!}
      familyLeaderboard={familyLeaderboard}
    />
  )
}
