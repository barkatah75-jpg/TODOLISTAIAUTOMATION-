import { getSupabaseServer } from '@/lib/supabase/server'

const FREE_LIMITS = {
  daily_todos: 10,
  total_ai_messages: 5,
  total_drawings: 20,
  total_files: 10,
}

const PRO_LIMITS = {
  daily_todos: Infinity,
  total_ai_messages: Infinity,
  total_drawings: Infinity,
  total_files: Infinity,
}

export async function checkSubscriptionLimit(
  userId: string,
  feature: keyof typeof FREE_LIMITS
): Promise<{ allowed: boolean; current: number; limit: number; plan: string }> {
  const supabase = getSupabaseServer()

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan, ai_enabled')
    .eq('user_id', userId)
    .single()

  const plan = sub?.plan || 'free'

  if (plan !== 'free') {
    return { allowed: true, current: 0, limit: Infinity, plan }
  }

  // Check current usage
  const limit = FREE_LIMITS[feature]

  if (feature === 'daily_todos') {
    const today = new Date().toISOString().split('T')[0]
    const { count } = await supabase
      .from('todos')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', `${today}T00:00:00Z`)

    const current = count || 0
    return { allowed: current < limit, current, limit, plan }
  }

  if (feature === 'total_drawings') {
    const { count } = await supabase
      .from('drawings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
    const current = count || 0
    return { allowed: current < limit, current, limit, plan }
  }

  if (feature === 'total_files') {
    const { count } = await supabase
      .from('files')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
    const current = count || 0
    return { allowed: current < limit, current, limit, plan }
  }

  return { allowed: true, current: 0, limit, plan }
}

export async function getUserPlan(userId: string) {
  const supabase = getSupabaseServer()
  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single()
  return data
}
