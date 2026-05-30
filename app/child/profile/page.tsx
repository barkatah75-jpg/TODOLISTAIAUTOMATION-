'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Loader2, LogOut, Moon, Sun, Bell, BellOff, ChevronRight, Shield, Volume2, VolumeX } from 'lucide-react'
import { useTheme } from 'next-themes'

const AVATARS = ['🦊','🐼','🦁','🐸','🐧','🦄','🐯','🐺','🦋','🐙','🦕','🤖','👾','🧸','🎃','🦸']

export default function ProfilePage() {
  const router = useRouter()
  const supabase = getSupabaseBrowser()
  const { theme, setTheme } = useTheme()
  const [profile, setProfile] = useState<{ name: string; display_name: string | null; email: string; sound_enabled: boolean } | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState('🦊')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [notifEnabled, setNotifEnabled] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles')
        .select('name, display_name, email, sound_enabled').eq('id', user.id).single()
      if (data) {
        setProfile(data)
        setDisplayName(data.display_name || data.name || '')
        setSoundEnabled(data.sound_enabled)
      }
    }
    load()
    setNotifEnabled('Notification' in window && Notification.permission === 'granted')
  }, [supabase])

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')
      const { error } = await supabase.from('profiles').update({
        display_name: displayName.trim() || null,
        sound_enabled: soundEnabled,
      }).eq('id', user.id)
      if (error) throw error
      toast.success('Profile saved! ✨')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleNotifToggle = async () => {
    if (!('Notification' in window)) { toast.error('Notifications not supported'); return }
    if (Notification.permission === 'denied') { toast.error('Notifications blocked. Enable in browser settings.'); return }
    if (Notification.permission === 'default') {
      const perm = await Notification.requestPermission()
      if (perm === 'granted') {
        // Register push subscription
        try {
          const reg = await navigator.serviceWorker.ready
          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
          })
          await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint, keys: { p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')!))), auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')!))) } }),
          })
          setNotifEnabled(true)
          toast.success('Notifications enabled! 🔔')
        } catch { toast.error('Failed to enable notifications') }
      }
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

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b px-4 py-3 flex items-center justify-between">
        <h1 className="font-black text-lg">My Profile</h1>
        <button onClick={() => router.back()} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
      </header>

      <main className="max-w-lg mx-auto px-4 pb-10 pt-6 space-y-6">
        {/* Avatar */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="text-7xl mb-3">{selectedAvatar}</div>
          <h2 className="text-xl font-black">{displayName || profile.name}</h2>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
        </motion.div>

        {/* Avatar picker */}
        <div className="bg-card border rounded-3xl p-5">
          <h3 className="font-bold text-sm mb-3">Choose Avatar</h3>
          <div className="grid grid-cols-8 gap-2">
            {AVATARS.map(av => (
              <button key={av} onClick={() => setSelectedAvatar(av)}
                className={`text-2xl rounded-xl py-1.5 transition-all hover:scale-110 ${selectedAvatar === av ? 'bg-violet-100 dark:bg-violet-900/30 scale-110' : ''}`}>
                {av}
              </button>
            ))}
          </div>
        </div>

        {/* Display name */}
        <div className="bg-card border rounded-3xl p-5 space-y-3">
          <h3 className="font-bold text-sm">Display Name</h3>
          <input value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={20}
            placeholder="Your nickname..."
            className="w-full py-2.5 px-4 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm" />
          <button onClick={handleSave} disabled={saving}
            className="btn-kid w-full bg-violet-600 text-white py-2.5 text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
          </button>
        </div>

        {/* Settings */}
        <div className="bg-card border rounded-3xl overflow-hidden">
          <h3 className="font-bold text-sm px-5 pt-4 pb-2">Settings</h3>
          {[
            {
              icon: theme === 'dark' ? Moon : Sun,
              label: 'Dark Mode',
              value: theme === 'dark',
              toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
              emoji: theme === 'dark' ? '🌙' : '☀️',
            },
            {
              icon: soundEnabled ? Volume2 : VolumeX,
              label: 'Sound Effects',
              value: soundEnabled,
              toggle: () => { setSoundEnabled(!soundEnabled) },
              emoji: soundEnabled ? '🔊' : '🔇',
            },
            {
              icon: notifEnabled ? Bell : BellOff,
              label: 'Push Notifications',
              value: notifEnabled,
              toggle: handleNotifToggle,
              emoji: notifEnabled ? '🔔' : '🔕',
            },
          ].map((item, i) => (
            <div key={item.label} className={`flex items-center gap-3 px-5 py-4 ${i < 2 ? 'border-b' : ''}`}>
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
        <div className="bg-card border rounded-3xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-green-500" />
            <h3 className="font-bold text-sm">Privacy & Safety</h3>
          </div>
          <p className="text-xs text-muted-foreground">AIVANA Kids OS is COPPA-compliant and kid-safe. Your data is never sold to advertisers.</p>
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
