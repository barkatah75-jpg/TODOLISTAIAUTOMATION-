import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { AdminDashboardClient } from '@/components/admin/AdminDashboardClient'

export const metadata = { title: 'Admin Dashboard' }

export default async function AdminDashboardPage() {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/')

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    totalUsersRes, childrenRes, parentsRes, proUsersRes,
    todosThisMonthRes, aiChatsRes, storiesRes, schoolsRes,
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'child'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'parent'),
    supabase.from('subscriptions').select('id', { count: 'exact', head: true }).neq('plan', 'free'),
    supabase.from('todos').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
    supabase.from('ai_conversations').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
    supabase.from('ai_stories').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
    supabase.from('schools').select('id', { count: 'exact', head: true }),
  ])

  // Recent signups
  const { data: recentUsers } = await supabase
    .from('profiles').select('id, name, email, role, created_at')
    .order('created_at', { ascending: false }).limit(10)

  // Revenue (last 30 days)
  const { data: payments } = await supabase
    .from('payments').select('amount, currency, plan, created_at, status')
    .eq('status', 'completed').gte('created_at', thirtyDaysAgo)

  const totalRevenue = (payments || []).reduce((s, p) => s + p.amount, 0)
  const planBreakdown = (payments || []).reduce((acc, p) => {
    acc[p.plan] = (acc[p.plan] || 0) + p.amount
    return acc
  }, {} as Record<string, number>)

  return (
    <AdminDashboardClient
      stats={{
        totalUsers: totalUsersRes.count || 0,
        children: childrenRes.count || 0,
        parents: parentsRes.count || 0,
        proUsers: proUsersRes.count || 0,
        todosThisMonth: todosThisMonthRes.count || 0,
        aiChats: aiChatsRes.count || 0,
        stories: storiesRes.count || 0,
        schools: schoolsRes.count || 0,
        totalRevenue,
        planBreakdown,
      }}
      recentUsers={recentUsers || []}
      payments={payments || []}
    />
  )
}
