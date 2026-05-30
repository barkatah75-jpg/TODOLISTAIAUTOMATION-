'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'

interface ErrorPageProps {
  error?: Error & { digest?: string }
  reset?: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const router = useRouter()

  useEffect(() => {
    console.error('App error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center"
      >
        {/* Animated sad emoji */}
        <motion.div
          animate={{ rotate: [-5, 5, -5], y: [0, -8, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatType: 'mirror' }}
          className="text-8xl mb-6"
        >
          😵
        </motion.div>

        <h1 className="text-3xl font-black mb-3 text-foreground">Oops! Something broke</h1>

        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
          Don't worry, even superheroes have bad days! Something went wrong on our end.
          {error?.message && (
            <span className="block mt-2 text-xs font-mono bg-muted px-3 py-2 rounded-lg text-left overflow-auto">
              {error.message}
            </span>
          )}
        </p>

        <div className="flex flex-col gap-3">
          {reset && (
            <motion.button
              onClick={reset}
              whileTap={{ scale: 0.97 }}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-2xl shadow-lg"
            >
              🔄 Try Again
            </motion.button>
          )}

          <motion.button
            onClick={() => router.back()}
            whileTap={{ scale: 0.97 }}
            className="w-full py-3 border border-border rounded-2xl font-semibold text-sm hover:bg-muted transition"
          >
            ← Go Back
          </motion.button>

          <motion.button
            onClick={() => router.push('/')}
            whileTap={{ scale: 0.97 }}
            className="w-full py-3 bg-muted rounded-2xl font-semibold text-sm hover:bg-muted/80 transition"
          >
            🏠 Go Home
          </motion.button>
        </div>

        {error?.digest && (
          <p className="text-xs text-muted-foreground mt-4">Error ID: {error.digest}</p>
        )}
      </motion.div>
    </div>
  )
}
