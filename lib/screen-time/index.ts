/**
 * Screen Time business logic utilities
 * Used by API routes, hooks, and background cron jobs
 */

import type { ScreenTimeStatus, ScreenTimeLimit } from '@/types/advanced'

/**
 * Calculate screen time status from raw DB data
 */
export function calculateScreenTimeStatus(
  todayMinutes: number,
  limit: ScreenTimeLimit | null,
  isWeekend: boolean,
  currentTimeHHMM: string, // e.g. "21:30"
): ScreenTimeStatus {
  const dailyLimit = limit
    ? (isWeekend
        ? limit.daily_limit_mins + (limit.weekend_extra_mins || 0)
        : limit.daily_limit_mins)
    : 120 // default 2 hours

  // Check bedtime
  let isBedtime = false
  if (limit?.bedtime_start && limit?.bedtime_end) {
    const start = limit.bedtime_start // e.g. "21:00"
    const end = limit.bedtime_end   // e.g. "07:00"
    // Handle overnight (e.g. 21:00 to 07:00)
    if (start > end) {
      isBedtime = currentTimeHHMM >= start || currentTimeHHMM < end
    } else {
      isBedtime = currentTimeHHMM >= start && currentTimeHHMM < end
    }
  }

  const withinLimit = todayMinutes < dailyLimit
  const remainingMins = Math.max(0, dailyLimit - todayMinutes)
  const usagePercent = Math.min(Math.round((todayMinutes / dailyLimit) * 100), 100)
  const warning = remainingMins <= 15 && remainingMins > 0 && withinLimit
  const blocked = !withinLimit || isBedtime

  return {
    todayMinutes,
    dailyLimit,
    remainingMins,
    usagePercent,
    withinLimit,
    isBedtime,
    warning,
    blocked,
    limit,
  }
}

/**
 * Get current time as HH:MM string in user's timezone
 */
export function getCurrentTimeString(timezone?: string): string {
  try {
    const now = new Date()
    return now.toLocaleTimeString('en-GB', {
      timeZone: timezone || 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  } catch {
    const now = new Date()
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  }
}

/**
 * Check if current time is a weekend in user's timezone
 */
export function isWeekendInTimezone(timezone?: string): boolean {
  try {
    const now = new Date()
    const day = parseInt(now.toLocaleDateString('en-US', {
      timeZone: timezone || 'Asia/Kolkata',
      weekday: 'numeric',
    }))
    // 0 = Sunday, 6 = Saturday in JS, but toLocaleDateString returns 1-7
    return [1, 7].includes(day) // Sunday=1, Saturday=7 in some locales
  } catch {
    return [0, 6].includes(new Date().getDay())
  }
}

/**
 * Format screen time duration for display
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/**
 * Generate screen time warning message for parents/children
 */
export function getScreenTimeMessage(status: ScreenTimeStatus): { title: string; body: string; severity: 'info' | 'warning' | 'danger' } {
  if (status.isBedtime) {
    return {
      title: '🌙 Bedtime!',
      body: 'Time to put the device down and get some rest. Goodnight!',
      severity: 'danger',
    }
  }

  if (!status.withinLimit) {
    return {
      title: '⏱️ Screen Time Used Up',
      body: `You've used all your screen time for today (${formatDuration(status.dailyLimit)}). See you tomorrow!`,
      severity: 'danger',
    }
  }

  if (status.warning) {
    return {
      title: '⚠️ Almost Done!',
      body: `Only ${formatDuration(status.remainingMins)} of screen time left today!`,
      severity: 'warning',
    }
  }

  if (status.usagePercent >= 75) {
    return {
      title: '📊 Screen Time Check',
      body: `You've used ${status.usagePercent}% of your daily screen time.`,
      severity: 'info',
    }
  }

  return {
    title: '✅ Looking Good',
    body: `${formatDuration(status.remainingMins)} of screen time remaining today.`,
    severity: 'info',
  }
}

/**
 * Calculate weekly screen time summary
 */
export function summarizeWeeklyUsage(sessions: Array<{ duration_mins: number | null; date: string }>) {
  const byDay: Record<string, number> = {}

  for (const session of sessions) {
    const date = session.date
    byDay[date] = (byDay[date] || 0) + (session.duration_mins || 0)
  }

  const values = Object.values(byDay)
  const total = values.reduce((s, v) => s + v, 0)
  const avg = values.length > 0 ? Math.round(total / values.length) : 0
  const peak = Math.max(0, ...values)

  return {
    byDay,
    totalMinutes: total,
    avgMinutesPerDay: avg,
    peakMinutes: peak,
    daysActive: values.length,
  }
}

/**
 * Build parent alert for screen time breach
 */
export function buildScreenTimeAlert(
  childId: string,
  parentId: string,
  todayMinutes: number,
  limitMinutes: number,
) {
  return {
    parent_id: parentId,
    child_id: childId,
    alert_type: 'screen_time' as const,
    message: `Screen time limit exceeded: ${formatDuration(todayMinutes)} used (limit: ${formatDuration(limitMinutes)})`,
    data: { todayMinutes, limitMinutes },
    read: false,
    created_at: new Date().toISOString(),
  }
}
