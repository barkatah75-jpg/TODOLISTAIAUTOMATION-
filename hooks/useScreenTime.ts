'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { ScreenTimeStatus } from '@/types/advanced'

export function useScreenTime() {
  const [status, setStatus] = useState<ScreenTimeStatus | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionMinutes, setSessionMinutes] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startRef = useRef<Date | null>(null)

  // Fetch current screen time status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/screen-time')
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
      }
    } catch {}
  }, [])

  // Start tracking session
  const startSession = useCallback(async () => {
    try {
      const res = await fetch('/api/screen-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      })
      if (res.ok) {
        const data = await res.json()
        setSessionId(data.sessionId)
        startRef.current = new Date()
        // Update session minutes every minute
        timerRef.current = setInterval(() => {
          if (startRef.current) {
            const elapsed = Math.round((Date.now() - startRef.current.getTime()) / 60000)
            setSessionMinutes(elapsed)
          }
          fetchStatus()
        }, 60000) // every 1 minute
      }
    } catch {}
  }, [fetchStatus])

  // End session
  const endSession = useCallback(async () => {
    if (!sessionId) return
    try {
      await fetch('/api/screen-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end', sessionId }),
      })
      setSessionId(null)
      startRef.current = null
      if (timerRef.current) clearInterval(timerRef.current)
    } catch {}
  }, [sessionId])

  // Auto-start on mount, end on unmount
  useEffect(() => {
    fetchStatus()
    startSession()
    return () => {
      endSession()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  return { status, sessionMinutes, sessionId, fetchStatus, endSession }
}
