'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Todo } from '@/types/database'
import { completeTodo } from '@/lib/actions/todos'
import { useRewards } from '@/hooks/useRewards'
import toast from 'react-hot-toast'
import confetti from 'canvas-confetti'
import { CheckCircle2, Circle, Flame, AlertCircle } from 'lucide-react'

const CATEGORY_COLORS: Record<string, string> = {
  homework: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  chores: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  reading: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  exercise: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  creative: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  social: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  personal: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  custom: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
}

interface Props {
  todo: Todo
  index?: number
  onComplete?: (todoId: string, xpGained: number) => void
}

export function TodoCard({ todo, index = 0, onComplete }: Props) {
  const [completing, setCompleting] = useState(false)
  const [completed, setCompleted] = useState(todo.completed)
  const { addXP } = useRewards()

  const isDue = todo.due_date && new Date(todo.due_date) < new Date() && !completed
  const isHighPriority = todo.priority === 3

  const handleComplete = async () => {
    if (completed || completing) return
    setCompleting(true)

    try {
      const result = await completeTodo(todo.id)
      if (result.error) throw new Error(result.error)

      setCompleted(true)

      // Trigger confetti
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#7C3AED', '#EC4899', '#F59E0B', '#10B981'],
      })

      const xpGained = result.data?.xp_gained || todo.points
      toast.custom((t) => (
        <motion.div
          initial={{ scale: 0.5, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.5, opacity: 0 }}
          className="bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-2xl px-5 py-3 shadow-lg flex items-center gap-3"
        >
          <span className="text-2xl">⚡</span>
          <div>
            <p className="font-bold">+{xpGained} XP earned!</p>
            <p className="text-violet-200 text-xs">Task completed! 🎉</p>
          </div>
        </motion.div>
      ), { duration: 2500 })

      if (result.data?.leveled_up) {
        setTimeout(() => {
          toast.custom(() => (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-gradient-to-r from-amber-400 to-yellow-500 text-white rounded-2xl px-5 py-3 shadow-lg bounce-in">
              <p className="font-black text-lg">🎊 Level Up!</p>
              <p className="text-amber-100 text-sm">You reached Level {result.data.new_level}!</p>
            </motion.div>
          ), { duration: 4000 })
        }, 500)
      }

      onComplete?.(todo.id, xpGained)
    } catch (err) {
      toast.error('Failed to complete task')
      setCompleted(false)
    } finally {
      setCompleting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`task-card flex items-start gap-3 ${completed ? 'opacity-60' : ''} ${isDue ? 'border-red-200 dark:border-red-800' : ''}`}
    >
      <button
        onClick={handleComplete}
        disabled={completed || completing}
        className="mt-0.5 flex-shrink-0 transition-transform hover:scale-110 active:scale-90"
      >
        <motion.div animate={completing ? { rotate: 360 } : {}} transition={{ duration: 0.5 }}>
          {completed ? (
            <CheckCircle2 className="h-6 w-6 text-green-500" />
          ) : (
            <Circle className="h-6 w-6 text-muted-foreground" />
          )}
        </motion.div>
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base">{todo.emoji}</span>
          <p className={`font-semibold text-sm flex-1 ${completed ? 'line-through text-muted-foreground' : ''}`}>
            {todo.text}
          </p>
          {isHighPriority && !completed && (
            <Flame className="h-4 w-4 text-red-500 flex-shrink-0" />
          )}
        </div>

        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[todo.category]}`}>
            {todo.category}
          </span>
          <span className="xp-badge">⚡ {todo.points} XP</span>
          {isDue && (
            <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
              <AlertCircle className="h-3 w-3" /> Overdue
            </span>
          )}
          {todo.ai_suggested && (
            <span className="text-xs text-violet-500 font-medium">🤖 AI suggested</span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
