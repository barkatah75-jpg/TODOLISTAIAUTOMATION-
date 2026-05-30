'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createBrowserClient } from '@supabase/ssr'
import { motion } from 'framer-motion'
import Link from 'next/link'
import toast from 'react-hot-toast'

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Valid email required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  confirmPassword: z.string(),
  role: z.enum(['parent', 'child']),
  agreeToTerms: z.boolean().refine((v) => v === true, 'You must agree to the terms'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

type RegisterFormData = z.infer<typeof registerSchema>

interface RegisterFormProps {
  defaultRole?: 'parent' | 'child'
  onSuccess?: () => void
}

export function RegisterForm({ defaultRole = 'parent', onSuccess }: RegisterFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: defaultRole, agreeToTerms: false },
  })

  const selectedRole = watch('role')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            name: data.name,
            role: data.role,
          },
        },
      })

      if (error) {
        if (error.message.includes('already registered')) {
          setError('email', { message: 'This email is already registered. Try signing in.' })
        } else {
          toast.error(error.message)
        }
        return
      }

      if (onSuccess) {
        onSuccess()
        return
      }

      // Redirect to email verification page
      router.push(`/auth/verify?email=${encodeURIComponent(data.email)}`)
    } catch (err) {
      toast.error('Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setIsLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })
    if (error) {
      toast.error('Google sign-up failed')
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* Role selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            I am a...
          </label>
          <div className="grid grid-cols-2 gap-3">
            {(['parent', 'child'] as const).map((role) => (
              <label
                key={role}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition ${
                  selectedRole === role
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                }`}
              >
                <input type="radio" value={role} {...register('role')} className="sr-only" />
                <span className="text-2xl mb-1">{role === 'parent' ? '👨‍👩‍👧' : '🧒'}</span>
                <span className="text-sm font-semibold capitalize text-gray-700 dark:text-gray-300">{role}</span>
              </label>
            ))}
          </div>
          {errors.role && <p className="mt-1 text-xs text-red-500">{errors.role.message}</p>}
        </div>

        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            {...register('name')}
            disabled={isLoading}
            placeholder="Your name"
            className={`w-full px-4 py-3 rounded-xl border bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition ${
              errors.name ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'
            }`}
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            {...register('email')}
            disabled={isLoading}
            placeholder="you@example.com"
            className={`w-full px-4 py-3 rounded-xl border bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition ${
              errors.email ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'
            }`}
          />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              {...register('password')}
              disabled={isLoading}
              placeholder="Min 8 chars, 1 uppercase, 1 number"
              className={`w-full px-4 py-3 pr-12 rounded-xl border bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition ${
                errors.password ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-3 flex items-center text-gray-400"
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            {...register('confirmPassword')}
            disabled={isLoading}
            placeholder="Repeat your password"
            className={`w-full px-4 py-3 rounded-xl border bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition ${
              errors.confirmPassword ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'
            }`}
          />
          {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>}
        </div>

        {/* Terms */}
        <div className="flex items-start gap-3">
          <input
            id="agreeToTerms"
            type="checkbox"
            {...register('agreeToTerms')}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          />
          <label htmlFor="agreeToTerms" className="text-sm text-gray-600 dark:text-gray-400">
            I agree to the{' '}
            <Link href="/terms" className="text-purple-600 hover:underline">Terms of Service</Link>
            {' '}and{' '}
            <Link href="/privacy" className="text-purple-600 hover:underline">Privacy Policy</Link>
          </label>
        </div>
        {errors.agreeToTerms && <p className="text-xs text-red-500">{errors.agreeToTerms.message}</p>}

        {/* Submit */}
        <motion.button
          type="submit"
          disabled={isLoading}
          whileTap={{ scale: 0.98 }}
          className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-xl shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creating account...
            </span>
          ) : `Create ${selectedRole === 'parent' ? 'Parent' : 'Child'} Account`}
        </motion.button>

        {/* Divider */}
        <div className="relative flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          <span className="text-xs text-gray-400">or</span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Google sign up */}
        <button
          type="button"
          onClick={handleGoogleSignUp}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 py-3 px-6 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition font-medium text-gray-700 dark:text-gray-300 disabled:opacity-60"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign up with Google
        </button>

        {/* Login link */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-purple-600 hover:text-purple-700 font-semibold">
            Sign in
          </Link>
        </p>
      </form>
    </motion.div>
  )
}

export default RegisterForm
