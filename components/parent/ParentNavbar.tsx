'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { Home, Users, ClipboardList, BarChart3, Gift, Settings, LogOut } from 'lucide-react'
import type { Profile } from '@/types/database'

const NAV_ITEMS = [
  { href: '/parent/dashboard', icon: Home, label: 'Home', emoji: '🏠' },
  { href: '/parent/children', icon: Users, label: 'Children', emoji: '👶' },
  { href: '/parent/tasks', icon: ClipboardList, label: 'Tasks', emoji: '📋' },
  { href: '/parent/analytics', icon: BarChart3, label: 'Analytics', emoji: '📊' },
  { href: '/parent/rewards', icon: Gift, label: 'Rewards', emoji: '🎁' },
]

export function ParentNavbar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = getSupabaseBrowser()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <>
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black gradient-text">AIVANA</span>
            <span className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300 rounded-full px-2 py-0.5 font-bold">Parent</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/parent/settings" className="p-2 rounded-xl hover:bg-secondary transition-colors">
              <Settings className="h-4 w-4" />
            </Link>
            <button onClick={handleLogout} className="p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-10 bg-background/95 backdrop-blur border-t">
        <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
          {NAV_ITEMS.map(item => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link key={item.href} href={item.href}
                className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${isActive ? 'text-violet-600 dark:text-violet-400' : 'text-muted-foreground hover:text-foreground'}`}>
                {isActive && (
                  <motion.div layoutId="parent-nav-pill"
                    className="absolute inset-0 bg-violet-100 dark:bg-violet-900/30 rounded-xl"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }} />
                )}
                <span className="relative text-lg">{item.emoji}</span>
                <span className="relative text-[10px] font-semibold">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
