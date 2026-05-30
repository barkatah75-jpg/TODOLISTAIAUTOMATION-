'use client'

import { motion } from 'framer-motion'
import { Profile, Reward } from '@/types/database'
import { ChildNavbar } from './ChildNavbar'
import { Trophy, Flame, Star, Medal } from 'lucide-react'

interface LeaderEntry {
  profile: { id: string; name: string; display_name: string | null; avatar_url: string | null }
  rewards: { total_xp: number; level: number; streak_days: number }
}

interface Props {
  profile: Profile
  myRewards: Reward
  familyLeaderboard: LeaderEntry[]
}

const RANK_STYLES = [
  { bg: 'from-yellow-400 to-amber-500', icon: '🥇', text: 'text-amber-900' },
  { bg: 'from-slate-300 to-slate-400', icon: '🥈', text: 'text-slate-900' },
  { bg: 'from-amber-600 to-amber-700', icon: '🥉', text: 'text-amber-100' },
]

export function LeaderboardClient({ profile, myRewards, familyLeaderboard }: Props) {
  const myRank = familyLeaderboard.findIndex(e => e.profile.id === profile.id) + 1

  return (
    <div className="min-h-screen bg-background">
      <ChildNavbar profile={profile} />
      <main className="max-w-2xl mx-auto px-4 pb-24 pt-4 space-y-5">
        <div className="text-center">
          <h1 className="text-2xl font-black flex items-center justify-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" /> Leaderboard
          </h1>
          {myRank > 0 && (
            <p className="text-sm text-muted-foreground mt-1">You're ranked #{myRank} in your family</p>
          )}
        </div>

        {/* My stats */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-3xl p-5 text-white flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl">
            {profile.avatar_url || '🧒'}
          </div>
          <div className="flex-1">
            <p className="font-black text-lg">{profile.display_name || profile.name}</p>
            <p className="text-violet-200 text-sm">Level {myRewards.level} · {myRewards.total_xp.toLocaleString()} XP</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black">#{myRank || '—'}</p>
            <p className="text-violet-200 text-xs">rank</p>
          </div>
        </motion.div>

        {/* Family leaderboard */}
        {familyLeaderboard.length > 0 ? (
          <div>
            <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wide mb-3">Family Ranking</h2>
            <div className="space-y-3">
              {familyLeaderboard.map((entry, i) => {
                const isMe = entry.profile.id === profile.id
                const rankStyle = RANK_STYLES[i] || null
                return (
                  <motion.div key={entry.profile.id}
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${isMe ? 'border-violet-400 bg-violet-50 dark:bg-violet-950/20' : 'border-border bg-card'}`}>
                    {/* Rank */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${rankStyle ? `bg-gradient-to-br ${rankStyle.bg}` : 'bg-secondary'}`}>
                      <span className="text-lg font-black">{rankStyle ? rankStyle.icon : i + 1}</span>
                    </div>
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-xl flex-shrink-0">
                      🧒
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm truncate">{entry.profile.display_name || entry.profile.name}</p>
                        {isMe && <span className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300 rounded-full px-2 py-0.5 font-bold">You</span>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>Level {entry.rewards.level}</span>
                        <span className="flex items-center gap-0.5"><Flame className="h-3 w-3 text-orange-500" /> {entry.rewards.streak_days}</span>
                      </div>
                    </div>
                    {/* XP */}
                    <div className="text-right flex-shrink-0">
                      <p className="font-black text-base">{entry.rewards.total_xp.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">XP</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">👨‍👩‍👧</div>
            <h3 className="font-bold text-lg">No family members yet</h3>
            <p className="text-muted-foreground text-sm mt-1 max-w-xs mx-auto">
              Ask your parent to link more children to your family to see the leaderboard!
            </p>
          </div>
        )}

        {/* Motivational footer */}
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 text-center">
          <p className="text-amber-700 dark:text-amber-300 font-semibold text-sm">
            ⚡ Complete tasks to earn XP and climb the leaderboard!
          </p>
          <p className="text-amber-600 dark:text-amber-400 text-xs mt-1">
            Each task = 10–100 XP · Streaks give bonus XP 🔥
          </p>
        </div>
      </main>
    </div>
  )
}
