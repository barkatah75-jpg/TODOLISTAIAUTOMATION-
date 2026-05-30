import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { z } from 'zod'

const patchSchema = z.object({
  display_name: z.string().min(1).max(50).optional(),
  language: z.enum(['en', 'hi']).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  sound_enabled: z.boolean().optional(),
})

export async function GET() {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: rewards } = await supabase
    .from('rewards')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, status, ai_enabled, current_period_end')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({ profile, rewards, subscription })
}

export async function PATCH(req: NextRequest) {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

  const { data, error } = await supabase
    .from('profiles')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile: data })
}
