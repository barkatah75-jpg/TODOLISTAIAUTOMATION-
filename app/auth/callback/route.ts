import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const role = searchParams.get('role') || 'child'
  const next = searchParams.get('next') ?? '/'

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=no_code`)
  }

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          try { cookieStore.set({ name, value, ...options }) } catch {}
        },
        remove(name: string, options: CookieOptions) {
          try { cookieStore.set({ name, value: '', ...options }) } catch {}
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(`${origin}/auth/login?error=${error.message}`)
  }

  // Get user and their profile
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${origin}/auth/login`)

  // Check if profile exists (new user vs returning)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, onboarded')
    .eq('id', user.id)
    .single()

  if (!profile) {
    // New Google OAuth user — create profile with selected role
    await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email!,
      name: user.user_metadata?.full_name || user.email!.split('@')[0],
      avatar_url: user.user_metadata?.avatar_url || null,
      role: role as 'child' | 'parent',
    })
    await supabase.from('rewards').upsert({ user_id: user.id })
    await supabase.from('subscriptions').upsert({ user_id: user.id, plan: 'free', ai_enabled: false })

    const redirectRole = role as string
    return NextResponse.redirect(`${origin}/${redirectRole}/onboarding`)
  }

  // Returning user
  const redirectTo = !profile.onboarded
    ? `${origin}/${profile.role}/onboarding`
    : `${origin}/${profile.role}/dashboard`

  return NextResponse.redirect(redirectTo)
}
