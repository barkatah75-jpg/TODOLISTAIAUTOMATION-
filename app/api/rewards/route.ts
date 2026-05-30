import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase/server'
import { z } from 'zod'

const rewardSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(500).optional().nullable(),
  xp_cost: z.number().int().min(1).max(10000),
  icon: z.string().default('🎁'),
  child_id: z.string().uuid(),
})

// GET /api/rewards — get rewards for a child or parent view
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const childId = searchParams.get('childId')
    const type = searchParams.get('type') || 'all' // 'xp' | 'parent_rewards' | 'all'

    // Child getting their own rewards & XP
    if (!childId || childId === user.id) {
      const [rewardsRes, badgesRes, parentRewardsRes] = await Promise.all([
        supabase.from('rewards').select('*').eq('user_id', user.id).single(),
        supabase.from('badges').select('*').eq('user_id', user.id).order('earned_at', { ascending: false }),
        supabase.from('parent_rewards').select('*').eq('child_id', user.id).eq('redeemed', false).order('created_at', { ascending: false }),
      ])

      return NextResponse.json({
        xp: rewardsRes.data,
        badges: badgesRes.data || [],
        parentRewards: parentRewardsRes.data || [],
      })
    }

    // Parent viewing child's rewards
    const { data: link } = await supabase
      .from('family_links')
      .select('id')
      .eq('parent_id', user.id)
      .eq('child_id', childId)
      .single()

    if (!link) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

    const [rewardsRes, badgesRes, parentRewardsRes] = await Promise.all([
      supabase.from('rewards').select('*').eq('user_id', childId).single(),
      supabase.from('badges').select('*').eq('user_id', childId).order('earned_at', { ascending: false }),
      supabase.from('parent_rewards').select('*').eq('child_id', childId).order('created_at', { ascending: false }),
    ])

    return NextResponse.json({
      xp: rewardsRes.data,
      badges: badgesRes.data || [],
      parentRewards: parentRewardsRes.data || [],
    })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch rewards' }, { status: 500 })
  }
}

// POST /api/rewards — parent creates a reward for a child
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'parent') {
      return NextResponse.json({ error: 'Only parents can create rewards' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = rewardSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 })

    // Verify family link
    const { data: link } = await supabase
      .from('family_links')
      .select('id')
      .eq('parent_id', user.id)
      .eq('child_id', parsed.data.child_id)
      .single()
    if (!link) return NextResponse.json({ error: 'Not authorized for this child' }, { status: 403 })

    const { data, error } = await supabase
      .from('parent_rewards')
      .insert({
        parent_id: user.id,
        child_id: parsed.data.child_id,
        title: parsed.data.title,
        description: parsed.data.description,
        xp_cost: parsed.data.xp_cost,
        icon: parsed.data.icon,
        redeemed: false,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ reward: data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to create reward' }, { status: 500 })
  }
}

// DELETE /api/rewards?rewardId=xxx — delete a parent reward
export async function DELETE(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const rewardId = searchParams.get('rewardId')
    if (!rewardId) return NextResponse.json({ error: 'rewardId required' }, { status: 400 })

    const { error } = await supabase
      .from('parent_rewards')
      .delete()
      .eq('id', rewardId)
      .eq('parent_id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete reward' }, { status: 500 })
  }
}

// PATCH /api/rewards — child redeems a reward (spends XP)
export async function PATCH(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { rewardId } = body
    if (!rewardId) return NextResponse.json({ error: 'rewardId required' }, { status: 400 })

    // Get reward
    const { data: reward } = await supabase
      .from('parent_rewards')
      .select('*')
      .eq('id', rewardId)
      .eq('child_id', user.id)
      .eq('redeemed', false)
      .single()

    if (!reward) return NextResponse.json({ error: 'Reward not found or already redeemed' }, { status: 404 })

    // Check XP balance
    const { data: rewardsData } = await supabase
      .from('rewards')
      .select('total_xp')
      .eq('user_id', user.id)
      .single()

    if (!rewardsData || rewardsData.total_xp < reward.xp_cost) {
      return NextResponse.json({
        error: `Not enough XP! Need ${reward.xp_cost} XP, you have ${rewardsData?.total_xp || 0}.`,
        insufficient: true,
      }, { status: 402 })
    }

    // Deduct XP and mark redeemed
    const [updateReward, deductXP] = await Promise.all([
      supabase.from('parent_rewards').update({ redeemed: true, redeemed_at: new Date().toISOString() }).eq('id', rewardId),
      supabase.from('rewards').update({ total_xp: rewardsData.total_xp - reward.xp_cost }).eq('user_id', user.id),
    ])

    if (updateReward.error) return NextResponse.json({ error: updateReward.error.message }, { status: 500 })

    return NextResponse.json({ success: true, xpSpent: reward.xp_cost, remainingXP: rewardsData.total_xp - reward.xp_cost })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to redeem reward' }, { status: 500 })
  }
}
