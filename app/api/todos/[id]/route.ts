import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { z } from 'zod'

const updateSchema = z.object({
  text: z.string().min(1).max(500).trim().optional(),
  description: z.string().max(2000).optional().nullable(),
  category: z.enum(['homework','chores','reading','exercise','creative','social','personal','custom']).optional(),
  emoji: z.string().optional(),
  points: z.number().int().min(1).max(1000).optional(),
  due_date: z.string().datetime().optional().nullable(),
  priority: z.number().int().min(1).max(3).optional(),
  recurring: z.string().optional().nullable(),
  completed: z.boolean().optional(),
  parent_approved: z.boolean().optional(),
})

// GET /api/todos/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('todos')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Todo not found' }, { status: 404 })
  return NextResponse.json({ todo: data })
}

// PATCH /api/todos/[id] — update todo
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

    // Check if this is a parent approving a child's task
    const { data: todo } = await supabase.from('todos').select('user_id, assigned_by').eq('id', params.id).single()
    if (!todo) return NextResponse.json({ error: 'Todo not found' }, { status: 404 })

    // Allow parent to approve if they assigned it
    if (todo.user_id !== user.id) {
      if (parsed.data.parent_approved !== undefined && todo.assigned_by === user.id) {
        const { data, error } = await supabase
          .from('todos')
          .update({ parent_approved: parsed.data.parent_approved })
          .eq('id', params.id)
          .select()
          .single()
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ todo: data })
      }
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updateData: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() }

    // If marking completed, add timestamp
    if (parsed.data.completed === true) {
      updateData.completed_at = new Date().toISOString()
    } else if (parsed.data.completed === false) {
      updateData.completed_at = null
    }

    const { data, error } = await supabase
      .from('todos')
      .update(updateData)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ todo: data })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/todos/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
