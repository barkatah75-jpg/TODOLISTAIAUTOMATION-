import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { generateAdaptiveTasks, analyzeAndUpdateProfile, getStudySchedule } from '@/lib/adaptive/engine'
import { checkRateLimit } from '@/lib/utils/rateLimit'

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'tasks'

    // Rate limit
    const rl = await checkRateLimit(`adaptive:${type}:${user.id}`, 10, '1 h')
    if (!rl.success) return NextResponse.json({ error: 'Rate limit reached' }, { status: 429 })

    const { data: profile } = await supabase
      .from('profiles').select('display_name, name').eq('id', user.id).single()
    const childName = profile?.display_name || profile?.name || 'Explorer'

    if (type === 'tasks') {
      const tasks = await generateAdaptiveTasks(user.id, childName, 3)
      return NextResponse.json({ tasks })
    }

    if (type === 'schedule') {
      const schedule = await getStudySchedule(user.id, childName)
      return NextResponse.json({ schedule })
    }

    if (type === 'analyze') {
      const learningProfile = await analyzeAndUpdateProfile(user.id)
      return NextResponse.json({ profile: learningProfile })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (err: unknown) {
    return NextResponse.json({ error: 'Adaptive engine error' }, { status: 500 })
  }
}
