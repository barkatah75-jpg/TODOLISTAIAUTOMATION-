'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Profile, Reward, Badge } from '@/types/database'

const ALL_BADGE_TYPES = [
  { type: 'first_task',     name: 'First Steps!',      icon: '🌱', desc: 'Complete your first task',              rarity: 'common'    },
  { type: 'streak_3',       name: '3-Day Streak!',     icon: '🔥', desc: 'Complete tasks 3 days in a row',        rarity: 'common'    },
  { type: 'streak_7',       name: 'Week Warrior!',     icon: '⚡', desc: 'Complete tasks 7 days in a row',        rarity: 'rare'      },
  { type: 'streak_30',      name: 'Monthly Legend!',   icon: '👑', desc: 'Complete tasks 30 days in a row',       rarity: 'legendary' },
  { type: 'level_5',        name: 'Rising Star!',      icon: '⭐', desc: 'Reach Level 5',                         rarity: 'rare'      },
  { type: 'level_10',       name: 'Champion!',         icon: '🏆', desc: 'Reach Level 10',                        rarity: 'epic'      },
  { type: 'homework_hero',  name: 'Homework Hero!',    icon: '📚', desc: 'Complete 10 homework tasks',             rarity: 'rare'      },
  { type: 'chore_champion', name: 'Chore Champion!',   icon: '✨', desc: 'Complete 20 chores',                    rarity: 'rare'      },
  { type: 'reader',         name: 'Bookworm!',         icon: '📖', desc: 'Complete 15 reading tasks',             rarity: 'common'    },
  { type: 'artist',         name: 'Creative Artist!',  icon: '🎨', desc: 'Create 5 drawings',                     rarity: 'common'    },
  { type: 'ai_explorer',    name: 'AI Explorer!',      icon: '🤖', desc: 'Chat with AI 10 times',                 rarity: 'rare'      },
  { type: 'social_star',    name: 'Social Star!',      icon: '🌟', desc: 'Complete 10 social tasks',              rarity: 'common'    },
  { type: 'perfect_week',   name: 'Perfect Week!',     icon: '💯', desc: 'Complete all tasks for a full week',    rarity: 'epic'      },
  { type: 'early_bird',     name: 'Early Bird!',       icon: '🌅', desc: 'Complete a task before 9 AM',           rarity: 'rare'      },
]

const rarityConfig = {
  common:    { bg: 'bg-gray-100 dark:bg-gray-800',         border: 'border-gray-300 dark:border-gray-600',         glow: '',                     label: 'Common',    color: 'text-gray-500' },
  rare:      { bg: 'bg-blue-50 dark:bg-blue-900/30',       border: 'border-blue-300 dark:border-blue-600',         glow: 'shadow-blue-200',      label: 'Rare',      color: 'text-blue-600' },
  epic:      { bg: 'bg-purple-50 dark:bg-purple-900/30',   border: 'border-purple-400 dark:border-purple-500',     glow: 'shadow-purple-200',    label: 'Epic',      color: 'text-purple-600' },
  legendary: { bg: 'bg-yellow-50 dark:bg-yellow-900/30',   border: 'border-yellow-400 dark:border-yellow-500',     glow: 'shadow-yellow-200',    label: 'Legendary', color: 'text-yellow-600' },
}

interface Props {
  profile: Profile
  badges: Badge[]
  rewards: { total_xp: number; level: number; tasks_completed: number; streak_days: number } | null
}

export function ARBadgesClient({ profile, badges, rewards }: Props) {
  const [selected, setSelected] = useState<(typeof ALL_BADGE_TYPES)[0] | null>(null)
  const [filter, setFilter] = useState<'all' | 'earned' | 'locked'>('all')

  const earnedTypes = new Set(badges.map((b) => b.badge_type))
  const earnedCount = earnedTypes.size
  const completion = Math.round((earnedCount / ALL_BADGE_TYPES.length) * 100)

  const filtered = ALL_BADGE_TYPES.filter((b) => {
    if (filter === 'earned') return earnedTypes.has(b.type as never)
    if (filter === 'locked') return !earnedTypes.has(b.type as never)
    return true
  })

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 px-6 pt-12 pb-20 text-white relative overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-2xl opacity-20"
            style={{ left: `${10 + i * 12}%`, top: `${15 + (i % 3) * 25}%` }}
            animate={{ y: [-8, 8], rotate: [-5, 5] }}
            transition={{ duration: 2 + i * 0.3, repeat: Infinity, repeatType: 'reverse' }}
          >
            {['⭐','🏆','🔥','👑','💎','⚡','🌟','🎖️'][i]}
          </motion.div>
        ))}
        <div className="relative z-10">
          <h1 className="text-2xl font-black mb-1">🎖️ My Badge Collection</h1>
          <p className="text-white/80 text-sm">
            {earnedCount} of {ALL_BADGE_TYPES.length} badges earned — {completion}% complete!
          </p>

          {/* Progress bar */}
          <div className="mt-4 bg-white/20 rounded-full h-2.5 overflow-hidden">
            <motion.div
              className="h-full bg-white rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${completion}%` }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            {[
              { label: 'Level', value: rewards?.level ?? 1, icon: '⭐' },
              { label: 'Streak', value: `${rewards?.streak_days ?? 0}d`, icon: '🔥' },
              { label: 'Tasks', value: rewards?.tasks_completed ?? 0, icon: '✅' },
            ].map((s) => (
              <div key={s.label} className="bg-white/15 rounded-xl p-3 text-center backdrop-blur">
                <div className="text-xl">{s.icon}</div>
                <div className="text-lg font-black">{s.value}</div>
                <div className="text-xs text-white/70">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-10 relative z-10">
        {/* Filter tabs */}
        <div className="bg-card border rounded-2xl shadow-lg p-1 flex gap-1 mb-5">
          {(['all', 'earned', 'locked'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${
                filter === f ? 'bg-purple-500 text-white shadow' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {f === 'all' ? `All (${ALL_BADGE_TYPES.length})`
                : f === 'earned' ? `✅ Earned (${earnedCount})`
                : `🔒 Locked (${ALL_BADGE_TYPES.length - earnedCount})`}
            </button>
          ))}
        </div>

        {/* Badge grid */}
        <div className="grid grid-cols-3 gap-3">
          {filtered.map((badge, i) => {
            const isEarned = earnedTypes.has(badge.type as never)
            const rarity = rarityConfig[badge.rarity as keyof typeof rarityConfig]
            const earnedBadge = badges.find((b) => b.badge_type === badge.type)

            return (
              <motion.button
                key={badge.type}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04, type: 'spring', stiffness: 400, damping: 25 }}
                onClick={() => setSelected(badge)}
                className={`relative flex flex-col items-center p-4 rounded-2xl border-2 transition-all ${
                  isEarned
                    ? `${rarity.bg} ${rarity.border} shadow-md ${rarity.glow} hover:scale-105`
                    : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-50 grayscale'
                }`}
              >
                {/* Rarity indicator */}
                {isEarned && (
                  <div className={`absolute -top-1.5 -right-1.5 text-xs font-bold px-1.5 py-0.5 rounded-full bg-white dark:bg-gray-900 border ${rarity.border} ${rarity.color}`}>
                    {rarity.label[0]}
                  </div>
                )}

                <span className="text-4xl mb-2">
                  {isEarned ? badge.icon : '🔒'}
                </span>
                <span className="text-xs font-bold text-center leading-tight text-gray-700 dark:text-gray-300 line-clamp-2">
                  {badge.name}
                </span>

                {isEarned && earnedBadge && (
                  <span className="text-[10px] text-gray-400 mt-1">
                    {new Date(earnedBadge.earned_at || '').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </motion.button>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <div className="text-5xl mb-3">🔍</div>
            <p className="font-semibold">No badges here yet!</p>
            <p className="text-sm mt-1">Complete tasks to earn badges.</p>
          </div>
        )}
      </div>

      {/* Badge detail modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center p-4"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 80, opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              className="bg-card border rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const isEarned = earnedTypes.has(selected.type as never)
                const rarity = rarityConfig[selected.rarity as keyof typeof rarityConfig]
                return (
                  <>
                    <motion.div
                      animate={isEarned ? { rotate: [0, -10, 10, -5, 5, 0], scale: [1, 1.1, 1] } : {}}
                      transition={{ duration: 0.6 }}
                      className="text-7xl mb-4"
                    >
                      {isEarned ? selected.icon : '🔒'}
                    </motion.div>
                    <h2 className="text-xl font-black mb-1">{selected.name}</h2>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${rarity.bg} ${rarity.border} ${rarity.color}`}>
                      {rarity.label}
                    </span>
                    <p className="text-sm text-muted-foreground mt-3">{selected.desc}</p>
                    {isEarned ? (
                      <div className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-3">
                        <p className="text-green-700 dark:text-green-400 font-bold text-sm">✅ Earned!</p>
                      </div>
                    ) : (
                      <div className="mt-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
                        <p className="text-gray-500 text-sm">Complete the challenge to unlock this badge!</p>
                      </div>
                    )}
                    <button
                      onClick={() => setSelected(null)}
                      className="mt-4 w-full py-2.5 rounded-xl bg-purple-500 text-white font-semibold text-sm"
                    >
                      Close
                    </button>
                  </>
                )
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
