'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-md"
          >
            <div className="text-6xl mb-4">😵</div>
            <h1 className="text-2xl font-black mb-2">Something went wrong!</h1>
            <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
              Don't worry — it's not your fault! Our team has been notified.
              {error.digest && (
                <span className="block mt-1 text-xs font-mono opacity-60">Error: {error.digest}</span>
              )}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={reset}
                className="btn-kid bg-violet-600 text-white px-6 py-3 text-sm font-bold"
              >
                Try Again 🔄
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="btn-kid border-2 border-border px-6 py-3 text-sm font-semibold hover:bg-secondary"
              >
                Go Home 🏠
              </button>
            </div>
          </motion.div>
        </div>
      </body>
    </html>
  )
}
