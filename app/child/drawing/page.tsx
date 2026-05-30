'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import {
  Pen, Eraser, Trash2, Download, Save, Undo2, Redo2,
  Minus, Plus, Loader2, Palette
} from 'lucide-react'

type Tool = 'pen' | 'eraser'

interface Point { x: number; y: number }
interface Stroke { tool: Tool; color: string; width: number; points: Point[] }

const COLORS = [
  '#1a1a1a', '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff', '#6b7280',
]

export default function DrawingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState('#1a1a1a')
  const [brushSize, setBrushSize] = useState(4)
  const [isDrawing, setIsDrawing] = useState(false)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [redoStack, setRedoStack] = useState<Stroke[]>([])
  const [saving, setSaving] = useState(false)
  const currentStroke = useRef<Point[]>([])

  const getCtx = () => canvasRef.current?.getContext('2d') || null

  const getPos = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const redrawAll = useCallback((strokeList: Stroke[]) => {
    const ctx = getCtx()
    const canvas = canvasRef.current
    if (!ctx || !canvas) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    strokeList.forEach(stroke => {
      if (stroke.points.length < 2) return
      ctx.beginPath()
      ctx.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color
      ctx.lineWidth = stroke.width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
      stroke.points.forEach(p => ctx.lineTo(p.x, p.y))
      ctx.stroke()
    })
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = 800
    canvas.height = 600
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 800, 600)
  }, [])

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    setIsDrawing(true)
    const pos = getPos(e)
    currentStroke.current = [pos]
    const ctx = getCtx()
    if (!ctx) return
    ctx.beginPath()
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color
    ctx.lineWidth = tool === 'eraser' ? brushSize * 3 : brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.moveTo(pos.x, pos.y)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (!isDrawing) return
    const pos = getPos(e)
    currentStroke.current.push(pos)
    const ctx = getCtx()
    if (!ctx) return
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
  }

  const endDrawing = () => {
    if (!isDrawing || currentStroke.current.length === 0) return
    setIsDrawing(false)
    const newStroke: Stroke = {
      tool,
      color,
      width: tool === 'eraser' ? brushSize * 3 : brushSize,
      points: [...currentStroke.current],
    }
    setStrokes(prev => [...prev, newStroke])
    setRedoStack([])
    currentStroke.current = []
  }

  const undo = () => {
    if (strokes.length === 0) return
    const last = strokes[strokes.length - 1]
    setRedoStack(prev => [last, ...prev])
    const newStrokes = strokes.slice(0, -1)
    setStrokes(newStrokes)
    redrawAll(newStrokes)
  }

  const redo = () => {
    if (redoStack.length === 0) return
    const stroke = redoStack[0]
    const newStrokes = [...strokes, stroke]
    setRedoStack(prev => prev.slice(1))
    setStrokes(newStrokes)
    redrawAll(newStrokes)
  }

  const clearCanvas = () => {
    setStrokes([])
    setRedoStack([])
    const ctx = getCtx()
    const canvas = canvasRef.current
    if (!ctx || !canvas) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  const saveDrawing = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    setSaving(true)
    try {
      const blob = await new Promise<Blob>((res) => canvas.toBlob(b => res(b!), 'image/png', 0.9))
      const supabase = getSupabaseBrowser()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      const fileName = `${user.id}/${Date.now()}_drawing.png`
      const { error: uploadErr } = await supabase.storage.from('drawings').upload(fileName, blob, { contentType: 'image/png' })
      if (uploadErr) throw uploadErr

      const { data: urlData } = supabase.storage.from('drawings').getPublicUrl(fileName)

      await supabase.from('drawings').insert({
        user_id: user.id,
        title: `Drawing ${new Date().toLocaleDateString()}`,
        image_url: urlData.publicUrl,
        canvas_data: { strokes: strokes.slice(-50) }, // save last 50 strokes
        width: 800,
        height: 600,
      })

      toast.success('Drawing saved! 🎨')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const downloadDrawing = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `aivana-drawing-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    toast.success('Downloaded! 🖼️')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="font-black text-lg flex items-center gap-2">🎨 Drawing Studio</h1>
          <div className="flex gap-2">
            <button onClick={undo} disabled={strokes.length === 0} className="p-2 rounded-xl hover:bg-secondary disabled:opacity-30 transition-all"><Undo2 className="h-4 w-4" /></button>
            <button onClick={redo} disabled={redoStack.length === 0} className="p-2 rounded-xl hover:bg-secondary disabled:opacity-30 transition-all"><Redo2 className="h-4 w-4" /></button>
            <button onClick={clearCanvas} className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 transition-all"><Trash2 className="h-4 w-4" /></button>
            <button onClick={downloadDrawing} className="p-2 rounded-xl hover:bg-secondary transition-all"><Download className="h-4 w-4" /></button>
            <button onClick={saveDrawing} disabled={saving}
              className="btn-kid flex items-center gap-1.5 bg-violet-600 text-white px-3 py-2 text-xs font-bold">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-4 flex flex-col gap-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 bg-card border rounded-2xl p-3">
          {/* Tool select */}
          <div className="flex gap-1.5">
            {([
              { id: 'pen', icon: Pen, label: 'Pen' },
              { id: 'eraser', icon: Eraser, label: 'Eraser' },
            ] as const).map(t => (
              <button key={t.id} onClick={() => setTool(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${tool === t.id ? 'bg-violet-600 text-white' : 'hover:bg-secondary'}`}>
                <t.icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-border" />

          {/* Colors */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {COLORS.map(c => (
              <button key={c} onClick={() => { setColor(c); setTool('pen') }}
                className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${color === c && tool === 'pen' ? 'border-violet-500 scale-125' : 'border-border'}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>

          <div className="h-6 w-px bg-border" />

          {/* Brush size */}
          <div className="flex items-center gap-2">
            <button onClick={() => setBrushSize(s => Math.max(1, s - 2))} className="p-1 hover:bg-secondary rounded-lg"><Minus className="h-3 w-3" /></button>
            <div className="flex items-center justify-center w-8 h-8">
              <div className="rounded-full bg-foreground" style={{ width: Math.min(brushSize * 2, 24), height: Math.min(brushSize * 2, 24) }} />
            </div>
            <button onClick={() => setBrushSize(s => Math.min(30, s + 2))} className="p-1 hover:bg-secondary rounded-lg"><Plus className="h-3 w-3" /></button>
          </div>
        </div>

        {/* Canvas */}
        <div className="rounded-3xl overflow-hidden border shadow-md bg-white">
          <canvas
            ref={canvasRef}
            className="w-full touch-none cursor-crosshair"
            style={{ aspectRatio: '4/3' }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={endDrawing}
            onMouseLeave={endDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={endDrawing}
          />
        </div>
      </div>
    </div>
  )
}
