import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { checkSubscriptionLimit } from '@/lib/utils/subscription'
import { z } from 'zod'

const saveSchema = z.object({
  title: z.string().min(1).max(200).default('My Drawing'),
  imageData: z.string().min(1), // base64 or data URL
  thumbnailData: z.string().optional(),
})

// GET /api/drawings — list user's drawings
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const offset = parseInt(searchParams.get('offset') || '0')

    const { data, error, count } = await supabase
      .from('drawings')
      .select('id, title, thumbnail_url, created_at', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ drawings: data || [], total: count || 0, limit, offset })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/drawings — save a drawing to Supabase Storage
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check free plan limit
    const limitCheck = await checkSubscriptionLimit(user.id, 'total_drawings')
    if (!limitCheck.allowed) {
      return NextResponse.json({
        error: `Drawing limit reached (${limitCheck.limit}). Upgrade to Pro for unlimited drawings!`,
        upgrade: true,
      }, { status: 403 })
    }

    const body = await req.json()
    const parsed = saveSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

    // Convert base64 to buffer and upload to Supabase Storage
    const base64Data = parsed.data.imageData.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')
    const fileName = `${user.id}/${Date.now()}.png`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('drawings')
      .upload(fileName, buffer, { contentType: 'image/png', upsert: false })

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    const { data: { publicUrl } } = supabase.storage.from('drawings').getPublicUrl(fileName)

    // Save thumbnail if provided
    let thumbnailUrl: string | null = null
    if (parsed.data.thumbnailData) {
      const thumbBase64 = parsed.data.thumbnailData.replace(/^data:image\/\w+;base64,/, '')
      const thumbBuffer = Buffer.from(thumbBase64, 'base64')
      const thumbName = `${user.id}/thumb_${Date.now()}.png`
      await supabase.storage.from('drawings').upload(thumbName, thumbBuffer, { contentType: 'image/png' })
      thumbnailUrl = supabase.storage.from('drawings').getPublicUrl(thumbName).data.publicUrl
    }

    // Save to DB
    const { data, error } = await supabase.from('drawings').insert({
      user_id: user.id,
      title: parsed.data.title,
      image_url: publicUrl,
      thumbnail_url: thumbnailUrl || publicUrl,
      file_size: buffer.length,
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ drawing: data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to save drawing' }, { status: 500 })
  }
}

// DELETE /api/drawings?drawingId=xxx
export async function DELETE(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const drawingId = searchParams.get('drawingId')
    if (!drawingId) return NextResponse.json({ error: 'drawingId required' }, { status: 400 })

    // Get image URL first to delete from storage
    const { data: drawing } = await supabase.from('drawings').select('image_url, thumbnail_url').eq('id', drawingId).eq('user_id', user.id).single()
    if (!drawing) return NextResponse.json({ error: 'Drawing not found' }, { status: 404 })

    // Extract storage path from URL and delete
    const extractPath = (url: string) => url.split('/drawings/')[1]
    if (drawing.image_url) await supabase.storage.from('drawings').remove([extractPath(drawing.image_url)])
    if (drawing.thumbnail_url && drawing.thumbnail_url !== drawing.image_url) {
      await supabase.storage.from('drawings').remove([extractPath(drawing.thumbnail_url)])
    }

    const { error } = await supabase.from('drawings').delete().eq('id', drawingId).eq('user_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete drawing' }, { status: 500 })
  }
}
