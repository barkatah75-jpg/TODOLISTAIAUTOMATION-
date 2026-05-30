'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import type { Profile } from '@/types/database'
import { Home, CheckSquare, Sparkles, Trophy, Palette } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/child/dashboard', icon: Home, label: 'Home', emoji: '🏠' },
  { href: '/child/todos', icon: CheckSquare, label: 'Tasks', emoji: '✅' },
  { href: '/child/ai-chat', icon: Sparkles, label: 'AIVA', emoji: '🤖' },
  { href: '/child/rewards', icon: Trophy, label: 'Rewards', emoji: '🏆' },
  { href: '/child/drawing', icon: Palette, label: 'Draw', emoji: '🎨' },
]

const MORE_ITEMS = [
  { href: '/child/mood', label: 'Mood Check', emoji: '😊' },
  { href: '/child/focus', label: 'Focus Mode', emoji: '🧠' },
  { href: '/child/story', label: 'My Stories', emoji: '📚' },
  { href: '/child/leaderboard', label: 'Leaderboard', emoji: '🏅' },
  { href: '/child/files', label: 'Files & OCR', emoji: '📄' },
]

export function ChildNavbar({ profile }: { profile: Profile }) {
  const pathname = usePathname()

  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black gradient-text">AIVANA</span>
          <span className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300 rounded-full px-2 py-0.5 font-bold">Kids OS</span>
        </div>
        <Link href="/child/profile" className="w-8 h-8 rounded-full overflow-hidden bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
          {profile.avatar_url ? (
            <Image src={profile.avatar_url} alt={profile.name} width={32} height={32} className="object-cover" />
          ) : (
            <span className="text-sm font-bold text-violet-600 dark:text-violet-300">
              {profile.name.charAt(0).toUpperCase()}
            </span>
          )}
        </Link>
      </header>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 bg-background/95 backdrop-blur border-t safe-area-pb">
        <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href}
                className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${isActive ? 'text-violet-600 dark:text-violet-400' : 'text-muted-foreground hover:text-foreground'}`}>
                {isActive && (
                  <motion.div layoutId="nav-pill"
                    className="absolute inset-0 bg-violet-100 dark:bg-violet-900/30 rounded-xl"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative text-lg leading-none">{item.emoji}</span>
                <span className="relative text-[10px] font-semibold leading-none">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
