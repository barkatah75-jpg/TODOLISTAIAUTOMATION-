import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { verifyRazorpayWebhook, processRazorpayEvent } from '@/lib/webhooks'

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get('x-razorpay-signature') || ''

    // Use dedicated webhook secret (set in Razorpay Dashboard → Webhooks)
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || ''
    if (!secret) {
      console.error('[Webhook] RAZORPAY_WEBHOOK_SECRET not configured')
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
    }

    if (!verifyRazorpayWebhook(body, signature, secret)) {
      console.error('[Webhook] Invalid Razorpay signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const event = JSON.parse(body)
    console.log('[Webhook] Razorpay event received:', event.event)

    const supabaseAdmin = getSupabaseAdmin()
    const { handled, message } = await processRazorpayEvent(event.event, event.payload, supabaseAdmin)

    console.log(`[Webhook] ${handled ? '✅' : '⚠️'} ${message}`)
    return NextResponse.json({ received: true, handled, message })
  } catch (err) {
    console.error('[Webhook] Processing error:', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
