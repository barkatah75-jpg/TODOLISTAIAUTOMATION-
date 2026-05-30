'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

type UserRole = 'child' | 'parent' | 'admin'
type SubscriptionPlan = 'free' | 'pro' | 'family' | 'school'

interface UserRow {
  id: string
  email: string
  name: string
  display_name: string | null
  role: UserRole
  onboarded: boolean
  created_at: string
  subscriptions?: Array<{ plan: string; status: string }> | { plan: string; status: string } | null
  rewards?: Array<{ total_xp: number; level: number; tasks_completed: number }> | { total_xp: number; level: number; tasks_completed: number } | null
}

interface Props {
  initialUsers: UserRow[]
  totalUsers: number
  roleStats: Record<string, number>
}

const ROLE_COLORS: Record<string, string> = {
  child: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  parent: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  pro: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  family: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  school: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
}

function getUserPlan(user: UserRow): string {
  const sub = Array.isArray(user.subscriptions) ? user.subscriptions[0] : user.subscriptions
  return sub?.plan || 'free'
}

function getUserRewards(user: UserRow) {
  return Array.isArray(user.rewards) ? user.rewards[0] : user.rewards
}

export function AdminUsersClient({ initialUsers, totalUsers, roleStats }: Props) {
  const [users, setUsers] = useState(initialUsers)
  const [total, setTotal] = useState(totalUsers)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  const [isActioning, setIsActioning] = useState(false)

  const fetchUsers = useCallback(async (q = search, role = roleFilter, plan = planFilter, p = page) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' })
      if (q) params.set('search', q)
      if (role) params.set('role', role)
      if (plan) params.set('plan', plan)
      const res = await fetch(`/api/admin/users?${params}`)
      const data = await res.json()
      if (data.users) {
        setUsers(data.users)
        setTotal(data.total)
      }
    } catch {
      toast.error('Failed to fetch users')
    } finally {
      setIsLoading(false)
    }
  }, [search, roleFilter, planFilter, page])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchUsers(search, roleFilter, planFilter, 1)
  }

  const handleAction = async (action: string, value?: string) => {
    if (!selectedUser) return
    setIsActioning(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id, action, role: value, plan: value }),
      })
      const data = await res.json()
      if (!res.ok) return toast.error(data.error || 'Action failed')
      toast.success(data.message || 'Updated!')
      setSelectedUser(null)
      fetchUsers()
    } catch {
      toast.error('Action failed')
    } finally {
      setIsActioning(false)
    }
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('Delete this user permanently? This cannot be undone.')) return
    setIsActioning(true)
    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) return toast.error(data.error || 'Delete failed')
      toast.success('User deleted')
      setSelectedUser(null)
      fetchUsers()
    } catch {
      toast.error('Delete failed')
    } finally {
      setIsActioning(false)
    }
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/admin/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← Dashboard</a>
            <span className="text-gray-300">|</span>
            <h1 className="font-black text-lg">User Management</h1>
          </div>
          <span className="text-sm text-muted-foreground">{total.toLocaleString()} users total</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        {/* Role stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Children', key: 'child', icon: '🧒' },
            { label: 'Parents', key: 'parent', icon: '👨‍👩‍👧' },
            { label: 'Admins', key: 'admin', icon: '🛡️' },
          ].map((r) => (
            <div key={r.key} className="bg-card border rounded-2xl p-4 text-center">
              <div className="text-2xl mb-1">{r.icon}</div>
              <div className="text-2xl font-black">{(roleStats[r.key] || 0).toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">{r.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-48 px-4 py-2 rounded-xl border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); fetchUsers(search, e.target.value, planFilter, 1) }}
            className="px-3 py-2 rounded-xl border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Roles</option>
            <option value="child">Child</option>
            <option value="parent">Parent</option>
            <option value="admin">Admin</option>
          </select>
          <select
            value={planFilter}
            onChange={(e) => { setPlanFilter(e.target.value); setPage(1); fetchUsers(search, roleFilter, e.target.value, 1) }}
            className="px-3 py-2 rounded-xl border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Plans</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="family">Family</option>
            <option value="school">School</option>
          </select>
          <button type="submit" className="px-4 py-2 bg-purple-500 text-white text-sm font-semibold rounded-xl hover:bg-purple-600 transition">
            Search
          </button>
        </form>

        {/* Table */}
        <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="py-16 text-center text-muted-foreground animate-pulse">Loading users...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    {['User', 'Role', 'Plan', 'Level / XP', 'Joined', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((user, i) => {
                    const plan = getUserPlan(user)
                    const rewards = getUserRewards(user)
                    return (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="hover:bg-muted/30 transition"
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-semibold text-foreground">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ROLE_COLORS[user.role] || ''}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${PLAN_COLORS[plan] || ''}`}>
                            {plan}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {rewards ? `Lv${rewards.level} · ${rewards.total_xp.toLocaleString()} XP` : '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {format(new Date(user.created_at), 'dd MMM yy')}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="text-xs px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 transition font-semibold"
                          >
                            Manage
                          </button>
                        </td>
                      </motion.tr>
                    )
                  })}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground">No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages} ({total} total)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { const p = page - 1; setPage(p); fetchUsers(search, roleFilter, planFilter, p) }}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 hover:bg-muted transition"
              >
                ← Prev
              </button>
              <button
                onClick={() => { const p = page + 1; setPage(p); fetchUsers(search, roleFilter, planFilter, p) }}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg border text-sm disabled:opacity-40 hover:bg-muted transition"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </main>

      {/* User action modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedUser(null)}>
          <div className="bg-card border rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-black text-lg mb-1">{selectedUser.name}</h2>
            <p className="text-sm text-muted-foreground mb-5">{selectedUser.email}</p>

            <div className="space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Change Role</p>
              <div className="grid grid-cols-3 gap-2">
                {(['child', 'parent', 'admin'] as const).map((r) => (
                  <button key={r} onClick={() => handleAction('set_role', r)} disabled={isActioning || selectedUser.role === r}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${selectedUser.role === r ? 'bg-purple-500 text-white border-purple-500' : 'border-border hover:bg-muted'}`}>
                    {r}
                  </button>
                ))}
              </div>

              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mt-3">Change Plan</p>
              <div className="grid grid-cols-2 gap-2">
                {(['free', 'pro', 'family', 'school'] as const).map((p) => (
                  <button key={p} onClick={() => handleAction('set_plan', p)} disabled={isActioning || getUserPlan(selectedUser) === p}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${getUserPlan(selectedUser) === p ? 'bg-purple-500 text-white border-purple-500' : 'border-border hover:bg-muted'}`}>
                    {p}
                  </button>
                ))}
              </div>

              <button onClick={() => handleDelete(selectedUser.id)} disabled={isActioning}
                className="w-full py-2.5 mt-2 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-200 transition">
                🗑️ Delete User
              </button>
              <button onClick={() => setSelectedUser(null)} className="w-full py-2 rounded-xl border text-sm font-semibold hover:bg-muted transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
