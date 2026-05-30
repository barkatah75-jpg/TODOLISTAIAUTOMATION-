import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { z } from 'zod'

const PAYPAL_BASE = process.env.NODE_ENV === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

const PLANS_USD: Record<string, { amount: string; description: string; maxChildren: number }> = {
  pro_monthly: { amount: '4.99', description: 'AIVANA Pro Monthly', maxChildren: 1 },
  pro_yearly: { amount: '39.99', description: 'AIVANA Pro Yearly', maxChildren: 1 },
  family_monthly: { amount: '7.99', description: 'AIVANA Family Monthly', maxChildren: 5 },
  family_yearly: { amount: '63.99', description: 'AIVANA Family Yearly', maxChildren: 5 },
}

async function getPayPalToken(): Promise<string> {
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  })
  const data = await res.json()
  return data.access_token
}

// Create PayPal order
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const schema = z.object({ plan: z.enum(['pro_monthly', 'pro_yearly', 'family_monthly', 'family_yearly']) })
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

    const planConfig = PLANS_USD[parsed.data.plan]
    const token = await getPayPalToken()

    const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: { currency_code: 'USD', value: planConfig.amount },
          description: planConfig.description,
          custom_id: `${user.id}:${parsed.data.plan}`,
        }],
        application_context: {
          brand_name: 'AIVANA Kids OS',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
          return_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/paypal/capture`,
          cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?cancelled=1`,
        },
      }),
    })

    const order = await orderRes.json()
    if (!orderRes.ok) throw new Error(order.message || 'PayPal order creation failed')

    // Save pending payment
    await supabase.from('payments').insert({
      user_id: user.id,
      provider: 'paypal',
      provider_payment_id: order.id,
      amount: parseFloat(planConfig.amount),
      currency: 'USD',
      plan: parsed.data.plan.split('_')[0] as 'pro' | 'family',
      status: 'pending',
      metadata: { plan_variant: parsed.data.plan, paypal_order: order.id },
    })

    const approveLink = order.links?.find((l: { rel: string; href: string }) => l.rel === 'approve')?.href
    return NextResponse.json({ orderId: order.id, approveUrl: approveLink })
  } catch (err: unknown) {
    console.error('PayPal order error:', err)
    return NextResponse.json({ error: 'Failed to create PayPal order' }, { status: 500 })
  }
}

// Capture PayPal payment after approval
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  if (!token) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/pricing?error=no_token`)

  try {
    const accessToken = await getPayPalToken()
    const captureRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${token}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    })

    const capture = await captureRes.json()
    if (!captureRes.ok) throw new Error('Capture failed')

    const customId = capture.purchase_units?.[0]?.payments?.captures?.[0]?.custom_id || ''
    const [userId, planVariant] = customId.split(':')

    if (userId && planVariant) {
      const admin = getSupabaseAdmin()
      const planConfig = PLANS_USD[planVariant]
      const isYearly = planVariant.includes('yearly')
      const periodEnd = new Date()
      periodEnd.setMonth(periodEnd.getMonth() + (isYearly ? 12 : 1))

      await admin.from('payments').update({ status: 'completed', provider_payment_id: token }).eq('provider_payment_id', token)
      await admin.from('subscriptions').update({
        plan: planVariant.split('_')[0] as 'pro' | 'family',
        status: 'active',
        provider: 'paypal',
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd.toISOString(),
        max_children: planConfig.maxChildren,
        ai_enabled: true,
      }).eq('user_id', userId)
    }

    const profile = await getSupabaseAdmin().from('profiles').select('role').eq('id', userId).single()
    const role = profile.data?.role || 'child'
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/${role}/dashboard?success=payment`)
  } catch (err) {
    console.error('PayPal capture error:', err)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/pricing?error=payment_failed`)
  }
}
