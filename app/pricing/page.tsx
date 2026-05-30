'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Sparkles, Loader2, Star } from 'lucide-react'
import toast from 'react-hot-toast'

type Billing = 'monthly' | 'yearly'

const PLANS = {
  free: {
    name: 'Free',
    emoji: '🌱',
    price: { monthly: 0, yearly: 0 },
    color: 'border-border',
    features: [
      '1 child account',
      '10 tasks per day',
      'Basic gamification',
      'Drawing canvas',
      'PDF compression',
      'OCR scanner',
    ],
    cta: 'Get Started Free',
    popular: false,
  },
  pro: {
    name: 'Pro',
    emoji: '⚡',
    price: { monthly: 299, yearly: 2499 },
    color: 'border-violet-500',
    features: [
      '1 child account',
      'Unlimited tasks',
      'AI Homework Helper (AIVA)',
      'Smart task suggestions',
      'Advanced gamification',
      'Parent dashboard',
      'Push notifications',
      'Priority support',
    ],
    cta: 'Start Pro',
    popular: true,
  },
  family: {
    name: 'Family',
    emoji: '👨‍👩‍👧',
    price: { monthly: 499, yearly: 3999 },
    color: 'border-pink-500',
    features: [
      'Up to 5 children',
      'Everything in Pro',
      'Family leaderboard',
      'Sibling challenges',
      'Advanced analytics',
      'Custom parent rewards',
      'School integration (beta)',
      'Dedicated support',
    ],
    cta: 'Start Family',
    popular: false,
  },
}

export default function PricingPage() {
  const [billing, setBilling] = useState<Billing>('monthly')
  const [loading, setLoading] = useState<string | null>(null)

  const handleSubscribe = async (plan: keyof typeof PLANS) => {
    if (plan === 'free') {
      window.location.href = '/auth/register'
      return
    }

    setLoading(plan)
    try {
      const planKey = `${plan}_${billing}`
      const res = await fetch('/api/payments/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create order')
      }

      const { orderId, amount, currency, keyId, description } = await res.json()

      // Load Razorpay script dynamically
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      document.head.appendChild(script)

      script.onload = () => {
        const rzp = new (window as unknown as { Razorpay: new (opts: unknown) => { open: () => void } }).Razorpay({
          key: keyId,
          amount,
          currency,
          name: 'AIVANA Kids OS',
          description,
          order_id: orderId,
          image: '/icons/icon-192x192.png',
          theme: { color: '#7C3AED' },
          handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
            const verifyRes = await fetch('/api/payments/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...response, plan: planKey }),
            })
            if (verifyRes.ok) {
              toast.success('🎉 Subscription activated! Welcome to AIVANA ' + PLANS[plan].name)
              setTimeout(() => window.location.href = '/child/dashboard', 1500)
            } else {
              toast.error('Payment verification failed. Contact support.')
            }
          },
          modal: {
            ondismiss: () => { setLoading(null); toast('Payment cancelled') },
          },
        })
        rzp.open()
        setLoading(null)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Payment failed')
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-background dark:from-violet-950/20 dark:via-background dark:to-background py-16 px-4">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full px-4 py-1.5 text-sm font-semibold">
            <Star className="h-4 w-4" /> Simple, transparent pricing
          </motion.div>
          <h1 className="text-4xl font-black">
            Choose your plan <span className="gradient-text">🚀</span>
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Start free, upgrade when you're ready. No hidden fees. Cancel anytime.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-3 bg-secondary rounded-full p-1">
            {(['monthly', 'yearly'] as const).map(b => (
              <button key={b} onClick={() => setBilling(b)}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all capitalize ${billing === b ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>
                {b}
                {b === 'yearly' && <span className="ml-1.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full px-1.5 py-0.5 font-bold">-30%</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-3 gap-6">
          {(Object.entries(PLANS) as [keyof typeof PLANS, typeof PLANS['free']][]).map(([key, plan], i) => (
            <motion.div key={key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className={`relative bg-card border-2 rounded-3xl p-6 flex flex-col ${plan.color} ${plan.popular ? 'shadow-kid-lg scale-105' : 'shadow-sm'}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
                    ✨ Most Popular
                  </span>
                </div>
              )}

              <div className="space-y-1 mb-6">
                <div className="text-3xl">{plan.emoji}</div>
                <h2 className="text-xl font-black">{plan.name}</h2>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black">
                    {plan.price[billing] === 0 ? 'Free' : `₹${plan.price[billing]}`}
                  </span>
                  {plan.price[billing] > 0 && (
                    <span className="text-muted-foreground text-sm">/{billing === 'monthly' ? 'mo' : 'yr'}</span>
                  )}
                </div>
              </div>

              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button onClick={() => handleSubscribe(key)} disabled={loading === key}
                className={`btn-kid w-full py-3 text-sm font-bold flex items-center justify-center gap-2 ${
                  plan.popular
                    ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700'
                    : key === 'family'
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600'
                    : 'border-2 border-border hover:bg-secondary'
                }`}>
                {loading === key ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <><Sparkles className="h-4 w-4" /> {plan.cta}</>
                )}
              </button>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          🔒 Secure payments via Razorpay (India) & PayPal (Global) · ✅ Kid-safe & COPPA compliant · 📞 Support: support@aivana.app
        </p>
      </div>
    </div>
  )
}
