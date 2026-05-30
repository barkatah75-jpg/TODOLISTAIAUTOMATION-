'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import type { Todo } from '@/types/database'

export function useTodos(userId: string, initialTodos: Todo[] = []) {
  const [todos, setTodos] = useState<Todo[]>(initialTodos)
  const [loading, setLoading] = useState(false)
  const supabase = getSupabaseBrowser()

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`todos:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'todos', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTodos(prev => [payload.new as Todo, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setTodos(prev => prev.map(t => t.id === payload.new.id ? payload.new as Todo : t))
          } else if (payload.eventType === 'DELETE') {
            setTodos(prev => prev.filter(t => t.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, supabase])

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', userId)
        .eq('completed', false)
        .order('sort_order')
        .order('created_at', { ascending: false })
      setTodos(data || [])
    } finally {
      setLoading(false)
    }
  }, [userId, supabase])

  const markComplete = useCallback((todoId: string) => {
    setTodos(prev => prev.map(t => t.id === todoId ? { ...t, completed: true, completed_at: new Date().toISOString() } : t))
  }, [])

  const removeFromList = useCallback((todoId: string) => {
    setTodos(prev => prev.filter(t => t.id !== todoId))
  }, [])

  const addTodo = useCallback((todo: Todo) => {
    setTodos(prev => [todo, ...prev])
  }, [])

  return { todos, loading, refetch, markComplete, removeFromList, addTodo, setTodos }
}
