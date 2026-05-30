import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { SchoolAssignmentsClient } from './SchoolAssignmentsClient'

export const metadata = { title: 'Assignments — AIVANA School' }

export default async function SchoolAssignmentsPage() {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: member } = await supabase
    .from('school_members')
    .select('*, school:schools(*)')
    .eq('user_id', user.id)
    .in('role', ['teacher', 'admin'])
    .single()

  if (!member) redirect('/child/dashboard')

  const [assignmentsRes, studentsRes] = await Promise.all([
    supabase
      .from('classroom_assignments')
      .select('*')
      .eq('school_id', member.school_id)
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false }),

    supabase
      .from('school_members')
      .select('id, class_name, profile:profiles!school_members_user_id_fkey(id, name)')
      .eq('school_id', member.school_id)
      .eq('role', 'student'),
  ])

  return (
    <SchoolAssignmentsClient
      teacher={member}
      school={member.school}
      assignments={assignmentsRes.data || []}
      students={studentsRes.data || []}
    />
  )
}
