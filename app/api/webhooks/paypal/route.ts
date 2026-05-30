import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { verifyPayPalWebhook, processPayPalEvent } from '@/lib/webhooks'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const headers: Record<string, string | undefined> = {
      'paypal-auth-algo': req.headers.get('paypal-auth-algo') || undefined,
      'paypal-transmission-id': req.headers.get('paypal-transmission-id') || undefined,
    }

    // Verify webhook authenticity
    if (!verifyPayPalWebhook(headers, body)) {
      console.error('[PayPal Webhook] Invalid webhook payload')
      return NextResponse.json({ error: 'Invalid webhook' }, { status: 400 })
    }

    const { event_type, resource } = body
    console.log('[PayPal Webhook] Event received:', event_type)

    const supabaseAdmin = getSupabaseAdmin()
    const { handled, message } = await processPayPalEvent(event_type, resource, supabaseAdmin)

    console.log(`[PayPal Webhook] ${handled ? '✅' : '⚠️'} ${message}`)
    return NextResponse.json({ received: true, handled, message })
  } catch (err) {
    console.error('[PayPal Webhook] Error:', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
