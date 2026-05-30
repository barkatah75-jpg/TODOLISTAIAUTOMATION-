import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getAIResponse } from '@/lib/ai/homeworkHelper'
import { z } from 'zod'

const schema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1).max(4000),
  })).min(1).max(50),
  conversationId: z.string().uuid().optional(),
  subject: z.string().max(100).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

    const { messages, conversationId, subject } = parsed.data

    const result = await getAIResponse(user.id, messages, subject)

    // Save conversation to DB
    const allMessages = [
      ...messages,
      { role: 'assistant' as const, content: result.message, timestamp: new Date().toISOString() },
    ]

    if (conversationId) {
      await supabase.from('ai_conversations').update({
        messages: allMessages,
        updated_at: new Date().toISOString(),
      }).eq('id', conversationId).eq('user_id', user.id)
    } else {
      // Create new conversation with auto-title from first message
      const title = messages[0].content.slice(0, 50) + (messages[0].content.length > 50 ? '...' : '')
      await supabase.from('ai_conversations').insert({
        user_id: user.id,
        title,
        messages: allMessages,
        subject: subject || null,
      })
    }

    return NextResponse.json({ message: result.message, suggestedTasks: result.suggestedTasks })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI service error'
    const status = message.includes('limit') ? 429 : message.includes('Pro') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function GET(req: NextRequest) {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('ai_conversations')
    .select('id, title, subject, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ conversations: data || [] })
}
