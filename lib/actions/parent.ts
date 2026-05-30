'use server'

import { revalidatePath } from 'next/cache'
import { getSupabaseServer } from '@/lib/supabase/server'
import { z } from 'zod'
import type { ApiResponse, Todo } from '@/types/database'

export async function approveTask(todoId: string): Promise<ApiResponse<null>> {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  // Verify parent relationship
  const { data: todo } = await supabase
    .from('todos').select('user_id, points, completed').eq('id', todoId).single()
  if (!todo) return { data: null, error: 'Task not found' }

  const { data: link } = await supabase
    .from('family_links').select('id').eq('parent_id', user.id).eq('child_id', todo.user_id).single()
  if (!link) return { data: null, error: 'Not authorized for this child' }

  const { error } = await supabase.from('todos').update({ parent_approved: true }).eq('id', todoId)
  if (error) return { data: null, error: error.message }

  // Award XP since task was completed and now approved
  if (todo.completed) {
    await supabase.rpc('award_xp', {
      p_user_id: todo.user_id,
      p_amount: todo.points,
      p_reason: 'Parent approved task',
      p_todo_id: todoId,
    })
    await supabase.rpc('update_streak', { p_user_id: todo.user_id })
  }

  revalidatePath('/parent/dashboard')
  return { data: null, error: null }
}

export async function rejectTask(todoId: string): Promise<ApiResponse<null>> {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const { data: todo } = await supabase.from('todos').select('user_id').eq('id', todoId).single()
  if (!todo) return { data: null, error: 'Task not found' }

  const { data: link } = await supabase
    .from('family_links').select('id').eq('parent_id', user.id).eq('child_id', todo.user_id).single()
  if (!link) return { data: null, error: 'Not authorized' }

  // Reset task to incomplete and rejected
  const { error } = await supabase.from('todos').update({
    parent_approved: false,
    completed: false,
    completed_at: null,
  }).eq('id', todoId)

  if (error) return { data: null, error: error.message }
  revalidatePath('/parent/dashboard')
  return { data: null, error: null }
}

const assignTaskSchema = z.object({
  childId: z.string().uuid(),
  text: z.string().min(1).max(500),
  category: z.enum(['homework','chores','reading','exercise','creative','social','personal','custom']).default('homework'),
  emoji: z.string().default('📚'),
  points: z.number().int().min(1).max(500).default(20),
  due_date: z.string().datetime().optional().nullable(),
  requireApproval: z.boolean().default(true),
})

export async function assignTaskToChild(input: unknown): Promise<ApiResponse<Todo>> {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const parsed = assignTaskSchema.safeParse(input)
  if (!parsed.success) return { data: null, error: parsed.error.errors[0].message }

  const { childId, requireApproval, ...taskData } = parsed.data

  // Verify parent-child relationship
  const { data: link } = await supabase
    .from('family_links').select('id').eq('parent_id', user.id).eq('child_id', childId).single()
  if (!link) return { data: null, error: 'Not authorized for this child' }

  const { data, error } = await supabase.from('todos').insert({
    user_id: childId,
    assigned_by: user.id,
    parent_approved: requireApproval ? null : true,
    ...taskData,
  }).select().single()

  if (error) return { data: null, error: error.message }
  revalidatePath('/parent/dashboard')
  return { data, error: null }
}

export async function createParentReward(input: unknown): Promise<ApiResponse<null>> {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const schema = z.object({
    childId: z.string().uuid(),
    title: z.string().min(1).max(200),
    description: z.string().max(500).optional(),
    xp_cost: z.number().int().min(10).max(10000),
    icon: z.string().default('🎁'),
  })

  const parsed = schema.safeParse(input)
  if (!parsed.success) return { data: null, error: parsed.error.errors[0].message }

  const { childId, ...rewardData } = parsed.data

  const { data: link } = await supabase
    .from('family_links').select('id').eq('parent_id', user.id).eq('child_id', childId).single()
  if (!link) return { data: null, error: 'Not authorized' }

  const { error } = await supabase.from('parent_rewards').insert({
    parent_id: user.id,
    child_id: childId,
    ...rewardData,
  })

  if (error) return { data: null, error: error.message }
  revalidatePath('/parent/rewards')
  return { data: null, error: null }
}

export async function inviteChild(email: string, childName: string): Promise<ApiResponse<null>> {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  // Check if child account exists
  const { data: childProfile } = await supabase
    .from('profiles').select('id, role').eq('email', email).single()

  if (!childProfile) return { data: null, error: 'No account found with this email. Ask your child to register first.' }
  if (childProfile.role !== 'child') return { data: null, error: 'This account is not a child account' }

  // Check max children
  const { data: sub } = await supabase.from('subscriptions').select('max_children').eq('user_id', user.id).single()
  const { count } = await supabase.from('family_links').select('id', { count: 'exact', head: true }).eq('parent_id', user.id)

  if (sub && count !== null && count >= sub.max_children) {
    return { data: null, error: `Your plan supports max ${sub.max_children} child${sub.max_children > 1 ? 'ren' : ''}. Upgrade to add more.` }
  }

  const { error } = await supabase.from('family_links').insert({
    parent_id: user.id,
    child_id: childProfile.id,
    nickname: childName,
  })

  if (error?.code === '23505') return { data: null, error: 'This child is already linked to your account' }
  if (error) return { data: null, error: error.message }

  revalidatePath('/parent/dashboard')
  return { data: null, error: null }
}
