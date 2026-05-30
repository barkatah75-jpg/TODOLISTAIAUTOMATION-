'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { format } from 'date-fns'
import { Users, TrendingUp, BookOpen, MessageSquare, DollarSign, School, Star, Sparkles } from 'lucide-react'

interface AdminStats {
  totalUsers: number; children: number; parents: number; proUsers: number;
  todosThisMonth: number; aiChats: number; stories: number; schools: number;
  totalRevenue: number; planBreakdown: Record<string, number>;
}

const PLAN_COLORS: Record<string, string> = { pro: '#7C3AED', family: '#EC4899', school: '#3B82F6' }

export function AdminDashboardClient({
  stats, recentUsers, payments,
}: {
  stats: AdminStats
  recentUsers: Array<{ id: string; name: string; email: string; role: string; created_at: string }>
  payments: Array<{ amount: number; currency: string; plan: string; created_at: string }>
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'revenue'>('overview')

  const conversionRate = stats.totalUsers > 0 ? ((stats.proUsers / stats.totalUsers) * 100).toFixed(1) : '0'

  // Revenue by day (last 30)
  const revByDay = payments.reduce((acc, p) => {
    const day = format(new Date(p.created_at), 'MMM d')
    acc[day] = (acc[day] || 0) + p.amount
    return acc
  }, {} as Record<string, number>)
  const revChartData = Object.entries(revByDay).slice(-14).map(([day, rev]) => ({ day, rev }))

  const planData = Object.entries(stats.planBreakdown).map(([name, value]) => ({ name, value }))

  const KPIS = [
    { label: 'Total Users', value: stats.totalUsers.toLocaleString(), icon: Users, color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300', change: '+12%' },
    { label: 'Pro Subscribers', value: stats.proUsers.toLocaleString(), icon: Star, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', change: `${conversionRate}% CVR` },
    { label: 'Revenue (30d)', value: `₹${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', change: '+8%' },
    { label: 'Tasks (30d)', value: stats.todosThisMonth.toLocaleString(), icon: BookOpen, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', change: '' },
    { label: 'AI Chats (30d)', value: stats.aiChats.toLocaleString(), icon: MessageSquare, color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300', change: '' },
    { label: 'Stories (30d)', value: stats.stories.toLocaleString(), icon: Sparkles, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300', change: '' },
    { label: 'Children', value: stats.children.toLocaleString(), icon: Users, color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300', change: '' },
    { label: 'Schools', value: stats.schools.toLocaleString(), icon: School, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300', change: '' },
  ]

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black gradient-text">AIVANA</span>
            <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-bold px-2 py-0.5 rounded-full">ADMIN</span>
          </div>
          <div className="flex gap-2 text-sm text-muted-foreground">
            <span>Platform Dashboard</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {KPIS.map((kpi, i) => (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card border rounded-2xl p-4">
              <div className={`inline-flex p-2 rounded-xl mb-3 ${kpi.color}`}>
                <kpi.icon className="h-4 w-4" />
              </div>
              <p className="text-2xl font-black">{kpi.value}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                {kpi.change && <span className="text-xs text-green-600 font-semibold">{kpi.change}</span>}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-secondary rounded-2xl w-fit">
          {(['overview', 'users', 'revenue'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all capitalize ${activeTab === t ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>
              {t}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="grid md:grid-cols-3 gap-5">
            {/* User composition */}
            <div className="bg-card border rounded-3xl p-5">
              <h3 className="font-bold text-sm mb-4">User Composition</h3>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={[
                    { name: 'Children', value: stats.children },
                    { name: 'Parents', value: stats.parents },
                    { name: 'Pro Users', value: stats.proUsers },
                  ]} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {['#7C3AED', '#10B981', '#F59E0B'].map((c, i) => <Cell key={i} fill={c} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {[['Children', stats.children, '#7C3AED'], ['Parents', stats.parents, '#10B981'], ['Pro', stats.proUsers, '#F59E0B']].map(([l, v, c]) => (
                  <div key={l as string} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c as string }} />
                      <span>{l as string}</span>
                    </div>
                    <span className="font-bold">{(v as number).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Revenue chart */}
            <div className="md:col-span-2 bg-card border rounded-3xl p-5">
              <h3 className="font-bold text-sm mb-4">Revenue (Last 14 Days)</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={revChartData} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '11px' }}
                    formatter={(v: number) => [`₹${v}`, 'Revenue']} />
                  <Bar dataKey="rev" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-card border rounded-3xl overflow-hidden">
            <div className="px-5 py-4 border-b">
              <h3 className="font-bold text-sm">Recent Signups</h3>
            </div>
            <div className="divide-y">
              {recentUsers.map((u, i) => (
                <div key={u.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-secondary transition-colors">
                  <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-sm font-bold text-violet-600">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${u.role === 'child' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                      {u.role}
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(u.created_at), 'MMM d')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'revenue' && (
          <div className="grid md:grid-cols-2 gap-5">
            <div className="bg-card border rounded-3xl p-5">
              <h3 className="font-bold text-sm mb-4">Revenue by Plan</h3>
              {planData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={planData} cx="50%" cy="50%" outerRadius={70} paddingAngle={3} dataKey="value">
                        {planData.map((entry, i) => <Cell key={i} fill={PLAN_COLORS[entry.name] || '#888'} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => [`₹${v}`, 'Revenue']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-2">
                    {planData.map(p => (
                      <div key={p.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PLAN_COLORS[p.name] || '#888' }} />
                          <span className="capitalize">{p.name} Plan</span>
                        </div>
                        <span className="font-bold">₹{p.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">No revenue data yet</div>
              )}
            </div>

            <div className="bg-card border rounded-3xl p-5">
              <h3 className="font-bold text-sm mb-4">Key Metrics</h3>
              <div className="space-y-4">
                {[
                  { label: 'Monthly Recurring Revenue', value: `₹${stats.totalRevenue.toLocaleString()}` },
                  { label: 'Paid Conversion Rate', value: `${conversionRate}%` },
                  { label: 'Avg Revenue Per User', value: stats.proUsers > 0 ? `₹${Math.round(stats.totalRevenue / stats.proUsers)}` : '₹0' },
                  { label: 'Free Users', value: (stats.totalUsers - stats.proUsers).toLocaleString() },
                  { label: 'School Accounts', value: stats.schools.toString() },
                ].map(m => (
                  <div key={m.label} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                    <span className="text-sm text-muted-foreground">{m.label}</span>
                    <span className="font-bold text-sm">{m.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
