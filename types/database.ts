// Auto-generated from Supabase schema
// Run: supabase gen types typescript --local > types/database.ts

export type UserRole = 'child' | 'parent' | 'admin'
export type TaskCategory = 'homework' | 'chores' | 'reading' | 'exercise' | 'creative' | 'social' | 'personal' | 'custom'
export type SubscriptionPlan = 'free' | 'pro' | 'family' | 'school'
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trialing'
export type MissionType = 'daily' | 'weekly' | 'special'
export type BadgeType =
  | 'first_task' | 'streak_3' | 'streak_7' | 'streak_30'
  | 'level_5' | 'level_10' | 'perfect_week' | 'early_bird'
  | 'homework_hero' | 'chore_champion' | 'reader' | 'artist'
  | 'ai_explorer' | 'social_star' | 'custom'
export type NotificationType = 'task_reminder' | 'streak_alert' | 'reward' | 'message' | 'system'
export type FileType = 'pdf' | 'image' | 'drawing'
export type PaymentProvider = 'razorpay' | 'paypal' | 'stripe'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'

export interface Profile {
  id: string
  email: string
  name: string
  display_name: string | null
  avatar_url: string | null
  role: UserRole
  date_of_birth: string | null
  language: string
  timezone: string
  theme: string
  sound_enabled: boolean
  onboarded: boolean
  created_at: string
  updated_at: string
}

export interface FamilyLink {
  id: string
  parent_id: string
  child_id: string
  nickname: string | null
  created_at: string
  child?: Profile
}

export interface Subscription {
  id: string
  user_id: string
  plan: SubscriptionPlan
  status: SubscriptionStatus
  provider: PaymentProvider | null
  provider_subscription_id: string | null
  current_period_start: string | null
  current_period_end: string | null
  max_children: number
  ai_enabled: boolean
  created_at: string
  updated_at: string
}

export interface Todo {
  id: string
  user_id: string
  assigned_by: string | null
  text: string
  description: string | null
  category: TaskCategory
  emoji: string
  completed: boolean
  completed_at: string | null
  points: number
  due_date: string | null
  priority: 1 | 2 | 3
  recurring: string | null
  parent_approved: boolean | null
  ai_suggested: boolean
  sort_order: number
  created_at: string
  updated_at: string
  assignee?: Profile
}

export interface Reward {
  id: string
  user_id: string
  total_xp: number
  level: number
  streak_days: number
  longest_streak: number
  last_active_date: string | null
  tasks_completed: number
  created_at: string
  updated_at: string
}

export interface Badge {
  id: string
  user_id: string
  badge_type: BadgeType
  name: string
  description: string | null
  icon: string
  earned_at: string
}

export interface XPTransaction {
  id: string
  user_id: string
  amount: number
  reason: string
  todo_id: string | null
  created_at: string
}

export interface Mission {
  id: string
  title: string
  description: string
  mission_type: MissionType
  target_count: number
  xp_reward: number
  category: TaskCategory | null
  active: boolean
  created_at: string
}

export interface UserMission {
  id: string
  user_id: string
  mission_id: string
  progress: number
  completed: boolean
  completed_at: string | null
  assigned_date: string
  expires_at: string
  mission?: Mission
}

export interface Drawing {
  id: string
  user_id: string
  title: string
  image_url: string
  thumbnail_url: string | null
  canvas_data: Record<string, unknown> | null
  width: number
  height: number
  created_at: string
  updated_at: string
}

export interface File {
  id: string
  user_id: string
  name: string
  original_url: string
  processed_url: string | null
  file_type: FileType
  original_size: number | null
  processed_size: number | null
  ocr_text: string | null
  processing_status: 'pending' | 'processing' | 'done' | 'error'
  created_at: string
}

export interface AIMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface AIConversation {
  id: string
  user_id: string
  title: string
  messages: AIMessage[]
  subject: string | null
  created_at: string
  updated_at: string
}

export interface ParentReward {
  id: string
  parent_id: string
  child_id: string
  title: string
  description: string | null
  xp_cost: number
  icon: string
  redeemed: boolean
  redeemed_at: string | null
  created_at: string
}

export interface PushSubscription {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
  user_agent: string | null
  created_at: string
}

export interface Payment {
  id: string
  user_id: string
  provider: PaymentProvider
  provider_payment_id: string
  provider_order_id: string | null
  amount: number
  currency: string
  plan: SubscriptionPlan
  status: PaymentStatus
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

// API response types
export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
}

// Auth types
export interface AuthUser {
  id: string
  email: string
  profile: Profile
  subscription: Subscription
}

// Dashboard types
export interface ChildStats {
  profile: Profile
  rewards: Reward
  badges: Badge[]
  todayTasks: number
  completedToday: number
  activeMissions: UserMission[]
}

export interface ParentDashboardData {
  children: ChildStats[]
  pendingApprovals: Todo[]
  familyXP: number
}
