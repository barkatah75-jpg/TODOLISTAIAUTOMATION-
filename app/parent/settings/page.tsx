'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { useTheme } from 'next-themes'
import toast from 'react-hot-toast'
import Link from 'next/link'
import {
  Loader2, Moon, Sun, Bell, LogOut, Shield,
  CreditCard, User, ChevronRight, Crown, Trash2
} from 'lucide-react'

export default function ParentSettingsPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowser()
  const { theme, setTheme } = useTheme()
  const [profile, setProfile] = useState<{
    name: string; email: string; display_name: string | null
  } | null>(null)
  const [subscription, setSubscription] = useState<{
    plan: string; status: string; current_period_end: string | null
  } | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [profileRes, subRes] = await Promise.all([
        supabase.from('profiles').select('name, email, display_name').eq('id', user.id).single(),
        supabase.from('subscriptions').select('plan, status, current_period_end').eq('user_id', user.id).single(),
      ])
      if (profileRes.data) {
        setProfile(profileRes.data)
        setDisplayName(profileRes.data.display_name || profileRes.data.name || '')
      }
      if (subRes.data) setSubscription(subRes.data)
    }
    load()
  }, [supabase])

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')
      await supabase.from('profiles').update({ display_name: displayName.trim() || null }).eq('id', user.id)
      toast.success('Settings saved!')
    } catch {
      toast.error('Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
    </div>
  )

  const planLabel = subscription?.plan === 'free' ? 'Free Plan' : subscription?.plan === 'pro' ? 'Pro Plan ⚡' : 'Family Plan 👨‍👩‍👧'

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b px-4 py-3 flex items-center justify-between">
        <h1 className="font-black text-lg">Settings ⚙️</h1>
        <button onClick={() => router.back()} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
      </header>

      <main className="max-w-lg mx-auto px-4 pb-10 pt-6 space-y-5">

        {/* Profile */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card border rounded-3xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-2xl">👤</div>
            <div>
              <p className="font-black">{displayName || profile.name}</p>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block">Display Name</label>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={50}
              className="w-full py-2.5 px-4 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <button onClick={handleSave} disabled={saving}
            className="btn-kid w-full bg-violet-600 text-white py-2.5 text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
          </button>
        </motion.div>

        {/* Subscription */}
        <div className="bg-card border rounded-3xl overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-violet-600" />
              <p className="font-bold text-sm">Subscription</p>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${subscription?.plan === 'free' ? 'bg-secondary text-muted-foreground' : 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'}`}>
              {planLabel}
            </span>
          </div>
          <div className="px-5 py-4 space-y-3">
            {subscription?.plan !== 'free' && subscription?.current_period_end && (
              <p className="text-xs text-muted-foreground">
                Renews on {new Date(subscription.current_period_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
            {subscription?.plan === 'free' ? (
              <Link href="/pricing"
                className="btn-kid flex items-center justify-center gap-2 w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white py-2.5 text-sm font-bold">
                <Crown className="h-4 w-4" /> Upgrade to Pro →
              </Link>
            ) : (
              <div className="space-y-2">
                <Link href="/pricing" className="btn-kid flex items-center justify-between w-full border-2 border-border px-4 py-2.5 text-sm font-semibold hover:bg-secondary">
                  <span>Change Plan</span><ChevronRight className="h-4 w-4" />
                </Link>
                <button className="w-full text-sm text-red-500 hover:text-red-600 py-2 transition-colors">
                  Cancel Subscription
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-card border rounded-3xl overflow-hidden">
          <p className="font-bold text-sm px-5 pt-4 pb-2">Preferences</p>
          {[
            {
              label: 'Dark Mode',
              emoji: theme === 'dark' ? '🌙' : '☀️',
              value: theme === 'dark',
              toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
            },
          ].map((item, i) => (
            <div key={item.label} className="flex items-center gap-3 px-5 py-4 border-t">
              <span className="text-xl">{item.emoji}</span>
              <p className="flex-1 text-sm font-medium">{item.label}</p>
              <button onClick={item.toggle}
                className={`relative w-11 h-6 rounded-full transition-colors ${item.value ? 'bg-violet-600' : 'bg-border'}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${item.value ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          ))}
        </div>

        {/* Privacy */}
        <div className="bg-card border rounded-3xl p-5 space-y-2">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-green-500" />
            <p className="font-bold text-sm">Privacy & Safety</p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            AIVANA Kids OS is COPPA-compliant. We never sell your or your child's data to advertisers.
            All child data is protected with Row Level Security — only you and your linked children can access it.
          </p>
          <div className="flex gap-3 pt-1">
            <Link href="/privacy" className="text-xs text-violet-600 hover:underline">Privacy Policy</Link>
            <Link href="/terms" className="text-xs text-violet-600 hover:underline">Terms of Service</Link>
          </div>
        </div>

        {/* Account danger zone */}
        <div className="bg-card border border-red-200 dark:border-red-900 rounded-3xl p-5 space-y-3">
          <p className="font-bold text-sm text-red-600 dark:text-red-400">Danger Zone</p>
          <button className="flex items-center gap-2 w-full py-2 text-sm text-red-500 hover:text-red-600 transition-colors">
            <Trash2 className="h-4 w-4" /> Delete Account
          </button>
        </div>

        {/* Logout */}
        <button onClick={handleLogout} disabled={loggingOut}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 font-semibold text-sm transition-all disabled:opacity-50">
          {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <><LogOut className="h-4 w-4" /> Sign Out</>}
        </button>
      </main>
    </div>
  )
}
