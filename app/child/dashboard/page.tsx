import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { ChildDashboardClient } from '@/components/child/ChildDashboardClient'

export const metadata = { title: 'My Dashboard' }

export default async function ChildDashboardPage() {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [profileRes, rewardsRes, todosRes, missionsRes, badgesRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('rewards').select('*').eq('user_id', user.id).single(),
    supabase.from('todos').select('*').eq('user_id', user.id)
      .gte('created_at', new Date(new Date().setHours(0,0,0,0)).toISOString())
      .order('sort_order'),
    supabase.from('user_missions')
      .select('*, mission:missions(*)')
      .eq('user_id', user.id)
      .eq('assigned_date', new Date().toISOString().split('T')[0])
      .eq('completed', false),
    supabase.from('badges').select('*').eq('user_id', user.id).order('earned_at', { ascending: false }).limit(6),
  ])

  return (
    <ChildDashboardClient
      profile={profileRes.data!}
      rewards={rewardsRes.data!}
      todayTodos={todosRes.data || []}
      activeMissions={missionsRes.data || []}
      recentBadges={badgesRes.data || []}
    />
  )
}
