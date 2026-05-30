'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { useSound } from '@/hooks/useSound'
import toast from 'react-hot-toast'
import { Play, Pause, RotateCcw, Zap, Clock, CheckCircle } from 'lucide-react'

type Phase = 'focus' | 'break' | 'idle'

const PRESETS = [
  { label: 'Quick', focus: 15, break: 3, emoji: '⚡' },
  { label: 'Classic', focus: 25, break: 5, emoji: '🍅' },
  { label: 'Deep', focus: 45, break: 10, emoji: '🧠' },
  { label: 'Flow', focus: 90, break: 20, emoji: '🌊' },
]

export default function FocusPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowser()
  const { play } = useSound()
  const [phase, setPhase] = useState<Phase>('idle')
  const [preset, setPreset] = useState(PRESETS[1])
  const [secondsLeft, setSecondsLeft] = useState(PRESETS[1].focus * 60)
  const [cycles, setCycles] = useState(0)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [totalFocusToday, setTotalFocusToday] = useState(0)
  const [subject, setSubject] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const totalSecs = phase === 'focus' ? preset.focus * 60 : preset.break * 60
  const progress = ((totalSecs - secondsLeft) / totalSecs) * 100
  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60

  useEffect(() => {
    // Load today's focus time
    const today = new Date().toISOString().split('T')[0]
    supabase.from('focus_sessions').select('duration_mins')
      .eq('status', 'completed').gte('started_at', `${today}T00:00:00Z`)
      .then(({ data }) => {
        const total = (data || []).reduce((s, r) => s + (r.duration_mins || 0), 0)
        setTotalFocusToday(total)
      })
  }, [])

  const startSession = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('focus_sessions').insert({
      user_id: user.id,
      duration_mins: preset.focus,
      break_mins: preset.break,
      subject: subject || null,
      status: 'active',
    }).select().single()
    if (data) setSessionId(data.id)
  }, [supabase, preset, subject])

  const completeSession = useCallback(async (completedCycles: number) => {
    if (!sessionId) return
    const xpBonus = completedCycles * 25
    await supabase.from('focus_sessions').update({
      status: 'completed',
      completed_cycles: completedCycles,
      xp_bonus: xpBonus,
      completed_at: new Date().toISOString(),
      duration_mins: preset.focus * completedCycles,
    }).eq('id', sessionId)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.rpc('award_xp', {
        p_user_id: user.id,
        p_amount: xpBonus,
        p_reason: `Focus session: ${completedCycles} cycle${completedCycles > 1 ? 's' : ''}`,
      })
    }
    return xpBonus
  }, [sessionId, supabase, preset])

  const tick = useCallback(() => {
    setSecondsLeft(prev => {
      if (prev <= 1) {
        // Phase complete
        if (phase === 'focus') {
          play('complete')
          setCycles(c => c + 1)
          setPhase('break')
          toast.success(`Focus complete! Take a ${preset.break} min break 🎉`)
          return preset.break * 60
        } else {
          play('streak')
          setPhase('focus')
          toast(`Break over! Back to focus 🧠`, { icon: '⏰' })
          return preset.focus * 60
        }
      }
      return prev - 1
    })
  }, [phase, preset, play])

  const handleStart = async () => {
    if (phase === 'idle') {
      await startSession()
      setSecondsLeft(preset.focus * 60)
      setPhase('focus')
    }
    intervalRef.current = setInterval(tick, 1000)
  }

  const handlePause = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  const handleReset = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (cycles > 0) {
      const xpBonus = await completeSession(cycles)
      if (xpBonus) toast.success(`Session saved! +${xpBonus} XP ⚡`)
    }
    setPhase('idle')
    setSecondsLeft(preset.focus * 60)
    setCycles(0)
    setSessionId(null)
  }

  useEffect(() => {
    if (phase !== 'idle') {
      intervalRef.current = setInterval(tick, 1000)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [phase, tick])

  const circumference = 2 * Math.PI * 110
  const strokeDashoffset = circumference - (progress / 100) * circumference
  const phaseColor = phase === 'focus' ? '#7C3AED' : '#10B981'

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-900 via-purple-900 to-slate-900 text-white flex flex-col">
      <header className="px-4 py-4 flex items-center justify-between">
        <button onClick={() => { handleReset(); router.back() }} className="text-white/60 hover:text-white text-sm">← Back</button>
        <h1 className="font-black">Focus Mode 🧠</h1>
        <div className="text-xs text-white/60">{totalFocusToday}m today</div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-10 space-y-6">
        {/* Subject input */}
        {phase === 'idle' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-xs">
            <input value={subject} onChange={e => setSubject(e.target.value)}
              placeholder="What are you studying? (optional)"
              className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-violet-400 text-center" />
          </motion.div>
        )}

        {/* Preset selector */}
        {phase === 'idle' && (
          <div className="flex gap-2">
            {PRESETS.map(p => (
              <button key={p.label} onClick={() => { setPreset(p); setSecondsLeft(p.focus * 60) }}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl text-xs font-bold transition-all ${preset.label === p.label ? 'bg-violet-600 scale-105' : 'bg-white/10 hover:bg-white/20'}`}>
                <span>{p.emoji}</span>
                {p.label}
                <span className="opacity-70">{p.focus}m</span>
              </button>
            ))}
          </div>
        )}

        {/* Circular timer */}
        <div className="relative flex items-center justify-center">
          <svg width="280" height="280" viewBox="0 0 280 280">
            {/* Track */}
            <circle cx="140" cy="140" r="110" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
            {/* Progress */}
            <motion.circle
              cx="140" cy="140" r="110" fill="none"
              stroke={phaseColor} strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform="rotate(-90 140 140)"
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.5 }}
            />
          </svg>
          <div className="absolute text-center">
            <div className="text-6xl font-black tabular-nums">
              {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
            </div>
            <div className={`text-sm font-semibold mt-1 capitalize ${phase === 'focus' ? 'text-violet-300' : 'text-emerald-300'}`}>
              {phase === 'idle' ? 'Ready' : phase === 'focus' ? '🧠 Focus' : '☕ Break'}
            </div>
            {cycles > 0 && (
              <div className="flex items-center justify-center gap-1 mt-2">
                {Array.from({ length: cycles }).map((_, i) => <div key={i} className="w-2 h-2 rounded-full bg-violet-400" />)}
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          {phase === 'idle' ? (
            <button onClick={handleStart}
              className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg hover:scale-105 transition-all active:scale-95">
              <Play className="h-7 w-7 fill-white text-white" />
            </button>
          ) : (
            <>
              <button onClick={handlePause}
                className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-all">
                <Pause className="h-6 w-6" />
              </button>
              <button onClick={handleStart}
                className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg hover:scale-105 transition-all">
                <Play className="h-7 w-7 fill-white text-white" />
              </button>
              <button onClick={handleReset}
                className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-all">
                <RotateCcw className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        {/* XP preview */}
        {cycles > 0 && (
          <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 text-sm">
            <Zap className="h-4 w-4 text-yellow-400" />
            <span>{cycles * 25} XP earned this session</span>
          </div>
        )}

        {/* Tips */}
        <div className="text-center text-white/50 text-xs max-w-xs">
          {phase === 'focus' && '📱 Put your phone away. You can do it!'}
          {phase === 'break' && '🚶 Stand up and stretch for a bit!'}
          {phase === 'idle' && `⚡ Each ${preset.focus}-min session = 25 XP`}
        </div>
      </main>
    </div>
  )
}
