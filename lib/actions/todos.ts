'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getSupabaseServer } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/utils/rateLimit'
import { checkSubscriptionLimit } from '@/lib/utils/subscription'
import type { ApiResponse, Todo } from '@/types/database'

const todoSchema = z.object({
  text: z.string().min(1).max(500).trim(),
  description: z.string().max(2000).optional(),
  category: z.enum(['homework','chores','reading','exercise','creative','social','personal','custom']).default('custom'),
  emoji: z.string().default('✅'),
  points: z.number().int().min(1).max(1000).default(10),
  due_date: z.string().datetime().optional().nullable(),
  priority: z.number().int().min(1).max(3).default(1),
  recurring: z.string().optional().nullable(),
})

export async function createTodo(input: unknown): Promise<ApiResponse<Todo>> {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  // Rate limit: 30 todos per minute
  const rl = await checkRateLimit(`todo:create:${user.id}`, 30, '1 m')
  if (!rl.success) return { data: null, error: 'Too many requests. Please slow down.' }

  // Parse & validate
  const parsed = todoSchema.safeParse(input)
  if (!parsed.success) return { data: null, error: parsed.error.errors[0].message }

  // Check subscription limits (free = 10 tasks/day)
  const limitCheck = await checkSubscriptionLimit(user.id, 'daily_todos')
  if (!limitCheck.allowed) return { data: null, error: `Daily limit reached. Upgrade to Pro for unlimited tasks! 🚀` }

  const { data, error } = await supabase
    .from('todos')
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single()

  if (error) return { data: null, error: error.message }

  revalidatePath('/child/todos')
  revalidatePath('/child/dashboard')
  return { data, error: null }
}

export async function completeTodo(todoId: string): Promise<ApiResponse<{ xp_gained: number; new_level: number; leveled_up: boolean; streak: number }>> {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  // Verify ownership
  const { data: todo, error: todoErr } = await supabase
    .from('todos')
    .select('id, completed, points, text, user_id, parent_approved')
    .eq('id', todoId)
    .eq('user_id', user.id)
    .single()

  if (todoErr || !todo) return { data: null, error: 'Task not found' }
  if (todo.completed) return { data: null, error: 'Task already completed' }

  // If parent approval required and not approved
  if (todo.parent_approved === false) return { data: null, error: 'Waiting for parent approval' }

  // Mark complete
  const { error: updateErr } = await supabase
    .from('todos')
    .update({ completed: true, completed_at: new Date().toISOString() })
    .eq('id', todoId)

  if (updateErr) return { data: null, error: updateErr.message }

  // Award XP via database function
  const { data: xpResult } = await supabase.rpc('award_xp', {
    p_user_id: user.id,
    p_amount: todo.points,
    p_reason: `Completed task: ${todo.text.slice(0, 50)}`,
    p_todo_id: todoId,
  })

  // Update streak
  const { data: streak } = await supabase.rpc('update_streak', { p_user_id: user.id })

  // Check & award badges
  await checkAndAwardBadges(user.id, supabase)

  // Update mission progress
  await updateMissionProgress(user.id, supabase)

  revalidatePath('/child/todos')
  revalidatePath('/child/dashboard')
  revalidatePath('/parent/dashboard')

  return {
    data: {
      xp_gained: todo.points,
      new_level: xpResult?.new_level || 1,
      leveled_up: xpResult?.leveled_up || false,
      streak: streak || 1,
    },
    error: null,
  }
}

export async function updateTodo(todoId: string, input: unknown): Promise<ApiResponse<Todo>> {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const updateSchema = todoSchema.partial()
  const parsed = updateSchema.safeParse(input)
  if (!parsed.success) return { data: null, error: parsed.error.errors[0].message }

  const { data, error } = await supabase
    .from('todos')
    .update(parsed.data)
    .eq('id', todoId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  revalidatePath('/child/todos')
  return { data, error: null }
}

export async function deleteTodo(todoId: string): Promise<ApiResponse<null>> {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const { error } = await supabase
    .from('todos')
    .delete()
    .eq('id', todoId)
    .eq('user_id', user.id)

  if (error) return { data: null, error: error.message }
  revalidatePath('/child/todos')
  revalidatePath('/child/dashboard')
  return { data: null, error: null }
}

export async function reorderTodos(todoIds: string[]): Promise<ApiResponse<null>> {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const updates = todoIds.map((id, index) => ({ id, sort_order: index }))
  const { error } = await supabase.from('todos').upsert(updates)
  if (error) return { data: null, error: error.message }
  revalidatePath('/child/todos')
  return { data: null, error: null }
}

export async function getTodosWithFilters(filters: {
  completed?: boolean
  category?: string
  dateFrom?: string
  dateTo?: string
  limit?: number
  offset?: number
}): Promise<ApiResponse<{ todos: Todo[]; count: number }>> {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  let query = supabase.from('todos').select('*', { count: 'exact' }).eq('user_id', user.id)

  if (filters.completed !== undefined) query = query.eq('completed', filters.completed)
  if (filters.category) query = query.eq('category', filters.category)
  if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom)
  if (filters.dateTo) query = query.lte('created_at', filters.dateTo)

  query = query.order('sort_order').order('created_at', { ascending: false })
    .range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 20) - 1)

  const { data, error, count } = await query
  if (error) return { data: null, error: error.message }
  return { data: { todos: data || [], count: count || 0 }, error: null }
}

// ── Internal helpers ────────────────────────────────────────

async function checkAndAwardBadges(userId: string, supabase: ReturnType<typeof getSupabaseServer>) {
  const { data: rewards } = await supabase.from('rewards').select('*').eq('user_id', userId).single()
  if (!rewards) return

  const badgesToCheck = [
    { condition: rewards.tasks_completed >= 1, type: 'first_task', name: 'First Steps!', icon: '🌱', desc: 'Complete your first task' },
    { condition: rewards.streak_days >= 3, type: 'streak_3', name: '3-Day Streak!', icon: '🔥', desc: 'Complete tasks 3 days in a row' },
    { condition: rewards.streak_days >= 7, type: 'streak_7', name: 'Week Warrior!', icon: '⚡', desc: 'Complete tasks 7 days in a row' },
    { condition: rewards.streak_days >= 30, type: 'streak_30', name: 'Monthly Legend!', icon: '👑', desc: 'Complete tasks 30 days in a row' },
    { condition: rewards.level >= 5, type: 'level_5', name: 'Rising Star!', icon: '⭐', desc: 'Reach Level 5' },
    { condition: rewards.level >= 10, type: 'level_10', name: 'Champion!', icon: '🏆', desc: 'Reach Level 10' },
  ] as const

  for (const badge of badgesToCheck) {
    if (badge.condition) {
      await supabase.from('badges').upsert({
        user_id: userId,
        badge_type: badge.type,
        name: badge.name,
        icon: badge.icon,
        description: badge.desc,
      }, { onConflict: 'user_id,badge_type', ignoreDuplicates: true })
    }
  }
}

async function updateMissionProgress(userId: string, supabase: ReturnType<typeof getSupabaseServer>) {
  const today = new Date().toISOString().split('T')[0]
  const { data: missions } = await supabase
    .from('user_missions')
    .select('*, mission:missions(*)')
    .eq('user_id', userId)
    .eq('assigned_date', today)
    .eq('completed', false)

  if (!missions?.length) return

  for (const um of missions) {
    const newProgress = um.progress + 1
    const isComplete = newProgress >= um.mission.target_count

    await supabase.from('user_missions').update({
      progress: newProgress,
      completed: isComplete,
      completed_at: isComplete ? new Date().toISOString() : null,
    }).eq('id', um.id)

    if (isComplete) {
      await supabase.rpc('award_xp', {
        p_user_id: userId,
        p_amount: um.mission.xp_reward,
        p_reason: `Mission complete: ${um.mission.title}`,
      })
    }
  }
}
