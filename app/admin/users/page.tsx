import { redirect } from 'next/navigation'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase/server'
import { AdminUsersClient } from './AdminUsersClient'

export const metadata = { title: 'User Management — AIVANA Admin' }

export default async function AdminUsersPage() {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/child/dashboard')

  const admin = getSupabaseAdmin()

  // Fetch first page of users
  const { data: users, count } = await admin
    .from('profiles')
    .select(`
      id, email, name, display_name, role, onboarded, created_at,
      subscriptions (plan, status),
      rewards (total_xp, level, tasks_completed)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(0, 19)

  // Role distribution for quick stats
  const { data: roleCounts } = await admin
    .from('profiles')
    .select('role')

  const roleStats = (roleCounts || []).reduce((acc: Record<string, number>, r) => {
    acc[r.role] = (acc[r.role] || 0) + 1
    return acc
  }, {})

  return (
    <AdminUsersClient
      initialUsers={users || []}
      totalUsers={count || 0}
      roleStats={roleStats}
    />
  )
}
