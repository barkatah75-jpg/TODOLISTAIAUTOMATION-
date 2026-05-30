import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { RewardsClient } from '@/components/child/RewardsClient'

export const metadata = { title: 'My Rewards' }

export default async function RewardsPage() {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [profileRes, rewardsRes, badgesRes, xpHistoryRes, parentRewardsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('rewards').select('*').eq('user_id', user.id).single(),
    supabase.from('badges').select('*').eq('user_id', user.id).order('earned_at', { ascending: false }),
    supabase.from('xp_transactions').select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(20),
    supabase.from('parent_rewards').select('*').eq('child_id', user.id).eq('redeemed', false),
  ])

  return (
    <RewardsClient
      profile={profileRes.data!}
      rewards={rewardsRes.data!}
      badges={badgesRes.data || []}
      xpHistory={xpHistoryRes.data || []}
      parentRewards={parentRewardsRes.data || []}
    />
  )
}
