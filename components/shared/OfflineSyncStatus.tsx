'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useOfflineSync } from '@/hooks/useOfflineSync'
import { WifiOff, RefreshCw, Check } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

export function OfflineSyncStatus() {
  const { pendingCount, syncing, isOffline, syncPending } = useOfflineSync()
  const [synced, setSynced] = useState(false)

  const handleSync = async () => {
    const result = await syncPending()
    if (result.synced > 0) {
      setSynced(true)
      toast.success(`${result.synced} action${result.synced > 1 ? 's' : ''} synced! ✅`)
      setTimeout(() => setSynced(false), 3000)
    }
  }

  if (!isOffline && pendingCount === 0) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        className="fixed bottom-20 left-4 right-4 z-40 max-w-sm mx-auto"
      >
        <div className={`rounded-2xl px-4 py-3 shadow-lg flex items-center gap-3 ${
          isOffline
            ? 'bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800'
            : 'bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800'
        }`}>
          {isOffline ? (
            <WifiOff className="h-4 w-4 text-amber-600 flex-shrink-0" />
          ) : (
            <RefreshCw className={`h-4 w-4 text-blue-600 flex-shrink-0 ${syncing ? 'animate-spin' : ''}`} />
          )}

          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold ${isOffline ? 'text-amber-800 dark:text-amber-300' : 'text-blue-800 dark:text-blue-300'}`}>
              {isOffline ? 'You\'re offline' : `${pendingCount} action${pendingCount > 1 ? 's' : ''} waiting to sync`}
            </p>
            <p className={`text-xs ${isOffline ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`}>
              {isOffline ? 'Changes saved locally. Will sync when online.' : 'Tap to sync now'}
            </p>
          </div>

          {!isOffline && pendingCount > 0 && (
            <button onClick={handleSync} disabled={syncing}
              className="flex-shrink-0 text-xs bg-blue-600 text-white rounded-xl px-3 py-1.5 font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1">
              {synced ? <><Check className="h-3 w-3" /> Done</> : syncing ? '...' : 'Sync'}
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
