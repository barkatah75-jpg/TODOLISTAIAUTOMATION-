import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { ChildrenManagementClient } from '@/components/parent/ChildrenManagementClient'

export const metadata = { title: 'My Children' }

export default async function ChildrenPage() {
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
  const [rewardsRes, subRes] = await Promise.all([
    childIds.length > 0 ? supabase.from('rewards').select('*').in('user_id', childIds) : Promise.resolve({ data: [] }),
    supabase.from('subscriptions').select('max_children, plan').eq('user_id', user.id).single(),
  ])

  return (
    <ChildrenManagementClient
      profile={profile!}
      familyLinks={familyLinks || []}
      rewards={rewardsRes.data || []}
      subscription={subRes.data}
    />
  )
}
