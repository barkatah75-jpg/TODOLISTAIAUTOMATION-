import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { extractTextFromImage } from '@/lib/ocr/scanner'
import { checkRateLimit } from '@/lib/utils/rateLimit'
import sharp from 'sharp'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const SUPPORTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Rate limit: 20 scans per hour
    const rl = await checkRateLimit(`ocr:scan:${user.id}`, 20, '1 h')
    if (!rl.success) return NextResponse.json({ error: 'Scan limit reached. Please wait.' }, { status: 429 })

    const formData = await req.formData()
    const file = formData.get('image') as File | null
    const language = formData.get('language') as string || 'eng'
    const useGoogleVision = formData.get('useGoogleVision') === 'true' && !!process.env.GOOGLE_VISION_API_KEY

    if (!file) return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    if (!SUPPORTED_TYPES.includes(file.type)) return NextResponse.json({ error: 'Unsupported file type. Use JPEG, PNG, or WebP.' }, { status: 400 })
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'Image too large. Max 10 MB.' }, { status: 400 })

    // Preprocess image with sharp for better OCR accuracy
    const rawBuffer = Buffer.from(await file.arrayBuffer())

    const processedBuffer = await sharp(rawBuffer)
      .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
      .grayscale()
      .normalize()
      .sharpen({ sigma: 1 })
      .png({ quality: 95 })
      .toBuffer()

    // Run OCR
    const result = await extractTextFromImage(processedBuffer, language, useGoogleVision)

    if (!result.text) {
      return NextResponse.json({
        success: false,
        text: '',
        message: 'No text found in image. Try a clearer photo.',
        detectedTasks: [],
        confidence: 0,
        provider: result.provider,
      })
    }

    // Save scan result
    await supabase.from('files').insert({
      user_id: user.id,
      name: file.name,
      original_url: '',
      file_type: 'image',
      ocr_text: result.text,
      processing_status: 'done',
    })

    return NextResponse.json({
      success: true,
      text: result.text,
      confidence: Math.round(result.confidence),
      detectedTasks: result.detectedTasks,
      wordCount: result.words.length,
      provider: result.provider,
      message: result.detectedTasks.length > 0
        ? `Found ${result.detectedTasks.length} task${result.detectedTasks.length > 1 ? 's' : ''} in your image! 🎯`
        : 'Text extracted successfully! ✅',
    })
  } catch (err: unknown) {
    console.error('OCR error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'OCR processing failed' },
      { status: 500 }
    )
  }
}
