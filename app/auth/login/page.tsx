'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Loader2, Mail, Sparkles } from 'lucide-react'

const schema = z.object({
  email: z.string().email('Valid email required'),
  role: z.enum(['child', 'parent']),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowser()
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'child' },
  })

  const role = watch('role')

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: data.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/verify`,
          data: { role: data.role },
        },
      })
      if (error) throw error
      // Store email for verify page
      sessionStorage.setItem('otp_email', data.email)
      sessionStorage.setItem('otp_role', data.role)
      toast.success('Magic link sent! Check your email ✨')
      router.push('/auth/verify')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      })
      if (error) throw error
    } catch (err: unknown) {
      toast.error('Google login failed')
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-purple-50 dark:from-violet-950/30 dark:via-background dark:to-purple-950/30 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            className="text-6xl mb-3"
          >
            🚀
          </motion.div>
          <h1 className="text-3xl font-black text-violet-700 dark:text-violet-400">
            AIVANA Kids OS
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Your AI-powered adventure begins here!
          </p>
        </div>

        {/* Role Selector */}
        <div className="bg-card border rounded-3xl p-6 shadow-lg mb-4">
          <div className="grid grid-cols-2 gap-3 mb-6">
            {(['child', 'parent'] as const).map((r) => (
              <label key={r} className={`relative cursor-pointer rounded-2xl border-2 p-4 text-center transition-all ${role === r ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20' : 'border-border hover:border-violet-200'}`}>
                <input type="radio" value={r} {...register('role')} className="sr-only" />
                <div className="text-3xl mb-1">{r === 'child' ? '👦' : '👨‍👩‍👧'}</div>
                <div className="font-semibold capitalize text-sm">{r === 'child' ? "I'm a Kid" : "I'm a Parent"}</div>
              </label>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  {...register('email')}
                  type="email"
                  placeholder="your@email.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all text-sm"
                />
              </div>
              {errors.email && <p className="text-destructive text-xs mt-1">{errors.email.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-kid w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white py-3 text-sm font-bold hover:from-violet-700 hover:to-purple-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : (
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4" /> Send Magic Link ✨
                </span>
              )}
            </button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs text-muted-foreground">
              <span className="bg-card px-2">or continue with</span>
            </div>
          </div>

          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            className="btn-kid w-full border-2 border-border bg-background hover:bg-secondary py-3 text-sm font-semibold flex items-center justify-center gap-2"
          >
            {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <>
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree to our Terms of Service & Privacy Policy.
          <br />Kid-safe & COPPA compliant 🔒
        </p>
      </motion.div>
    </div>
  )
}
