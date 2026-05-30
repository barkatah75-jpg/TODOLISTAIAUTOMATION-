/**
 * Shared payment utilities for Razorpay and PayPal
 * Used by both API routes and webhook handlers
 */

export type PlanKey = 'pro_monthly' | 'pro_yearly' | 'family_monthly' | 'family_yearly'
export type PlanBase = 'pro' | 'family'

export interface PlanConfig {
  amountINR: number      // paise
  amountUSD: string      // dollars string for PayPal
  description: string
  maxChildren: number
  aiEnabled: boolean
  durationDays: number
  planBase: PlanBase
}

export const PLANS: Record<PlanKey, PlanConfig> = {
  pro_monthly: {
    amountINR: 29900,
    amountUSD: '4.99',
    description: 'AIVANA Pro — Monthly',
    maxChildren: 1,
    aiEnabled: true,
    durationDays: 30,
    planBase: 'pro',
  },
  pro_yearly: {
    amountINR: 249900,
    amountUSD: '39.99',
    description: 'AIVANA Pro — Yearly',
    maxChildren: 1,
    aiEnabled: true,
    durationDays: 365,
    planBase: 'pro',
  },
  family_monthly: {
    amountINR: 49900,
    amountUSD: '7.99',
    description: 'AIVANA Family — Monthly',
    maxChildren: 5,
    aiEnabled: true,
    durationDays: 30,
    planBase: 'family',
  },
  family_yearly: {
    amountINR: 399900,
    amountUSD: '63.99',
    description: 'AIVANA Family — Yearly',
    maxChildren: 5,
    aiEnabled: true,
    durationDays: 365,
    planBase: 'family',
  },
}

/**
 * Activate or update a user's subscription after successful payment.
 * Call this from both Razorpay verify route and PayPal capture route.
 */
export async function activateSubscription(
  supabaseAdmin: ReturnType<typeof import('@/lib/supabase/server').getSupabaseAdmin>,
  userId: string,
  planKey: PlanKey,
  provider: 'razorpay' | 'paypal',
  providerPaymentId: string,
  providerOrderId?: string,
  amountPaid?: number,
  currency?: string,
) {
  const plan = PLANS[planKey]
  if (!plan) throw new Error(`Unknown plan: ${planKey}`)

  const now = new Date()
  const periodEnd = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000)

  // Update subscription
  const { error: subError } = await supabaseAdmin
    .from('subscriptions')
    .upsert({
      user_id: userId,
      plan: plan.planBase,
      status: 'active',
      provider,
      provider_subscription_id: providerPaymentId,
      max_children: plan.maxChildren,
      ai_enabled: plan.aiEnabled,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      updated_at: now.toISOString(),
    }, { onConflict: 'user_id' })

  if (subError) throw new Error(`Subscription update failed: ${subError.message}`)

  // Record payment
  const { error: payError } = await supabaseAdmin
    .from('payments')
    .upsert({
      user_id: userId,
      provider,
      provider_payment_id: providerPaymentId,
      provider_order_id: providerOrderId || providerPaymentId,
      amount: amountPaid ?? (currency === 'INR' ? plan.amountINR / 100 : parseFloat(plan.amountUSD)),
      currency: currency || (provider === 'razorpay' ? 'INR' : 'USD'),
      plan: plan.planBase,
      status: 'completed',
      metadata: { planKey, durationDays: plan.durationDays },
      updated_at: now.toISOString(),
    }, { onConflict: 'provider_payment_id' })

  if (payError) throw new Error(`Payment record failed: ${payError.message}`)

  return { planBase: plan.planBase, periodEnd, maxChildren: plan.maxChildren }
}

/**
 * Get PayPal OAuth token using Client Credentials
 */
export async function getPayPalAccessToken(): Promise<string> {
  const base = process.env.NODE_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'

  const credentials = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`PayPal token error: ${err}`)
  }

  const data = await res.json()
  return data.access_token
}

/**
 * Verify Razorpay payment signature
 */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  const crypto = require('crypto')
  const secret = process.env.RAZORPAY_KEY_SECRET!
  const body = `${orderId}|${paymentId}`
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex')
  return expected === signature
}

/**
 * Format amount for display
 */
export function formatAmount(amount: number, currency: string): string {
  if (currency === 'INR') return `₹${(amount).toFixed(0)}`
  return `$${amount.toFixed(2)}`
}

/**
 * Get plan display name
 */
export function getPlanDisplayName(planKey: PlanKey): string {
  return PLANS[planKey]?.description || planKey
}
