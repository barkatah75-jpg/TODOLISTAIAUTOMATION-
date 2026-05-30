import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { generatePersonalizedStory, type StoryGenre } from '@/lib/ai/storyGenerator'
import { checkRateLimit } from '@/lib/utils/rateLimit'
import { z } from 'zod'

const genSchema = z.object({
  genre: z.enum(['adventure', 'mystery', 'fantasy', 'space', 'underwater', 'dinosaur']).default('adventure'),
  achievement: z.string().max(200).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Rate limit: 3 stories per day
    const rl = await checkRateLimit(`story:generate:${user.id}`, 3, '24 h')
    if (!rl.success) return NextResponse.json({ error: 'Story limit: 3 per day. Come back tomorrow! 📚' }, { status: 429 })

    const body = await req.json()
    const parsed = genSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

    // Get child profile + rewards + badges
    const [profileRes, rewardsRes, badgesRes] = await Promise.all([
      supabase.from('profiles').select('name, display_name').eq('id', user.id).single(),
      supabase.from('rewards').select('total_xp, level').eq('user_id', user.id).single(),
      supabase.from('badges').select('name').eq('user_id', user.id).order('earned_at', { ascending: false }).limit(5),
    ])

    const heroName = profileRes.data?.display_name || profileRes.data?.name || 'Hero'
    const totalXP = rewardsRes.data?.total_xp || 0
    const level = rewardsRes.data?.level || 1
    const badges = badgesRes.data?.map(b => b.name) || []

    const achievement = parsed.data.achievement || `completing tasks and reaching Level ${level}`

    // Generate story
    const story = await generatePersonalizedStory(heroName, achievement, level, totalXP, badges, parsed.data.genre)

    // Save to database
    const { data: savedStory, error } = await supabase.from('ai_stories').insert({
      user_id: user.id,
      title: story.title,
      content: story.content,
      hero_name: heroName,
      achievement,
      genre: story.genre,
      word_count: story.wordCount,
      status: 'ready',
      milestone_xp: totalXP,
      milestone_level: level,
      cover_emoji: story.coverEmoji,
    }).select().single()

    if (error) throw error

    // Award XP for reading/generating story
    await supabase.rpc('award_xp', {
      p_user_id: user.id,
      p_amount: 15,
      p_reason: 'Generated personal story',
    })

    return NextResponse.json({ story: savedStory, xpBonus: 15 })
  } catch (err: unknown) {
    console.error('Story generation error:', err)
    return NextResponse.json({ error: 'Story generation failed' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: stories } = await supabase
      .from('ai_stories').select('*')
      .eq('user_id', user.id)
      .eq('status', 'ready')
      .order('created_at', { ascending: false })

    return NextResponse.json({ stories: stories || [] })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch stories' }, { status: 500 })
  }
}
