import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { TeacherDashboardClient } from '@/components/school/TeacherDashboardClient'

export const metadata = { title: 'School Dashboard' }

export default async function SchoolDashboardPage() {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Get schools where this user is teacher/admin
  const { data: memberOf } = await supabase
    .from('school_members')
    .select('*, school:schools(*)')
    .eq('user_id', user.id)
    .in('role', ['teacher', 'admin'])

  if (!memberOf?.length) redirect('/school/onboarding')

  const schoolId = memberOf[0].school_id

  const [assignmentsRes, studentsRes, profileRes] = await Promise.all([
    supabase.from('classroom_assignments').select('*, completions:assignment_completions(count)')
      .eq('school_id', schoolId).eq('teacher_id', user.id)
      .order('created_at', { ascending: false }).limit(20),
    supabase.from('school_members').select('*, profile:profiles(id, name, display_name, avatar_url)')
      .eq('school_id', schoolId).eq('role', 'student'),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
  ])

  return (
    <TeacherDashboardClient
      profile={profileRes.data!}
      school={memberOf[0].school as { id: string; name: string; code: string; max_students: number }}
      assignments={assignmentsRes.data || []}
      students={studentsRes.data || []}
      teacherRole={memberOf[0].role as 'teacher' | 'admin'}
    />
  )
}
