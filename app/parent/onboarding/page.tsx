'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { inviteChild } from '@/lib/actions/parent'
import toast from 'react-hot-toast'
import { Loader2, ArrowRight, ArrowLeft, Plus, UserPlus } from 'lucide-react'

const STEPS = ['Welcome', 'Your Profile', 'Add Child', 'Done!']

export default function ParentOnboardingPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowser()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [parentName, setParentName] = useState('')
  const [childEmail, setChildEmail] = useState('')
  const [childNickname, setChildNickname] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteSent, setInviteSent] = useState(false)

  const handleSaveProfile = async () => {
    if (!parentName.trim()) { toast.error('Please enter your name'); return }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')
      await supabase.from('profiles').update({ display_name: parentName.trim(), onboarded: true }).eq('id', user.id)
      setStep(2)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  const handleInviteChild = async () => {
    if (!childEmail.trim()) { toast.error('Please enter child email'); return }
    setInviteLoading(true)
    try {
      const result = await inviteChild(childEmail.trim(), childNickname.trim())
      if (result.error) throw new Error(result.error)
      setInviteSent(true)
      toast.success(`${childNickname || 'Child'} linked! 🎉`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Invite failed')
    } finally {
      setInviteLoading(false)
    }
  }

  const STEP_CONTENT = [
    // Step 0: Welcome
    <motion.div key="welcome" className="text-center space-y-6">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.2 }} className="text-8xl">👨‍👩‍👧</motion.div>
      <div>
        <h1 className="text-4xl font-black gradient-text">Welcome, Parent!</h1>
        <p className="text-muted-foreground mt-3 text-lg max-w-sm mx-auto">Track your child's learning journey, assign tasks, and celebrate their wins together!</p>
      </div>
      <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
        {[['📊', 'Track Progress'], ['✅', 'Assign Tasks'], ['🎁', 'Set Rewards']].map(([emoji, label]) => (
          <div key={label} className="bg-card border rounded-2xl p-3 text-center">
            <div className="text-2xl mb-1">{emoji}</div>
            <p className="text-xs font-semibold">{label}</p>
          </div>
        ))}
      </div>
      <button onClick={() => setStep(1)} className="btn-kid bg-gradient-to-r from-violet-600 to-purple-600 text-white px-10 py-4 text-base font-bold flex items-center gap-2 mx-auto">
        Set Up Dashboard <ArrowRight className="h-5 w-5" />
      </button>
    </motion.div>,

    // Step 1: Parent profile
    <motion.div key="profile" className="space-y-5">
      <div className="text-center">
        <div className="text-6xl mb-3">👤</div>
        <h2 className="text-2xl font-black">Your Name</h2>
        <p className="text-muted-foreground text-sm mt-1">What should your children call you?</p>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5">Display Name</label>
        <input value={parentName} onChange={e => setParentName(e.target.value)} placeholder="e.g. Mom, Dad, Papa, Mama..."
          className="w-full py-3 px-4 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-violet-500 text-base" />
      </div>
      <div className="bg-secondary rounded-2xl p-4 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground mb-1">💡 Quick tip</p>
        <p>Ask your child to register on AIVANA with their own email first, then link their account from your dashboard.</p>
      </div>
      <button onClick={handleSaveProfile} disabled={saving || !parentName.trim()}
        className="btn-kid w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white py-3 text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue <ArrowRight className="h-4 w-4" /></>}
      </button>
    </motion.div>,

    // Step 2: Link child
    <motion.div key="child" className="space-y-5">
      <div className="text-center">
        <div className="text-6xl mb-3">🔗</div>
        <h2 className="text-2xl font-black">Link Your Child</h2>
        <p className="text-muted-foreground text-sm mt-1">Enter your child's registered email to link their account</p>
      </div>
      {!inviteSent ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Child's Email Address</label>
            <input value={childEmail} onChange={e => setChildEmail(e.target.value)} type="email" placeholder="child@example.com"
              className="w-full py-3 px-4 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Nickname (optional)</label>
            <input value={childNickname} onChange={e => setChildNickname(e.target.value)} placeholder="e.g. Aryan, My Star..."
              className="w-full py-3 px-4 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
          </div>
          <button onClick={handleInviteChild} disabled={inviteLoading || !childEmail.trim()}
            className="btn-kid w-full bg-violet-600 text-white py-3 text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
            {inviteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserPlus className="h-4 w-4" /> Link Account</>}
          </button>
          <button onClick={() => setStep(3)} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2">
            Skip for now →
          </button>
        </div>
      ) : (
        <div className="text-center space-y-4">
          <div className="text-5xl">🎉</div>
          <p className="font-bold text-lg">{childNickname || 'Child'} linked successfully!</p>
          <p className="text-muted-foreground text-sm">You can add more children from your dashboard.</p>
          <button onClick={() => setStep(3)} className="btn-kid bg-violet-600 text-white px-8 py-3 text-sm font-bold flex items-center gap-2 mx-auto">
            Go to Dashboard <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </motion.div>,

    // Step 3: Done
    <motion.div key="done" className="text-center space-y-6">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 150 }} className="text-8xl">🌟</motion.div>
      <div>
        <h2 className="text-3xl font-black">Dashboard Ready!</h2>
        <p className="text-muted-foreground mt-2 max-w-sm mx-auto">Monitor progress, assign tasks, approve rewards, and cheer on your child every day!</p>
      </div>
      <button onClick={() => router.push('/parent/dashboard')}
        className="btn-kid bg-gradient-to-r from-violet-600 to-purple-600 text-white px-10 py-4 text-base font-bold flex items-center gap-2 mx-auto">
        Open My Dashboard 🚀
      </button>
    </motion.div>,
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 dark:from-violet-950/30 dark:via-background dark:to-purple-950/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
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
        {step > 0 && step < 2 && (
          <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mt-6">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        )}
      </div>
    </div>
  )
}
