import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { AnalyticsClient } from '@/components/parent/AnalyticsClient'
import { subDays, startOfDay } from 'date-fns'

export const metadata = { title: 'Analytics' }

export default async function AnalyticsPage({ searchParams }: { searchParams: { child?: string } }) {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'parent') redirect('/child/dashboard')

  const { data: familyLinks } = await supabase
    .from('family_links')
    .select('*, child:profiles!family_links_child_id_fkey(*)')
    .eq('parent_id', user.id)

  const childIds = familyLinks?.map(l => l.child_id) || []
  const activeChildId = searchParams.child || childIds[0] || null

  const thirtyDaysAgo = subDays(new Date(), 30).toISOString()

  const [rewardsRes, todosRes, xpRes, badgesRes] = await Promise.all([
    childIds.length > 0 ? supabase.from('rewards').select('*').in('user_id', childIds) : Promise.resolve({ data: [] }),
    activeChildId
      ? supabase.from('todos').select('*').eq('user_id', activeChildId).gte('created_at', thirtyDaysAgo).order('created_at')
      : Promise.resolve({ data: [] }),
    activeChildId
      ? supabase.from('xp_transactions').select('*').eq('user_id', activeChildId).gte('created_at', thirtyDaysAgo).order('created_at')
      : Promise.resolve({ data: [] }),
    activeChildId
      ? supabase.from('badges').select('*').eq('user_id', activeChildId)
      : Promise.resolve({ data: [] }),
  ])

  return (
    <AnalyticsClient
      profile={profile!}
      familyLinks={familyLinks || []}
      rewards={rewardsRes.data || []}
      activeChildId={activeChildId}
      todos={todosRes.data || []}
      xpTransactions={xpRes.data || []}
      badges={badgesRes.data || []}
    />
  )
}
