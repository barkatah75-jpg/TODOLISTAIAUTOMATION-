import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { z } from 'zod'

const subSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const parsed = subSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })

    const { endpoint, keys } = parsed.data
    const userAgent = req.headers.get('user-agent') || ''

    // Upsert subscription
    await supabase.from('push_subscriptions').upsert({
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent: userAgent,
    }, { onConflict: 'endpoint' })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { endpoint } = await req.json()
    await supabase.from('push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', endpoint)

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
