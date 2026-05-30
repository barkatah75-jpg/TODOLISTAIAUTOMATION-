'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface StudentRow {
  id: string
  class_name: string | null
  joined_at: string
  profile: { id: string; name: string; display_name: string | null; avatar_url: string | null; email: string } | null
  rewards: { total_xp: number; level: number; tasks_completed: number; streak_days: number } | null
}

interface Props {
  teacher: { id: string; role: string; school_id: string }
  school: { id: string; name: string; code: string } | null
  students: StudentRow[]
  classNames: string[]
}

export function SchoolStudentsClient({ teacher, school, students, classNames }: Props) {
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'xp' | 'streak' | 'tasks'>('xp')

  const filtered = students
    .filter((s) => {
      const name = s.profile?.name?.toLowerCase() || ''
      const matches = search === '' || name.includes(search.toLowerCase())
      const classMatch = classFilter === '' || s.class_name === classFilter
      return matches && classMatch
    })
    .sort((a, b) => {
      if (sortBy === 'name') return (a.profile?.name || '').localeCompare(b.profile?.name || '')
      if (sortBy === 'xp') return (b.rewards?.total_xp || 0) - (a.rewards?.total_xp || 0)
      if (sortBy === 'streak') return (b.rewards?.streak_days || 0) - (a.rewards?.streak_days || 0)
      if (sortBy === 'tasks') return (b.rewards?.tasks_completed || 0) - (a.rewards?.tasks_completed || 0)
      return 0
    })

  const avgXP = students.length > 0
    ? Math.round(students.reduce((s, st) => s + (st.rewards?.total_xp || 0), 0) / students.length)
    : 0

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/school/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← Dashboard</a>
            <span className="text-gray-300">|</span>
            <div>
              <h1 className="font-black text-lg">Students</h1>
              <p className="text-xs text-muted-foreground">{school?.name}</p>
            </div>
          </div>
          <span className="text-sm text-muted-foreground">{students.length} students</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Students', value: students.length, icon: '🧒' },
            { label: 'Avg XP', value: avgXP.toLocaleString(), icon: '⭐' },
            { label: 'Classes', value: classNames.length, icon: '🏫' },
          ].map((s) => (
            <div key={s.label} className="bg-card border rounded-2xl p-4 text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-xl font-black">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-48 px-4 py-2 rounded-xl border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {classNames.length > 0 && (
            <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border bg-card text-sm focus:outline-none">
              <option value="">All Classes</option>
              {classNames.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-2 rounded-xl border bg-card text-sm focus:outline-none">
            <option value="xp">Sort by XP</option>
            <option value="streak">Sort by Streak</option>
            <option value="tasks">Sort by Tasks</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>

        {/* Student cards */}
        <div className="grid gap-3">
          {filtered.map((student, i) => (
            <motion.div key={student.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-card border rounded-2xl p-4 flex items-center gap-4 hover:shadow-md transition">
              {/* Rank */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${
                i === 0 ? 'bg-yellow-400 text-white' : i === 1 ? 'bg-gray-300 text-gray-700' : i === 2 ? 'bg-orange-400 text-white' : 'bg-muted text-muted-foreground'
              }`}>
                {i + 1}
              </div>

              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                {student.profile?.avatar_url
                  ? <img src={student.profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  : student.profile?.name?.[0]?.toUpperCase() || '?'}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{student.profile?.name || 'Unknown'}</p>
                {student.class_name && <p className="text-xs text-muted-foreground">{student.class_name}</p>}
              </div>

              {/* Stats */}
              <div className="flex gap-4 text-center">
                <div>
                  <p className="text-sm font-black text-purple-600">{(student.rewards?.total_xp || 0).toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">XP</p>
                </div>
                <div>
                  <p className="text-sm font-black text-orange-500">{student.rewards?.streak_days || 0}🔥</p>
                  <p className="text-[10px] text-muted-foreground">Streak</p>
                </div>
                <div>
                  <p className="text-sm font-black text-green-600">{student.rewards?.tasks_completed || 0}</p>
                  <p className="text-[10px] text-muted-foreground">Tasks</p>
                </div>
                <div>
                  <p className="text-sm font-black text-blue-600">Lv{student.rewards?.level || 1}</p>
                  <p className="text-[10px] text-muted-foreground">Level</p>
                </div>
              </div>
            </motion.div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <div className="text-5xl mb-3">🔍</div>
              <p className="font-semibold">No students found</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
