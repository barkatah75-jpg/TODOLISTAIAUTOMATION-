'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface VoiceInputOptions {
  language?: string
  continuous?: boolean
  interimResults?: boolean
  onResult?: (transcript: string, isFinal: boolean) => void
  onError?: (error: string) => void
}

interface VoiceInputReturn {
  isListening: boolean
  transcript: string
  interimTranscript: string
  confidence: number
  supported: boolean
  error: string | null
  startListening: () => void
  stopListening: () => void
  resetTranscript: () => void
  toggleListening: () => void
}

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}

export function useVoiceInput(options: VoiceInputOptions = {}): VoiceInputReturn {
  const {
    language = 'en-IN',
    continuous = false,
    interimResults = true,
    onResult,
    onError,
  } = options

  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [confidence, setConfidence] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [supported, setSupported] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    setSupported(!!SpeechRecognitionAPI)
  }, [])

  const createRecognition = useCallback(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognitionAPI) return null

    const recognition = new SpeechRecognitionAPI()
    recognition.lang = language
    recognition.continuous = continuous
    recognition.interimResults = interimResults
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsListening(true)
      setError(null)
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = ''
      let interimText = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalText += result[0].transcript
          setConfidence(Math.round(result[0].confidence * 100))
          onResult?.(result[0].transcript, true)
        } else {
          interimText += result[0].transcript
          onResult?.(result[0].transcript, false)
        }
      }

      if (finalText) {
        setTranscript(prev => (prev ? `${prev} ${finalText}` : finalText).trim())
        setInterimTranscript('')
      }
      if (interimText) {
        setInterimTranscript(interimText)
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorMessages: Record<string, string> = {
        'not-allowed': 'Microphone permission denied. Please allow microphone access.',
        'no-speech': 'No speech detected. Please try again.',
        'network': 'Network error. Check your internet connection.',
        'audio-capture': 'Microphone not found or not working.',
        'service-not-allowed': 'Speech service not allowed.',
      }
      const msg = errorMessages[event.error] || `Speech recognition error: ${event.error}`
      setError(msg)
      onError?.(msg)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
      setInterimTranscript('')
    }

    return recognition
  }, [language, continuous, interimResults, onResult, onError])

  const startListening = useCallback(() => {
    if (!supported) {
      setError('Speech recognition not supported in this browser. Try Chrome or Edge.')
      return
    }

    // Stop any existing recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }

    const recognition = createRecognition()
    if (!recognition) return

    recognitionRef.current = recognition
    setTranscript('')
    setInterimTranscript('')

    try {
      recognition.start()
    } catch (err) {
      setError('Failed to start microphone')
    }
  }, [supported, createRecognition])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsListening(false)
  }, [])

  const resetTranscript = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
    setConfidence(0)
  }, [])

  const toggleListening = useCallback(() => {
    if (isListening) stopListening()
    else startListening()
  }, [isListening, startListening, stopListening])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  return {
    isListening,
    transcript,
    interimTranscript,
    confidence,
    supported,
    error,
    startListening,
    stopListening,
    resetTranscript,
    toggleListening,
  }
}
