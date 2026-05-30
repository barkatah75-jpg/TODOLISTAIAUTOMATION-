'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Profile, FamilyLink, Todo } from '@/types/database'
import { ParentNavbar } from './ParentNavbar'
import { assignTaskToChild } from '@/lib/actions/parent'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { Plus, Loader2, CheckCircle2, Clock, Flame, X } from 'lucide-react'

const QUICK_TASKS = [
  { text: 'Complete math homework', emoji: '🔢', category: 'homework' as const, points: 30 },
  { text: 'Read for 20 minutes', emoji: '📚', category: 'reading' as const, points: 20 },
  { text: 'Clean your room', emoji: '🧹', category: 'chores' as const, points: 25 },
  { text: 'Practice handwriting', emoji: '✏️', category: 'homework' as const, points: 15 },
  { text: 'Exercise for 15 minutes', emoji: '💪', category: 'exercise' as const, points: 20 },
  { text: 'Help with dishes', emoji: '🍽️', category: 'chores' as const, points: 20 },
]

const schema = z.object({
  text: z.string().min(1).max(300),
  category: z.enum(['homework','chores','reading','exercise','creative','social','personal','custom']).default('homework'),
  emoji: z.string().default('📚'),
  points: z.number().int().min(5).max(500).default(20),
  priority: z.number().int().min(1).max(3).default(1),
  due_date: z.string().optional(),
  requireApproval: z.boolean().default(false),
})
type FormData = z.infer<typeof schema>

interface Props {
  profile: Profile
  familyLinks: (FamilyLink & { child: { id: string; name: string; display_name: string | null; avatar_url: string | null } })[]
  activeChildId: string | null
  childTasks: Todo[]
}

export function AssignTasksClient({ profile, familyLinks, activeChildId: initialChildId, childTasks: initialTasks }: Props) {
  const router = useRouter()
  const [activeChildId, setActiveChildId] = useState(initialChildId)
  const [childTasks, setChildTasks] = useState<Todo[]>(initialTasks)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'homework', emoji: '📚', points: 20, priority: 1, requireApproval: false },
  })

  const activeChild = familyLinks.find(l => l.child_id === activeChildId)?.child

  const onSubmit = async (data: FormData) => {
    if (!activeChildId) return toast.error('Select a child first')
    setSubmitting(true)
    try {
      const result = await assignTaskToChild({
        ...data,
        childId: activeChildId,
        due_date: data.due_date ? new Date(data.due_date).toISOString() : null,
      })
      if (result.error) throw new Error(result.error)
      setChildTasks(prev => [result.data!, ...prev])
      reset()
      setShowForm(false)
      toast.success(`Task assigned to ${activeChild?.display_name || activeChild?.name}! 📋`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to assign')
    } finally {
      setSubmitting(false)
    }
  }

  const handleQuickTask = async (qt: typeof QUICK_TASKS[0]) => {
    if (!activeChildId) return toast.error('Select a child first')
    setSubmitting(true)
    try {
      const result = await assignTaskToChild({ ...qt, childId: activeChildId, priority: 1, requireApproval: false })
      if (result.error) throw new Error(result.error)
      setChildTasks(prev => [result.data!, ...prev])
      toast.success('Quick task assigned! ✅')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <ParentNavbar profile={profile} />
      <main className="max-w-2xl mx-auto px-4 pb-24 pt-4 space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black">Assign Tasks 📋</h1>
          <button onClick={() => setShowForm(!showForm)}
            className={`btn-kid flex items-center gap-1.5 px-3 py-2 text-xs font-bold ${showForm ? 'bg-secondary' : 'bg-violet-600 text-white'}`}>
            {showForm ? <><X className="h-3.5 w-3.5" /> Cancel</> : <><Plus className="h-3.5 w-3.5" /> Custom Task</>}
          </button>
        </div>

        {/* Child selector */}
        {familyLinks.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {familyLinks.map(link => (
              <button key={link.child_id} onClick={() => {
                setActiveChildId(link.child_id)
                router.push(`/parent/tasks?child=${link.child_id}`)
              }}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${activeChildId === link.child_id ? 'bg-violet-600 text-white' : 'bg-card border hover:bg-secondary'}`}>
                🧒 {link.child.display_name || link.child.name}
              </button>
            ))}
          </div>
        )}

        {!activeChildId ? (
          <div className="text-center py-10 text-muted-foreground">No children linked yet.</div>
        ) : (
          <>
            {/* Quick tasks */}
            {!showForm && (
              <div>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Quick Assign</p>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_TASKS.map(qt => (
                    <button key={qt.text} onClick={() => handleQuickTask(qt)} disabled={submitting}
                      className="flex items-center gap-2 bg-card border rounded-2xl p-3 hover:border-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-all text-left disabled:opacity-50">
                      <span className="text-2xl">{qt.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{qt.text}</p>
                        <span className="xp-badge text-xs">+{qt.points} XP</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom task form */}
            <AnimatePresence>
              {showForm && (
                <motion.form initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  onSubmit={handleSubmit(onSubmit)} className="bg-card border rounded-3xl p-5 space-y-4">
                  <p className="font-bold text-sm">Assign to: {activeChild?.display_name || activeChild?.name} 👤</p>

                  <div>
                    <label className="text-xs font-medium mb-1 block">Task Description *</label>
                    <input {...register('text')} placeholder="What should they do?"
                      className="w-full py-2.5 px-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                    {errors.text && <p className="text-destructive text-xs mt-1">{errors.text.message}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium mb-1 block">Category</label>
                      <select {...register('category')} className="w-full py-2.5 px-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                        {[['homework','📚 Homework'],['chores','🧹 Chores'],['reading','📖 Reading'],['exercise','💪 Exercise'],['creative','🎨 Creative'],['custom','✏️ Custom']].map(([v,l]) =>
                          <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">XP Points</label>
                      <select {...register('points', { valueAsNumber: true })} className="w-full py-2.5 px-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                        {[10,15,20,25,30,50,75,100].map(p => <option key={p} value={p}>⚡ {p} XP</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium mb-1 block">Due Date (optional)</label>
                    <input {...register('due_date')} type="datetime-local"
                      className="w-full py-2.5 px-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" {...register('requireApproval')} className="rounded" />
                    <span className="text-sm">Require my approval before XP is awarded</span>
                  </label>

                  <button type="submit" disabled={submitting}
                    className="btn-kid w-full bg-violet-600 text-white py-3 text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" /> Assign Task</>}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Child's tasks list */}
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                {activeChild?.display_name || activeChild?.name}'s Tasks ({childTasks.length})
              </p>
              {childTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">No tasks yet. Add one above!</div>
              ) : (
                <div className="space-y-2">
                  {childTasks.slice(0, 15).map((task, i) => (
                    <motion.div key={task.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-3 bg-card border rounded-2xl px-4 py-3">
                      <span className="text-xl">{task.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${task.completed ? 'line-through text-muted-foreground' : ''}`}>{task.text}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="xp-badge text-xs">⚡ {task.points}</span>
                          {task.due_date && <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {format(new Date(task.due_date), 'MMM d')}</span>}
                          {task.priority === 3 && <Flame className="h-3 w-3 text-red-500" />}
                          {task.parent_approved === null && task.completed && <span className="text-xs text-amber-500 font-medium">⏳ Awaiting approval</span>}
                          {task.parent_approved === true && <span className="text-xs text-green-500 font-medium">✅ Approved</span>}
                        </div>
                      </div>
                      {task.completed && <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
