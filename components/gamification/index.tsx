'use client'

import { motion } from 'framer-motion'
import { Badge, UserMission } from '@/types/database'

// ── XP Progress Bar ─────────────────────────────────────────

export function XPBar({ progress, level }: { progress: number; level: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-medium">Level {level}</span>
        <span className="text-muted-foreground font-medium">Level {level + 1}</span>
      </div>
      <div className="level-bar">
        <motion.div
          className="level-bar-fill"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <p className="text-xs text-muted-foreground text-right">{Math.round(progress)}% to next level</p>
    </div>
  )
}

// ── Streak Counter ──────────────────────────────────────────

export function StreakCounter({ days }: { days: number }) {
  const getMessage = () => {
    if (days >= 30) return "Legendary! 👑"
    if (days >= 14) return "Incredible! 🌟"
    if (days >= 7) return "Keep it up! ⚡"
    if (days >= 3) return "On fire! 🔥"
    return "Great start! ✨"
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-3 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border border-orange-200 dark:border-orange-800 rounded-2xl px-4 py-3"
    >
      <motion.span
        className="text-2xl streak-fire"
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
      >
        🔥
      </motion.span>
      <div className="flex-1">
        <p className="font-bold text-orange-700 dark:text-orange-300 text-sm">{days}-Day Streak!</p>
        <p className="text-orange-500 dark:text-orange-400 text-xs">{getMessage()}</p>
      </div>
      <div className="text-right">
        <p className="text-2xl font-black text-orange-600 dark:text-orange-300">{days}</p>
        <p className="text-xs text-orange-400">days</p>
      </div>
    </motion.div>
  )
}

// ── Mission Card ────────────────────────────────────────────

export function MissionCard({ userMission }: { userMission: UserMission }) {
  const mission = userMission.mission
  if (!mission) return null

  const progress = userMission.progress
  const target = mission.target_count
  const pct = Math.min((progress / target) * 100, 100)

  const missionEmoji = {
    daily: '⚡',
    weekly: '🌟',
    special: '🎯',
  }[mission.mission_type]

  return (
    <div className="bg-card border rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{missionEmoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-sm truncate">{mission.title}</p>
            <span className="xp-badge flex-shrink-0">+{mission.xp_reward} XP</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 mb-2">{mission.description}</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className="text-xs text-muted-foreground flex-shrink-0">{progress}/{target}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Badge Showcase ──────────────────────────────────────────

const BADGE_COLORS: Record<string, string> = {
  first_task: 'from-green-400 to-emerald-500',
  streak_3: 'from-orange-400 to-red-500',
  streak_7: 'from-red-500 to-rose-600',
  streak_30: 'from-yellow-400 to-amber-500',
  level_5: 'from-blue-400 to-indigo-500',
  level_10: 'from-violet-500 to-purple-600',
  perfect_week: 'from-pink-400 to-rose-500',
  homework_hero: 'from-blue-500 to-cyan-500',
  artist: 'from-pink-500 to-fuchsia-500',
  custom: 'from-gray-400 to-slate-500',
}

export function BadgeShowcase({ badges }: { badges: Badge[] }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {badges.map((badge, i) => (
        <motion.div
          key={badge.id}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.08, type: 'spring', stiffness: 200 }}
          className="float"
          style={{ animationDelay: `${i * 0.3}s` }}
        >
          <div className={`bg-gradient-to-br ${BADGE_COLORS[badge.badge_type] || BADGE_COLORS.custom} rounded-2xl p-4 text-center shadow-md`}>
            <div className="text-3xl mb-1">{badge.icon}</div>
            <p className="text-white text-xs font-bold leading-tight">{badge.name}</p>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// ── Level Badge ─────────────────────────────────────────────

export function LevelBadge({ level }: { level: number }) {
  const getColor = () => {
    if (level >= 20) return 'from-yellow-400 to-amber-500'
    if (level >= 10) return 'from-violet-500 to-purple-600'
    if (level >= 5) return 'from-blue-400 to-indigo-500'
    return 'from-green-400 to-emerald-500'
  }

  return (
    <div className={`inline-flex items-center gap-1.5 bg-gradient-to-r ${getColor()} text-white rounded-full px-3 py-1 text-xs font-bold shadow-sm`}>
      ⭐ Level {level}
    </div>
  )
}
