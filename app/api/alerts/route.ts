import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'

// GET /api/alerts — get parent alerts
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const unreadOnly = searchParams.get('unread') === 'true'
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

    let query = supabase
      .from('parent_alerts')
      .select('*, child:profiles!parent_alerts_child_id_fkey(name, display_name, avatar_url)')
      .eq('parent_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (unreadOnly) query = query.eq('read', false)

    const { data, error, count } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { count: unreadCount } = await supabase
      .from('parent_alerts')
      .select('id', { count: 'exact', head: true })
      .eq('parent_id', user.id)
      .eq('read', false)

    return NextResponse.json({ alerts: data || [], unreadCount: unreadCount || 0 })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/alerts — mark alerts as read
export async function PATCH(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { alertId, markAllRead } = body

    if (markAllRead) {
      await supabase.from('parent_alerts').update({ read: true }).eq('parent_id', user.id).eq('read', false)
      return NextResponse.json({ success: true, message: 'All alerts marked as read' })
    }

    if (alertId) {
      await supabase.from('parent_alerts').update({ read: true }).eq('id', alertId).eq('parent_id', user.id)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Provide alertId or markAllRead: true' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/alerts — delete an alert
export async function DELETE(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const alertId = searchParams.get('alertId')
    const deleteAll = searchParams.get('all') === 'true'

    if (deleteAll) {
      await supabase.from('parent_alerts').delete().eq('parent_id', user.id)
      return NextResponse.json({ success: true })
    }

    if (alertId) {
      await supabase.from('parent_alerts').delete().eq('id', alertId).eq('parent_id', user.id)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Provide alertId or all=true' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
