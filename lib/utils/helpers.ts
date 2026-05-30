import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'

// ── Tailwind class merger ────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── XP & Level calculations ─────────────────────────────────

/** Calculate level from total XP using formula: floor(sqrt(xp/100)) + 1 */
export function calculateLevel(totalXP: number): number {
  return Math.floor(Math.sqrt(totalXP / 100)) + 1
}

/** XP needed to reach a given level */
export function xpForLevel(level: number): number {
  return Math.pow(level - 1, 2) * 100
}

/** Progress percentage within current level */
export function levelProgress(totalXP: number): number {
  const level = calculateLevel(totalXP)
  const current = xpForLevel(level)
  const next = xpForLevel(level + 1)
  if (next === current) return 100
  return Math.min(Math.round(((totalXP - current) / (next - current)) * 100), 100)
}

/** XP needed to reach next level */
export function xpToNextLevel(totalXP: number): number {
  const level = calculateLevel(totalXP)
  const next = xpForLevel(level + 1)
  return Math.max(0, next - totalXP)
}

// ── Date formatting ─────────────────────────────────────────

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'MMM d')
}

export function formatRelativeTime(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
}

export function formatDateTime(dateStr: string): string {
  return format(new Date(dateStr), 'MMM d, yyyy · h:mm a')
}

// ── File size formatting ─────────────────────────────────────

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`
}

// ── String utilities ─────────────────────────────────────────

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + '...'
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n.charAt(0).toUpperCase())
    .join('')
}

// ── Color utilities ──────────────────────────────────────────

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    homework: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    chores: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    reading: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    exercise: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    creative: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
    social: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
    personal: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    custom: 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300',
  }
  return colors[category] || colors.custom
}

export function getCategoryEmoji(category: string): string {
  const emojis: Record<string, string> = {
    homework: '📚', chores: '🧹', reading: '📖',
    exercise: '💪', creative: '🎨', social: '👋',
    personal: '🌟', custom: '✏️',
  }
  return emojis[category] || '✏️'
}

// ── Validation helpers ───────────────────────────────────────

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isStrongPassword(password: string): boolean {
  return password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)
}

// ── Random utilities ─────────────────────────────────────────

export function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function shuffleArray<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

// ── Debounce ────────────────────────────────────────────────

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

// ── Storage helpers (localStorage with SSR safety) ──────────

export function getLocalStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const item = localStorage.getItem(key)
    return item ? (JSON.parse(item) as T) : fallback
  } catch {
    return fallback
  }
}

export function setLocalStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage errors
  }
}

// ── URL helpers ──────────────────────────────────────────────

export function buildUrl(base: string, params: Record<string, string | number | boolean | null | undefined>): string {
  const url = new URL(base, 'http://localhost')
  Object.entries(params).forEach(([key, val]) => {
    if (val !== null && val !== undefined && val !== '') {
      url.searchParams.set(key, String(val))
    }
  })
  return url.pathname + url.search
}

// ── Array utilities ──────────────────────────────────────────

export function groupBy<T, K extends string | number>(arr: T[], fn: (item: T) => K): Record<K, T[]> {
  return arr.reduce((groups, item) => {
    const key = fn(item)
    return { ...groups, [key]: [...(groups[key] || []), item] }
  }, {} as Record<K, T[]>)
}

export function unique<T>(arr: T[], key?: keyof T): T[] {
  if (!key) return [...new Set(arr)]
  const seen = new Set()
  return arr.filter((item) => {
    const k = item[key]
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

export function sortBy<T>(arr: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] {
  return [...arr].sort((a, b) => {
    const av = a[key], bv = b[key]
    if (av < bv) return direction === 'asc' ? -1 : 1
    if (av > bv) return direction === 'asc' ? 1 : -1
    return 0
  })
}
