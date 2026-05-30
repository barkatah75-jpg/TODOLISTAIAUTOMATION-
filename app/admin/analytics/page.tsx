import { redirect } from 'next/navigation'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase/server'
import { AdminAnalyticsClient } from './AdminAnalyticsClient'

export const metadata = { title: 'Platform Analytics — AIVANA Admin' }

export default async function AdminAnalyticsPage() {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/child/dashboard')

  const admin = getSupabaseAdmin()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [signupsRes, todosRes, paymentsRes, subsRes, moodRes] = await Promise.all([
    admin.from('profiles').select('created_at, role').gte('created_at', thirtyDaysAgo).order('created_at'),
    admin.from('todos').select('created_at').gte('created_at', thirtyDaysAgo).eq('completed', true),
    admin.from('payments').select('amount, currency, plan, created_at').gte('created_at', thirtyDaysAgo).eq('status', 'completed'),
    admin.from('subscriptions').select('plan, status'),
    admin.from('mood_entries').select('mood').gte('checked_in_at', thirtyDaysAgo),
  ])

  return (
    <AdminAnalyticsClient
      signups={signupsRes.data || []}
      completedTodos={todosRes.data || []}
      payments={paymentsRes.data || []}
      subscriptions={subsRes.data || []}
      moodEntries={moodRes.data || []}
    />
  )
}
