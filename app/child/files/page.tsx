'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, Image, Loader2, Download, CheckCircle, Scan, Plus, X } from 'lucide-react'
import { createTodo } from '@/lib/actions/todos'
import toast from 'react-hot-toast'

type Tab = 'pdf' | 'ocr'

interface PDFResult {
  originalSize: number
  compressedSize: number
  compressionRatio: number
  pageCount: number
  downloadUrl: string
  formatted: { original: string; compressed: string; saved: string }
}

interface OCRResult {
  text: string
  confidence: number
  detectedTasks: string[]
  provider: string
  message: string
}

export default function FilesPage() {
  const [tab, setTab] = useState<Tab>('pdf')
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pdfResult, setPdfResult] = useState<PDFResult | null>(null)
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null)
  const [pdfQuality, setPdfQuality] = useState(70)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const processFile = async (file: File) => {
    setUploading(true)
    setPdfResult(null)
    setOcrResult(null)

    try {
      const formData = new FormData()

      if (tab === 'pdf') {
        if (!file.name.toLowerCase().endsWith('.pdf'))
          return toast.error('Please select a PDF file')
        formData.append('file', file)
        formData.append('quality', (pdfQuality / 100).toString())

        const res = await fetch('/api/pdf/compress', { method: 'POST', body: formData })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setPdfResult(data)
        toast.success(`Compressed ${data.compressionRatio}%! 🎉`)
      } else {
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
        if (!validTypes.includes(file.type))
          return toast.error('Please select a JPEG, PNG, or WebP image')
        formData.append('image', file)
        formData.append('language', 'eng')

        const res = await fetch('/api/ocr/scan', { method: 'POST', body: formData })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setOcrResult(data)
        toast.success(data.message)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Processing failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const addDetectedTask = async (text: string) => {
    const result = await createTodo({ text, category: 'homework', points: 20 })
    if (!result.error) toast.success('Task added! ✅')
    else toast.error(result.error)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b px-4 py-3">
        <h1 className="font-black text-lg">Files & Tools 📄</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 pb-24 pt-4 space-y-5">
        {/* Tab switcher */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-secondary rounded-2xl">
          {([
            { id: 'pdf', label: 'PDF Compress', emoji: '📄' },
            { id: 'ocr', label: 'OCR Scanner', emoji: '🔍' },
          ] as const).map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setPdfResult(null); setOcrResult(null) }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === t.id ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <span>{t.emoji}</span> {t.label}
            </button>
          ))}
        </div>

        {/* PDF quality slider */}
        {tab === 'pdf' && (
          <div className="bg-card border rounded-2xl p-4 space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Compression Level</label>
              <span className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full px-2 py-0.5 font-bold">{pdfQuality}%</span>
            </div>
            <input type="range" min={30} max={95} value={pdfQuality} onChange={e => setPdfQuality(Number(e.target.value))}
              className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Max compression</span><span>Best quality</span>
            </div>
          </div>
        )}

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-3 p-10 rounded-3xl border-2 border-dashed cursor-pointer transition-all ${dragging ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/20 scale-105' : 'border-border hover:border-violet-300 hover:bg-secondary/50'}`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-10 w-10 text-violet-500 animate-spin" />
              <p className="text-sm font-semibold">{tab === 'pdf' ? 'Compressing PDF...' : 'Scanning text...'}</p>
            </div>
          ) : (
            <>
              <div className="text-5xl">{tab === 'pdf' ? '📄' : '📷'}</div>
              <div className="text-center">
                <p className="font-semibold text-sm">Drop your {tab === 'pdf' ? 'PDF' : 'image'} here</p>
                <p className="text-xs text-muted-foreground mt-1">or click to browse · {tab === 'pdf' ? 'Max 50MB' : 'Max 10MB'}</p>
              </div>
            </>
          )}
          <input ref={fileRef} type="file" accept={tab === 'pdf' ? '.pdf' : 'image/*'}
            onChange={e => e.target.files?.[0] && processFile(e.target.files[0])} className="sr-only" />
        </div>

        {/* PDF Result */}
        <AnimatePresence>
          {pdfResult && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800 rounded-3xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="font-bold text-green-800 dark:text-green-300">Compression Complete!</h3>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: 'Original', value: pdfResult.formatted.original, color: 'text-red-600' },
                  { label: 'Compressed', value: pdfResult.formatted.compressed, color: 'text-green-700 dark:text-green-400' },
                  { label: 'Saved', value: `${pdfResult.compressionRatio}%`, color: 'text-blue-600' },
                ].map(s => (
                  <div key={s.label} className="bg-white/70 dark:bg-black/20 rounded-2xl p-3">
                    <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
              <a href={pdfResult.downloadUrl} download
                className="btn-kid flex items-center justify-center gap-2 w-full bg-green-600 text-white py-3 text-sm font-bold hover:bg-green-700">
                <Download className="h-4 w-4" /> Download Compressed PDF
              </a>
            </motion.div>
          )}
        </AnimatePresence>

        {/* OCR Result */}
        <AnimatePresence>
          {ocrResult && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card border rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scan className="h-5 w-5 text-violet-600" />
                  <h3 className="font-bold">Scan Result</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{ocrResult.confidence}% confidence</span>
                  <span className="text-xs bg-secondary rounded-full px-2 py-0.5">{ocrResult.provider}</span>
                </div>
              </div>

              {ocrResult.detectedTasks.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">🎯 Detected Tasks:</p>
                  {ocrResult.detectedTasks.map((task, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                      className="flex items-center gap-2 bg-violet-50 dark:bg-violet-900/20 rounded-xl px-3 py-2">
                      <span className="flex-1 text-sm">{task}</span>
                      <button onClick={() => addDetectedTask(task)}
                        className="flex items-center gap-1 text-xs bg-violet-600 text-white rounded-lg px-2.5 py-1 hover:bg-violet-700 transition-colors">
                        <Plus className="h-3 w-3" /> Add
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}

              {ocrResult.text && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground">Extracted Text:</p>
                  <div className="bg-secondary rounded-xl p-3 max-h-40 overflow-y-auto">
                    <pre className="text-xs whitespace-pre-wrap font-sans text-foreground">{ocrResult.text}</pre>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
