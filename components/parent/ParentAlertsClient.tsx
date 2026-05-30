'use client'

import { motion } from 'framer-motion'
import { format } from 'date-fns'
import { ParentNavbar } from './ParentNavbar'
import type { Profile } from '@/types/database'
import type { ParentAlert } from '@/types/advanced'
import { Bell, Heart, Flame, Monitor, Moon, TrendingUp } from 'lucide-react'

const ALERT_CONFIG = {
  mood_low: { icon: Heart, color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300', label: 'Mood Alert', emoji: '💔' },
  streak_break: { icon: Flame, color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-300', label: 'Streak Alert', emoji: '🔥' },
  screen_time: { icon: Monitor, color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300', label: 'Screen Time', emoji: '📱' },
  no_activity: { icon: Moon, color: 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-300', label: 'No Activity', emoji: '😴' },
  level_up: { icon: TrendingUp, color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-300', label: 'Level Up!', emoji: '🚀' },
}

interface Props {
  profile: Profile
  alerts: (ParentAlert & { child: { name: string; display_name: string | null } | null })[]
}

export function ParentAlertsClient({ profile, alerts }: Props) {
  const unreadCount = alerts.filter(a => !a.read).length

  return (
    <div className="min-h-screen bg-background">
      <ParentNavbar profile={profile} />
      <main className="max-w-2xl mx-auto px-4 pb-24 pt-4 space-y-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-black">Smart Alerts 🔔</h1>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">{unreadCount} new</span>
          )}
        </div>

        {alerts.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <h3 className="font-bold text-lg">No alerts yet</h3>
            <p className="text-muted-foreground text-sm mt-1 max-w-xs mx-auto">
              AIVANA monitors your children's patterns and alerts you when they need attention.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert, i) => {
              const config = ALERT_CONFIG[alert.alert_type] || ALERT_CONFIG.no_activity
              const childName = alert.child?.display_name || alert.child?.name || 'Your child'
              return (
                <motion.div key={alert.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className={`bg-card border rounded-2xl p-4 flex items-start gap-3 ${!alert.read ? 'border-l-4 border-l-violet-500' : ''}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${config.color}`}>
                    <span className="text-xl">{config.emoji}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm">{config.label}</p>
                      <span className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300 rounded-full px-2 py-0.5 font-medium">{childName}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-1.5">{format(new Date(alert.created_at), 'MMM d, h:mm a')}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Alert types explanation */}
        <div className="bg-secondary rounded-2xl p-4 space-y-2">
          <p className="font-semibold text-sm">About Smart Alerts</p>
          <div className="space-y-1.5">
            {Object.entries(ALERT_CONFIG).map(([key, val]) => (
              <div key={key} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{val.emoji}</span>
                <strong className="text-foreground">{val.label}:</strong>
                <span>
                  {key === 'mood_low' && 'Child reports feeling sad/stressed 2+ days in a row'}
                  {key === 'streak_break' && "Child hasn't completed tasks today (streak at risk)"}
                  {key === 'screen_time' && 'Daily screen time limit approached or exceeded'}
                  {key === 'no_activity' && 'No app activity for 3+ days'}
                  {key === 'level_up' && 'Child reached a new level milestone'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
