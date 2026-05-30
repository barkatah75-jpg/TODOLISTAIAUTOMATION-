import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase/server'
import { sendNotification } from '@/lib/notifications/webpush'
import { checkRateLimit } from '@/lib/utils/rateLimit'
import { z } from 'zod'

const schema = z.object({
  userId: z.string().uuid(),
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(300),
  url: z.string().optional(),
  tag: z.string().optional(),
})

// Internal route - only callable server-side or with service key
export async function POST(req: NextRequest) {
  try {
    // Verify this is an internal call (from server action or cron)
    const authHeader = req.headers.get('authorization')
    const isServiceCall = authHeader === `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`

    if (!isServiceCall) {
      const supabase = getSupabaseServer()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

      // Rate limit: 10 notifications per hour per user
      const rl = await checkRateLimit(`notif:send:${user.id}`, 10, '1 h')
      if (!rl.success) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

    const result = await sendNotification(parsed.data.userId, {
      title: parsed.data.title,
      body: parsed.data.body,
      url: parsed.data.url,
      tag: parsed.data.tag,
    })

    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    console.error('Send notification error:', err)
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
  }
}
