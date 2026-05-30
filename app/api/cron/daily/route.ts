import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { sendStreakBreakWarning, sendWeeklyReport } from '@/lib/email/sender'
import { sendStreakAlert } from '@/lib/notifications/webpush'

// Vercel Cron: runs at 8pm IST (2:30pm UTC) every day
// vercel.json: { "crons": [{ "path": "/api/cron/daily", "schedule": "30 14 * * *" }] }

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const results = { missions: 0, streakAlerts: 0, emailsSent: 0, errors: [] as string[] }

  try {
    // 1. Assign daily missions to all active child users
    const { data: activeChildren } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'child')
      .gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    for (const child of activeChildren || []) {
      try {
        await supabase.rpc('assign_daily_missions', { p_user_id: child.id })
        results.missions++
      } catch (e) {
        results.errors.push(`Mission assign failed for ${child.id}`)
      }
    }

    // 2. Check streaks — alert parents if child hasn't been active today
    const today = new Date().toISOString().split('T')[0]
    const { data: childrenWithStreaks } = await supabase
      .from('rewards')
      .select('user_id, streak_days')
      .gt('streak_days', 0)

    for (const r of childrenWithStreaks || []) {
      // Check if they've completed any task today
      const { count: todayTasks } = await supabase
        .from('todos').select('*', { count: 'exact', head: true })
        .eq('user_id', r.user_id).eq('completed', true)
        .gte('completed_at', `${today}T00:00:00Z`)

      if ((todayTasks || 0) === 0 && r.streak_days >= 3) {
        // Send push notification to child
        await sendStreakAlert(r.user_id, r.streak_days, 'Explorer').catch(() => {})

        // Get parent info and send email alert
        const { data: links } = await supabase
          .from('family_links').select('parent_id').eq('child_id', r.user_id)
        const { data: childProfile } = await supabase
          .from('profiles').select('name, display_name').eq('id', r.user_id).single()
        const childName = childProfile?.display_name || childProfile?.name || 'Your child'

        for (const link of links || []) {
          const { data: parentProfile } = await supabase
            .from('profiles').select('email').eq('id', link.parent_id).single()
          if (parentProfile?.email) {
            await sendStreakBreakWarning(parentProfile.email, childName, r.streak_days).catch(() => {})
            results.emailsSent++
          }
        }
        results.streakAlerts++
      }
    }

    // 3. Weekly report (runs Monday only)
    const isMonday = new Date().getDay() === 1
    if (isMonday) {
      const { data: allParents } = await supabase.from('profiles').select('id, email, name, display_name').eq('role', 'parent')
      for (const parent of allParents || []) {
        const { data: children } = await supabase.from('family_links').select('child_id').eq('parent_id', parent.id)
        for (const link of children || []) {
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
          const [childProfile, rewards, completedTodos, xpThisWeek] = await Promise.all([
            supabase.from('profiles').select('name, display_name').eq('id', link.child_id).single(),
            supabase.from('rewards').select('level, streak_days').eq('user_id', link.child_id).single(),
            supabase.from('todos').select('id', { count: 'exact', head: true }).eq('user_id', link.child_id).eq('completed', true).gte('completed_at', weekAgo),
            supabase.from('xp_transactions').select('amount').eq('user_id', link.child_id).gte('created_at', weekAgo),
          ])

          const childName = childProfile.data?.display_name || childProfile.data?.name || 'Your child'
          const stats = {
            tasksCompleted: completedTodos.count || 0,
            xpEarned: xpThisWeek.data?.filter(x => x.amount > 0).reduce((s, x) => s + x.amount, 0) || 0,
            streakDays: rewards.data?.streak_days || 0,
            level: rewards.data?.level || 1,
          }

          if (stats.tasksCompleted > 0 && parent.email) {
            await sendWeeklyReport(parent.email, parent.display_name || parent.name, childName, stats).catch(() => {})
            results.emailsSent++
          }
        }
      }
    }

  } catch (err: unknown) {
    results.errors.push(err instanceof Error ? err.message : 'Unknown error')
  }

  console.log('[CRON] Daily job results:', results)
  return NextResponse.json({ success: true, results })
}
