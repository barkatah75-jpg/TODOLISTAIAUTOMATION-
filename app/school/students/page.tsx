import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { SchoolStudentsClient } from './SchoolStudentsClient'

export const metadata = { title: 'Students — AIVANA School' }

export default async function SchoolStudentsPage() {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Verify teacher/school role
  const { data: member } = await supabase
    .from('school_members')
    .select('*, school:schools(*)')
    .eq('user_id', user.id)
    .in('role', ['teacher', 'admin'])
    .single()

  if (!member) redirect('/child/dashboard')

  // Get all students in same school
  const { data: students } = await supabase
    .from('school_members')
    .select(`
      id, class_name, joined_at,
      profile:profiles!school_members_user_id_fkey(id, name, display_name, avatar_url, email),
      rewards:rewards!rewards_user_id_fkey(total_xp, level, tasks_completed, streak_days)
    `)
    .eq('school_id', member.school_id)
    .eq('role', 'student')
    .order('joined_at', { ascending: false })

  // Get class names for filter
  const classNames = [...new Set((students || []).map((s) => s.class_name).filter(Boolean))] as string[]

  return (
    <SchoolStudentsClient
      teacher={member}
      school={member.school}
      students={students || []}
      classNames={classNames}
    />
  )
}
