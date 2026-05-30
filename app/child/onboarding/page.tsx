'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Loader2, ArrowRight, ArrowLeft } from 'lucide-react'

const AVATARS = ['🦊','🐼','🦁','🐸','🐧','🦄','🐯','🐺','🦋','🐙','🦕','🤖','👾','🧸','🎃','🦸']
const INTERESTS = [
  { label: 'Math', emoji: '🔢' },
  { label: 'Science', emoji: '🔬' },
  { label: 'Reading', emoji: '📚' },
  { label: 'Art', emoji: '🎨' },
  { label: 'Sports', emoji: '⚽' },
  { label: 'Music', emoji: '🎵' },
  { label: 'Coding', emoji: '💻' },
  { label: 'Nature', emoji: '🌿' },
  { label: 'History', emoji: '🏛️' },
  { label: 'Cooking', emoji: '🍳' },
  { label: 'Gaming', emoji: '🎮' },
  { label: 'Space', emoji: '🚀' },
]

const STEPS = ['Welcome', 'Avatar', 'About You', 'Interests', 'Ready!']

export default function ChildOnboardingPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowser()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [selectedAvatar, setSelectedAvatar] = useState('🦊')
  const [displayName, setDisplayName] = useState('')
  const [age, setAge] = useState('')
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])

  const toggleInterest = (label: string) => {
    setSelectedInterests(prev =>
      prev.includes(label) ? prev.filter(i => i !== label) : [...prev, label].slice(0, 5)
    )
  }

  const handleFinish = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      await supabase.from('profiles').update({
        display_name: displayName.trim() || null,
        date_of_birth: age ? new Date(Date.now() - parseInt(age) * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : null,
        onboarded: true,
      }).eq('id', user.id)

      toast.success(`Welcome to AIVANA, ${displayName || 'Explorer'}! 🚀`)
      router.push('/child/dashboard')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Setup failed')
    } finally {
      setSaving(false)
    }
  }

  const STEP_CONTENT = [
    // Step 0: Welcome
    <motion.div key="welcome" className="text-center space-y-6">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.2 }} className="text-8xl">🚀</motion.div>
      <div>
        <h1 className="text-4xl font-black gradient-text">Welcome to AIVANA!</h1>
        <p className="text-muted-foreground mt-3 text-lg">Your AI-powered adventure starts here. Let's set up your profile in 2 minutes!</p>
      </div>
      <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
        {[['🤖', 'AI Helper'], ['🏆', 'Earn XP'], ['🎨', 'Draw & Create']].map(([emoji, label]) => (
          <div key={label} className="bg-card border rounded-2xl p-3 text-center">
            <div className="text-3xl mb-1">{emoji}</div>
            <p className="text-xs font-semibold">{label}</p>
          </div>
        ))}
      </div>
      <button onClick={() => setStep(1)} className="btn-kid bg-gradient-to-r from-violet-600 to-purple-600 text-white px-10 py-4 text-base font-bold flex items-center gap-2 mx-auto hover:from-violet-700 hover:to-purple-700">
        Let's Go! <ArrowRight className="h-5 w-5" />
      </button>
    </motion.div>,

    // Step 1: Choose Avatar
    <motion.div key="avatar" className="space-y-5">
      <div className="text-center">
        <div className="text-6xl mb-3">{selectedAvatar}</div>
        <h2 className="text-2xl font-black">Pick Your Avatar</h2>
        <p className="text-muted-foreground text-sm mt-1">Choose the one that feels like YOU! 🌟</p>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {AVATARS.map(av => (
          <button key={av} onClick={() => setSelectedAvatar(av)}
            className={`text-4xl py-3 rounded-2xl border-2 transition-all hover:scale-110 ${selectedAvatar === av ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 scale-110' : 'border-border hover:border-violet-300'}`}>
            {av}
          </button>
        ))}
      </div>
    </motion.div>,

    // Step 2: About You
    <motion.div key="about" className="space-y-5">
      <div className="text-center">
        <div className="text-6xl mb-3">{selectedAvatar}</div>
        <h2 className="text-2xl font-black">What's Your Name?</h2>
        <p className="text-muted-foreground text-sm mt-1">What should we call you?</p>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">Nickname / Display Name</label>
          <input value={displayName} onChange={e => setDisplayName(e.target.value)}
            placeholder="e.g. SuperAryan, CoolKid99..."
            maxLength={20}
            className="w-full py-3 px-4 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-violet-500 text-base transition-all" />
          <p className="text-xs text-muted-foreground mt-1">{displayName.length}/20 characters</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Your Age</label>
          <div className="flex gap-3">
            {[6,7,8,9,10,11,12,13,14,15,16,17].map(a => (
              <button key={a} onClick={() => setAge(a.toString())}
                className={`w-10 h-10 rounded-full text-sm font-bold border-2 flex-shrink-0 transition-all ${age === a.toString() ? 'border-violet-500 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' : 'border-border hover:border-violet-300'}`}>
                {a}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>,

    // Step 3: Interests
    <motion.div key="interests" className="space-y-5">
      <div className="text-center">
        <h2 className="text-2xl font-black">What do you love?</h2>
        <p className="text-muted-foreground text-sm mt-1">Pick up to 5 interests · AI will suggest tasks based on these</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {INTERESTS.map(item => (
          <button key={item.label} onClick={() => toggleInterest(item.label)}
            className={`flex items-center gap-2 p-3 rounded-2xl border-2 text-sm font-semibold transition-all ${selectedInterests.includes(item.label) ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300' : 'border-border hover:border-violet-200'}`}>
            <span className="text-xl">{item.emoji}</span> {item.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-center text-muted-foreground">{selectedInterests.length}/5 selected</p>
    </motion.div>,

    // Step 4: All Done
    <motion.div key="done" className="text-center space-y-6">
      <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 150, delay: 0.1 }} className="text-8xl">🎉</motion.div>
      <div>
        <h2 className="text-3xl font-black">You're all set, {displayName || 'Explorer'}!</h2>
        <p className="text-muted-foreground mt-2">Your adventure begins now. Start by adding your first task and earning XP! ⚡</p>
      </div>
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-3xl p-5 text-white text-left space-y-2">
        <p className="font-bold text-sm opacity-80">Your Profile:</p>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{selectedAvatar}</span>
          <div>
            <p className="font-black text-xl">{displayName || 'Explorer'}</p>
            <p className="text-violet-200 text-sm">Level 1 · 0 XP · Starting streak 🔥</p>
          </div>
        </div>
      </div>
      <button onClick={handleFinish} disabled={saving}
        className="btn-kid bg-gradient-to-r from-violet-600 to-purple-600 text-white px-10 py-4 text-base font-bold flex items-center gap-2 mx-auto hover:from-violet-700 hover:to-purple-700 disabled:opacity-50">
        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Start My Adventure! 🚀</>}
      </button>
    </motion.div>,
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 dark:from-violet-950/30 dark:via-background dark:to-purple-950/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Step {step + 1} of {STEPS.length}</span>
            <span>{STEPS[step]}</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full"
              animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }} transition={{ duration: 0.4 }} />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}>
            {STEP_CONTENT[step]}
          </motion.div>
        </AnimatePresence>

        {/* Nav buttons (steps 1-3) */}
        {step > 0 && step < 4 && (
          <div className="flex justify-between mt-6">
            <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            {step < 3 && (
              <button onClick={() => setStep(s => s + 1)}
                className="btn-kid flex items-center gap-2 bg-violet-600 text-white px-5 py-2 text-sm font-bold">
                Next <ArrowRight className="h-4 w-4" />
              </button>
            )}
            {step === 3 && (
              <button onClick={() => setStep(4)}
                className="btn-kid flex items-center gap-2 bg-violet-600 text-white px-5 py-2 text-sm font-bold">
                {selectedInterests.length === 0 ? 'Skip →' : 'Continue →'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
