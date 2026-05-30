import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const today = new Date().toISOString().split('T')[0]

    // Get existing missions for today
    const { data: existing } = await supabase
      .from('user_missions')
      .select('*, mission:missions(*)')
      .eq('user_id', user.id)
      .eq('assigned_date', today)

    if (existing && existing.length > 0) {
      return NextResponse.json({ missions: existing })
    }

    // Assign new daily missions - pick 3 random active daily missions
    const { data: allMissions } = await supabase
      .from('missions')
      .select('*')
      .eq('active', true)
      .eq('mission_type', 'daily')

    if (!allMissions || allMissions.length === 0) {
      return NextResponse.json({ missions: [] })
    }

    // Shuffle and pick 3
    const shuffled = allMissions.sort(() => Math.random() - 0.5).slice(0, 3)
    const tomorrow = new Date()
    tomorrow.setHours(23, 59, 59, 999)

    const newUserMissions = shuffled.map(mission => ({
      user_id: user.id,
      mission_id: mission.id,
      progress: 0,
      completed: false,
      assigned_date: today,
      expires_at: tomorrow.toISOString(),
    }))

    const { data: created } = await supabase
      .from('user_missions')
      .insert(newUserMissions)
      .select('*, mission:missions(*)')

    return NextResponse.json({ missions: created || [] })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to load missions' }, { status: 500 })
  }
}
