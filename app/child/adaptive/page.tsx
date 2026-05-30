'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAdaptive } from '@/hooks/useAdaptive'
import { createTodo } from '@/lib/actions/todos'
import toast from 'react-hot-toast'
import { Sparkles, Brain, Plus, Loader2, Clock, ChevronRight, BarChart2, Target } from 'lucide-react'
import { getCategoryEmoji, getCategoryColor } from '@/lib/utils/helpers'

const DIFFICULTY_CONFIG = {
  easy: { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', label: 'Easy', icon: '🌱' },
  medium: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', label: 'Medium', icon: '⚡' },
  hard: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300', label: 'Hard', icon: '🔥' },
  adaptive: { color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300', label: 'Adaptive', icon: '🤖' },
}

export default function AdaptivePage() {
  const router = useRouter()
  const { tasks, schedule, profile, loading, fetchAdaptiveTasks, fetchStudySchedule, analyzeProfile } = useAdaptive()
  const [addingTask, setAddingTask] = useState<string | null>(null)
  const [addedTasks, setAddedTasks] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'tasks' | 'schedule' | 'insights'>('tasks')

  useEffect(() => {
    fetchAdaptiveTasks()
    fetchStudySchedule()
    analyzeProfile()
  }, [])

  const handleAddTask = async (task: typeof tasks[0]) => {
    setAddingTask(task.text)
    try {
      const result = await createTodo({
        text: task.text,
        category: task.category as 'homework' | 'chores' | 'reading' | 'exercise' | 'creative' | 'custom',
        emoji: task.emoji,
        points: task.points,
        ai_suggested: true,
      })
      if (result.error) throw new Error(result.error)
      setAddedTasks(prev => new Set([...prev, task.text]))
      toast.success('AI task added! ⚡')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setAddingTask(null)
    }
  }

  const handleAddAll = async () => {
    const unadded = tasks.filter(t => !addedTasks.has(t.text))
    for (const task of unadded) await handleAddTask(task)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b px-4 py-3 flex items-center justify-between">
        <button onClick={() => router.back()} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
        <h1 className="font-black text-lg flex items-center gap-2">
          <Brain className="h-5 w-5 text-violet-600" /> Adaptive Learning
        </h1>
        <div className="w-16" />
      </header>

      <main className="max-w-2xl mx-auto px-4 pb-10 pt-4 space-y-5">
        {/* Header card */}
        <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-3xl p-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-violet-200 text-sm">AI-Personalized For You</p>
              <h2 className="text-2xl font-black mt-0.5">Your Learning Plan 🧠</h2>
              <p className="text-violet-200 text-sm mt-1">Based on your performance patterns</p>
            </div>
            <div className="text-5xl">🤖</div>
          </div>
          {profile && (
            <div className="grid grid-cols-3 gap-3 mt-4">
              {[
                { label: 'Difficulty', value: profile.current_difficulty, icon: '⚡' },
                { label: 'Best At', value: profile.best_category || 'Building...', icon: '🏆' },
                { label: 'Focus On', value: profile.struggle_category || 'All Good!', icon: '🎯' },
              ].map(item => (
                <div key={item.label} className="bg-white/15 rounded-2xl p-3 text-center">
                  <p className="text-lg">{item.icon}</p>
                  <p className="text-white text-xs font-bold capitalize truncate">{item.value}</p>
                  <p className="text-violet-300 text-xs">{item.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-secondary rounded-2xl">
          {[
            { id: 'tasks', label: 'Smart Tasks', emoji: '✅' },
            { id: 'schedule', label: 'Study Plan', emoji: '📅' },
            { id: 'insights', label: 'Insights', emoji: '📊' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeTab === tab.id ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>
              <span>{tab.emoji}</span> {tab.label}
            </button>
          ))}
        </div>

        {/* Smart Tasks */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm">Personalized for today</h3>
              <div className="flex gap-2">
                {tasks.length > 0 && (
                  <button onClick={handleAddAll} disabled={tasks.every(t => addedTasks.has(t.text))}
                    className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-xl px-3 py-1.5 font-semibold hover:bg-violet-200 transition-colors disabled:opacity-40">
                    Add All
                  </button>
                )}
                <button onClick={fetchAdaptiveTasks} disabled={loading}
                  className="text-xs bg-secondary rounded-xl px-3 py-1.5 font-semibold hover:bg-secondary/80 transition-colors flex items-center gap-1">
                  {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  Refresh
                </button>
              </div>
            </div>

            {loading && tasks.length === 0 ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-24 bg-secondary rounded-2xl shimmer" />)}
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-4xl mb-2">🤔</div>
                <p className="font-semibold">No suggestions yet</p>
                <p className="text-muted-foreground text-sm mt-1">Complete a few tasks and AI will learn your style!</p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {tasks.map((task, i) => {
                    const diff = DIFFICULTY_CONFIG[task.difficulty as keyof typeof DIFFICULTY_CONFIG] || DIFFICULTY_CONFIG.medium
                    const isAdded = addedTasks.has(task.text)
                    return (
                      <motion.div key={task.text} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                        className={`bg-card border rounded-2xl p-4 transition-all ${isAdded ? 'opacity-50 border-green-200 dark:border-green-800' : 'hover:border-violet-200 dark:hover:border-violet-800'}`}>
                        <div className="flex items-start gap-3">
                          <span className="text-2xl flex-shrink-0">{task.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold text-sm ${isAdded ? 'line-through text-muted-foreground' : ''}`}>{task.text}</p>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getCategoryColor(task.category)}`}>{task.category}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${diff.color}`}>
                                {diff.icon} {diff.label}
                              </span>
                              <span className="xp-badge">⚡ {task.points}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1.5 italic">🤖 {task.reason}</p>
                          </div>
                          <button onClick={() => handleAddTask(task)} disabled={isAdded || addingTask === task.text}
                            className={`flex-shrink-0 p-2 rounded-xl transition-all ${isAdded ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 hover:bg-violet-200'} disabled:opacity-50`}>
                            {addingTask === task.text ? <Loader2 className="h-4 w-4 animate-spin" /> : isAdded ? '✅' : <Plus className="h-4 w-4" />}
                          </button>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

        {/* Study Schedule */}
        {activeTab === 'schedule' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm">Today's Study Plan</h3>
              <button onClick={fetchStudySchedule} disabled={loading}
                className="text-xs bg-secondary rounded-xl px-3 py-1.5 font-semibold hover:bg-secondary/80 transition-colors">
                Regenerate
              </button>
            </div>
            {schedule.length === 0 ? (
              <div className="text-center py-8">
                {loading ? <Loader2 className="h-6 w-6 animate-spin text-violet-500 mx-auto" /> : (
                  <p className="text-muted-foreground text-sm">No schedule yet. Click Regenerate!</p>
                )}
              </div>
            ) : (
              schedule.map((slot, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-4 bg-card border rounded-2xl p-4">
                  <div className="text-center flex-shrink-0 w-16">
                    <p className="font-black text-sm text-violet-600 dark:text-violet-400">{slot.timeSlot}</p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" /> {slot.duration}m
                    </p>
                  </div>
                  <div className="h-10 w-px bg-border flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{slot.subject}</p>
                    <p className="text-xs text-violet-500 dark:text-violet-400 mt-0.5 italic">💡 {slot.tip}</p>
                  </div>
                  <button onClick={() => router.push('/child/focus')}
                    className="flex-shrink-0 p-2 bg-violet-100 dark:bg-violet-900/30 text-violet-600 rounded-xl hover:bg-violet-200 transition-all">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Insights */}
        {activeTab === 'insights' && (
          <div className="space-y-4">
            {!profile ? (
              <div className="text-center py-10">
                <div className="text-4xl mb-2">📊</div>
                <p className="font-semibold">Building your profile...</p>
                <p className="text-muted-foreground text-sm mt-1">Complete more tasks so AI can analyze your patterns!</p>
              </div>
            ) : (
              <>
                {/* Subject scores */}
                <div className="bg-card border rounded-2xl p-5 space-y-4">
                  <h3 className="font-bold text-sm flex items-center gap-2"><BarChart2 className="h-4 w-4 text-violet-600" /> Subject Performance</h3>
                  {[
                    { label: 'Math', score: profile.math_score, emoji: '🔢', color: 'bg-blue-500' },
                    { label: 'Science', score: profile.science_score, emoji: '🔬', color: 'bg-green-500' },
                    { label: 'Reading', score: profile.reading_score, emoji: '📖', color: 'bg-amber-500' },
                    { label: 'Writing', score: profile.writing_score, emoji: '✏️', color: 'bg-pink-500' },
                  ].map(subj => (
                    <div key={subj.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm flex items-center gap-1.5">{subj.emoji} {subj.label}</span>
                        <span className="text-xs font-bold">{Math.round(subj.score)}%</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <motion.div className={`h-full rounded-full ${subj.color}`}
                          initial={{ width: 0 }} animate={{ width: `${subj.score}%` }} transition={{ duration: 0.8, delay: 0.2 }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Recommendations */}
                <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 border border-violet-200 dark:border-violet-800 rounded-2xl p-4 space-y-3">
                  <h3 className="font-bold text-sm text-violet-700 dark:text-violet-300">🎯 AI Recommendations</h3>
                  {[
                    profile.best_category && `You're excelling at ${profile.best_category}! Keep it up with harder challenges.`,
                    profile.struggle_category && `Focus extra time on ${profile.struggle_category} — start with easier tasks to build confidence.`,
                    profile.current_difficulty === 'easy' && 'Your difficulty is set to Easy. Challenge yourself a bit more!',
                    profile.current_difficulty === 'hard' && 'You\'re taking on Hard challenges. You\'re a rockstar! 🌟',
                    profile.consecutive_easy_wins >= 3 && 'You\'ve been crushing easy tasks! Ready to level up to Medium?',
                    'Complete your mood check-in daily for a better-tailored schedule.',
                  ].filter(Boolean).slice(0, 3).map((rec, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-violet-800 dark:text-violet-200">
                      <span className="mt-0.5">→</span>
                      <p>{rec}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
