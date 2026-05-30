'use server'

import { getSupabaseServer } from '@/lib/supabase/server'
import { generateTaskSuggestions as _generateTaskSuggestions } from '@/lib/ai/homeworkHelper'
import { checkRateLimit } from '@/lib/utils/rateLimit'

export async function generateTaskSuggestions(
  userId: string,
  recentTasks: string[],
  completionRate: number,
  categories: string[]
): Promise<string[]> {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== userId) return []

  const rl = await checkRateLimit(`ai:suggest:${userId}`, 5, '1 h')
  if (!rl.success) return []

  return _generateTaskSuggestions(userId, recentTasks, completionRate, categories)
}
