'use client'

import { useState, useEffect, useCallback } from 'react'

interface PendingAction {
  id: string
  type: 'create_todo' | 'complete_todo' | 'update_todo' | 'mood_entry'
  payload: Record<string, unknown>
  timestamp: number
  retries: number
}

const DB_NAME = 'aivana-offline'
const DB_VERSION = 1
const STORE_NAME = 'pending-actions'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function savePending(action: PendingAction) {
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(action)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function getAllPending(): Promise<PendingAction[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function deletePending(id: string) {
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

const API_ROUTES: Record<PendingAction['type'], { url: string; method: string }> = {
  create_todo: { url: '/api/todos', method: 'POST' },
  complete_todo: { url: '/api/todos/complete', method: 'POST' },
  update_todo: { url: '/api/todos', method: 'PATCH' },
  mood_entry: { url: '/api/mood', method: 'POST' },
}

export function useOfflineSync() {
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setIsOffline(!navigator.onLine)

    const handleOnline = () => {
      setIsOffline(false)
      syncPending()
    }
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Load pending count on mount
    getAllPending().then(items => setPendingCount(items.length)).catch(() => {})

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Queue action for offline execution
  const queueAction = useCallback(async (
    type: PendingAction['type'],
    payload: Record<string, unknown>
  ): Promise<void> => {
    const action: PendingAction = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type,
      payload,
      timestamp: Date.now(),
      retries: 0,
    }
    await savePending(action)
    setPendingCount(c => c + 1)
  }, [])

  // Sync all pending actions when online
  const syncPending = useCallback(async (): Promise<{ synced: number; failed: number }> => {
    if (typeof window === 'undefined' || !navigator.onLine) return { synced: 0, failed: 0 }

    setSyncing(true)
    let synced = 0
    let failed = 0

    try {
      const pending = await getAllPending()
      for (const action of pending) {
        try {
          const route = API_ROUTES[action.type]
          const res = await fetch(route.url, {
            method: route.method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action.payload),
          })
          if (res.ok) {
            await deletePending(action.id)
            synced++
          } else if (action.retries >= 3) {
            // Give up after 3 retries
            await deletePending(action.id)
            failed++
          } else {
            // Update retry count
            await savePending({ ...action, retries: action.retries + 1 })
            failed++
          }
        } catch {
          failed++
        }
      }
      const remaining = await getAllPending()
      setPendingCount(remaining.length)
    } finally {
      setSyncing(false)
    }

    return { synced, failed }
  }, [])

  return { pendingCount, syncing, isOffline, queueAction, syncPending }
}
