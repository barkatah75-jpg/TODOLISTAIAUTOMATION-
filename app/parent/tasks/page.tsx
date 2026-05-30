import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { AssignTasksClient } from '@/components/parent/AssignTasksClient'

export const metadata = { title: 'Assign Tasks' }

export default async function TasksPage({ searchParams }: { searchParams: { child?: string } }) {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'parent') redirect('/child/dashboard')

  const { data: familyLinks } = await supabase
    .from('family_links')
    .select('*, child:profiles!family_links_child_id_fkey(id, name, display_name, avatar_url)')
    .eq('parent_id', user.id)

  const activeChildId = searchParams.child || familyLinks?.[0]?.child_id || null

  // Get tasks for active child
  const { data: childTasks } = activeChildId
    ? await supabase.from('todos').select('*').eq('user_id', activeChildId)
        .order('created_at', { ascending: false }).limit(30)
    : { data: [] }

  return (
    <AssignTasksClient
      profile={profile!}
      familyLinks={familyLinks || []}
      activeChildId={activeChildId}
      childTasks={childTasks || []}
    />
  )
}
