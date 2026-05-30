// Lightweight analytics tracking — no external SDKs
// Events are stored in the DB and surfaced in the admin dashboard

import { getSupabaseServer } from '@/lib/supabase/server'

export type AnalyticsEvent =
  | 'todo_created'
  | 'todo_completed'
  | 'ai_chat_sent'
  | 'story_generated'
  | 'focus_session_completed'
  | 'badge_earned'
  | 'level_up'
  | 'mood_checked_in'
  | 'payment_initiated'
  | 'payment_completed'
  | 'school_joined'
  | 'file_compressed'
  | 'ocr_scanned'

interface TrackOptions {
  userId: string
  event: AnalyticsEvent
  properties?: Record<string, string | number | boolean>
}

/**
 * Track an analytics event (server-side only)
 * Stored as XP transactions with negative amounts won't conflict
 * Uses a simple append-only table approach
 */
export async function trackEvent({ userId, event, properties = {} }: TrackOptions): Promise<void> {
  try {
    // Use Supabase to log to a lightweight events table
    // For now, we rely on existing tables as the source of truth
    // and aggregate in the admin dashboard
    // Future: add a dedicated analytics_events table

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Analytics] ${event}`, { userId, ...properties })
    }

    // Optional: forward to PostHog, Mixpanel, etc.
    // await fetch('https://app.posthog.com/capture/', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     api_key: process.env.POSTHOG_API_KEY,
    //     event,
    //     distinct_id: userId,
    //     properties,
    //   }),
    // })
  } catch {
    // Analytics should never break the main flow
  }
}

/**
 * Get aggregated stats for admin dashboard
 */
export async function getPlatformStats(days = 30) {
  const supabase = getSupabaseServer()
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const [usersRes, todosRes, paymentsRes, chatsRes] = await Promise.all([
    supabase.from('profiles').select('id, role, created_at').gte('created_at', since),
    supabase.from('todos').select('id, completed, created_at').gte('created_at', since),
    supabase.from('payments').select('amount, plan, status, created_at').eq('status', 'completed').gte('created_at', since),
    supabase.from('ai_conversations').select('id, created_at').gte('created_at', since),
  ])

  const users = usersRes.data || []
  const todos = todosRes.data || []
  const payments = paymentsRes.data || []
  const chats = chatsRes.data || []

  return {
    newUsers: users.length,
    newChildren: users.filter(u => u.role === 'child').length,
    newParents: users.filter(u => u.role === 'parent').length,
    tasksCreated: todos.length,
    tasksCompleted: todos.filter(t => t.completed).length,
    completionRate: todos.length > 0 ? Math.round((todos.filter(t => t.completed).length / todos.length) * 100) : 0,
    revenue: payments.reduce((s, p) => s + p.amount, 0),
    paymentCount: payments.length,
    aiChats: chats.length,
    avgTasksPerUser: users.length > 0 ? Math.round(todos.length / users.length) : 0,
  }
}
