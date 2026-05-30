import webpush from 'web-push'
import { getSupabaseAdmin } from '@/lib/supabase/server'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  url?: string
  tag?: string
  data?: Record<string, unknown>
}

export async function sendNotification(
  userId: string,
  payload: NotificationPayload
): Promise<{ sent: number; failed: number }> {
  const supabase = getSupabaseAdmin()

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth, id')
    .eq('user_id', userId)

  if (!subscriptions?.length) return { sent: 0, failed: 0 }

  let sent = 0
  let failed = 0

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/badge-72x72.png',
    url: payload.url || '/',
    tag: payload.tag || 'aivana-notification',
    data: payload.data || {},
  })

  const results = await Promise.allSettled(
    subscriptions.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        notificationPayload
      )
    )
  )

  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    if (result.status === 'fulfilled') {
      sent++
    } else {
      failed++
      // Remove invalid/expired subscriptions (410 Gone)
      const err = result.reason as { statusCode?: number }
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        await supabase.from('push_subscriptions').delete().eq('id', subscriptions[i].id)
      }
    }
  }

  return { sent, failed }
}

export async function sendStreakAlert(userId: string, streakDays: number, childName: string) {
  await sendNotification(userId, {
    title: `🔥 ${streakDays}-day streak!`,
    body: `Amazing ${childName}! Keep it up to earn bonus XP!`,
    tag: 'streak-alert',
    url: '/child/dashboard',
  })
}

export async function sendTaskReminder(userId: string, taskText: string, childName: string) {
  await sendNotification(userId, {
    title: `📚 Task reminder for ${childName}`,
    body: `Don't forget: "${taskText.slice(0, 50)}"`,
    tag: 'task-reminder',
    url: '/child/todos',
  })
}

export async function sendRewardUnlocked(userId: string, rewardName: string, childName: string) {
  await sendNotification(userId, {
    title: `🎁 New reward available!`,
    body: `${childName} earned enough XP to unlock: ${rewardName}`,
    tag: 'reward-unlocked',
    url: '/child/rewards',
  })
}

export async function sendLevelUp(userId: string, newLevel: number, childName: string) {
  await sendNotification(userId, {
    title: `⭐ Level Up! ${childName} is now Level ${newLevel}!`,
    body: `Congratulations! Keep completing tasks to level up again!`,
    tag: 'level-up',
    url: '/child/dashboard',
  })
}
