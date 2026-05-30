'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Loader2, BookOpen, Sparkles, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'

const GENRES = [
  { id: 'adventure', label: 'Adventure', emoji: '🗺️' },
  { id: 'mystery', label: 'Mystery', emoji: '🔍' },
  { id: 'fantasy', label: 'Fantasy', emoji: '🧙' },
  { id: 'space', label: 'Space', emoji: '🚀' },
  { id: 'underwater', label: 'Ocean', emoji: '🌊' },
  { id: 'dinosaur', label: 'Dinos', emoji: '🦕' },
]

interface Story {
  id: string
  title: string
  content: string
  cover_emoji: string
  genre: string
  word_count: number
  achievement: string
  milestone_level: number
  created_at: string
}

export default function StoryPage() {
  const router = useRouter()
  const [stories, setStories] = useState<Story[]>([])
  const [generating, setGenerating] = useState(false)
  const [selectedGenre, setSelectedGenre] = useState('adventure')
  const [activeStory, setActiveStory] = useState<Story | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/story').then(r => r.json()).then(d => {
      setStories(d.stories || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genre: selectedGenre }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setStories(prev => [data.story, ...prev])
      setActiveStory(data.story)
      toast.success(`Story created! +${data.xpBonus} XP 📚`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50/30 to-background dark:from-amber-950/20 dark:via-background dark:to-background">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b px-4 py-3 flex items-center justify-between">
        <button onClick={() => router.back()} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
        <h1 className="font-black text-lg flex items-center gap-2">📚 My Story Library</h1>
        <div className="w-16" />
      </header>

      <main className="max-w-2xl mx-auto px-4 pb-10 pt-4 space-y-5">
        {/* Generate new story */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-3xl p-5 text-white">
          <p className="font-black text-lg mb-1">Create Your Story ✨</p>
          <p className="text-amber-100 text-sm mb-4">AI writes a story where YOU are the hero!</p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {GENRES.map(g => (
              <button key={g.id} onClick={() => setSelectedGenre(g.id)}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-2xl text-xs font-bold transition-all ${selectedGenre === g.id ? 'bg-white text-amber-600 scale-105' : 'bg-white/20 hover:bg-white/30'}`}>
                <span className="text-xl">{g.emoji}</span>
                {g.label}
              </button>
            ))}
          </div>
          <button onClick={handleGenerate} disabled={generating}
            className="btn-kid w-full bg-white text-amber-600 py-3 font-black text-sm flex items-center justify-center gap-2 hover:bg-amber-50 disabled:opacity-50">
            {generating ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Writing your story...</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Generate My Story! (3/day)</>
            )}
          </button>
        </div>

        {/* Story display */}
        <AnimatePresence mode="wait">
          {activeStory && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="bg-card border-2 border-amber-200 dark:border-amber-800 rounded-3xl overflow-hidden">
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 p-5 border-b">
                <div className="flex items-center gap-3">
                  <span className="text-5xl">{activeStory.cover_emoji}</span>
                  <div>
                    <h2 className="font-black text-xl">{activeStory.title}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Level {activeStory.milestone_level} · {activeStory.word_count} words · {activeStory.genre}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{activeStory.content}</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-4">
                  🏆 Achievement: {activeStory.achievement}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Story library */}
        <div>
          <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wide mb-3">Your Stories</h2>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-secondary rounded-2xl shimmer" />)}</div>
          ) : stories.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-2">📖</div>
              <p className="font-semibold">No stories yet</p>
              <p className="text-muted-foreground text-sm mt-1">Generate your first adventure above!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stories.map((story, i) => (
                <motion.button key={story.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  onClick={() => setActiveStory(activeStory?.id === story.id ? null : story)}
                  className="w-full flex items-center gap-3 bg-card border rounded-2xl px-4 py-3 hover:border-amber-300 dark:hover:border-amber-700 transition-all text-left">
                  <span className="text-3xl">{story.cover_emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{story.title}</p>
                    <p className="text-xs text-muted-foreground">{story.genre} · {format(new Date(story.created_at), 'MMM d, yyyy')}</p>
                  </div>
                  <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${activeStory?.id === story.id ? 'rotate-90' : ''}`} />
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
