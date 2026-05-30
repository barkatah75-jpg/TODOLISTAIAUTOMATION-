import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AIVANA Kids OS — AI-Powered Learning Platform for Kids',
  description: 'Help your children learn, grow, and have fun with AI-powered tasks, gamification, and real-time progress tracking.',
}

const FEATURES = [
  { emoji: '🤖', title: 'AI Homework Helper', desc: 'AIVA guides kids through difficult topics with hints, not answers' },
  { emoji: '🏆', title: 'XP & Gamification', desc: 'Earn XP, level up, maintain streaks, and unlock real rewards' },
  { emoji: '📊', title: 'Parent Dashboard', desc: 'Assign tasks, approve rewards, view analytics in real-time' },
  { emoji: '🎨', title: 'Drawing Studio', desc: 'Creative canvas that saves artwork to cloud automatically' },
  { emoji: '🔍', title: 'OCR Scanner', desc: 'Snap homework sheets — AI extracts and creates tasks automatically' },
  { emoji: '📄', title: 'PDF Compressor', desc: 'Real PDF compression with instant download, no watermarks' },
  { emoji: '🎤', title: 'Voice Input', desc: 'Add tasks hands-free in English and Hindi' },
  { emoji: '🔔', title: 'Smart Reminders', desc: 'AI-generated reminders that keep kids on track without nagging' },
]

const PLANS = [
  { name: 'Free', price: '₹0', color: 'border-border', cta: 'Start Free', href: '/auth/register', features: ['1 child', '10 tasks/day', 'Drawing & Files', 'Basic gamification'] },
  { name: 'Pro', price: '₹299/mo', color: 'border-violet-500', cta: 'Start Pro', href: '/auth/register?plan=pro', popular: true, features: ['1 child', 'Unlimited tasks', 'AIVA AI Helper', 'Smart reminders', 'Parent dashboard'] },
  { name: 'Family', price: '₹499/mo', color: 'border-pink-400', cta: 'Start Family', href: '/auth/register?plan=family', features: ['Up to 5 children', 'Everything in Pro', 'Family leaderboard', 'Advanced analytics'] },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black gradient-text">AIVANA</span>
            <span className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300 rounded-full px-2 py-0.5 font-bold hidden sm:inline">Kids OS</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
            <Link href="/auth/login" className="text-sm font-semibold hover:text-violet-600 transition-colors">Sign In</Link>
            <Link href="/auth/register" className="btn-kid bg-violet-600 text-white px-4 py-2 text-sm font-bold">Get Started Free</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-violet-50 via-purple-50/50 to-background dark:from-violet-950/30 dark:via-purple-950/20 dark:to-background pt-20 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full px-4 py-1.5 text-sm font-semibold">
            🚀 AI-Powered Learning Platform for Kids
          </div>

          <h1 className="text-5xl md:text-7xl font-black leading-tight">
            <span className="gradient-text">AIVANA</span>
            <br />
            <span className="text-foreground">Kids OS</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Transform homework and chores into an adventure. Real AI homework help, gamified tasks, parent oversight — everything your family needs.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth/register" className="btn-kid bg-gradient-to-r from-violet-600 to-purple-600 text-white px-8 py-4 text-base font-bold hover:from-violet-700 hover:to-purple-700">
              Start Free Today 🚀
            </Link>
            <Link href="/pricing" className="btn-kid border-2 border-border px-8 py-4 text-base font-semibold hover:bg-secondary">
              View Plans →
            </Link>
          </div>

          <p className="text-xs text-muted-foreground">Free plan forever · No credit card · COPPA compliant 🔒</p>
        </div>

        {/* Floating emoji decorations */}
        <div className="absolute top-10 left-10 text-4xl opacity-20 animate-bounce">🌟</div>
        <div className="absolute top-20 right-16 text-3xl opacity-20 animate-pulse">⚡</div>
        <div className="absolute bottom-10 left-20 text-2xl opacity-20 animate-bounce delay-150">🎨</div>
        <div className="absolute bottom-20 right-10 text-4xl opacity-20 animate-pulse delay-300">🏆</div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black mb-3">Everything kids need to thrive 🌱</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Real features, not demos. Every tool is production-ready and actually works.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f, i) => (
              <div key={f.title} className="bg-card border rounded-3xl p-5 hover:shadow-md transition-all hover:-translate-y-0.5">
                <div className="text-4xl mb-3">{f.emoji}</div>
                <h3 className="font-bold text-sm mb-1">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-gradient-to-b from-violet-50/50 to-background dark:from-violet-950/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-black mb-12">Get started in 3 steps</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Parent Signs Up', desc: 'Create your parent account with email or Google in 30 seconds', emoji: '👨‍👩‍👧' },
              { step: '2', title: 'Child Registers', desc: 'Kid creates their account, picks an avatar, and links to parent', emoji: '🧒' },
              { step: '3', title: 'Start Learning!', desc: 'Assign tasks, earn XP, chat with AIVA, and celebrate wins together', emoji: '🚀' },
            ].map(s => (
              <div key={s.step} className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white font-black text-xl flex items-center justify-center mx-auto">
                  {s.step}
                </div>
                <div className="text-4xl">{s.emoji}</div>
                <h3 className="font-bold">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black mb-2">Simple pricing 💰</h2>
            <p className="text-muted-foreground">No hidden fees. Cancel anytime.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {PLANS.map(plan => (
              <div key={plan.name} className={`relative bg-card border-2 ${plan.color} rounded-3xl p-6 ${plan.popular ? 'scale-105 shadow-kid-lg' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-violet-600 text-white text-xs font-bold px-4 py-1 rounded-full">✨ Most Popular</span>
                  </div>
                )}
                <h3 className="font-black text-xl mb-1">{plan.name}</h3>
                <p className="text-2xl font-black mb-4">{plan.price}</p>
                <ul className="space-y-2 mb-5">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <span className="text-green-500">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href={plan.href}
                  className={`btn-kid block text-center py-3 text-sm font-bold ${plan.popular ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white' : 'border-2 border-border hover:bg-secondary'}`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-10 px-4 bg-background">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-black text-lg gradient-text">AIVANA Kids OS</p>
            <p className="text-xs text-muted-foreground mt-0.5">© 2025 AIVANA. Made with ❤️ for children everywhere.</p>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
            <a href="mailto:support@aivana.app" className="hover:text-foreground">Support</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
