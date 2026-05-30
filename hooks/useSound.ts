'use client'

import { useCallback, useRef } from 'react'

// Web Audio API - no external library needed
type SoundType = 'complete' | 'levelup' | 'badge' | 'click' | 'error' | 'streak'

function createAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    return new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  } catch {
    return null
  }
}

function playTone(ctx: AudioContext, freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) {
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  oscillator.type = type
  oscillator.frequency.setValueAtTime(freq, ctx.currentTime)
  oscillator.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + duration * 0.6)

  gainNode.gain.setValueAtTime(volume, ctx.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

  oscillator.start(ctx.currentTime)
  oscillator.stop(ctx.currentTime + duration)
}

const SOUND_SEQUENCES: Record<SoundType, { freq: number; duration: number; delay: number; type?: OscillatorType }[]> = {
  complete: [
    { freq: 523, duration: 0.12, delay: 0 },
    { freq: 659, duration: 0.12, delay: 0.1 },
    { freq: 784, duration: 0.2, delay: 0.2 },
  ],
  levelup: [
    { freq: 523, duration: 0.1, delay: 0 },
    { freq: 659, duration: 0.1, delay: 0.08 },
    { freq: 784, duration: 0.1, delay: 0.16 },
    { freq: 1047, duration: 0.3, delay: 0.24 },
  ],
  badge: [
    { freq: 880, duration: 0.15, delay: 0 },
    { freq: 1047, duration: 0.15, delay: 0.12 },
    { freq: 1319, duration: 0.25, delay: 0.24 },
  ],
  click: [
    { freq: 800, duration: 0.06, delay: 0, type: 'square' as OscillatorType },
  ],
  error: [
    { freq: 300, duration: 0.15, delay: 0 },
    { freq: 250, duration: 0.2, delay: 0.12 },
  ],
  streak: [
    { freq: 440, duration: 0.08, delay: 0 },
    { freq: 550, duration: 0.08, delay: 0.07 },
    { freq: 660, duration: 0.08, delay: 0.14 },
    { freq: 880, duration: 0.15, delay: 0.21 },
    { freq: 1100, duration: 0.2, delay: 0.3 },
  ],
}

export function useSound() {
  const ctxRef = useRef<AudioContext | null>(null)

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = createAudioContext()
    }
    return ctxRef.current
  }, [])

  const play = useCallback((sound: SoundType) => {
    // Check user preference
    if (typeof window !== 'undefined') {
      const soundPref = localStorage.getItem('sound_enabled')
      if (soundPref === 'false') return
    }

    const ctx = getCtx()
    if (!ctx) return

    // Resume if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        const sequence = SOUND_SEQUENCES[sound]
        sequence.forEach(({ freq, duration, delay, type }) => {
          setTimeout(() => playTone(ctx, freq, duration, type || 'sine'), delay * 1000)
        })
      })
      return
    }

    const sequence = SOUND_SEQUENCES[sound]
    sequence.forEach(({ freq, duration, delay, type }) => {
      setTimeout(() => playTone(ctx, freq, duration, type || 'sine'), delay * 1000)
    })
  }, [getCtx])

  return { play }
}
