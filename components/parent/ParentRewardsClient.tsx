'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Profile, FamilyLink, ParentReward } from '@/types/database'
import { ParentNavbar } from './ParentNavbar'
import { createParentReward } from '@/lib/actions/parent'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Plus, X, Gift, Trash2, Check, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

const REWARD_ICONS = ['🎮','🍕','🎬','🎠','🏖️','📱','👟','🍦','🎪','🎡','📚','🎵','🧸','🌈','⭐','🏆']

const schema = z.object({
  childId: z.string().uuid(),
  title: z.string().min(1, 'Title required').max(100),
  description: z.string().max(300).optional(),
  xp_cost: z.number().int().min(50).max(10000),
  icon: z.string().default('🎁'),
})
type FormData = z.infer<typeof schema>

interface Props {
  profile: Profile
  familyLinks: (FamilyLink & { child: { id: string; name: string; display_name: string | null } })[]
  rewards: ParentReward[]
}

const QUICK_REWARDS = [
  { title: 'Extra screen time (30 min)', icon: '📱', xp_cost: 200 },
  { title: 'Choose dinner tonight', icon: '🍕', xp_cost: 150 },
  { title: 'Movie night pick', icon: '🎬', xp_cost: 300 },
  { title: 'Skip one chore', icon: '🎉', xp_cost: 100 },
  { title: 'Small toy or book', icon: '🧸', xp_cost: 500 },
  { title: 'Day trip to favourite place', icon: '🏖️', xp_cost: 1000 },
]

export function ParentRewardsClient({ profile, familyLinks, rewards: initialRewards }: Props) {
  const supabase = getSupabaseBrowser()
  const [rewards, setRewards] = useState<ParentReward[]>(initialRewards)
  const [showForm, setShowForm] = useState(false)
  const [selectedIcon, setSelectedIcon] = useState('🎁')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      childId: familyLinks[0]?.child_id || '',
      xp_cost: 200,
      icon: '🎁',
    },
  })

  const onSubmit = async (data: FormData) => {
    setSubmitting(true)
    try {
      const result = await createParentReward({ ...data, icon: selectedIcon })
      if (result.error) throw new Error(result.error)
      toast.success('Reward created! 🎁')
      reset()
      setShowForm(false)
      // Refresh list
      const { data: updated } = await supabase.from('parent_rewards')
        .select('*').eq('parent_id', profile.id).order('created_at', { ascending: false })
      setRewards(updated || [])
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create reward')
    } finally {
      setSubmitting(false)
    }
  }

  const handleQuickReward = async (childId: string, reward: typeof QUICK_REWARDS[0]) => {
    if (!childId) return toast.error('Select a child first')
    setSubmitting(true)
    try {
      const result = await createParentReward({ childId, ...reward })
      if (result.error) throw new Error(result.error)
      toast.success('Quick reward added! ✨')
      const { data: updated } = await supabase.from('parent_rewards')
        .select('*').eq('parent_id', profile.id).order('created_at', { ascending: false })
      setRewards(updated || [])
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (rewardId: string) => {
    setDeleting(rewardId)
    try {
      const { error } = await supabase.from('parent_rewards').delete().eq('id', rewardId).eq('parent_id', profile.id)
      if (error) throw error
      setRewards(prev => prev.filter(r => r.id !== rewardId))
      toast.success('Reward removed')
    } catch {
      toast.error('Failed to delete')
    } finally {
      setDeleting(null)
    }
  }

  const selectedChildId = watch('childId')
  const childName = (id: string) => {
    const link = familyLinks.find(l => l.child_id === id)
    return link?.child.display_name || link?.child.name || 'Child'
  }

  const unredeemedRewards = rewards.filter(r => !r.redeemed)
  const redeemedRewards = rewards.filter(r => r.redeemed)

  return (
    <div className="min-h-screen bg-background">
      <ParentNavbar profile={profile} />
      <main className="max-w-2xl mx-auto px-4 pb-24 pt-4 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">Rewards 🎁</h1>
            <p className="text-sm text-muted-foreground">Create rewards children can unlock with XP</p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className={`btn-kid flex items-center gap-1.5 px-3 py-2 text-xs font-bold ${showForm ? 'bg-secondary' : 'bg-violet-600 text-white'}`}>
            {showForm ? <><X className="h-3.5 w-3.5" /> Cancel</> : <><Plus className="h-3.5 w-3.5" /> Custom</>}
          </button>
        </div>

        {familyLinks.length === 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 text-sm text-amber-700 dark:text-amber-300">
            Link a child first to create rewards for them.
          </div>
        )}

        {/* Custom reward form */}
        <AnimatePresence>
          {showForm && (
            <motion.form initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              onSubmit={handleSubmit(onSubmit)} className="bg-card border rounded-3xl p-5 space-y-4">
              <h3 className="font-bold text-sm">Create Custom Reward</h3>

              <div>
                <label className="text-xs font-medium mb-1 block">For which child?</label>
                <select {...register('childId')} className="w-full py-2.5 px-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                  {familyLinks.map(l => (
                    <option key={l.child_id} value={l.child_id}>{l.child.display_name || l.child.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium mb-1.5 block">Choose Icon</label>
                <div className="flex flex-wrap gap-2">
                  {REWARD_ICONS.map(icon => (
                    <button key={icon} type="button" onClick={() => { setSelectedIcon(icon); setValue('icon', icon) }}
                      className={`text-2xl w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all hover:scale-110 ${selectedIcon === icon ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 scale-110' : 'border-border'}`}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium mb-1 block">Reward Title *</label>
                <input {...register('title')} placeholder="e.g. Extra game time, Pizza night, New book..."
                  className="w-full py-2.5 px-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                {errors.title && <p className="text-destructive text-xs mt-1">{errors.title.message}</p>}
              </div>

              <div>
                <label className="text-xs font-medium mb-1 block">Description (optional)</label>
                <input {...register('description')} placeholder="Any extra details..."
                  className="w-full py-2.5 px-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>

              <div>
                <label className="text-xs font-medium mb-1 block">XP Cost</label>
                <div className="flex gap-2">
                  {[100, 200, 300, 500, 750, 1000].map(cost => (
                    <button key={cost} type="button" onClick={() => setValue('xp_cost', cost, { shouldValidate: true })}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${watch('xp_cost') === cost ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300' : 'border-border hover:border-violet-200'}`}>
                      {cost}
                    </button>
                  ))}
                </div>
                {errors.xp_cost && <p className="text-destructive text-xs mt-1">{errors.xp_cost.message}</p>}
              </div>

              <button type="submit" disabled={submitting}
                className="btn-kid w-full bg-violet-600 text-white py-3 text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Gift className="h-4 w-4" /> Create Reward</>}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Quick rewards */}
        {!showForm && familyLinks.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Quick Add</p>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_REWARDS.map(qr => (
                <button key={qr.title} onClick={() => handleQuickReward(familyLinks[0]?.child_id, qr)}
                  disabled={submitting}
                  className="flex items-center gap-2 bg-card border rounded-2xl p-3 hover:border-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-all text-left disabled:opacity-50">
                  <span className="text-2xl">{qr.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold leading-tight">{qr.title}</p>
                    <span className="xp-badge text-xs">⚡ {qr.xp_cost} XP</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active rewards */}
        {unredeemedRewards.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Active Rewards ({unredeemedRewards.length})
            </p>
            <div className="space-y-3">
              {unredeemedRewards.map((reward, i) => (
                <motion.div key={reward.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                  className="bg-card border-2 border-violet-100 dark:border-violet-800 rounded-3xl p-4 flex items-start gap-3">
                  <div className="text-3xl">{reward.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">{reward.title}</p>
                    {reward.description && <p className="text-xs text-muted-foreground mt-0.5">{reward.description}</p>}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="xp-badge">⚡ {reward.xp_cost} XP</span>
                      <span className="text-xs text-muted-foreground">for {childName(reward.child_id)}</span>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(reward.id)} disabled={deleting === reward.id}
                    className="p-2 rounded-xl text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all">
                    {deleting === reward.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Redeemed rewards */}
        {redeemedRewards.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Redeemed ({redeemedRewards.length})
            </p>
            <div className="space-y-2">
              {redeemedRewards.map(reward => (
                <div key={reward.id} className="flex items-center gap-3 bg-card border rounded-2xl px-4 py-3 opacity-60">
                  <span className="text-2xl grayscale">{reward.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-through text-muted-foreground truncate">{reward.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Redeemed {reward.redeemed_at ? format(new Date(reward.redeemed_at), 'MMM d') : ''}
                    </p>
                  </div>
                  <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}

        {rewards.length === 0 && !showForm && (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">🎁</div>
            <h3 className="font-bold text-lg">No rewards yet</h3>
            <p className="text-muted-foreground text-sm mt-1 max-w-xs mx-auto">
              Create rewards your child can unlock with their earned XP. It makes tasks more exciting!
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
