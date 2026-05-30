'use client'

import { useState, useOptimistic, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Profile, Todo } from '@/types/database'
import { createTodo, deleteTodo } from '@/lib/actions/todos'
import { generateTaskSuggestions } from '@/lib/actions/ai'
import { TodoCard } from './TodoCard'
import { ChildNavbar } from './ChildNavbar'
import { useVoiceInput } from '@/hooks/useVoiceInput'
import toast from 'react-hot-toast'
import {
  Plus, Mic, MicOff, Sparkles, Filter, X,
  Loader2, ChevronDown, Flame, BookOpen, Home, Dumbbell
} from 'lucide-react'

const CATEGORIES = [
  { value: 'all', label: 'All', emoji: '🌟' },
  { value: 'homework', label: 'Homework', emoji: '📚' },
  { value: 'chores', label: 'Chores', emoji: '🏠' },
  { value: 'reading', label: 'Reading', emoji: '📖' },
  { value: 'exercise', label: 'Exercise', emoji: '💪' },
  { value: 'creative', label: 'Creative', emoji: '🎨' },
  { value: 'custom', label: 'Custom', emoji: '✏️' },
]

const EMOJIS = ['✅', '📚', '🏠', '🎨', '💪', '🎮', '🌟', '🔥', '📖', '🧹', '🍎', '🎵', '🧪', '✏️', '🏃', '🛁']

const addSchema = z.object({
  text: z.string().min(1, 'Task cannot be empty').max(300),
  category: z.enum(['homework','chores','reading','exercise','creative','social','personal','custom']).default('custom'),
  emoji: z.string().default('✅'),
  points: z.number().int().min(5).max(500).default(10),
  priority: z.number().int().min(1).max(3).default(1),
  due_date: z.string().optional(),
})
type AddForm = z.infer<typeof addSchema>

interface Props {
  profile: Profile
  initialTodos: Todo[]
  rewards: { total_xp: number; level: number } | null
}

export function TodosClient({ profile, initialTodos, rewards }: Props) {
  const searchParams = useSearchParams()
  const [todos, setTodos] = useState<Todo[]>(initialTodos)
  const [showAdd, setShowAdd] = useState(searchParams.get('voice') === '1')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const [loadingAI, setLoadingAI] = useState(false)
  const [isPending, startTransition] = useTransition()

  const { isListening, transcript, interimTranscript, supported, toggleListening, resetTranscript } = useVoiceInput({
    language: 'en-IN',
    onResult: (text, isFinal) => {
      if (isFinal) setValue('text', text)
    },
  })

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<AddForm>({
    resolver: zodResolver(addSchema),
    defaultValues: { text: '', category: 'custom', emoji: '✅', points: 10, priority: 1 },
  })

  const watchedEmoji = watch('emoji')
  const filteredTodos = selectedCategory === 'all'
    ? todos
    : todos.filter(t => t.category === selectedCategory)

  const onSubmit = async (data: AddForm) => {
    try {
      const result = await createTodo({
        ...data,
        due_date: data.due_date ? new Date(data.due_date).toISOString() : null,
      })
      if (result.error) throw new Error(result.error)
      setTodos(prev => [result.data!, ...prev])
      reset()
      setShowAdd(false)
      toast.success('Task added! 🎯')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add task')
    }
  }

  const handleDelete = (todoId: string) => {
    startTransition(async () => {
      setTodos(prev => prev.filter(t => t.id !== todoId))
      const result = await deleteTodo(todoId)
      if (result.error) {
        toast.error('Failed to delete')
        // Re-fetch to restore state
      }
    })
  }

  const handleComplete = (todoId: string) => {
    setTodos(prev => prev.filter(t => t.id !== todoId))
  }

  const loadAISuggestions = async () => {
    setLoadingAI(true)
    try {
      const recentTaskTexts = todos.slice(0, 10).map(t => t.text)
      const completionRate = todos.length > 0 ? todos.filter(t => t.completed).length / todos.length : 0.5
      const categories = [...new Set(todos.map(t => t.category))]
      const result = await generateTaskSuggestions(profile.id, recentTaskTexts, completionRate, categories)
      setAiSuggestions(result)
    } catch {
      toast.error('Could not load AI suggestions')
    } finally {
      setLoadingAI(false)
    }
  }

  const addSuggestedTask = async (text: string) => {
    const result = await createTodo({ text, category: 'homework', points: 20, ai_suggested: true })
    if (!result.error && result.data) {
      setTodos(prev => [result.data!, ...prev])
      setAiSuggestions(prev => prev.filter(s => s !== text))
      toast.success('AI task added! 🤖')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <ChildNavbar profile={profile} />
      <main className="max-w-2xl mx-auto px-4 pb-24 pt-4 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">My Tasks</h1>
            <p className="text-sm text-muted-foreground">{filteredTodos.length} pending · {profile.name}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={loadAISuggestions} disabled={loadingAI}
              className="flex items-center gap-1.5 text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-xl px-3 py-2 font-semibold hover:bg-violet-200 dark:hover:bg-violet-800/30 transition-all disabled:opacity-50">
              {loadingAI ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              AI Suggest
            </button>
            <button onClick={() => setShowAdd(!showAdd)}
              className={`btn-kid flex items-center gap-1.5 px-3 py-2 text-xs font-bold ${showAdd ? 'bg-secondary text-foreground' : 'bg-violet-600 text-white'}`}>
              {showAdd ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {showAdd ? 'Cancel' : 'Add Task'}
            </button>
          </div>
        </div>

        {/* AI Suggestions */}
        <AnimatePresence>
          {aiSuggestions.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border border-violet-200 dark:border-violet-800 rounded-2xl p-4 space-y-2">
              <p className="text-xs font-bold text-violet-700 dark:text-violet-300 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" /> AI suggests these tasks for you:
              </p>
              {aiSuggestions.map((s, i) => (
                <motion.button key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                  onClick={() => addSuggestedTask(s)}
                  className="flex items-center gap-2 w-full text-left text-sm bg-white dark:bg-violet-900/20 rounded-xl px-3 py-2 hover:bg-violet-100 dark:hover:bg-violet-800/30 transition-all">
                  <Plus className="h-3.5 w-3.5 text-violet-500 flex-shrink-0" />
                  <span className="text-violet-800 dark:text-violet-200">{s}</span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Task Form */}
        <AnimatePresence>
          {showAdd && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="bg-card border rounded-3xl p-5 shadow-md space-y-4">
              <h3 className="font-bold text-sm">Add New Task ✨</h3>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                {/* Task text + voice */}
                <div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="text-2xl hover:scale-110 transition-transform flex-shrink-0">{watchedEmoji}</button>
                    <div className="relative flex-1">
                      <input {...register('text')} placeholder={isListening ? (interimTranscript || 'Listening...') : 'What do you need to do?'}
                        className={`w-full pr-10 py-2.5 px-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all ${isListening ? 'border-red-300 animate-pulse' : ''}`} />
                      {supported && (
                        <button type="button" onClick={() => { toggleListening(); if (transcript) setValue('text', transcript) }}
                          className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-all ${isListening ? 'text-red-500 bg-red-50 dark:bg-red-950/30' : 'text-muted-foreground hover:bg-secondary'}`}>
                          {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                  {errors.text && <p className="text-destructive text-xs mt-1">{errors.text.message}</p>}
                </div>

                {/* Emoji picker */}
                <AnimatePresence>
                  {showEmojiPicker && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                      className="flex flex-wrap gap-2 p-3 bg-secondary rounded-2xl">
                      {EMOJIS.map(e => (
                        <button key={e} type="button" onClick={() => { setValue('emoji', e); setShowEmojiPicker(false) }}
                          className={`text-xl hover:scale-125 transition-transform ${watchedEmoji === e ? 'scale-125' : ''}`}>{e}</button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Category + Points */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                    <select {...register('category')} className="w-full py-2 px-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                      {CATEGORIES.filter(c => c.value !== 'all').map(c => (
                        <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">XP Points</label>
                    <select {...register('points', { valueAsNumber: true })} className="w-full py-2 px-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                      {[5, 10, 20, 30, 50, 100].map(p => <option key={p} value={p}>{p} XP</option>)}
                    </select>
                  </div>
                </div>

                {/* Priority */}
                <div className="flex gap-2">
                  {[{ v: 1, label: 'Low', color: 'border-green-300 bg-green-50 text-green-700' },
                    { v: 2, label: 'Medium', color: 'border-amber-300 bg-amber-50 text-amber-700' },
                    { v: 3, label: 'High', color: 'border-red-300 bg-red-50 text-red-700' }
                  ].map(({ v, label, color }) => (
                    <label key={v} className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl border-2 cursor-pointer text-xs font-semibold transition-all ${watch('priority') === v ? color : 'border-border text-muted-foreground'}`}>
                      <input type="radio" value={v} {...register('priority', { valueAsNumber: true })} className="sr-only" />
                      {v === 3 && <Flame className="h-3 w-3" />} {label}
                    </label>
                  ))}
                </div>

                <button type="submit" disabled={isSubmitting}
                  className="btn-kid w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white py-3 text-sm font-bold hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" /> Add Task</>}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {CATEGORIES.map(cat => (
            <button key={cat.value} onClick={() => setSelectedCategory(cat.value)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${selectedCategory === cat.value ? 'bg-violet-600 text-white shadow-sm' : 'bg-card border hover:bg-secondary'}`}>
              <span>{cat.emoji}</span> {cat.label}
            </button>
          ))}
        </div>

        {/* Task list */}
        {filteredTodos.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🎉</div>
            <h3 className="font-bold text-lg">All done!</h3>
            <p className="text-muted-foreground text-sm mt-1">No pending tasks. You're amazing! ✨</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredTodos.map((todo, i) => (
                <TodoCard key={todo.id} todo={todo} index={i}
                  onComplete={(id) => handleComplete(id)} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  )
}
