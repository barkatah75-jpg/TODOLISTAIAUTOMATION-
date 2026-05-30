'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import type { ClassroomAssignment } from '@/types/advanced'

interface Props {
  teacher: { id: string; school_id: string; role: string }
  school: { id: string; name: string } | null
  assignments: ClassroomAssignment[]
  students: Array<{ id: string; class_name: string | null; profile: { id: string; name: string } | null }>
}

const SUBJECTS = ['Math', 'Science', 'English', 'Hindi', 'Social Studies', 'Computer', 'Art', 'Physical Education', 'Other']
const EMOJIS = ['📚', '🔢', '🔬', '✍️', '📖', '🖥️', '🎨', '🏃', '📝']

const defaultForm = {
  title: '', description: '', subject: 'Math', class_name: '',
  points: 50, emoji: '📚', due_date: '',
}

export function SchoolAssignmentsClient({ teacher, school, assignments: initialAssignments, students }: Props) {
  const [assignments, setAssignments] = useState(initialAssignments)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [isCreating, setIsCreating] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'past'>('all')

  const classNames = [...new Set(students.map((s) => s.class_name).filter(Boolean))] as string[]

  const filtered = assignments.filter((a) => {
    if (filter === 'active') return a.active
    if (filter === 'past') return !a.active
    return true
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return toast.error('Title is required')
    setIsCreating(true)
    try {
      const res = await fetch('/api/school', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_assignment',
          schoolId: teacher.school_id,
          ...form,
          points: Number(form.points),
        }),
      })
      const data = await res.json()
      if (!res.ok) return toast.error(data.error || 'Failed to create')
      toast.success('Assignment created!')
      setAssignments((prev) => [data.assignment, ...prev])
      setShowCreate(false)
      setForm(defaultForm)
    } catch {
      toast.error('Something went wrong')
    } finally {
      setIsCreating(false)
    }
  }

  const handleToggleActive = async (id: string, active: boolean) => {
    const res = await fetch('/api/school', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_assignment', assignmentId: id, active: !active }),
    })
    if (res.ok) {
      setAssignments((prev) => prev.map((a) => a.id === id ? { ...a, active: !active } : a))
      toast.success(active ? 'Assignment deactivated' : 'Assignment activated')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/school/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← Dashboard</a>
            <span className="text-gray-300">|</span>
            <div>
              <h1 className="font-black text-lg">Assignments</h1>
              <p className="text-xs text-muted-foreground">{school?.name}</p>
            </div>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-bold rounded-xl hover:opacity-90 transition">
            + New Assignment
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: assignments.length, icon: '📋' },
            { label: 'Active', value: assignments.filter((a) => a.active).length, icon: '✅' },
            { label: 'Classes', value: classNames.length, icon: '🏫' },
          ].map((s) => (
            <div key={s.label} className="bg-card border rounded-2xl p-4 text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-xl font-black">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {(['all', 'active', 'past'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${filter === f ? 'bg-blue-500 text-white' : 'border hover:bg-muted'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Assignment list */}
        <div className="space-y-3">
          {filtered.map((assignment, i) => (
            <motion.div key={assignment.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="bg-card border rounded-2xl p-4 flex items-start gap-4 hover:shadow-md transition">
              <span className="text-3xl">{assignment.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-sm">{assignment.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${assignment.active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700'}`}>
                    {assignment.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex gap-3 mt-1 flex-wrap">
                  <span className="text-xs text-muted-foreground">{assignment.subject}</span>
                  {assignment.class_name && <span className="text-xs text-muted-foreground">· {assignment.class_name}</span>}
                  {assignment.due_date && <span className="text-xs text-muted-foreground">· Due {format(new Date(assignment.due_date), 'MMM d')}</span>}
                  <span className="text-xs font-semibold text-purple-600">· {assignment.points} pts</span>
                </div>
                {assignment.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{assignment.description}</p>
                )}
                <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                  <span>{assignment.total_assigned || 0} assigned</span>
                  <span>{assignment.total_completed || 0} completed</span>
                  {assignment.total_assigned > 0 && (
                    <span className="text-green-600 font-semibold">
                      {Math.round(((assignment.total_completed || 0) / assignment.total_assigned) * 100)}% done
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => handleToggleActive(assignment.id, assignment.active)}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition flex-shrink-0 ${
                  assignment.active
                    ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400'
                    : 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400'
                }`}>
                {assignment.active ? 'Deactivate' : 'Activate'}
              </button>
            </motion.div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <div className="text-5xl mb-3">📋</div>
              <p className="font-semibold">No assignments yet</p>
              <p className="text-sm mt-1">Create your first assignment!</p>
            </div>
          )}
        </div>
      </main>

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4"
            onClick={() => setShowCreate(false)}>
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
              className="bg-card border rounded-3xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}>
              <h2 className="font-black text-xl mb-5">📋 New Assignment</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                {/* Emoji picker */}
                <div className="flex gap-2 flex-wrap">
                  {EMOJIS.map((e) => (
                    <button key={e} type="button" onClick={() => setForm((f) => ({ ...f, emoji: e }))}
                      className={`text-xl p-2 rounded-xl transition ${form.emoji === e ? 'bg-blue-100 border-2 border-blue-400' : 'hover:bg-muted border-2 border-transparent'}`}>
                      {e}
                    </button>
                  ))}
                </div>

                <input type="text" placeholder="Assignment title *" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <textarea placeholder="Description (optional)" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />

                <div className="grid grid-cols-2 gap-3">
                  <select value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                    className="px-3 py-3 rounded-xl border bg-background text-sm focus:outline-none">
                    {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                  {classNames.length > 0 ? (
                    <select value={form.class_name} onChange={(e) => setForm((f) => ({ ...f, class_name: e.target.value }))}
                      className="px-3 py-3 rounded-xl border bg-background text-sm focus:outline-none">
                      <option value="">All Classes</option>
                      {classNames.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  ) : (
                    <input type="text" placeholder="Class name" value={form.class_name} onChange={(e) => setForm((f) => ({ ...f, class_name: e.target.value }))}
                      className="px-3 py-3 rounded-xl border bg-background text-sm focus:outline-none" />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Points: {form.points}</label>
                    <input type="range" min={10} max={500} step={10} value={form.points} onChange={(e) => setForm((f) => ({ ...f, points: parseInt(e.target.value) }))}
                      className="w-full accent-blue-500" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Due Date</label>
                    <input type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border bg-background text-sm focus:outline-none" />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button type="submit" disabled={isCreating}
                    className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-xl disabled:opacity-60 transition">
                    {isCreating ? 'Creating...' : 'Create Assignment'}
                  </button>
                  <button type="button" onClick={() => setShowCreate(false)}
                    className="px-4 py-3 border rounded-xl text-sm font-semibold hover:bg-muted transition">
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
