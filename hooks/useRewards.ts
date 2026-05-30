'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import type { Reward } from '@/types/database'

export function useRewards(initialRewards: Reward) {
  const [currentRewards, setCurrentRewards] = useState<Reward>(initialRewards)
  const supabase = getSupabaseBrowser()

  useEffect(() => {
    const channel = supabase
      .channel(`rewards:${initialRewards.user_id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rewards', filter: `user_id=eq.${initialRewards.user_id}` },
        (payload) => { setCurrentRewards(payload.new as Reward) }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [initialRewards.user_id, supabase])

  const addXP = useCallback((amount: number) => {
    setCurrentRewards(prev => ({
      ...prev,
      total_xp: prev.total_xp + amount,
    }))
  }, [])

  return { currentRewards, addXP }
}
