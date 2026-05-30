'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { format, subDays, eachDayOfInterval, startOfDay, isSameDay } from 'date-fns'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { Profile, FamilyLink, Reward, Todo, XPTransaction, Badge } from '@/types/database'
import { ParentNavbar } from './ParentNavbar'
import { TrendingUp, Target, Award, Calendar } from 'lucide-react'

const CATEGORY_COLORS: Record<string, string> = {
  homework: '#3B82F6', chores: '#10B981', reading: '#F59E0B',
  exercise: '#EF4444', creative: '#EC4899', social: '#8B5CF6',
  personal: '#14B8A6', custom: '#6B7280',
}

interface Props {
  profile: Profile
  familyLinks: (FamilyLink & { child: Profile })[]
  rewards: Reward[]
  activeChildId: string | null
  todos: Todo[]
  xpTransactions: XPTransaction[]
  badges: Badge[]
}

export function AnalyticsClient({ profile, familyLinks, rewards, activeChildId, todos, xpTransactions, badges }: Props) {
  const router = useRouter()
  const [activeId, setActiveId] = useState(activeChildId)
  const activeReward = rewards.find(r => r.user_id === activeId)
  const activeLink = familyLinks.find(l => l.child_id === activeId)

  // Build 30-day completion chart
  const last30Days = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() })
  const dailyData = last30Days.map(day => {
    const dayTodos = todos.filter(t => isSameDay(new Date(t.created_at), day))
    const completed = dayTodos.filter(t => t.completed).length
    const total = dayTodos.length
    const xpEarned = xpTransactions
      .filter(x => isSameDay(new Date(x.created_at), day) && x.amount > 0)
      .reduce((sum, x) => sum + x.amount, 0)
    return {
      date: format(day, 'MMM d'),
      shortDate: format(day, 'd'),
      completed, total, xpEarned,
      rate: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  })

  // Category breakdown
  const categoryData = Object.entries(
    todos.filter(t => t.completed).reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value, color: CATEGORY_COLORS[name] || '#6B7280' }))

  const completionRate = todos.length > 0 ? Math.round((todos.filter(t => t.completed).length / todos.length) * 100) : 0
  const totalXPEarned = xpTransactions.filter(x => x.amount > 0).reduce((s, x) => s + x.amount, 0)
  const avgPerDay = todos.length > 0 ? (todos.filter(t => t.completed).length / 30).toFixed(1) : '0'

  return (
    <div className="min-h-screen bg-background">
      <ParentNavbar profile={profile} />
      <main className="max-w-3xl mx-auto px-4 pb-24 pt-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black">Analytics 📊</h1>
          <span className="text-xs text-muted-foreground">Last 30 days</span>
        </div>

        {/* Child selector */}
        {familyLinks.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {familyLinks.map(link => (
              <button key={link.child_id}
                onClick={() => { setActiveId(link.child_id); router.push(`/parent/analytics?child=${link.child_id}`) }}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${activeId === link.child_id ? 'bg-violet-600 text-white' : 'bg-card border hover:bg-secondary'}`}>
                🧒 {link.child.display_name || link.child.name}
              </button>
            ))}
          </div>
        )}

        {!activeId ? (
          <div className="text-center py-10 text-muted-foreground">No children linked yet.</div>
        ) : (
          <>
            {/* Child header */}
            <div className="flex items-center gap-4 bg-gradient-to-r from-violet-600 to-purple-600 rounded-3xl p-4 text-white">
              <div className="text-4xl">🧒</div>
              <div>
                <p className="font-black text-lg">{activeLink?.child.display_name || activeLink?.child.name}</p>
                <p className="text-violet-200 text-sm">Level {activeReward?.level || 1} · {activeReward?.total_xp.toLocaleString() || 0} total XP</p>
              </div>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Completion Rate', value: `${completionRate}%`, icon: Target, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
                { label: 'XP This Month', value: totalXPEarned.toLocaleString(), icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-100 dark:bg-violet-900/30' },
                { label: 'Avg Tasks/Day', value: avgPerDay, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
                { label: 'Badges Earned', value: badges.length, icon: Award, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
              ].map((kpi, i) => (
                <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                  className="bg-card border rounded-2xl p-4">
                  <div className={`inline-flex p-2 rounded-xl mb-2 ${kpi.bg}`}>
                    <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                  </div>
                  <p className="text-2xl font-black">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Daily completion chart */}
            <div className="bg-card border rounded-3xl p-5">
              <h3 className="font-bold text-sm mb-4">Daily Task Completion</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={dailyData.slice(-14)} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={1} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid var(--border)' }} />
                  <Area type="monotone" dataKey="completed" name="Completed" stroke="#7C3AED" fill="url(#gradCompleted)" strokeWidth={2} />
                  <Area type="monotone" dataKey="total" name="Total" stroke="#E5E7EB" fill="transparent" strokeWidth={1.5} strokeDasharray="4 4" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* XP chart */}
            <div className="bg-card border rounded-3xl p-5">
              <h3 className="font-bold text-sm mb-4">XP Earned Per Day</h3>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={dailyData.slice(-14)} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={1} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid var(--border)' }} />
                  <Bar dataKey="xpEarned" name="XP Earned" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Category breakdown */}
            {categoryData.length > 0 && (
              <div className="bg-card border rounded-3xl p-5">
                <h3 className="font-bold text-sm mb-4">Tasks by Category</h3>
                <div className="flex gap-6 items-center">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                        {categoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {categoryData.map(cat => (
                      <div key={cat.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="text-xs capitalize flex-1">{cat.name}</span>
                        <span className="text-xs font-bold">{cat.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
