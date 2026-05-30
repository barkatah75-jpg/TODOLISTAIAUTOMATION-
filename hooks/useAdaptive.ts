'use client'

import { useState, useCallback } from 'react'
import type { AdaptiveTaskSuggestion, StudySlot, LearningProfile } from '@/types/advanced'

interface AdaptiveState {
  tasks: AdaptiveTaskSuggestion[]
  schedule: StudySlot[]
  profile: LearningProfile | null
  loading: boolean
  error: string | null
}

export function useAdaptive() {
  const [state, setState] = useState<AdaptiveState>({
    tasks: [],
    schedule: [],
    profile: null,
    loading: false,
    error: null,
  })

  const fetchAdaptiveTasks = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const res = await fetch('/api/adaptive?type=tasks')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setState(s => ({ ...s, tasks: data.tasks || [], loading: false }))
    } catch (err) {
      setState(s => ({ ...s, error: 'Could not load suggestions', loading: false }))
    }
  }, [])

  const fetchStudySchedule = useCallback(async () => {
    setState(s => ({ ...s, loading: true }))
    try {
      const res = await fetch('/api/adaptive?type=schedule')
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setState(s => ({ ...s, schedule: data.schedule || [], loading: false }))
    } catch {
      setState(s => ({ ...s, loading: false }))
    }
  }, [])

  const analyzeProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/adaptive?type=analyze')
      if (!res.ok) return
      const data = await res.json()
      setState(s => ({ ...s, profile: data.profile }))
    } catch {}
  }, [])

  return {
    ...state,
    fetchAdaptiveTasks,
    fetchStudySchedule,
    analyzeProfile,
  }
}
