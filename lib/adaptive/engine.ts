import Anthropic from '@anthropic-ai/sdk'
import { getSupabaseServer } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export interface LearningProfile {
  user_id: string
  math_score: number
  science_score: number
  reading_score: number
  writing_score: number
  current_difficulty: 'easy' | 'medium' | 'hard' | 'adaptive'
  best_category: string | null
  struggle_category: string | null
  preferred_time_of_day: string | null
  avg_completion_time_mins: number | null
}

export interface AdaptiveTaskSuggestion {
  text: string
  category: string
  emoji: string
  points: number
  difficulty: string
  reason: string
}

/**
 * Analyze child's performance history and update learning profile
 */
export async function analyzeAndUpdateProfile(userId: string): Promise<LearningProfile | null> {
  const supabase = getSupabaseServer()

  // Trigger DB function for analysis
  await supabase.rpc('analyze_learning_profile', { p_user_id: userId })

  // Fetch updated profile
  const { data } = await supabase
    .from('learning_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  return data
}

/**
 * Generate AI-powered personalized task suggestions based on learning profile
 */
export async function generateAdaptiveTasks(
  userId: string,
  childName: string,
  count = 3
): Promise<AdaptiveTaskSuggestion[]> {
  const supabase = getSupabaseServer()

  // Get learning profile + recent performance
  const [profileRes, recentTodosRes, rewardsRes] = await Promise.all([
    supabase.from('learning_profiles').select('*').eq('user_id', userId).single(),
    supabase.from('todos').select('category, completed, points, text')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
    supabase.from('rewards').select('level, streak_days, tasks_completed').eq('user_id', userId).single(),
  ])

  const profile = profileRes.data
  const recentTodos = recentTodosRes.data || []
  const rewards = rewardsRes.data

  const completionRate = recentTodos.length > 0
    ? Math.round((recentTodos.filter(t => t.completed).length / recentTodos.length) * 100)
    : 50

  const recentCategories = [...new Set(recentTodos.map(t => t.category))]
  const recentTaskTexts = recentTodos.slice(0, 5).map(t => t.text)

  const prompt = `You are an educational AI creating personalized tasks for a child named ${childName}.

CHILD PROFILE:
- Level: ${rewards?.level || 1} | Streak: ${rewards?.streak_days || 0} days
- Completion rate (last 20 tasks): ${completionRate}%
- Best subject: ${profile?.best_category || 'unknown'}
- Struggling with: ${profile?.struggle_category || 'none identified'}
- Current difficulty: ${profile?.current_difficulty || 'medium'}
- Recent task categories: ${recentCategories.join(', ') || 'various'}
- Recent tasks: ${recentTaskTexts.join('; ')}

ADAPTIVE RULES:
- If difficulty is 'easy': simpler tasks, shorter time, confidence-building
- If difficulty is 'hard': challenging tasks, higher XP, stretch goals
- If struggle_category exists: include 1 supportive task in that area
- If best_category exists: include 1 advanced task to maintain momentum
- Vary categories to prevent boredom
- Make tasks specific and achievable in one sitting (15-45 mins)
- XP should match difficulty: easy=10-15, medium=20-30, hard=40-60

Generate exactly ${count} adaptive tasks. Respond ONLY with valid JSON array:
[
  {
    "text": "task description (specific and actionable)",
    "category": "homework|chores|reading|exercise|creative|custom",
    "emoji": "single relevant emoji",
    "points": number,
    "difficulty": "easy|medium|hard",
    "reason": "1 sentence why this task was chosen for this child"
  }
]`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '[]'
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return Array.isArray(parsed) ? parsed.slice(0, count) : []
  } catch {
    return []
  }
}

export async function getAdaptiveSuggestions(
  userId: string,
  count = 3
): Promise<AdaptiveTaskSuggestion[]> {
  const supabase = getSupabaseServer()
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, display_name')
    .eq('id', userId)
    .single()

  return generateAdaptiveTasks(
    userId,
    profile?.display_name || profile?.name || 'there',
    count
  )
}

/**
 * Record task completion performance for adaptive analysis
 */
export async function recordTaskPerformance(
  userId: string,
  todoId: string,
  category: string,
  completed: boolean,
  timeTakenMins?: number
): Promise<void> {
  const supabase = getSupabaseServer()

  // Get current difficulty from profile
  const { data: profile } = await supabase
    .from('learning_profiles')
    .select('current_difficulty')
    .eq('user_id', userId)
    .single()

  await supabase.from('task_performance').insert({
    user_id: userId,
    todo_id: todoId,
    category,
    difficulty: profile?.current_difficulty || 'medium',
    completed,
    time_taken_mins: timeTakenMins || null,
  })

  // Re-analyze profile after every 5 task recordings
  const { count } = await supabase
    .from('task_performance')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (count && count % 5 === 0) {
    await supabase.rpc('analyze_learning_profile', { p_user_id: userId })
  }
}

/**
 * Get personalized study schedule based on performance patterns
 */
export async function getStudySchedule(
  userId: string,
  childName: string
): Promise<{ timeSlot: string; subject: string; duration: number; tip: string }[]> {
  const supabase = getSupabaseServer()

  const { data: profile } = await supabase
    .from('learning_profiles').select('*').eq('user_id', userId).single()

  const prompt = `Create a study schedule for ${childName} based on their performance:
- Best performing area: ${profile?.best_category || 'general'}
- Needs improvement: ${profile?.struggle_category || 'none'}
- Preferred time: ${profile?.preferred_time_of_day || 'afternoon'}
- Current difficulty level: ${profile?.current_difficulty || 'medium'}

Return a JSON array of 4 study slots for today:
[{"timeSlot": "4:00 PM", "subject": "Math", "duration": 25, "tip": "short motivating tip"}]`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = response.content[0].type === 'text' ? response.content[0].text : '[]'
    return JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim())
  } catch {
    return [
      { timeSlot: '4:00 PM', subject: 'Homework', duration: 25, tip: 'Start with the easiest task!' },
      { timeSlot: '4:30 PM', subject: 'Reading', duration: 20, tip: 'Read something you enjoy!' },
      { timeSlot: '5:00 PM', subject: 'Practice', duration: 25, tip: 'Revise yesterday\'s learning.' },
      { timeSlot: '6:00 PM', subject: 'Creative', duration: 20, tip: 'Express yourself freely!' },
    ]
  }
}
