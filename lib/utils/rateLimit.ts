import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Use in-memory fallback if Redis not configured (dev mode)
let redis: Redis | null = null
const inMemoryStore = new Map<string, { count: number; resetAt: number }>()

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }
  return redis
}

type Duration = `${number} ${'ms' | 's' | 'm' | 'h' | 'd'}`

export async function checkRateLimit(
  key: string,
  limit: number,
  window: Duration
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const redisClient = getRedis()

  // Use Upstash Redis if available
  if (redisClient) {
    const ratelimit = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(limit, window),
      analytics: true,
      prefix: 'aivana',
    })
    const result = await ratelimit.limit(key)
    return { success: result.success, remaining: result.remaining, reset: result.reset }
  }

  // In-memory fallback for development
  const windowMs = parseWindowToMs(window)
  const now = Date.now()
  const entry = inMemoryStore.get(key)

  if (!entry || now > entry.resetAt) {
    inMemoryStore.set(key, { count: 1, resetAt: now + windowMs })
    return { success: true, remaining: limit - 1, reset: now + windowMs }
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0, reset: entry.resetAt }
  }

  entry.count++
  return { success: true, remaining: limit - entry.count, reset: entry.resetAt }
}

function parseWindowToMs(window: Duration): number {
  const [value, unit] = window.split(' ')
  const num = parseInt(value)
  const multipliers: Record<string, number> = {
    ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000,
  }
  return num * (multipliers[unit] || 1000)
}
