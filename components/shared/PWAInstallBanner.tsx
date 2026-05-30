'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePWA } from '@/hooks/usePWA'
import { Download, X, Wifi, WifiOff } from 'lucide-react'

export function PWAInstallBanner() {
  const { canInstall, isOnline, install } = usePWA()
  const [dismissed, setDismissed] = useState(false)
  const [installing, setInstalling] = useState(false)

  const handleInstall = async () => {
    setInstalling(true)
    const outcome = await install()
    setInstalling(false)
    if (outcome === 'accepted') setDismissed(true)
  }

  return (
    <>
      {/* Offline indicator */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[60] bg-amber-500 text-white text-center py-2 px-4 text-xs font-semibold flex items-center justify-center gap-2"
          >
            <WifiOff className="h-3 w-3" />
            You're offline — some features may be limited
          </motion.div>
        )}
      </AnimatePresence>

      {/* Install banner */}
      <AnimatePresence>
        {canInstall && !dismissed && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-20 left-4 right-4 z-50 max-w-lg mx-auto"
          >
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-2xl p-4 shadow-xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 text-xl">
                🚀
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">Install AIVANA</p>
                <p className="text-violet-200 text-xs">Works offline · Faster · Full screen</p>
              </div>
              <button
                onClick={handleInstall}
                disabled={installing}
                className="flex-shrink-0 bg-white text-violet-700 rounded-xl px-3 py-2 text-xs font-bold hover:bg-violet-50 transition-colors flex items-center gap-1.5"
              >
                <Download className="h-3 w-3" />
                {installing ? '...' : 'Install'}
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="flex-shrink-0 p-1 rounded-lg hover:bg-white/20 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
