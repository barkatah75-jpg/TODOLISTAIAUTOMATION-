'use server'

import { revalidatePath } from 'next/cache'
import { getSupabaseServer } from '@/lib/supabase/server'
import { z } from 'zod'

function generateSchoolCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return 'SCHOOL-' + Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function createSchool(name: string, city?: string) {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const { data: school, error } = await supabase.from('schools').insert({
    name,
    city: city || null,
    code: generateSchoolCode(),
  }).select().single()

  if (error) return { data: null, error: error.message }

  // Add creator as admin
  await supabase.from('school_members').insert({
    school_id: school.id,
    user_id: user.id,
    role: 'admin',
  })

  revalidatePath('/school/dashboard')
  return { data: school, error: null }
}

export async function joinSchool(code: string, className: string) {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const { data: school, error: findErr } = await supabase
    .from('schools').select('id, name, max_students').eq('code', code.toUpperCase()).eq('active', true).single()
  if (findErr || !school) return { data: null, error: 'Invalid school code' }

  // Check capacity
  const { count } = await supabase.from('school_members').select('*', { count: 'exact', head: true })
    .eq('school_id', school.id).eq('role', 'student')
  if (count && count >= school.max_students) return { data: null, error: 'Class is full' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const memberRole = profile?.role === 'parent' ? 'teacher' : 'student'

  const { error } = await supabase.from('school_members').upsert({
    school_id: school.id,
    user_id: user.id,
    role: memberRole,
    class_name: className,
  }, { onConflict: 'school_id,user_id' })

  if (error) return { data: null, error: error.message }
  revalidatePath('/school/dashboard')
  return { data: { school, role: memberRole }, error: null }
}

const assignmentSchema = z.object({
  schoolId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  subject: z.string().max(100),
  className: z.string().max(50),
  dueDate: z.string().datetime().optional().nullable(),
  points: z.number().int().min(5).max(500).default(20),
  emoji: z.string().default('📚'),
})

export async function createAssignment(input: unknown) {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Unauthorized' }

  const parsed = assignmentSchema.safeParse(input)
  if (!parsed.success) return { data: null, error: parsed.error.errors[0].message }

  // Verify teacher role
  const { data: member } = await supabase.from('school_members').select('role')
    .eq('school_id', parsed.data.schoolId).eq('user_id', user.id)
    .in('role', ['teacher', 'admin']).single()
  if (!member) return { data: null, error: 'Not authorized as teacher' }

  const { data: assignment, error } = await supabase.from('classroom_assignments').insert({
    school_id: parsed.data.schoolId,
    teacher_id: user.id,
    title: parsed.data.title,
    description: parsed.data.description || null,
    subject: parsed.data.subject,
    class_name: parsed.data.className,
    due_date: parsed.data.dueDate || null,
    points: parsed.data.points,
    emoji: parsed.data.emoji,
  }).select().single()

  if (error) return { data: null, error: error.message }

  // Auto-assign to all students in the class
  const { data: students } = await supabase.from('school_members').select('user_id')
    .eq('school_id', parsed.data.schoolId).eq('class_name', parsed.data.className).eq('role', 'student')

  if (students?.length) {
    // Create todos for all students
    const todos = students.map(s => ({
      user_id: s.user_id,
      text: parsed.data.title,
      description: parsed.data.description || null,
      category: 'homework' as const,
      emoji: parsed.data.emoji,
      points: parsed.data.points,
      due_date: parsed.data.dueDate || null,
      assigned_by: user.id,
    }))
    const { data: createdTodos } = await supabase.from('todos').insert(todos).select('id, user_id')

    // Create completion records
    if (createdTodos?.length) {
      const completions = students.map(s => ({
        assignment_id: assignment.id,
        student_id: s.user_id,
        todo_id: createdTodos.find(t => t.user_id === s.user_id)?.id || null,
      }))
      await supabase.from('assignment_completions').insert(completions)
    }

    // Update total assigned count
    await supabase.from('classroom_assignments').update({ total_assigned: students.length }).eq('id', assignment.id)
  }

  revalidatePath('/school/assignments')
  return { data: assignment, error: null }
}
