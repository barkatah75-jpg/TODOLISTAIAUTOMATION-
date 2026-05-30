'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Profile, Reward, Todo, UserMission, Badge } from '@/types/database'
import { XPBar } from '@/components/gamification/XPBar'
import { StreakCounter } from '@/components/gamification/StreakCounter'
import { TodoCard } from '@/components/child/TodoCard'
import { MissionCard } from '@/components/gamification/MissionCard'
import { BadgeShowcase } from '@/components/gamification/BadgeShowcase'
import { ChildNavbar } from '@/components/child/ChildNavbar'
import { useRewards } from '@/hooks/useRewards'
import { 
  Sparkles, BookOpen, Palette, FileText, 
  Mic, Trophy, MessageSquare, Plus, ChevronRight 
} from 'lucide-react'

interface Props {
  profile: Profile
  rewards: Reward
  todayTodos: Todo[]
  activeMissions: UserMission[]
  recentBadges: Badge[]
}

const QUICK_ACTIONS = [
  { label: 'AI Helper', icon: Sparkles, href: '/child/ai-chat', color: 'bg-violet-500', emoji: '🤖' },
  { label: 'My Tasks', icon: BookOpen, href: '/child/todos', color: 'bg-blue-500', emoji: '📚' },
  { label: 'Draw', icon: Palette, href: '/child/drawing', color: 'bg-pink-500', emoji: '🎨' },
  { label: 'Files', icon: FileText, href: '/child/files', color: 'bg-green-500', emoji: '📄' },
  { label: 'Voice', icon: Mic, href: '/child/todos?voice=1', color: 'bg-orange-500', emoji: '🎤' },
  { label: 'Rewards', icon: Trophy, href: '/child/rewards', color: 'bg-amber-500', emoji: '🏆' },
]

export function ChildDashboardClient({ profile, rewards, todayTodos, activeMissions, recentBadges }: Props) {
  const { currentRewards } = useRewards(rewards)
  const completedToday = todayTodos.filter(t => t.completed).length
  const totalToday = todayTodos.length
  const completionPct = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const xpForNextLevel = Math.pow(currentRewards.level, 2) * 100
  const xpForCurrentLevel = Math.pow(currentRewards.level - 1, 2) * 100
  const levelProgress = ((currentRewards.total_xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50/50 to-background dark:from-violet-950/20 dark:to-background">
      <ChildNavbar profile={profile} />

      <main className="max-w-2xl mx-auto px-4 pb-24 pt-4 space-y-5">
        {/* Greeting + XP */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-muted-foreground text-sm">{greeting()},</p>
              <h1 className="text-2xl font-black">
                {profile.display_name || profile.name} {profile.role === 'child' ? '🌟' : ''}
              </h1>
            </div>
            <div className="text-right">
              <div className="xp-badge text-base px-3 py-1">
                ⚡ {currentRewards.total_xp.toLocaleString()} XP
              </div>
              <p className="text-xs text-muted-foreground mt-1">Level {currentRewards.level}</p>
            </div>
          </div>

          <XPBar progress={Math.min(levelProgress, 100)} level={currentRewards.level} />

          {currentRewards.streak_days > 0 && (
            <StreakCounter days={currentRewards.streak_days} />
          )}
        </motion.div>

        {/* Today's Progress */}
        {totalToday > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-3xl p-5 text-white">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-violet-200 text-sm">Today's Progress</p>
                <p className="text-2xl font-black">{completedToday}/{totalToday} Tasks</p>
              </div>
              <div className="text-5xl">{completionPct === 100 ? '🎉' : completionPct >= 50 ? '💪' : '🚀'}</div>
            </div>
            <div className="bg-white/20 rounded-full h-2.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${completionPct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                className="h-full bg-white rounded-full"
              />
            </div>
            <p className="text-violet-200 text-xs mt-2 text-right">{completionPct}% complete</p>
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
          <h2 className="font-bold text-sm text-muted-foreground mb-3 uppercase tracking-wide">Quick Actions</h2>
          <div className="grid grid-cols-3 gap-3">
            {QUICK_ACTIONS.map((action, i) => (
              <motion.div key={action.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + i * 0.05 }}>
                <Link href={action.href}
                  className="flex flex-col items-center gap-2 p-3 bg-card border rounded-2xl hover:shadow-md transition-all hover:-translate-y-0.5 active:scale-95">
                  <span className="text-2xl">{action.emoji}</span>
                  <span className="text-xs font-semibold text-center leading-tight">{action.label}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Today's Tasks (top 3) */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wide">Today's Tasks</h2>
            <Link href="/child/todos" className="flex items-center gap-1 text-xs text-violet-600 font-semibold">
              See all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {todayTodos.length === 0 ? (
            <div className="bg-card border rounded-3xl p-8 text-center">
              <div className="text-4xl mb-2">🎯</div>
              <p className="font-semibold">No tasks yet!</p>
              <p className="text-muted-foreground text-sm mt-1">Add your first task to start earning XP</p>
              <Link href="/child/todos" className="btn-kid mt-4 inline-flex items-center gap-2 bg-violet-600 text-white px-4 py-2 text-sm">
                <Plus className="h-4 w-4" /> Add Task
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {todayTodos.slice(0, 3).map((todo, i) => (
                  <TodoCard key={todo.id} todo={todo} index={i} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Active Missions */}
        {activeMissions.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
            <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wide mb-3">Active Missions</h2>
            <div className="space-y-2">
              {activeMissions.slice(0, 2).map(mission => (
                <MissionCard key={mission.id} userMission={mission} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Recent Badges */}
        {recentBadges.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wide">Recent Badges</h2>
              <Link href="/child/rewards" className="flex items-center gap-1 text-xs text-violet-600 font-semibold">
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <BadgeShowcase badges={recentBadges} />
          </motion.div>
        )}
      </main>
    </div>
  )
}
