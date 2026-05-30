import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'

// GET /api/auth — get current session and profile
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ user: null, profile: null, authenticated: false })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, name, display_name, avatar_url, onboarded, theme, sound_enabled, language')
      .eq('id', user.id)
      .single()

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan, status, max_children, ai_enabled, current_period_end')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({
      authenticated: true,
      user: { id: user.id, email: user.email },
      profile,
      subscription,
    })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to get session' }, { status: 500 })
  }
}

// POST /api/auth — sign out
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const action = body.action || 'signout'

    const supabase = getSupabaseServer()

    if (action === 'signout') {
      const { error } = await supabase.auth.signOut()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, message: 'Signed out successfully' })
    }

    if (action === 'refresh') {
      const { data: { session }, error } = await supabase.auth.refreshSession()
      if (error) return NextResponse.json({ error: error.message }, { status: 401 })
      return NextResponse.json({ success: true, session: { expires_at: session?.expires_at } })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/auth — delete account
export async function DELETE(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Soft delete: anonymize profile data
    await supabase.from('profiles').update({
      name: 'Deleted User',
      email: `deleted_${user.id}@aivana.deleted`,
      display_name: null,
      avatar_url: null,
    }).eq('id', user.id)

    await supabase.auth.signOut()
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}
