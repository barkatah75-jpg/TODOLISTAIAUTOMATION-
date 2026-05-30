// ── Advanced Feature Types (extends types/database.ts) ──────

export type MoodType = 'great' | 'good' | 'okay' | 'tired' | 'sad' | 'stressed'
export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'adaptive'
export type FocusSessionStatus = 'active' | 'completed' | 'abandoned'
export type StoryStatus = 'generating' | 'ready' | 'failed'
export type SchoolRole = 'teacher' | 'student' | 'admin'
export type AlertType = 'mood_low' | 'streak_break' | 'screen_time' | 'no_activity' | 'level_up'
export type StoryGenre = 'adventure' | 'mystery' | 'fantasy' | 'space' | 'underwater' | 'dinosaur'

export interface MoodEntry {
  id: string
  user_id: string
  mood: MoodType
  note: string | null
  energy_level: number | null
  tasks_before: number
  checked_in_at: string
  date: string
}

export interface ScreenTimeLimit {
  id: string
  parent_id: string
  child_id: string
  daily_limit_mins: number
  bedtime_start: string | null
  bedtime_end: string | null
  weekend_extra_mins: number
  focus_mode_enabled: boolean
  created_at: string
  updated_at: string
}

export interface ScreenTimeSession {
  id: string
  user_id: string
  started_at: string
  ended_at: string | null
  duration_mins: number | null
  date: string
}

export interface FocusSession {
  id: string
  user_id: string
  todo_id: string | null
  subject: string | null
  duration_mins: number
  break_mins: number
  status: FocusSessionStatus
  completed_cycles: number
  xp_bonus: number
  started_at: string
  completed_at: string | null
}

export interface LearningProfile {
  id: string
  user_id: string
  math_score: number
  science_score: number
  reading_score: number
  writing_score: number
  avg_completion_time_mins: number | null
  preferred_time_of_day: string | null
  best_category: string | null
  struggle_category: string | null
  current_difficulty: DifficultyLevel
  consecutive_easy_wins: number
  consecutive_failures: number
  last_analyzed_at: string | null
  updated_at: string
}

export interface TaskPerformance {
  id: string
  user_id: string
  todo_id: string | null
  category: string
  difficulty: DifficultyLevel
  completed: boolean
  time_taken_mins: number | null
  attempts: number
  created_at: string
}

export interface AIStory {
  id: string
  user_id: string
  title: string
  content: string
  hero_name: string
  achievement: string
  genre: StoryGenre
  word_count: number | null
  status: StoryStatus
  milestone_xp: number | null
  milestone_level: number | null
  cover_emoji: string
  created_at: string
}

export interface School {
  id: string
  name: string
  code: string
  city: string | null
  country: string
  subscription_plan: string
  max_students: number
  active: boolean
  created_at: string
}

export interface SchoolMember {
  id: string
  school_id: string
  user_id: string
  role: SchoolRole
  class_name: string | null
  joined_at: string
  profile?: {
    id: string
    name: string
    display_name: string | null
    avatar_url: string | null
    email: string
  }
  school?: School
}

export interface ClassroomAssignment {
  id: string
  school_id: string
  teacher_id: string
  title: string
  description: string | null
  subject: string
  class_name: string
  due_date: string | null
  points: number
  emoji: string
  active: boolean
  total_assigned: number
  total_completed: number
  created_at: string
}

export interface AssignmentCompletion {
  id: string
  assignment_id: string
  student_id: string
  todo_id: string | null
  completed: boolean
  completed_at: string | null
  grade: string | null
  teacher_note: string | null
  created_at: string
}

export interface ParentAlert {
  id: string
  parent_id: string
  child_id: string
  alert_type: AlertType
  message: string
  data: Record<string, unknown> | null
  read: boolean
  created_at: string
  child?: { name: string; display_name: string | null }
}

// Adaptive task suggestion from AI
export interface AdaptiveTaskSuggestion {
  text: string
  category: string
  emoji: string
  points: number
  difficulty: DifficultyLevel
  reason: string
}

// Study schedule slot
export interface StudySlot {
  timeSlot: string
  subject: string
  duration: number
  tip: string
}

// Screen time status
export interface ScreenTimeStatus {
  todayMinutes: number
  dailyLimit: number
  remainingMins: number
  usagePercent: number
  withinLimit: boolean
  isBedtime: boolean
  warning: boolean
  blocked: boolean
  limit: ScreenTimeLimit | null
}

// Admin platform stats
export interface PlatformStats {
  totalUsers: number
  children: number
  parents: number
  proUsers: number
  todosThisMonth: number
  aiChats: number
  stories: number
  schools: number
  totalRevenue: number
  planBreakdown: Record<string, number>
}
