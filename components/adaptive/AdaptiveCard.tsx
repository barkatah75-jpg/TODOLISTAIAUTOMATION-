'use client'

import { motion } from 'framer-motion'
import type { AdaptiveTaskSuggestion } from '@/types/advanced'

interface AdaptiveCardProps {
  suggestion: AdaptiveTaskSuggestion
  index: number
  onAccept: (suggestion: AdaptiveTaskSuggestion) => void
  onSkip: (suggestion: AdaptiveTaskSuggestion) => void
  isLoading?: boolean
}

const difficultyConfig = {
  easy: { color: 'from-green-400 to-emerald-500', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-700', label: 'Easy', icon: '🌱' },
  medium: { color: 'from-yellow-400 to-orange-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-700', label: 'Medium', icon: '⚡' },
  hard: { color: 'from-red-400 to-pink-500', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-700', label: 'Hard', icon: '🔥' },
  adaptive: { color: 'from-purple-400 to-blue-500', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-700', label: 'Adaptive', icon: '🎯' },
}

const categoryEmojis: Record<string, string> = {
  homework: '📚',
  math: '🔢',
  science: '🔬',
  reading: '📖',
  writing: '✍️',
  exercise: '🏃',
  creative: '🎨',
  chores: '🧹',
  social: '👥',
  custom: '✨',
}

export function AdaptiveCard({ suggestion, index, onAccept, onSkip, isLoading }: AdaptiveCardProps) {
  const diff = difficultyConfig[suggestion.difficulty] || difficultyConfig.medium
  const catEmoji = categoryEmojis[suggestion.category] || suggestion.emoji || '✅'

  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 300, damping: 30 }}
      className={`relative rounded-2xl border-2 ${diff.border} ${diff.bg} p-5 shadow-sm hover:shadow-md transition-shadow`}
    >
      {/* Difficulty badge */}
      <div className={`absolute top-3 right-3 flex items-center gap-1 bg-gradient-to-r ${diff.color} text-white text-xs font-bold px-2 py-1 rounded-full`}>
        <span>{diff.icon}</span>
        <span>{diff.label}</span>
      </div>

      {/* Category + emoji */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-3xl">{catEmoji}</span>
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {suggestion.category}
        </span>
      </div>

      {/* Task text */}
      <h3 className="text-base font-bold text-gray-800 dark:text-white mb-2 pr-16 leading-snug">
        {suggestion.text}
      </h3>

      {/* AI reason */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 italic leading-relaxed">
        🤖 {suggestion.reason}
      </p>

      {/* XP reward */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/30 px-3 py-1 rounded-full">
          <span className="text-sm">⭐</span>
          <span className="text-sm font-bold text-yellow-700 dark:text-yellow-400">+{suggestion.points} XP</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <motion.button
          onClick={() => onAccept(suggestion)}
          disabled={isLoading}
          whileTap={{ scale: 0.95 }}
          className="flex-1 py-2 px-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50"
        >
          ✅ Add Task
        </motion.button>
        <motion.button
          onClick={() => onSkip(suggestion)}
          disabled={isLoading}
          whileTap={{ scale: 0.95 }}
          className="py-2 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 text-sm font-semibold rounded-xl transition disabled:opacity-50"
        >
          Skip
        </motion.button>
      </div>
    </motion.div>
  )
}

// Loading skeleton
export function AdaptiveCardSkeleton() {
  return (
    <div className="rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-5 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="w-20 h-4 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="w-3/4 h-5 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
      <div className="w-full h-4 rounded bg-gray-200 dark:bg-gray-700 mb-1" />
      <div className="w-2/3 h-4 rounded bg-gray-200 dark:bg-gray-700 mb-4" />
      <div className="flex gap-3">
        <div className="flex-1 h-9 rounded-xl bg-gray-200 dark:bg-gray-700" />
        <div className="w-16 h-9 rounded-xl bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  )
}

export default AdaptiveCard
