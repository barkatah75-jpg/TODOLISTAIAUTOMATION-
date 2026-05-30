import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { ParentAlertsClient } from '@/components/parent/ParentAlertsClient'

export const metadata = { title: 'Alerts' }

export default async function ParentAlertsPage() {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'parent') redirect('/child/dashboard')

  const { data: alerts } = await supabase
    .from('parent_alerts')
    .select('*, child:profiles!parent_alerts_child_id_fkey(name, display_name)')
    .eq('parent_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  // Mark all as read
  await supabase.from('parent_alerts').update({ read: true })
    .eq('parent_id', user.id).eq('read', false)

  return <ParentAlertsClient profile={profile!} alerts={alerts || []} />
}
