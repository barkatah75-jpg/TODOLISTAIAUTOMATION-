import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { ARBadgesClient } from './ARBadgesClient'

export const metadata = { title: 'My Badges — AIVANA' }

export default async function ARBadgesPage() {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [profileRes, badgesRes, rewardsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('badges').select('*').eq('user_id', user.id).order('earned_at', { ascending: false }),
    supabase.from('rewards').select('total_xp, level, tasks_completed, streak_days').eq('user_id', user.id).single(),
  ])

  if (profileRes.data?.role !== 'child') redirect('/parent/dashboard')

  return (
    <ARBadgesClient
      profile={profileRes.data!}
      badges={badgesRes.data || []}
      rewards={rewardsRes.data}
    />
  )
}
