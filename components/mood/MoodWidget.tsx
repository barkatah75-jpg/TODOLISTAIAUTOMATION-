'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import type { MoodType } from '@/types/advanced'

const MOODS: Array<{ type: MoodType; emoji: string; label: string; color: string; bg: string }> = [
  { type: 'great',    emoji: '😄', label: 'Great!',   color: 'text-green-600',  bg: 'bg-green-100 dark:bg-green-900/40 border-green-300 dark:border-green-700' },
  { type: 'good',     emoji: '🙂', label: 'Good',     color: 'text-blue-600',   bg: 'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700' },
  { type: 'okay',     emoji: '😐', label: 'Okay',     color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-300 dark:border-yellow-700' },
  { type: 'tired',    emoji: '😴', label: 'Tired',    color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/40 border-orange-300 dark:border-orange-700' },
  { type: 'sad',      emoji: '😢', label: 'Sad',      color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/40 border-purple-300 dark:border-purple-700' },
  { type: 'stressed', emoji: '😤', label: 'Stressed', color: 'text-red-600',    bg: 'bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-700' },
]

interface MoodWidgetProps {
  onCheckedIn?: (mood: MoodType) => void
  compact?: boolean
}

export function MoodWidget({ onCheckedIn, compact = false }: MoodWidgetProps) {
  const [selected, setSelected] = useState<MoodType | null>(null)
  const [note, setNote] = useState('')
  const [energy, setEnergy] = useState(3)
  const [step, setStep] = useState<'select' | 'note' | 'done'>('select')
  const [isLoading, setIsLoading] = useState(false)

  const handleMoodSelect = (mood: MoodType) => {
    setSelected(mood)
    if (compact) {
      handleSubmit(mood)
    } else {
      setStep('note')
    }
  }

  const handleSubmit = async (mood?: MoodType) => {
    const moodToSubmit = mood || selected
    if (!moodToSubmit) return
    setIsLoading(true)

    try {
      const res = await fetch('/api/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mood: moodToSubmit,
          note: note.trim() || null,
          energy_level: energy,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || 'Check-in failed')
        return
      }

      setStep('done')
      onCheckedIn?.(moodToSubmit)

      const moodInfo = MOODS.find((m) => m.type === moodToSubmit)
      toast.success(`Mood logged: ${moodInfo?.emoji} ${moodInfo?.label}`)
    } catch {
      toast.error('Could not save mood. Try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (step === 'done') {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center gap-3 py-6"
      >
        <span className="text-5xl">
          {MOODS.find((m) => m.type === selected)?.emoji}
        </span>
        <p className="font-bold text-gray-700 dark:text-gray-200">Mood logged! ✅</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">Keep being awesome 🌟</p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {step === 'select' && (
          <motion.div
            key="select"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {!compact && (
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3 text-center">
                How are you feeling right now?
              </p>
            )}
            <div className={`grid ${compact ? 'grid-cols-6' : 'grid-cols-3'} gap-2`}>
              {MOODS.map((mood) => (
                <motion.button
                  key={mood.type}
                  onClick={() => handleMoodSelect(mood.type)}
                  disabled={isLoading}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex flex-col items-center justify-center gap-1 border-2 rounded-xl transition ${
                    compact ? 'p-2' : 'p-3'
                  } ${
                    selected === mood.type
                      ? mood.bg + ' border-current'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <span className={compact ? 'text-xl' : 'text-3xl'}>{mood.emoji}</span>
                  {!compact && (
                    <span className={`text-xs font-semibold ${mood.color}`}>{mood.label}</span>
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 'note' && selected && (
          <motion.div
            key="note"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Selected mood display */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
              <span className="text-3xl">{MOODS.find((m) => m.type === selected)?.emoji}</span>
              <div>
                <p className="font-semibold text-gray-800 dark:text-white">
                  Feeling {MOODS.find((m) => m.type === selected)?.label}
                </p>
                <button
                  onClick={() => { setSelected(null); setStep('select') }}
                  className="text-xs text-purple-500 hover:text-purple-700"
                >
                  Change
                </button>
              </div>
            </div>

            {/* Energy level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Energy Level: {'⚡'.repeat(energy)}
              </label>
              <input
                type="range"
                min={1}
                max={5}
                value={energy}
                onChange={(e) => setEnergy(parseInt(e.target.value))}
                className="w-full accent-purple-500"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Very Low</span>
                <span>High Energy</span>
              </div>
            </div>

            {/* Optional note */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Want to share anything? (optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={300}
                rows={2}
                placeholder="What's on your mind?"
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
              <p className="text-xs text-gray-400 text-right mt-1">{note.length}/300</p>
            </div>

            {/* Submit */}
            <motion.button
              onClick={() => handleSubmit()}
              disabled={isLoading}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl shadow transition disabled:opacity-60"
            >
              {isLoading ? 'Saving...' : 'Save Mood Check-in ✅'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default MoodWidget
