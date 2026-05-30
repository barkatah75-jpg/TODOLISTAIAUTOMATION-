'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { inviteChild } from '@/lib/actions/parent'
import toast from 'react-hot-toast'
import { Loader2, ArrowLeft, UserPlus, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function InviteChildPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    try {
      const result = await inviteChild(email.trim(), nickname.trim())
      if (result.error) throw new Error(result.error)
      setSuccess(true)
      toast.success(`${nickname || 'Child'} linked successfully! 🎉`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to link child')
    } finally {
      setLoading(false)
    }
  }

  if (success) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-4">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} className="text-center space-y-4">
        <div className="text-7xl">🎉</div>
        <h2 className="text-2xl font-black text-green-700 dark:text-green-300">
          {nickname || 'Child'} linked!
        </h2>
        <p className="text-muted-foreground text-sm max-w-xs">
          You can now assign tasks, track progress, and set rewards for {nickname || 'them'}.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => { setSuccess(false); setEmail(''); setNickname('') }}
            className="btn-kid border-2 border-border px-5 py-2.5 text-sm font-semibold">
            Add Another
          </button>
          <Link href="/parent/children" className="btn-kid bg-violet-600 text-white px-5 py-2.5 text-sm font-bold">
            View Children →
          </Link>
        </div>
      </motion.div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 dark:from-violet-950/30 dark:via-background dark:to-purple-950/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/parent/children" className="flex items-center gap-2 text-sm text-muted-foreground mb-6 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Children
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card border rounded-3xl p-6 shadow-lg">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🔗</div>
            <h1 className="text-2xl font-black">Link a Child</h1>
            <p className="text-muted-foreground text-sm mt-2">
              Your child must have a registered AIVANA account first. Then enter their email below.
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-3 mb-5 text-xs text-blue-700 dark:text-blue-300">
            <p className="font-semibold mb-1">📱 How it works:</p>
            <ol className="space-y-0.5 list-decimal list-inside">
              <li>Ask your child to sign up at aivana.app</li>
              <li>They should choose "I'm a Kid" role</li>
              <li>Enter their email below to link accounts</li>
            </ol>
          </div>

          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Child's Email Address *</label>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email"
                placeholder="child@example.com" required
                className="w-full py-3 px-4 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Nickname (optional)</label>
              <input value={nickname} onChange={e => setNickname(e.target.value)}
                placeholder="e.g. Aryan, My Star, Champ..."
                className="w-full py-3 px-4 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
              <p className="text-xs text-muted-foreground mt-1">This is how they'll appear in your dashboard</p>
            </div>
            <button type="submit" disabled={loading || !email.trim()}
              className="btn-kid w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white py-3 text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserPlus className="h-4 w-4" /> Link Account</>}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
