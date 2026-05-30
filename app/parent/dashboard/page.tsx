import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { ParentDashboardClient } from '@/components/parent/ParentDashboardClient'

export const metadata = { title: 'Parent Dashboard' }

export default async function ParentDashboardPage() {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Get parent profile
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'parent') redirect('/child/dashboard')

  // Get linked children with their stats
  const { data: familyLinks } = await supabase
    .from('family_links')
    .select('*, child:profiles!family_links_child_id_fkey(*)')
    .eq('parent_id', user.id)

  const childIds = familyLinks?.map(l => l.child_id) || []

  // Fetch stats for all children in parallel
  const [rewardsRes, todosRes, badgesRes, missionsRes, pendingTasksRes] = await Promise.all([
    childIds.length > 0
      ? supabase.from('rewards').select('*').in('user_id', childIds)
      : Promise.resolve({ data: [] }),
    childIds.length > 0
      ? supabase.from('todos').select('*').in('user_id', childIds)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    childIds.length > 0
      ? supabase.from('badges').select('*').in('user_id', childIds).order('earned_at', { ascending: false }).limit(10)
      : Promise.resolve({ data: [] }),
    childIds.length > 0
      ? supabase.from('user_missions').select('*, mission:missions(*)').in('user_id', childIds)
          .eq('assigned_date', new Date().toISOString().split('T')[0])
      : Promise.resolve({ data: [] }),
    // Tasks awaiting parent approval
    childIds.length > 0
      ? supabase.from('todos').select('*, assignee:profiles!todos_user_id_fkey(name, avatar_url)')
          .in('user_id', childIds).eq('completed', true).is('parent_approved', null)
          .order('completed_at', { ascending: false }).limit(20)
      : Promise.resolve({ data: [] }),
  ])

  return (
    <ParentDashboardClient
      profile={profile!}
      familyLinks={familyLinks || []}
      rewards={rewardsRes.data || []}
      recentTodos={todosRes.data || []}
      badges={badgesRes.data || []}
      missions={missionsRes.data || []}
      pendingApprovals={pendingTasksRes.data || []}
    />
  )
}
