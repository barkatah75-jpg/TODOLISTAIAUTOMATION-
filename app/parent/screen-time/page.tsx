import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { ScreenTimeManagerClient } from '@/components/parent/ScreenTimeManagerClient'

export const metadata = { title: 'Screen Time' }

export default async function ScreenTimePage() {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'parent') redirect('/child/dashboard')

  const { data: familyLinks } = await supabase
    .from('family_links')
    .select('*, child:profiles!family_links_child_id_fkey(id, name, display_name)')
    .eq('parent_id', user.id)

  const childIds = familyLinks?.map(l => l.child_id) || []

  const [limitsRes, sessionsRes] = await Promise.all([
    childIds.length > 0
      ? supabase.from('screen_time_limits').select('*').in('child_id', childIds)
      : Promise.resolve({ data: [] }),
    childIds.length > 0
      ? supabase.from('screen_time_sessions').select('user_id, duration_mins, date')
          .in('user_id', childIds)
          .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      : Promise.resolve({ data: [] }),
  ])

  return (
    <ScreenTimeManagerClient
      profile={profile!}
      familyLinks={familyLinks || []}
      limits={limitsRes.data || []}
      sessions={sessionsRes.data || []}
    />
  )
}
