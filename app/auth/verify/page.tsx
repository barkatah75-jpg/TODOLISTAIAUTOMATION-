'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Loader2, ArrowLeft, RefreshCw } from 'lucide-react'

export default function VerifyPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowser()
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(60)
  const [email, setEmail] = useState('')
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    const storedEmail = sessionStorage.getItem('otp_email') || ''
    setEmail(storedEmail)
    if (!storedEmail) router.push('/auth/login')
  }, [router])

  useEffect(() => {
    if (resendTimer <= 0) return
    const timer = setInterval(() => setResendTimer(t => t - 1), 1000)
    return () => clearInterval(timer)
  }, [resendTimer])

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)
    if (value && index < 5) inputRefs.current[index + 1]?.focus()
    if (newOtp.every(d => d) && newOtp.join('').length === 6) {
      verifyOtp(newOtp.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const verifyOtp = async (token: string) => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      })
      if (error) throw error
      
      // Get profile to redirect to correct dashboard
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles').select('role, onboarded').eq('id', user.id).single()
        const role = profile?.role || 'child'
        const isOnboarded = profile?.onboarded || false
        toast.success('Welcome to AIVANA! 🚀')
        router.push(isOnboarded ? `/${role}/dashboard` : `/${role}/onboarding`)
      }
    } catch (err: unknown) {
      toast.error('Invalid OTP. Please try again.')
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } })
    if (!error) {
      toast.success('New OTP sent!')
      setResendTimer(60)
      setOtp(['', '', '', '', '', ''])
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-purple-50 dark:from-violet-950/30 dark:via-background dark:to-purple-950/30 p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <button onClick={() => router.push('/auth/login')} className="flex items-center gap-2 text-sm text-muted-foreground mb-6 hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to login
        </button>

        <div className="bg-card border rounded-3xl p-8 shadow-lg text-center">
          <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }} className="text-5xl mb-4">📬</motion.div>
          <h2 className="text-2xl font-black mb-2">Check your email!</h2>
          <p className="text-muted-foreground text-sm mb-6">
            We sent a 6-digit code to<br />
            <span className="font-semibold text-foreground">{email}</span>
          </p>

          <div className="flex justify-center gap-3 mb-6">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleOtpChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                disabled={loading}
                className="w-11 h-14 text-center text-xl font-bold rounded-xl border-2 bg-background focus:outline-none focus:border-violet-500 transition-all disabled:opacity-50"
              />
            ))}
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 text-violet-600 mb-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Verifying...</span>
            </div>
          )}

          <button
            onClick={handleResend}
            disabled={resendTimer > 0}
            className="flex items-center justify-center gap-2 mx-auto text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend code'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
