'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Mic, MicOff, Sparkles, Plus, BookOpen, Loader2 } from 'lucide-react'
import { createTodo } from '@/lib/actions/todos'
import { useVoiceInput } from '@/hooks/useVoiceInput'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  suggestedTasks?: string[]
}

const SUBJECT_OPTIONS = [
  { label: 'Math', emoji: '🔢' },
  { label: 'Science', emoji: '🔬' },
  { label: 'English', emoji: '📚' },
  { label: 'History', emoji: '🏛️' },
  { label: 'Hindi', emoji: '🇮🇳' },
  { label: 'General', emoji: '🌟' },
]

const STARTER_PROMPTS = [
  "Help me with my math homework",
  "Explain photosynthesis simply",
  "मुझे गणित समझाओ",
  "How do I solve fractions?",
  "Help me write a story",
]

export function AIChatInterface({ userId }: { userId: string }) {
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: "Hi! I'm AIVA, your AI learning buddy! 🤖✨\n\nI can help you with homework, explain difficult topics, and make learning fun! What subject are you working on today?",
    timestamp: new Date().toISOString(),
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState('General')
  const [conversationId, setConversationId] = useState<string | undefined>()
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { isListening, transcript, startListening, stopListening, supported } = useVoiceInput()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (transcript) setInput(transcript)
  }, [transcript])

  const sendMessage = async (text?: string) => {
    const content = (text || input).trim()
    if (!content || loading) return

    const userMsg: Message = { role: 'user', content, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          subject: selectedSubject,
          conversationId,
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error)
      }

      const data = await response.json()
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString(),
        suggestedTasks: data.suggestedTasks,
      }])
      if (data.conversationId) setConversationId(data.conversationId)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to get response'
      toast.error(msg)
      setMessages(prev => prev.filter(m => m !== userMsg))
    } finally {
      setLoading(false)
    }
  }

  const handleAddTask = async (taskText: string) => {
    const result = await createTodo({ text: taskText, category: 'homework', points: 20 })
    if (result.error) toast.error(result.error)
    else toast.success('Task added! ✅')
  }

  const handleVoice = () => {
    if (isListening) stopListening()
    else startListening()
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-2xl mx-auto">
      {/* Subject selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 px-1">
        {SUBJECT_OPTIONS.map(s => (
          <button
            key={s.label}
            onClick={() => setSelectedSubject(s.label)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              selectedSubject === s.label
                ? 'bg-violet-600 text-white'
                : 'bg-card border hover:bg-secondary'
            }`}
          >
            <span>{s.emoji}</span> {s.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}
            >
              {msg.role === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-sm">🤖</div>
              )}
              <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-violet-600 text-white rounded-tr-sm'
                    : 'bg-card border rounded-tl-sm'
                }`}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : msg.content}
                </div>

                {/* Suggested tasks */}
                {msg.suggestedTasks && msg.suggestedTasks.length > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 space-y-1.5">
                    <p className="text-xs text-muted-foreground font-medium">💡 Suggested tasks:</p>
                    {msg.suggestedTasks.map((task, j) => (
                      <button
                        key={j}
                        onClick={() => handleAddTask(task)}
                        className="flex items-center gap-2 w-full text-left text-xs bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl px-3 py-2 hover:bg-violet-100 transition-colors"
                      >
                        <Plus className="h-3 w-3 text-violet-500 flex-shrink-0" />
                        <span className="text-violet-700 dark:text-violet-300">{task}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-sm">🤖</div>
            <div className="bg-card border rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <motion.div key={i} className="w-2 h-2 rounded-full bg-violet-400"
                    animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Starter prompts */}
      {messages.length === 1 && (
        <div className="flex gap-2 overflow-x-auto py-2">
          {STARTER_PROMPTS.map((p, i) => (
            <button key={i} onClick={() => sendMessage(p)}
              className="flex-shrink-0 text-xs bg-card border rounded-full px-3 py-1.5 hover:bg-secondary transition-colors">
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="mt-3 flex items-end gap-2 bg-card border rounded-2xl p-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
          placeholder="Ask AIVA anything... 🌟"
          rows={1}
          className="flex-1 bg-transparent resize-none text-sm focus:outline-none placeholder:text-muted-foreground max-h-32 min-h-[36px] py-1.5 px-2"
          style={{ height: 'auto' }}
          onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px' }}
        />

        {supported && (
          <button onClick={handleVoice}
            className={`p-2 rounded-xl transition-all ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'hover:bg-secondary text-muted-foreground'}`}>
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
        )}

        <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
          className="p-2 rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-all active:scale-95">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}
