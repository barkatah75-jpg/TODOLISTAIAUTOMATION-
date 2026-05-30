import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { AIChatInterface } from '@/components/child/AIChatInterface'
import { ChildNavbar } from '@/components/child/ChildNavbar'

export const metadata = { title: 'AIVA AI Helper' }

export default async function AIChatPage() {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [profileRes, subRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('subscriptions').select('ai_enabled, plan').eq('user_id', user.id).single(),
  ])

  const profile = profileRes.data!
  const isAIEnabled = subRes.data?.ai_enabled || subRes.data?.plan !== 'free'

  return (
    <div className="min-h-screen bg-background">
      <ChildNavbar profile={profile} />
      <main className="max-w-2xl mx-auto px-4 pb-24 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-xl">🤖</div>
          <div>
            <h1 className="font-black text-xl">AIVA</h1>
            <p className="text-xs text-muted-foreground">Your AI Learning Companion</p>
          </div>
          {!isAIEnabled && (
            <span className="ml-auto bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-bold px-2 py-1 rounded-full">
              Free: 5 msgs/day
            </span>
          )}
        </div>
        {isAIEnabled ? (
          <AIChatInterface userId={user.id} />
        ) : (
          <div className="space-y-4">
            <AIChatInterface userId={user.id} />
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-3xl p-5 text-white text-center">
              <div className="text-3xl mb-2">🚀</div>
              <h3 className="font-black text-lg mb-1">Upgrade to Pro</h3>
              <p className="text-violet-200 text-sm mb-4">Unlimited AI chat, smart task suggestions & more!</p>
              <a href="/pricing" className="inline-block bg-white text-violet-700 font-bold px-6 py-2 rounded-full text-sm hover:bg-violet-50 transition-colors">
                See Plans →
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
