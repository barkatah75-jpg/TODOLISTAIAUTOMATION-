import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { TodosClient } from '@/components/child/TodosClient'

export const metadata = { title: 'My Tasks' }

export default async function TodosPage() {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [profileRes, todosRes, rewardsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('todos').select('*').eq('user_id', user.id).eq('completed', false)
      .order('sort_order').order('priority', { ascending: false }),
    supabase.from('rewards').select('total_xp, level').eq('user_id', user.id).single(),
  ])

  return (
    <TodosClient
      profile={profileRes.data!}
      initialTodos={todosRes.data || []}
      rewards={rewardsRes.data}
    />
  )
}
