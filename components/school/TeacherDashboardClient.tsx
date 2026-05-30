'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createAssignment } from '@/lib/school/actions'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { Plus, X, Users, BookOpen, CheckCircle2, Clock, Copy, Loader2, TrendingUp } from 'lucide-react'
import type { Profile } from '@/types/database'

const schema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  subject: z.string().min(1).max(100),
  className: z.string().min(1).max(50),
  dueDate: z.string().optional(),
  points: z.number().int().min(5).max(500).default(20),
  emoji: z.string().default('📚'),
})
type FormData = z.infer<typeof schema>

const SUBJECTS = ['Math', 'Science', 'English', 'Hindi', 'Social Studies', 'Computer', 'Art', 'PE', 'Other']
const EMOJIS = ['📚', '🔢', '🔬', '✏️', '🗺️', '💻', '🎨', '⚽', '📖']

interface Props {
  profile: Profile
  school: { id: string; name: string; code: string; max_students: number }
  assignments: Array<{
    id: string; title: string; subject: string; class_name: string;
    emoji: string; points: number; due_date: string | null;
    total_assigned: number; total_completed: number; created_at: string
  }>
  students: Array<{ user_id: string; class_name: string; profile: { name: string; display_name: string | null } | null }>
  teacherRole: 'teacher' | 'admin'
}

export function TeacherDashboardClient({ profile, school, assignments, students, teacherRole }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [localAssignments, setLocalAssignments] = useState(assignments)
  const [activeTab, setActiveTab] = useState<'assignments' | 'students'>('assignments')

  const classes = [...new Set(students.map(s => s.class_name).filter(Boolean))]

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { subject: 'Math', className: classes[0] || '', points: 20, emoji: '📚' },
  })

  const watchEmoji = watch('emoji')

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)
    try {
      const result = await createAssignment({
        ...data,
        schoolId: school.id,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
      })
      if (result.error) throw new Error(result.error)
      toast.success(`Assignment sent to ${students.filter(s => s.class_name === data.className).length} students! 📚`)
      setLocalAssignments(prev => [result.data!, ...prev])
      reset()
      setShowForm(false)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  const copyCode = () => {
    navigator.clipboard.writeText(school.code)
    toast.success('School code copied!')
  }

  const completionRate = (a: typeof assignments[0]) =>
    a.total_assigned > 0 ? Math.round((a.total_completed / a.total_assigned) * 100) : 0

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-black text-lg flex items-center gap-2">🏫 {school.name}</h1>
            <p className="text-xs text-muted-foreground">{profile.display_name || profile.name} · {teacherRole}</p>
          </div>
          <button onClick={copyCode} className="flex items-center gap-1.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-xl px-3 py-2 text-xs font-bold hover:bg-violet-200 transition-colors">
            <Copy className="h-3 w-3" /> {school.code}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pb-10 pt-4 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Students', value: students.length, icon: Users, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
            { label: 'Assignments', value: localAssignments.length, icon: BookOpen, color: 'text-violet-600 bg-violet-100 dark:bg-violet-900/30' },
            { label: 'Avg Completion', value: `${localAssignments.length > 0 ? Math.round(localAssignments.reduce((s, a) => s + completionRate(a), 0) / localAssignments.length) : 0}%`, icon: TrendingUp, color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
          ].map(stat => (
            <div key={stat.label} className="bg-card border rounded-2xl p-4">
              <div className={`inline-flex p-2 rounded-xl mb-2 ${stat.color}`}>
                <stat.icon className="h-4 w-4" />
              </div>
              <p className="text-2xl font-black">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-secondary rounded-2xl">
          {(['assignments', 'students'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all capitalize ${activeTab === t ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>
              {t === 'assignments' ? '📋 Assignments' : '👥 Students'}
            </button>
          ))}
        </div>

        {/* Add assignment button */}
        {activeTab === 'assignments' && (
          <button onClick={() => setShowForm(!showForm)}
            className={`btn-kid flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold ${showForm ? 'bg-secondary' : 'bg-violet-600 text-white'}`}>
            {showForm ? <><X className="h-4 w-4" /> Cancel</> : <><Plus className="h-4 w-4" /> New Assignment</>}
          </button>
        )}

        {/* Assignment form */}
        <AnimatePresence>
          {showForm && activeTab === 'assignments' && (
            <motion.form initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              onSubmit={handleSubmit(onSubmit)} className="bg-card border rounded-3xl p-5 space-y-4">
              <p className="font-bold text-sm">Create Assignment 📝</p>

              {/* Emoji + title */}
              <div className="flex gap-2">
                <select value={watchEmoji} onChange={e => setValue('emoji', e.target.value)}
                  className="w-16 py-2.5 px-2 rounded-xl border bg-background text-lg focus:outline-none focus:ring-2 focus:ring-violet-500">
                  {EMOJIS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
                <input {...register('title')} placeholder="Assignment title *"
                  className="flex-1 py-2.5 px-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>

              <textarea {...register('description')} rows={2} placeholder="Instructions (optional)"
                className="w-full py-2.5 px-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Subject *</label>
                  <select {...register('subject')} className="w-full py-2.5 px-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Class *</label>
                  <select {...register('className')} className="w-full py-2.5 px-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                    {classes.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="all">All Classes</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Due Date</label>
                  <input {...register('dueDate')} type="datetime-local"
                    className="w-full py-2.5 px-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">XP Points</label>
                  <select {...register('points', { valueAsNumber: true })} className="w-full py-2.5 px-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                    {[10, 15, 20, 25, 30, 50].map(p => <option key={p} value={p}>⚡ {p} XP</option>)}
                  </select>
                </div>
              </div>

              <button type="submit" disabled={submitting}
                className="btn-kid w-full bg-violet-600 text-white py-3 text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><BookOpen className="h-4 w-4" /> Assign to Students</>}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Assignments list */}
        {activeTab === 'assignments' && (
          <div className="space-y-3">
            {localAssignments.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No assignments yet. Create your first one!</p>
              </div>
            ) : localAssignments.map((a, i) => (
              <motion.div key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                className="bg-card border rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{a.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{a.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full px-2 py-0.5 font-medium">{a.subject}</span>
                      <span className="text-xs text-muted-foreground">{a.class_name}</span>
                      <span className="xp-badge">⚡ {a.points}</span>
                      {a.due_date && <span className="flex items-center gap-0.5 text-xs text-muted-foreground"><Clock className="h-2.5 w-2.5" /> {format(new Date(a.due_date), 'MMM d')}</span>}
                    </div>
                    {/* Completion progress */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${completionRate(a)}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        {a.total_completed}/{a.total_assigned} ({completionRate(a)}%)
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Students list */}
        {activeTab === 'students' && (
          <div className="space-y-2">
            {students.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-muted-foreground text-sm">No students yet. Share the code <strong>{school.code}</strong> with your students.</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-2">
                  Share code <strong className="text-foreground">{school.code}</strong> with students to join
                </p>
                {students.map((s, i) => (
                  <motion.div key={s.user_id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-3 bg-card border rounded-xl px-4 py-3">
                    <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-sm font-bold text-violet-600">
                      {(s.profile?.display_name || s.profile?.name || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{s.profile?.display_name || s.profile?.name}</p>
                      <p className="text-xs text-muted-foreground">{s.class_name}</p>
                    </div>
                  </motion.div>
                ))}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
