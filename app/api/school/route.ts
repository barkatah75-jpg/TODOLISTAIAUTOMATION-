import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { z } from 'zod'

async function verifyTeacher(supabase: ReturnType<typeof getSupabaseServer>, userId: string, schoolId?: string) {
  const query = supabase.from('school_members').select('id, school_id, role').eq('user_id', userId).in('role', ['teacher', 'admin'])
  if (schoolId) query.eq('school_id', schoolId)
  const { data } = await query.single()
  return data
}

// GET /api/school — get school data for logged-in teacher
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action') || 'overview'

    const member = await verifyTeacher(supabase, user.id)
    if (!member) return NextResponse.json({ error: 'School member not found' }, { status: 403 })

    if (action === 'overview') {
      const [schoolRes, studentsRes, assignmentsRes] = await Promise.all([
        supabase.from('schools').select('*').eq('id', member.school_id).single(),
        supabase.from('school_members').select('id, class_name', { count: 'exact', head: true }).eq('school_id', member.school_id).eq('role', 'student'),
        supabase.from('classroom_assignments').select('id, title, active, total_assigned, total_completed').eq('school_id', member.school_id).eq('teacher_id', user.id),
      ])
      return NextResponse.json({
        school: schoolRes.data,
        studentCount: studentsRes.count || 0,
        assignments: assignmentsRes.data || [],
      })
    }

    if (action === 'leaderboard') {
      const { data } = await supabase
        .from('school_members')
        .select(`
          user_id, class_name,
          profile:profiles!school_members_user_id_fkey(name, display_name, avatar_url),
          rewards:rewards!rewards_user_id_fkey(total_xp, level, streak_days, tasks_completed)
        `)
        .eq('school_id', member.school_id)
        .eq('role', 'student')
        .order('user_id')
      return NextResponse.json({ leaderboard: (data || []).sort((a, b) => {
        const aXP = Array.isArray(a.rewards) ? (a.rewards[0]?.total_xp || 0) : ((a.rewards as {total_xp?: number})?.total_xp || 0)
        const bXP = Array.isArray(b.rewards) ? (b.rewards[0]?.total_xp || 0) : ((b.rewards as {total_xp?: number})?.total_xp || 0)
        return bXP - aXP
      })})
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/school — create assignment or join school
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const action = body.action

    // Join school by code (student/teacher)
    if (action === 'join') {
      const { code, role = 'student', class_name } = body
      if (!code) return NextResponse.json({ error: 'School code required' }, { status: 400 })

      const { data: school } = await supabase.from('schools').select('id, name, active').eq('code', code.toUpperCase()).single()
      if (!school) return NextResponse.json({ error: 'School not found. Check the code.' }, { status: 404 })
      if (!school.active) return NextResponse.json({ error: 'This school is not active.' }, { status: 403 })

      const { data: existing } = await supabase.from('school_members').select('id').eq('school_id', school.id).eq('user_id', user.id).single()
      if (existing) return NextResponse.json({ error: 'Already a member of this school' }, { status: 409 })

      const { error } = await supabase.from('school_members').insert({
        school_id: school.id,
        user_id: user.id,
        role,
        class_name: class_name || null,
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, school: { id: school.id, name: school.name } })
    }

    // Create classroom assignment
    if (action === 'create_assignment') {
      const schema = z.object({
        schoolId: z.string().uuid(),
        title: z.string().min(1).max(300),
        description: z.string().max(1000).optional().nullable(),
        subject: z.string().max(100),
        class_name: z.string().max(100).optional().nullable(),
        due_date: z.string().optional().nullable(),
        points: z.number().int().min(1).max(1000).default(50),
        emoji: z.string().default('📚'),
      })
      const parsed = schema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

      const member = await verifyTeacher(supabase, user.id, parsed.data.schoolId)
      if (!member) return NextResponse.json({ error: 'Not a teacher in this school' }, { status: 403 })

      const { data, error } = await supabase.from('classroom_assignments').insert({
        school_id: parsed.data.schoolId,
        teacher_id: user.id,
        title: parsed.data.title,
        description: parsed.data.description,
        subject: parsed.data.subject,
        class_name: parsed.data.class_name,
        due_date: parsed.data.due_date || null,
        points: parsed.data.points,
        emoji: parsed.data.emoji,
        active: true,
        total_assigned: 0,
        total_completed: 0,
      }).select().single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ assignment: data }, { status: 201 })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/school — update assignment
export async function PATCH(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { action, assignmentId, active } = body

    if (action === 'toggle_assignment') {
      const { data: assignment } = await supabase.from('classroom_assignments').select('school_id').eq('id', assignmentId).single()
      if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })

      const member = await verifyTeacher(supabase, user.id, assignment.school_id)
      if (!member) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

      const { error } = await supabase.from('classroom_assignments').update({ active }).eq('id', assignmentId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
