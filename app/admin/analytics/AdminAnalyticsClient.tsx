'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { format, eachDayOfInterval, subDays } from 'date-fns'

interface Props {
  signups: Array<{ created_at: string; role: string }>
  completedTodos: Array<{ created_at: string }>
  payments: Array<{ amount: number; currency: string; plan: string; created_at: string }>
  subscriptions: Array<{ plan: string; status: string }>
  moodEntries: Array<{ mood: string }>
}

const MOOD_COLORS: Record<string, string> = {
  great: '#22c55e', good: '#3b82f6', okay: '#f59e0b',
  tired: '#f97316', sad: '#a855f7', stressed: '#ef4444',
}

const PLAN_COLORS: Record<string, string> = {
  free: '#94a3b8', pro: '#7c3aed', family: '#ec4899', school: '#3b82f6',
}

function groupByDate<T extends { created_at: string }>(records: T[], days = 30): Record<string, number> {
  const result: Record<string, number> = {}
  const interval = eachDayOfInterval({ start: subDays(new Date(), days - 1), end: new Date() })
  interval.forEach((d) => { result[format(d, 'MMM dd')] = 0 })
  records.forEach((r) => {
    const key = format(new Date(r.created_at), 'MMM dd')
    if (key in result) result[key] = (result[key] || 0) + 1
  })
  return result
}

export function AdminAnalyticsClient({ signups, completedTodos, payments, subscriptions, moodEntries }: Props) {
  const [range, setRange] = useState(30)

  const signupData = useMemo(() => {
    const byDate = groupByDate(signups, range)
    return Object.entries(byDate).map(([date, count]) => ({ date, signups: count }))
  }, [signups, range])

  const todoData = useMemo(() => {
    const byDate = groupByDate(completedTodos, range)
    return Object.entries(byDate).map(([date, count]) => ({ date, tasks: count }))
  }, [completedTodos, range])

  const revenueData = useMemo(() => {
    const byDate: Record<string, number> = {}
    const interval = eachDayOfInterval({ start: subDays(new Date(), range - 1), end: new Date() })
    interval.forEach((d) => { byDate[format(d, 'MMM dd')] = 0 })
    payments.forEach((p) => {
      const key = format(new Date(p.created_at), 'MMM dd')
      if (key in byDate) byDate[key] = (byDate[key] || 0) + (p.amount || 0)
    })
    return Object.entries(byDate).map(([date, revenue]) => ({ date, revenue }))
  }, [payments, range])

  const planData = useMemo(() => {
    const counts: Record<string, number> = {}
    subscriptions.forEach((s) => { counts[s.plan] = (counts[s.plan] || 0) + 1 })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [subscriptions])

  const moodData = useMemo(() => {
    const counts: Record<string, number> = {}
    moodEntries.forEach((m) => { counts[m.mood] = (counts[m.mood] || 0) + 1 })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [moodEntries])

  const totalRevenue = payments.reduce((s, p) => s + (p.amount || 0), 0)
  const activeSubscriptions = subscriptions.filter((s) => s.status === 'active' && s.plan !== 'free').length

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/admin/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← Dashboard</a>
            <span className="text-gray-300">|</span>
            <h1 className="font-black text-lg">Platform Analytics</h1>
          </div>
          <div className="flex gap-2">
            {[7, 30, 90].map((d) => (
              <button key={d} onClick={() => setRange(d)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${range === d ? 'bg-purple-500 text-white' : 'border hover:bg-muted'}`}>
                {d}d
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'New Signups', value: signups.length, icon: '👥', color: 'text-blue-600' },
            { label: 'Tasks Completed', value: completedTodos.length, icon: '✅', color: 'text-green-600' },
            { label: 'Revenue (30d)', value: `₹${totalRevenue.toLocaleString()}`, icon: '💰', color: 'text-purple-600' },
            { label: 'Active Subs', value: activeSubscriptions, icon: '⭐', color: 'text-pink-600' },
          ].map((kpi, i) => (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card border rounded-2xl p-4">
              <div className="text-2xl mb-2">{kpi.icon}</div>
              <div className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{kpi.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Signup trend */}
        <div className="bg-card border rounded-2xl p-5">
          <h2 className="font-bold mb-4 text-sm text-muted-foreground uppercase tracking-wide">Daily Signups</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={signupData}>
              <defs>
                <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.floor(signupData.length / 6)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Area type="monotone" dataKey="signups" stroke="#7c3aed" fill="url(#signupGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Tasks completed */}
          <div className="bg-card border rounded-2xl p-5">
            <h2 className="font-bold mb-4 text-sm text-muted-foreground uppercase tracking-wide">Tasks Completed / Day</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={todoData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={Math.floor(todoData.length / 5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="tasks" fill="#22c55e" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue */}
          <div className="bg-card border rounded-2xl p-5">
            <h2 className="font-bold mb-4 text-sm text-muted-foreground uppercase tracking-wide">Daily Revenue (₹)</h2>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={Math.floor(revenueData.length / 5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString()}`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#ec4899" fill="url(#revGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Plan distribution */}
          <div className="bg-card border rounded-2xl p-5">
            <h2 className="font-bold mb-4 text-sm text-muted-foreground uppercase tracking-wide">Plan Distribution</h2>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={planData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {planData.map((entry) => (
                    <Cell key={entry.name} fill={PLAN_COLORS[entry.name] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Mood distribution */}
          <div className="bg-card border rounded-2xl p-5">
            <h2 className="font-bold mb-4 text-sm text-muted-foreground uppercase tracking-wide">Mood Distribution</h2>
            {moodData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={moodData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={60} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {moodData.map((entry) => (
                      <Cell key={entry.name} fill={MOOD_COLORS[entry.name] || '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-44 flex items-center justify-center text-muted-foreground text-sm">No mood data yet</div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
