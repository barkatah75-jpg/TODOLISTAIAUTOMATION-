'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { ParentNavbar } from './ParentNavbar'
import toast from 'react-hot-toast'
import type { Profile, FamilyLink } from '@/types/database'
import type { ScreenTimeLimit } from '@/types/advanced'
import { Monitor, Moon, Save, Loader2 } from 'lucide-react'

interface Session { user_id: string; duration_mins: number | null; date: string }

interface Props {
  profile: Profile
  familyLinks: (FamilyLink & { child: { id: string; name: string; display_name: string | null } })[]
  limits: ScreenTimeLimit[]
  sessions: Session[]
}

export function ScreenTimeManagerClient({ profile, familyLinks, limits, sessions }: Props) {
  const supabase = getSupabaseBrowser()
  const [saving, setSaving] = useState<string | null>(null)
  const [childLimits, setChildLimits] = useState<Record<string, Partial<ScreenTimeLimit>>>(
    Object.fromEntries(familyLinks.map(l => {
      const existing = limits.find(li => li.child_id === l.child_id)
      return [l.child_id, existing || { daily_limit_mins: 120, weekend_extra_mins: 60, focus_mode_enabled: true }]
    }))
  )

  const getChildSessionMins = (childId: string) => {
    const today = new Date().toISOString().split('T')[0]
    return sessions.filter(s => s.user_id === childId && s.date === today)
      .reduce((sum, s) => sum + (s.duration_mins || 0), 0)
  }

  const handleSave = async (childId: string) => {
    setSaving(childId)
    try {
      const limit = childLimits[childId]
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      await supabase.from('screen_time_limits').upsert({
        parent_id: user.id,
        child_id: childId,
        daily_limit_mins: limit.daily_limit_mins || 120,
        weekend_extra_mins: limit.weekend_extra_mins || 60,
        bedtime_start: limit.bedtime_start || null,
        bedtime_end: limit.bedtime_end || null,
        focus_mode_enabled: limit.focus_mode_enabled ?? true,
      }, { onConflict: 'parent_id,child_id' })

      toast.success('Screen time limit saved! ✅')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(null)
    }
  }

  const updateLimit = (childId: string, field: string, value: unknown) => {
    setChildLimits(prev => ({
      ...prev,
      [childId]: { ...prev[childId], [field]: value },
    }))
  }

  if (familyLinks.length === 0) return (
    <div className="min-h-screen bg-background">
      <ParentNavbar profile={profile} />
      <div className="text-center py-20 text-muted-foreground">No children linked yet.</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <ParentNavbar profile={profile} />
      <main className="max-w-2xl mx-auto px-4 pb-24 pt-4 space-y-5">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Monitor className="h-6 w-6 text-violet-600" /> Screen Time
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Set healthy limits for each child</p>
        </div>

        {familyLinks.map((link, i) => {
          const limit = childLimits[link.child_id] || {}
          const todayMins = getChildSessionMins(link.child_id)
          const dailyLimit = limit.daily_limit_mins || 120
          const usagePct = Math.min(Math.round((todayMins / dailyLimit) * 100), 100)
          const childName = link.child.display_name || link.child.name

          return (
            <motion.div key={link.child_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="bg-card border rounded-3xl p-5 space-y-5">
              {/* Child header + today usage */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-xl">🧒</div>
                    <div>
                      <p className="font-bold">{childName}</p>
                      <p className="text-xs text-muted-foreground">Today: {todayMins}m / {dailyLimit}m</p>
                    </div>
                  </div>
                  <span className={`text-sm font-black ${usagePct >= 100 ? 'text-red-500' : usagePct >= 80 ? 'text-amber-500' : 'text-green-600'}`}>
                    {usagePct}%
                  </span>
                </div>
                <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${usagePct >= 100 ? 'bg-red-500' : usagePct >= 80 ? 'bg-amber-500' : 'bg-green-500'}`}
                    style={{ width: `${usagePct}%` }} />
                </div>
              </div>

              {/* Daily limit slider */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium">Daily Limit</label>
                  <span className="text-sm font-bold text-violet-600">{limit.daily_limit_mins || 120} min</span>
                </div>
                <input type="range" min={30} max={480} step={15}
                  value={limit.daily_limit_mins || 120}
                  onChange={e => updateLimit(link.child_id, 'daily_limit_mins', parseInt(e.target.value))}
                  className="w-full" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>30 min</span><span>4 hrs</span><span>8 hrs</span>
                </div>
              </div>

              {/* Weekend extra */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium">Weekend Bonus</label>
                  <span className="text-sm font-bold text-violet-600">+{limit.weekend_extra_mins || 60} min</span>
                </div>
                <input type="range" min={0} max={180} step={15}
                  value={limit.weekend_extra_mins || 60}
                  onChange={e => updateLimit(link.child_id, 'weekend_extra_mins', parseInt(e.target.value))}
                  className="w-full" />
              </div>

              {/* Bedtime */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block flex items-center gap-1"><Moon className="h-3 w-3" /> Bedtime Start</label>
                  <input type="time" value={limit.bedtime_start || '21:00'}
                    onChange={e => updateLimit(link.child_id, 'bedtime_start', e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Wake Time</label>
                  <input type="time" value={limit.bedtime_end || '07:00'}
                    onChange={e => updateLimit(link.child_id, 'bedtime_end', e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
              </div>

              {/* Focus mode toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Focus Mode</p>
                  <p className="text-xs text-muted-foreground">Block app during focus sessions</p>
                </div>
                <button onClick={() => updateLimit(link.child_id, 'focus_mode_enabled', !limit.focus_mode_enabled)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${limit.focus_mode_enabled ? 'bg-violet-600' : 'bg-border'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${limit.focus_mode_enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <button onClick={() => handleSave(link.child_id)} disabled={saving === link.child_id}
                className="btn-kid w-full bg-violet-600 text-white py-3 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                {saving === link.child_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Save Limits for {childName}</>}
              </button>
            </motion.div>
          )
        })}
      </main>
    </div>
  )
}
