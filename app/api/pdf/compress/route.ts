import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { compressPDF, formatFileSize } from '@/lib/pdf/compress'
import { checkRateLimit } from '@/lib/utils/rateLimit'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Rate limit: 10 compressions per hour
    const rl = await checkRateLimit(`pdf:compress:${user.id}`, 10, '1 h')
    if (!rl.success) return NextResponse.json({ error: 'Too many compressions. Please wait.' }, { status: 429 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const quality = parseFloat(formData.get('quality') as string || '0.7')

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!file.name.endsWith('.pdf')) return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 })
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: `File too large. Max ${formatFileSize(MAX_FILE_SIZE)}` }, { status: 400 })

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer()
    const inputBuffer = Buffer.from(arrayBuffer)

    // Compress
    const result = await compressPDF(inputBuffer, {
      imageQuality: Math.min(Math.max(quality, 0.1), 1.0),
      removeMetadata: true,
    })

    // Upload original to Supabase Storage
    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-z0-9.-]/gi, '_')
    const originalPath = `${user.id}/${timestamp}_original_${safeName}`
    const compressedPath = `${user.id}/${timestamp}_compressed_${safeName}`

    const [originalUpload, compressedUpload] = await Promise.all([
      supabase.storage.from('files').upload(originalPath, inputBuffer, { contentType: 'application/pdf' }),
      supabase.storage.from('files').upload(compressedPath, result.compressedBuffer, { contentType: 'application/pdf' }),
    ])

    if (originalUpload.error || compressedUpload.error) {
      throw new Error('Failed to upload files')
    }

    // Get signed URLs (1 hour validity)
    const { data: compressedUrl } = await supabase.storage
      .from('files')
      .createSignedUrl(compressedPath, 3600)

    // Save file record
    await supabase.from('files').insert({
      user_id: user.id,
      name: file.name,
      original_url: originalPath,
      processed_url: compressedPath,
      file_type: 'pdf',
      original_size: result.originalSize,
      processed_size: result.compressedSize,
      processing_status: 'done',
    })

    return NextResponse.json({
      success: true,
      originalSize: result.originalSize,
      compressedSize: result.compressedSize,
      compressionRatio: result.compressionRatio,
      pageCount: result.pageCount,
      downloadUrl: compressedUrl?.signedUrl,
      formatted: {
        original: formatFileSize(result.originalSize),
        compressed: formatFileSize(result.compressedSize),
        saved: formatFileSize(result.originalSize - result.compressedSize),
      },
    })
  } catch (err: unknown) {
    console.error('PDF compression error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Compression failed' },
      { status: 500 }
    )
  }
}
