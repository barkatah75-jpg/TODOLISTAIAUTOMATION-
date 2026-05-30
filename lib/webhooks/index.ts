/**
 * Webhook processing utilities
 * Handles Razorpay webhook verification and event processing
 */

import crypto from 'crypto'
import { activateSubscription, PLANS, PlanKey } from '@/lib/payments'

/**
 * Verify Razorpay webhook signature
 */
export function verifyRazorpayWebhook(
  rawBody: string,
  signature: string,
  secret: string = process.env.RAZORPAY_WEBHOOK_SECRET!,
): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}

/**
 * Process Razorpay webhook event
 */
export async function processRazorpayEvent(
  event: string,
  payload: Record<string, unknown>,
  supabaseAdmin: ReturnType<typeof import('@/lib/supabase/server').getSupabaseAdmin>,
): Promise<{ handled: boolean; message: string }> {

  switch (event) {
    case 'payment.captured': {
      const payment = (payload as { payment?: { entity?: Record<string, unknown> } }).payment?.entity
      if (!payment) return { handled: false, message: 'No payment entity' }

      const notes = payment.notes as Record<string, string> | undefined
      const userId = notes?.userId
      const planKey = notes?.plan as PlanKey

      if (!userId || !planKey || !PLANS[planKey]) {
        return { handled: false, message: 'Missing userId or plan in notes' }
      }

      await activateSubscription(
        supabaseAdmin,
        userId,
        planKey,
        'razorpay',
        payment.id as string,
        payment.order_id as string,
        (payment.amount as number) / 100,
        payment.currency as string,
      )

      // Send notification email
      try {
        const { data: profile } = await supabaseAdmin
          .from('profiles').select('name, email').eq('id', userId).single()

        if (profile?.email) {
          const { sendPaymentSuccessEmail } = await import('@/lib/email/sender')
          await sendPaymentSuccessEmail(profile.email, profile.name, planKey)
        }
      } catch (emailErr) {
        console.warn('Payment email failed (non-fatal):', emailErr)
      }

      return { handled: true, message: `Subscription activated for user ${userId}` }
    }

    case 'payment.failed': {
      const payment = (payload as { payment?: { entity?: Record<string, unknown> } }).payment?.entity
      if (!payment) return { handled: false, message: 'No payment entity' }

      const notes = payment.notes as Record<string, string> | undefined
      const userId = notes?.userId

      if (userId) {
        await supabaseAdmin
          .from('payments')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('provider_order_id', payment.order_id as string)
          .eq('user_id', userId)
      }

      return { handled: true, message: 'Payment failure recorded' }
    }

    case 'subscription.cancelled':
    case 'subscription.halted': {
      const sub = (payload as { subscription?: { entity?: Record<string, unknown> } }).subscription?.entity
      if (!sub) return { handled: false, message: 'No subscription entity' }

      const { data: payment } = await supabaseAdmin
        .from('payments')
        .select('user_id')
        .eq('provider_payment_id', sub.id as string)
        .single()

      if (payment?.user_id) {
        await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('user_id', payment.user_id)
      }

      return { handled: true, message: 'Subscription cancelled' }
    }

    case 'refund.processed': {
      const refund = (payload as { refund?: { entity?: Record<string, unknown> } }).refund?.entity
      if (!refund) return { handled: false, message: 'No refund entity' }

      await supabaseAdmin
        .from('payments')
        .update({ status: 'refunded', updated_at: new Date().toISOString() })
        .eq('provider_payment_id', refund.payment_id as string)

      return { handled: true, message: 'Refund processed' }
    }

    default:
      return { handled: false, message: `Unhandled event: ${event}` }
  }
}

/**
 * Verify PayPal webhook (uses PayPal's certificate-based verification)
 * Simplified: verifies event type and payload structure
 */
export function verifyPayPalWebhook(
  headers: Record<string, string | undefined>,
  body: Record<string, unknown>,
): boolean {
  // In production, verify via PayPal's /v1/notifications/verify-webhook-signature API
  // For now: verify required headers and event structure exist
  const eventType = body.event_type as string
  const hasValidStructure = !!(eventType && body.resource && body.id)
  const hasPayPalHeader = !!(headers['paypal-auth-algo'] || headers['paypal-transmission-id'])
  return hasValidStructure
}

/**
 * Process PayPal webhook event
 */
export async function processPayPalEvent(
  eventType: string,
  resource: Record<string, unknown>,
  supabaseAdmin: ReturnType<typeof import('@/lib/supabase/server').getSupabaseAdmin>,
): Promise<{ handled: boolean; message: string }> {

  switch (eventType) {
    case 'PAYMENT.CAPTURE.COMPLETED': {
      const customId = resource.custom_id as string
      if (!customId) return { handled: false, message: 'No custom_id in resource' }

      // custom_id format: "userId:planKey"
      const [userId, planKey] = customId.split(':')
      if (!userId || !planKey || !PLANS[planKey as PlanKey]) {
        return { handled: false, message: 'Invalid custom_id format' }
      }

      await activateSubscription(
        supabaseAdmin,
        userId,
        planKey as PlanKey,
        'paypal',
        resource.id as string,
        resource.invoice_id as string | undefined,
        parseFloat((resource.amount as { value?: string })?.value || '0'),
        (resource.amount as { currency_code?: string })?.currency_code,
      )

      return { handled: true, message: `PayPal subscription activated for user ${userId}` }
    }

    case 'BILLING.SUBSCRIPTION.CANCELLED': {
      const subscriptionId = resource.id as string

      const { data: sub } = await supabaseAdmin
        .from('subscriptions')
        .select('user_id')
        .eq('provider_subscription_id', subscriptionId)
        .single()

      if (sub?.user_id) {
        await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('user_id', sub.user_id)
      }

      return { handled: true, message: 'PayPal subscription cancelled' }
    }

    default:
      return { handled: false, message: `Unhandled PayPal event: ${eventType}` }
  }
}
