import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, userId } = body

    // Verify Razorpay signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Update payment status
    await supabase.from('payments')
      .update({ status: 'completed', provider_payment_id: razorpay_payment_id })
      .eq('provider_order_id', razorpay_order_id)

    // Calculate subscription end date
    const isYearly = plan.includes('yearly')
    const periodEnd = new Date()
    periodEnd.setMonth(periodEnd.getMonth() + (isYearly ? 12 : 1))

    const planName = plan.split('_')[0] as 'pro' | 'family'
    const maxChildren = planName === 'family' ? 5 : 1

    // Activate subscription
    await supabase.from('subscriptions')
      .update({
        plan: planName,
        status: 'active',
        provider: 'razorpay',
        provider_subscription_id: razorpay_payment_id,
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd.toISOString(),
        max_children: maxChildren,
        ai_enabled: true,
      })
      .eq('user_id', userId)

    return NextResponse.json({ success: true, message: 'Subscription activated!' })
  } catch (err) {
    console.error('Razorpay verify error:', err)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
