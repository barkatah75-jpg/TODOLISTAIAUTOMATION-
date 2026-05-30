'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { Profile, FamilyLink, Reward, Todo, Badge, UserMission } from '@/types/database'
import { approveTask, rejectTask } from '@/lib/actions/parent'
import { format, subDays, isToday } from 'date-fns'
import toast from 'react-hot-toast'
import { CheckCircle, XCircle, Users, Target, Trophy, TrendingUp, Plus, Bell, Settings } from 'lucide-react'

interface Props {
  profile: Profile
  familyLinks: (FamilyLink & { child: Profile })[]
  rewards: Reward[]
  recentTodos: (Todo & { assignee?: { name: string; avatar_url: string | null } })[]
  badges: Badge[]
  missions: (UserMission & { mission: unknown })[]
  pendingApprovals: (Todo & { assignee?: { name: string; avatar_url: string | null } })[]
}

export function ParentDashboardClient({ profile, familyLinks, rewards, recentTodos, pendingApprovals }: Props) {
  const [activeChild, setActiveChild] = useState<string | null>(
    familyLinks[0]?.child_id || null
  )
  const [approving, setApproving] = useState<Set<string>>(new Set())

  const getChildReward = (childId: string) => rewards.find(r => r.user_id === childId)
  const getChildTodos = (childId: string) => recentTodos.filter(t => t.user_id === childId)

  const totalFamilyXP = rewards.reduce((sum, r) => sum + r.total_xp, 0)
  const totalCompletedThisWeek = recentTodos.filter(t => t.completed).length

  // Build 7-day completion chart data
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i)
    const dateStr = format(date, 'yyyy-MM-dd')
    const completed = recentTodos.filter(t => t.completed && t.completed_at?.startsWith(dateStr)).length
    const total = recentTodos.filter(t => t.created_at?.startsWith(dateStr)).length
    return {
      day: format(date, 'EEE'),
      completed,
      total,
      rate: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  })

  const handleApprove = async (todoId: string) => {
    setApproving(prev => new Set([...prev, todoId]))
    try {
      const result = await approveTask(todoId)
      if (result.error) throw new Error(result.error)
      toast.success('Task approved! XP awarded ✅')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve')
    } finally {
      setApproving(prev => { const s = new Set(prev); s.delete(todoId); return s })
    }
  }

  const handleReject = async (todoId: string) => {
    setApproving(prev => new Set([...prev, todoId]))
    try {
      const result = await rejectTask(todoId)
      if (result.error) throw new Error(result.error)
      toast.success('Task marked for redo')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setApproving(prev => { const s = new Set(prev); s.delete(todoId); return s })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-background dark:from-slate-950/30 dark:to-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-black text-lg">Parent Hub 👨‍👩‍👧</h1>
            <p className="text-xs text-muted-foreground">Welcome back, {profile.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/parent/children/invite" className="btn-kid flex items-center gap-1.5 bg-violet-600 text-white px-3 py-1.5 text-xs">
              <Plus className="h-3 w-3" /> Add Child
            </Link>
            <Link href="/parent/settings" className="p-2 rounded-xl hover:bg-secondary transition-colors">
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Family Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Children', value: familyLinks.length, icon: Users, color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
            { label: 'Family XP', value: totalFamilyXP.toLocaleString(), icon: TrendingUp, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
            { label: 'Completed (7d)', value: totalCompletedThisWeek, icon: Target, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
            { label: 'Pending Review', value: pendingApprovals.length, icon: Bell, color: `${pendingApprovals.length > 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400'}` },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="bg-card border rounded-2xl p-4">
              <div className={`inline-flex p-2 rounded-xl mb-2 ${stat.color}`}>
                <stat.icon className="h-4 w-4" />
              </div>
              <p className="text-2xl font-black">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Children tabs */}
        {familyLinks.length > 0 && (
          <div className="space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {familyLinks.map(link => (
                <button key={link.child_id} onClick={() => setActiveChild(link.child_id)}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                    activeChild === link.child_id ? 'bg-violet-600 text-white' : 'bg-card border hover:bg-secondary'
                  }`}>
                  <span className="text-base">{link.child.avatar_url ? '👤' : '🧒'}</span>
                  {link.nickname || link.child.name}
                </button>
              ))}
            </div>

            {/* Active child stats */}
            {activeChild && (() => {
              const link = familyLinks.find(l => l.child_id === activeChild)
              const reward = getChildReward(activeChild)
              const childTodos = getChildTodos(activeChild)
              const completedTodos = childTodos.filter(t => t.completed)
              if (!link || !reward) return null

              return (
                <motion.div key={activeChild} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid md:grid-cols-2 gap-4">
                  {/* Child info card */}
                  <div className="bg-card border rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-2xl">
                        🧒
                      </div>
                      <div>
                        <h3 className="font-bold">{link.child.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="xp-badge">⚡ {reward.total_xp.toLocaleString()} XP</span>
                          <span className="text-xs text-muted-foreground">Level {reward.level}</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-secondary rounded-xl p-3">
                        <p className="text-xl font-black">{reward.streak_days}</p>
                        <p className="text-xs text-muted-foreground">Streak 🔥</p>
                      </div>
                      <div className="bg-secondary rounded-xl p-3">
                        <p className="text-xl font-black">{reward.tasks_completed}</p>
                        <p className="text-xs text-muted-foreground">Tasks ✅</p>
                      </div>
                      <div className="bg-secondary rounded-xl p-3">
                        <p className="text-xl font-black">{childTodos.length > 0 ? Math.round((completedTodos.length / childTodos.length) * 100) : 0}%</p>
                        <p className="text-xs text-muted-foreground">Rate 📊</p>
                      </div>
                    </div>
                  </div>

                  {/* Weekly chart */}
                  <div className="bg-card border rounded-2xl p-5">
                    <h4 className="font-bold text-sm mb-3">7-Day Completion</h4>
                    <ResponsiveContainer width="100%" height={140}>
                      <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                        <defs>
                          <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid var(--border)' }} />
                        <Area type="monotone" dataKey="completed" stroke="#7C3AED" fill="url(#colorCompleted)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              )
            })()}
          </div>
        )}

        {/* Pending Approvals */}
        {pendingApprovals.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="font-bold">Pending Approvals</h2>
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-bold">{pendingApprovals.length}</span>
            </div>
            <div className="space-y-2">
              {pendingApprovals.map(todo => (
                <motion.div key={todo.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="bg-card border rounded-2xl p-4 flex items-center gap-3">
                  <span className="text-2xl">{todo.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{todo.text}</p>
                    <p className="text-xs text-muted-foreground">{todo.assignee?.name} • {todo.points} XP</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleApprove(todo.id)} disabled={approving.has(todo.id)}
                      className="p-2 rounded-xl bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 transition-all disabled:opacity-50">
                      <CheckCircle className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleReject(todo.id)} disabled={approving.has(todo.id)}
                      className="p-2 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 transition-all disabled:opacity-50">
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* No children state */}
        {familyLinks.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">👨‍👩‍👧</div>
            <h3 className="text-xl font-bold mb-2">Link your child's account</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
              Invite your child to join AIVANA and start tracking their progress, assigning tasks, and approving rewards.
            </p>
            <Link href="/parent/children/invite" className="btn-kid inline-flex items-center gap-2 bg-violet-600 text-white px-6 py-3">
              <Plus className="h-4 w-4" /> Add Your First Child
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
