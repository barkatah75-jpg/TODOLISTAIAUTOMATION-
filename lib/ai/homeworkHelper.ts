import Anthropic from '@anthropic-ai/sdk'
import { getSupabaseServer } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/utils/rateLimit'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const SYSTEM_PROMPT = `You are AIVA, a friendly AI learning companion for children aged 5-15.

PERSONALITY:
- Warm, encouraging, and patient
- Use simple language appropriate for the child's age
- Add relevant emojis to make responses fun
- Always positive and supportive
- Never give direct answers — guide with hints and questions
- Celebrate progress and effort

CAPABILITIES:
- Help with homework (math, science, english, history, etc.)
- Explain concepts in simple, relatable ways
- Suggest study strategies
- Break complex problems into steps
- Create memory tricks and mnemonics
- Answer questions about tasks and learning

RULES:
- Never produce adult content
- Always encourage learning over shortcuts
- If a topic is inappropriate, gently redirect
- Keep responses concise (under 200 words unless explaining step-by-step)
- Use examples from everyday life children understand

LANGUAGE: Respond in the same language the child uses (supports English and Hindi).
If the child writes in Hindi/Hinglish, respond in that language.`

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AIResponse {
  message: string
  suggestedTasks?: string[]
  tokensUsed: number
}

export async function getAIResponse(
  userId: string,
  messages: ChatMessage[],
  subject?: string
): Promise<AIResponse> {
  // Rate limit: 20 AI messages per hour (free), 100 (pro)
  const rl = await checkRateLimit(`ai:chat:${userId}`, 20, '1 h')
  if (!rl.success) {
    throw new Error('AI message limit reached. Upgrade to Pro for unlimited AI chat! 🚀')
  }

  // Check AI is enabled for this user
  const supabase = getSupabaseServer()
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('ai_enabled, plan')
    .eq('user_id', userId)
    .single()

  if (!sub?.ai_enabled && sub?.plan === 'free') {
    throw new Error('AI features require Pro plan. Upgrade to unlock AIVA! ✨')
  }

  const systemWithSubject = subject
    ? `${SYSTEM_PROMPT}\n\nCurrent subject focus: ${subject}`
    : SYSTEM_PROMPT

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    system: systemWithSubject,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  // Extract suggested tasks if AI mentions any
  const suggestedTasks = extractSuggestedTasks(text)

  return {
    message: text,
    suggestedTasks: suggestedTasks.length > 0 ? suggestedTasks : undefined,
    tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
  }
}

export async function generateTaskSuggestions(
  userId: string,
  recentTasks: string[],
  completionRate: number,
  categories: string[]
): Promise<string[]> {
  const rl = await checkRateLimit(`ai:suggest:${userId}`, 5, '1 h')
  if (!rl.success) return []

  const prompt = `Based on this child's recent activity:
- Recent completed tasks: ${recentTasks.slice(0, 5).join(', ')}
- Completion rate: ${Math.round(completionRate * 100)}%
- Active categories: ${categories.join(', ')}

Suggest 3 new age-appropriate tasks that would:
1. Build on their current progress
2. Cover any gaps in their routine
3. Be achievable and motivating

Return ONLY a JSON array of task strings, nothing else.
Example: ["Read for 20 minutes", "Practice multiplication tables", "Clean your room"]`

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [{ role: 'user', content: prompt }],
  })

  try {
    const text = response.content[0].type === 'text' ? response.content[0].text : '[]'
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
    const tasks = JSON.parse(cleaned)
    return Array.isArray(tasks) ? tasks.slice(0, 3) : []
  } catch {
    return []
  }
}

export async function getSmartReminder(
  childName: string,
  pendingTasks: string[],
  streakDays: number
): Promise<string> {
  const prompt = `Create a short, fun, encouraging reminder message for ${childName} who has:
- ${pendingTasks.length} pending tasks: ${pendingTasks.slice(0, 3).join(', ')}
- Current streak: ${streakDays} days

Make it:
- Max 2 sentences
- Upbeat and motivating
- Age-appropriate (child-friendly)
- Include 1-2 relevant emojis

Just return the message text, nothing else.`

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 100,
    messages: [{ role: 'user', content: prompt }],
  })

  return response.content[0].type === 'text' ? response.content[0].text : `Hey ${childName}! Time to complete your tasks and keep that streak going! 🔥`
}

function extractSuggestedTasks(text: string): string[] {
  const tasks: string[] = []
  const patterns = [
    /(?:task|try|add|complete|do):?\s*[""']([^""']{5,80})[""']/gi,
    /(?:^\s*[-•*]\s*)(.{5,80})$/gm,
  ]
  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(text)) !== null) {
      tasks.push(match[1].trim())
    }
  }
  return [...new Set(tasks)].slice(0, 3)
}
