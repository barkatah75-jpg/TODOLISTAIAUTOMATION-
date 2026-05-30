import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { ParentRewardsClient } from '@/components/parent/ParentRewardsClient'

export const metadata = { title: 'Manage Rewards' }

export default async function ParentRewardsPage() {
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
  const { data: rewards } = childIds.length > 0
    ? await supabase.from('parent_rewards').select('*').in('child_id', childIds).order('created_at', { ascending: false })
    : { data: [] }

  return (
    <ParentRewardsClient
      profile={profile!}
      familyLinks={familyLinks || []}
      rewards={rewards || []}
    />
  )
}
