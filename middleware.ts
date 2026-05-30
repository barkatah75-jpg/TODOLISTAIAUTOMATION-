import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/', '/auth/login', '/auth/register', '/auth/verify', '/api/auth', '/pricing']
const CHILD_PATHS = ['/child']
const PARENT_PATHS = ['/parent']
const ADMIN_PATHS = ['/admin']
const SCHOOL_PATHS = ['/school']

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  const pathname = request.nextUrl.pathname

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    if (session) {
      // Redirect authenticated users away from auth pages
      if (pathname.startsWith('/auth')) {
        const { data: profile } = await supabase
          .from('profiles').select('role').eq('id', session.user.id).single()
        const role = profile?.role || 'child'
        return NextResponse.redirect(new URL(`/${role}/dashboard`, request.url))
      }
    }
    return response
  }

  // Require auth for protected paths
  if (!session) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Role-based routing
  const { data: profile } = await supabase
    .from('profiles').select('role, onboarded').eq('id', session.user.id).single()

  if (!profile) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Redirect to onboarding if not completed
  if (!profile.onboarded && !pathname.includes('/onboarding')) {
    return NextResponse.redirect(new URL(`/${profile.role}/onboarding`, request.url))
  }

  // Enforce role access
  if (CHILD_PATHS.some(p => pathname.startsWith(p)) && profile.role !== 'child') {
    return NextResponse.redirect(new URL(`/${profile.role}/dashboard`, request.url))
  }
  if (PARENT_PATHS.some(p => pathname.startsWith(p)) && profile.role !== 'parent' && profile.role !== 'admin') {
    return NextResponse.redirect(new URL(`/${profile.role}/dashboard`, request.url))
  }
  if (ADMIN_PATHS.some(p => pathname.startsWith(p)) && profile.role !== 'admin') {
    return NextResponse.redirect(new URL(`/${profile.role}/dashboard`, request.url))
  }
  if (SCHOOL_PATHS.some(p => pathname.startsWith(p)) && profile.role === 'child') {
    return NextResponse.redirect(new URL('/child/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|sw.js|workbox|manifest).*)'],
}
