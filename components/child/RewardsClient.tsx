'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { Profile, Reward, Badge, XPTransaction, ParentReward } from '@/types/database'
import { ChildNavbar } from './ChildNavbar'
import { XPBar, LevelBadge, BadgeShowcase } from '@/components/gamification/index'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Zap, Gift, Clock, Star, Lock, CheckCircle2 } from 'lucide-react'

const ALL_BADGE_DEFS = [
  { type: 'first_task', name: 'First Steps', icon: '🌱', desc: 'Complete your first task', locked: false },
  { type: 'streak_3', name: '3-Day Streak', icon: '🔥', desc: '3 days in a row', locked: false },
  { type: 'streak_7', name: 'Week Warrior', icon: '⚡', desc: '7 days in a row', locked: false },
  { type: 'streak_30', name: 'Monthly Legend', icon: '👑', desc: '30 days in a row', locked: false },
  { type: 'level_5', name: 'Rising Star', icon: '⭐', desc: 'Reach Level 5', locked: false },
  { type: 'level_10', name: 'Champion', icon: '🏆', desc: 'Reach Level 10', locked: false },
  { type: 'perfect_week', name: 'Perfect Week', icon: '🌈', desc: 'Complete all tasks for 7 days', locked: false },
  { type: 'homework_hero', name: 'Homework Hero', icon: '📚', desc: '20 homework tasks done', locked: false },
  { type: 'chore_champion', name: 'Chore Champ', icon: '🧹', desc: '20 chore tasks done', locked: false },
  { type: 'artist', name: 'Little Artist', icon: '🎨', desc: 'Save 10 drawings', locked: false },
  { type: 'ai_explorer', name: 'AI Explorer', icon: '🤖', desc: 'Use AI helper 10 times', locked: false },
  { type: 'reader', name: 'Bookworm', icon: '📖', desc: '10 reading tasks done', locked: false },
]

type Tab = 'badges' | 'xp' | 'rewards'

interface Props {
  profile: Profile
  rewards: Reward
  badges: Badge[]
  xpHistory: XPTransaction[]
  parentRewards: ParentReward[]
}

export function RewardsClient({ profile, rewards, badges, xpHistory, parentRewards }: Props) {
  const [tab, setTab] = useState<Tab>('badges')
  const [redeeming, setRedeeming] = useState<string | null>(null)
  const supabase = getSupabaseBrowser()

  const earnedTypes = new Set(badges.map(b => b.badge_type))
  const xpForNext = Math.pow(rewards.level, 2) * 100
  const xpForCurrent = Math.pow(rewards.level - 1, 2) * 100
  const progress = ((rewards.total_xp - xpForCurrent) / (xpForNext - xpForCurrent)) * 100
  const xpNeeded = xpForNext - rewards.total_xp

  const handleRedeem = async (rewardId: string, xpCost: number) => {
    if (rewards.total_xp < xpCost) {
      toast.error(`Need ${xpCost - rewards.total_xp} more XP to redeem! 💪`)
      return
    }
    setRedeeming(rewardId)
    try {
      const { error } = await supabase.from('parent_rewards')
        .update({ redeemed: true, redeemed_at: new Date().toISOString() })
        .eq('id', rewardId)
      if (error) throw error
      // Deduct XP
      await supabase.rpc('award_xp', {
        p_user_id: profile.id,
        p_amount: -xpCost,
        p_reason: `Redeemed reward`,
      })
      toast.success('Reward redeemed! Ask your parent to approve it 🎁')
    } catch {
      toast.error('Redemption failed')
    } finally {
      setRedeeming(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <ChildNavbar profile={profile} />
      <main className="max-w-2xl mx-auto px-4 pb-24 pt-4 space-y-5">

        {/* Level & XP Card */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-3xl p-5 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <LevelBadge level={rewards.level} />
              <p className="text-3xl font-black mt-2">{rewards.total_xp.toLocaleString()} <span className="text-lg font-normal text-violet-200">XP</span></p>
              <p className="text-violet-200 text-sm">{xpNeeded > 0 ? `${xpNeeded} XP to Level ${rewards.level + 1}` : 'Max Level!'}</p>
            </div>
            <div className="text-right">
              <div className="text-5xl">⚡</div>
              <p className="text-violet-200 text-xs mt-1">{badges.length} badges</p>
            </div>
          </div>
          <div className="bg-white/20 rounded-full h-2.5">
            <motion.div className="h-full bg-white rounded-full" initial={{ width: 0 }}
              animate={{ width: `${Math.min(progress, 100)}%` }} transition={{ duration: 0.8, delay: 0.3 }} />
          </div>
          <div className="flex justify-between text-xs text-violet-200 mt-1.5">
            <span>Level {rewards.level}</span>
            <span>{Math.round(progress)}%</span>
            <span>Level {rewards.level + 1}</span>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: 'Streak', value: `${rewards.streak_days}🔥` },
              { label: 'Tasks Done', value: rewards.tasks_completed },
              { label: 'Best Streak', value: rewards.longest_streak },
            ].map(s => (
              <div key={s.label} className="bg-white/10 rounded-xl p-2.5 text-center">
                <p className="font-black text-lg">{s.value}</p>
                <p className="text-violet-300 text-xs">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-secondary rounded-2xl">
          {([
            { id: 'badges', label: 'Badges', emoji: '🏅' },
            { id: 'xp', label: 'XP History', emoji: '⚡' },
            { id: 'rewards', label: 'Rewards', emoji: '🎁' },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${tab === t.id ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <span>{t.emoji}</span> {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {tab === 'badges' && (
            <motion.div key="badges" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="grid grid-cols-3 gap-3">
                {ALL_BADGE_DEFS.map((def, i) => {
                  const earned = badges.find(b => b.badge_type === def.type)
                  return (
                    <motion.div key={def.type} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className={`rounded-2xl p-4 text-center transition-all ${earned ? 'bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 border-2 border-violet-300 dark:border-violet-700' : 'bg-secondary border-2 border-transparent opacity-60'}`}>
                      <div className={`text-3xl mb-1.5 ${!earned ? 'grayscale' : 'float'}`}>{earned ? def.icon : '🔒'}</div>
                      <p className="text-xs font-bold leading-tight">{def.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{def.desc}</p>
                      {earned && (
                        <p className="text-xs text-violet-500 mt-1">{format(new Date(earned.earned_at), 'MMM d')}</p>
                      )}
                    </motion.div>
                  )
                })}
              </div>
              <p className="text-center text-sm text-muted-foreground mt-4">
                {badges.length}/{ALL_BADGE_DEFS.length} badges earned ✨
              </p>
            </motion.div>
          )}

          {tab === 'xp' && (
            <motion.div key="xp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
              {xpHistory.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-4xl mb-2">⚡</div>
                  <p className="text-muted-foreground text-sm">No XP history yet. Complete tasks to earn XP!</p>
                </div>
              ) : xpHistory.map((tx, i) => (
                <motion.div key={tx.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 bg-card border rounded-2xl px-4 py-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${tx.amount > 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                    <Zap className={`h-4 w-4 ${tx.amount > 0 ? 'text-green-600' : 'text-red-500'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.reason}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(tx.created_at), 'MMM d, h:mm a')}</p>
                  </div>
                  <span className={`text-sm font-black ${tx.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount} XP
                  </span>
                </motion.div>
              ))}
            </motion.div>
          )}

          {tab === 'rewards' && (
            <motion.div key="rewards" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {parentRewards.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-4xl mb-2">🎁</div>
                  <p className="font-semibold">No rewards yet</p>
                  <p className="text-muted-foreground text-sm mt-1">Ask your parent to add rewards you can unlock with XP!</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {parentRewards.map((reward, i) => {
                    const canAfford = rewards.total_xp >= reward.xp_cost
                    return (
                      <motion.div key={reward.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                        className={`bg-card border-2 rounded-3xl p-5 transition-all ${canAfford ? 'border-violet-200 dark:border-violet-800' : 'border-border opacity-70'}`}>
                        <div className="flex items-start gap-4">
                          <div className="text-4xl">{reward.icon}</div>
                          <div className="flex-1">
                            <p className="font-bold">{reward.title}</p>
                            {reward.description && <p className="text-sm text-muted-foreground mt-0.5">{reward.description}</p>}
                            <div className="flex items-center gap-2 mt-2">
                              <span className="xp-badge">⚡ {reward.xp_cost} XP</span>
                              {!canAfford && (
                                <span className="text-xs text-muted-foreground">{reward.xp_cost - rewards.total_xp} more XP needed</span>
                              )}
                            </div>
                          </div>
                          <button onClick={() => handleRedeem(reward.id, reward.xp_cost)}
                            disabled={!canAfford || redeeming === reward.id}
                            className={`btn-kid flex-shrink-0 px-4 py-2 text-xs font-bold flex items-center gap-1.5 ${canAfford ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white' : 'bg-secondary text-muted-foreground cursor-not-allowed'}`}>
                            {redeeming === reward.id ? <Loader2 className="h-3 w-3 animate-spin" /> : canAfford ? <><Gift className="h-3.5 w-3.5" /> Redeem</> : <><Lock className="h-3.5 w-3.5" /> Locked</>}
                          </button>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

function Loader2({ className }: { className?: string }) {
  return <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
}
