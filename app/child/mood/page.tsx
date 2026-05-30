'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useSound } from '@/hooks/useSound'
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'

const MOODS = [
  { value: 'great', emoji: '🤩', label: 'Amazing!', color: 'from-yellow-400 to-amber-500', bg: 'bg-yellow-50 dark:bg-yellow-950/20', border: 'border-yellow-300' },
  { value: 'good', emoji: '😊', label: 'Good', color: 'from-green-400 to-emerald-500', bg: 'bg-green-50 dark:bg-green-950/20', border: 'border-green-300' },
  { value: 'okay', emoji: '😐', label: 'Okay', color: 'from-blue-400 to-cyan-500', bg: 'bg-blue-50 dark:bg-blue-950/20', border: 'border-blue-300' },
  { value: 'tired', emoji: '😴', label: 'Tired', color: 'from-purple-400 to-violet-500', bg: 'bg-purple-50 dark:bg-purple-950/20', border: 'border-purple-300' },
  { value: 'sad', emoji: '😢', label: 'Sad', color: 'from-gray-400 to-slate-500', bg: 'bg-gray-50 dark:bg-gray-950/20', border: 'border-gray-300' },
  { value: 'stressed', emoji: '😰', label: 'Stressed', color: 'from-red-400 to-rose-500', bg: 'bg-red-50 dark:bg-red-950/20', border: 'border-red-300' },
]

const ENERGY_LABELS = ['Very Low', 'Low', 'Medium', 'High', 'Super!']

export default function MoodPage() {
  const router = useRouter()
  const { play } = useSound()
  const [selected, setSelected] = useState<string | null>(null)
  const [energy, setEnergy] = useState(3)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [history, setHistory] = useState<Array<{ mood: string; date: string; energy_level: number }>>([])
  const [todayDone, setTodayDone] = useState(false)

  useEffect(() => {
    fetch('/api/mood?days=14')
      .then(r => r.json())
      .then(data => {
        setHistory(data.entries || [])
        setTodayDone(!!data.todayEntry)
        if (data.todayEntry) {
          setSelected(data.todayEntry.mood)
          setEnergy(data.todayEntry.energy_level || 3)
        }
      })
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const res = await fetch('/api/mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood: selected, energy_level: energy, note: note.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      play('complete')
      setSaved(true)
      toast.custom(() => (
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-2xl px-5 py-3 shadow-lg flex items-center gap-3">
          <span className="text-2xl">{MOODS.find(m => m.value === selected)?.emoji}</span>
          <div>
            <p className="font-bold">Mood logged! +{data.xpBonus} XP ⚡</p>
            <p className="text-violet-200 text-xs">Check in tomorrow too!</p>
          </div>
        </motion.div>
      ))
      setTimeout(() => router.back(), 1500)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  // Build chart data
  const chartData = history.slice(0, 14).reverse().map(e => ({
    date: format(new Date(e.date), 'MM/dd'),
    energy: e.energy_level || 3,
    moodScore: { great: 5, good: 4, okay: 3, tired: 2, sad: 1, stressed: 1 }[e.mood] || 3,
  }))

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-background dark:from-violet-950/20 p-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between pt-4">
          <button onClick={() => router.back()} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
          <h1 className="text-xl font-black">How are you feeling? 💭</h1>
          <div />
        </div>

        {saved ? (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center py-16">
            <div className="text-7xl mb-4">{MOODS.find(m => m.value === selected)?.emoji}</div>
            <h2 className="text-2xl font-black text-green-600">Mood saved! 🎉</h2>
            <p className="text-muted-foreground mt-2">+5 XP for checking in!</p>
          </motion.div>
        ) : (
          <>
            {/* Mood grid */}
            <div className="grid grid-cols-3 gap-3">
              {MOODS.map((mood, i) => (
                <motion.button
                  key={mood.value}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => { setSelected(mood.value); play('click') }}
                  className={`flex flex-col items-center gap-2 p-4 rounded-3xl border-2 transition-all ${
                    selected === mood.value
                      ? `${mood.bg} ${mood.border} scale-105 shadow-md`
                      : 'border-border hover:border-violet-200 bg-card'
                  }`}
                >
                  <motion.span className="text-4xl"
                    animate={selected === mood.value ? { rotate: [0, 15, -15, 0] } : {}}
                    transition={{ duration: 0.4 }}>
                    {mood.emoji}
                  </motion.span>
                  <span className="text-xs font-semibold">{mood.label}</span>
                </motion.button>
              ))}
            </div>

            {/* Energy level */}
            <AnimatePresence>
              {selected && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-card border rounded-2xl p-4 space-y-3">
                  <p className="font-semibold text-sm">Energy level ⚡</p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} onClick={() => setEnergy(n)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${energy >= n ? 'bg-violet-600 text-white' : 'bg-secondary text-muted-foreground'}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-center text-muted-foreground">{ENERGY_LABELS[energy - 1]}</p>

                  <div>
                    <p className="font-semibold text-sm mb-1.5">Want to share anything? (optional)</p>
                    <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} maxLength={200}
                      placeholder="What's on your mind?"
                      className="w-full py-2 px-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
                  </div>

                  <button onClick={handleSave} disabled={saving}
                    className="btn-kid w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white py-3 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                    {saving ? '⏳ Saving...' : `Save ${MOODS.find(m => m.value === selected)?.emoji} +5 XP`}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mood history chart */}
            {chartData.length > 2 && (
              <div className="bg-card border rounded-2xl p-4">
                <p className="font-semibold text-sm mb-3">Your mood this week 📈</p>
                <ResponsiveContainer width="100%" height={120}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '11px' }}
                      formatter={(v: number) => [['😔', '😔', '😐', '😊', '🤩'][v - 1] || '😐', 'Mood']} />
                    <Area type="monotone" dataKey="moodScore" stroke="#7C3AED" fill="url(#moodGrad)" strokeWidth={2} dot={{ r: 3, fill: '#7C3AED' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {todayDone && (
              <p className="text-center text-xs text-muted-foreground">
                ✅ You already checked in today. Update your mood anytime!
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
