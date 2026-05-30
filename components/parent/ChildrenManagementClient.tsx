'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Profile, FamilyLink, Reward } from '@/types/database'
import { ParentNavbar } from './ParentNavbar'
import { LevelBadge } from '@/components/gamification/index'
import { Plus, UserPlus, Crown, Flame, CheckCircle2, Lock } from 'lucide-react'

interface Props {
  profile: Profile
  familyLinks: (FamilyLink & { child: Profile })[]
  rewards: Reward[]
  subscription: { max_children: number; plan: string } | null
}

export function ChildrenManagementClient({ profile, familyLinks, rewards, subscription }: Props) {
  const maxChildren = subscription?.max_children || 1
  const canAddMore = familyLinks.length < maxChildren

  return (
    <div className="min-h-screen bg-background">
      <ParentNavbar profile={profile} />
      <main className="max-w-2xl mx-auto px-4 pb-24 pt-4 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">My Children</h1>
            <p className="text-sm text-muted-foreground">{familyLinks.length}/{maxChildren} slots used</p>
          </div>
          {canAddMore ? (
            <Link href="/parent/children/invite"
              className="btn-kid flex items-center gap-1.5 bg-violet-600 text-white px-3 py-2 text-xs font-bold">
              <Plus className="h-3.5 w-3.5" /> Add Child
            </Link>
          ) : (
            <Link href="/pricing"
              className="btn-kid flex items-center gap-1.5 bg-amber-500 text-white px-3 py-2 text-xs font-bold">
              <Crown className="h-3.5 w-3.5" /> Upgrade
            </Link>
          )}
        </div>

        {familyLinks.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">👶</div>
            <h3 className="text-xl font-bold">No children linked yet</h3>
            <p className="text-muted-foreground text-sm mt-2 mb-6 max-w-sm mx-auto">
              Link your child's account to start tracking their progress and assigning tasks.
            </p>
            <Link href="/parent/children/invite"
              className="btn-kid inline-flex items-center gap-2 bg-violet-600 text-white px-6 py-3">
              <UserPlus className="h-4 w-4" /> Link First Child
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {familyLinks.map((link, i) => {
              const reward = rewards.find(r => r.user_id === link.child_id)
              return (
                <motion.div key={link.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                  className="bg-card border rounded-3xl p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex items-center justify-center text-3xl flex-shrink-0">
                      🧒
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-lg">{link.nickname || link.child.name}</h3>
                        {reward && <LevelBadge level={reward.level} />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{link.child.email}</p>
                      {reward && (
                        <div className="flex items-center gap-3 mt-2">
                          <span className="xp-badge">⚡ {reward.total_xp.toLocaleString()} XP</span>
                          <span className="flex items-center gap-1 text-xs text-orange-500 font-semibold">
                            <Flame className="h-3 w-3" /> {reward.streak_days} day streak
                          </span>
                          <span className="flex items-center gap-1 text-xs text-green-600 font-semibold">
                            <CheckCircle2 className="h-3 w-3" /> {reward.tasks_completed} tasks
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <Link href={`/parent/tasks?child=${link.child_id}`}
                      className="btn-kid py-2.5 text-xs font-semibold border-2 border-border hover:bg-secondary text-center">
                      📋 Assign Tasks
                    </Link>
                    <Link href={`/parent/analytics?child=${link.child_id}`}
                      className="btn-kid py-2.5 text-xs font-semibold bg-violet-600 text-white text-center">
                      📊 View Progress
                    </Link>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        {!canAddMore && subscription?.plan === 'free' && (
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="h-4 w-4 text-amber-600" />
              <p className="font-semibold text-sm text-amber-800 dark:text-amber-300">Upgrade to add more children</p>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">Free plan supports 1 child. Family plan supports up to 5.</p>
            <Link href="/pricing" className="btn-kid inline-flex items-center gap-1.5 bg-amber-500 text-white px-4 py-2 text-xs font-bold">
              <Crown className="h-3.5 w-3.5" /> Upgrade to Family
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
