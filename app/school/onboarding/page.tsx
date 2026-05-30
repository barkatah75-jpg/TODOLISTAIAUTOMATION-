'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createSchool, joinSchool } from '@/lib/school/actions'
import toast from 'react-hot-toast'
import { Loader2, School, UserPlus } from 'lucide-react'

export default function SchoolOnboardingPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose')
  const [loading, setLoading] = useState(false)
  const [schoolName, setSchoolName] = useState('')
  const [city, setCity] = useState('')
  const [code, setCode] = useState('')
  const [className, setClassName] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!schoolName.trim()) return
    setLoading(true)
    try {
      const result = await createSchool(schoolName.trim(), city.trim())
      if (result.error) throw new Error(result.error)
      toast.success(`School created! Code: ${result.data?.code} 🏫`)
      router.push('/school/dashboard')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim() || !className.trim()) return
    setLoading(true)
    try {
      const result = await joinSchool(code.trim(), className.trim())
      if (result.error) throw new Error(result.error)
      toast.success(`Joined! You're a ${result.data?.role} 🎉`)
      router.push(result.data?.role === 'student' ? '/child/dashboard' : '/school/dashboard')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Invalid code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🏫</div>
          <h1 className="text-3xl font-black">School Integration</h1>
          <p className="text-muted-foreground text-sm mt-1">Connect AIVANA with your school</p>
        </div>

        <AnimatePresence mode="wait">
          {mode === 'choose' && (
            <motion.div key="choose" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="grid gap-4">
              <button onClick={() => setMode('create')}
                className="bg-card border-2 border-blue-200 dark:border-blue-800 rounded-3xl p-6 text-left hover:border-blue-400 dark:hover:border-blue-600 transition-all hover:shadow-md group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">🏫</div>
                  <div>
                    <h3 className="font-black text-lg">Create School</h3>
                    <p className="text-sm text-muted-foreground">I'm a teacher/admin setting up a new school</p>
                  </div>
                </div>
              </button>
              <button onClick={() => setMode('join')}
                className="bg-card border-2 border-green-200 dark:border-green-800 rounded-3xl p-6 text-left hover:border-green-400 dark:hover:border-green-600 transition-all hover:shadow-md group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">🔗</div>
                  <div>
                    <h3 className="font-black text-lg">Join School</h3>
                    <p className="text-sm text-muted-foreground">I have a school code from my teacher</p>
                  </div>
                </div>
              </button>
            </motion.div>
          )}

          {mode === 'create' && (
            <motion.div key="create" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="bg-card border rounded-3xl p-6">
                <h2 className="font-black text-xl mb-4">Create Your School</h2>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">School Name *</label>
                    <input value={schoolName} onChange={e => setSchoolName(e.target.value)} required placeholder="e.g. DPS Ranchi"
                      className="w-full py-3 px-4 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">City</label>
                    <input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Ranchi"
                      className="w-full py-3 px-4 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setMode('choose')} className="btn-kid flex-1 border-2 border-border py-3 text-sm font-semibold">← Back</button>
                    <button type="submit" disabled={loading || !schoolName.trim()} className="btn-kid flex-1 bg-violet-600 text-white py-3 text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><School className="h-4 w-4" /> Create</>}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {mode === 'join' && (
            <motion.div key="join" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="bg-card border rounded-3xl p-6">
                <h2 className="font-black text-xl mb-4">Join Your School</h2>
                <form onSubmit={handleJoin} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">School Code *</label>
                    <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} required placeholder="e.g. SCHOOL-X4K9"
                      className="w-full py-3 px-4 rounded-xl border bg-background text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Your Class *</label>
                    <input value={className} onChange={e => setClassName(e.target.value)} required placeholder="e.g. 5A, Grade 4"
                      className="w-full py-3 px-4 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setMode('choose')} className="btn-kid flex-1 border-2 border-border py-3 text-sm font-semibold">← Back</button>
                    <button type="submit" disabled={loading || !code.trim() || !className.trim()} className="btn-kid flex-1 bg-green-600 text-white py-3 text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserPlus className="h-4 w-4" /> Join</>}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
