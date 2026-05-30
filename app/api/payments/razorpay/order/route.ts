import { NextRequest, NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import crypto from 'crypto'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { z } from 'zod'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

const PLANS: Record<string, { amount: number; currency: string; description: string; maxChildren: number; aiEnabled: boolean }> = {
  pro_monthly: { amount: 29900, currency: 'INR', description: 'AIVANA Pro - Monthly', maxChildren: 1, aiEnabled: true },
  pro_yearly: { amount: 249900, currency: 'INR', description: 'AIVANA Pro - Yearly', maxChildren: 1, aiEnabled: true },
  family_monthly: { amount: 49900, currency: 'INR', description: 'AIVANA Family - Monthly', maxChildren: 5, aiEnabled: true },
  family_yearly: { amount: 399900, currency: 'INR', description: 'AIVANA Family - Yearly', maxChildren: 5, aiEnabled: true },
}

const orderSchema = z.object({
  plan: z.enum(['pro_monthly', 'pro_yearly', 'family_monthly', 'family_yearly']),
})

// Create Razorpay order
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const parsed = orderSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

    const planConfig = PLANS[parsed.data.plan]
    if (!planConfig) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

    const order = await razorpay.orders.create({
      amount: planConfig.amount,
      currency: planConfig.currency,
      receipt: `aivana_${user.id}_${Date.now()}`,
      notes: {
        userId: user.id,
        plan: parsed.data.plan,
        description: planConfig.description,
      },
    })

    // Save pending payment
    await supabase.from('payments').insert({
      user_id: user.id,
      provider: 'razorpay',
      provider_payment_id: order.id,
      provider_order_id: order.id,
      amount: planConfig.amount / 100,
      currency: planConfig.currency,
      plan: parsed.data.plan.split('_')[0] as 'pro' | 'family',
      status: 'pending',
      metadata: { plan_variant: parsed.data.plan },
    })

    return NextResponse.json({
      orderId: order.id,
      amount: planConfig.amount,
      currency: planConfig.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      description: planConfig.description,
    })
  } catch (err) {
    console.error('Razorpay order error:', err)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}
