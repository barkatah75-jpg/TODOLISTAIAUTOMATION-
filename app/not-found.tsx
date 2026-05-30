import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-violet-50 to-background dark:from-violet-950/20 p-4">
      <div className="text-center max-w-md">
        <div className="text-8xl mb-6 animate-bounce">🔍</div>
        <h1 className="text-6xl font-black text-violet-600 mb-2">404</h1>
        <h2 className="text-2xl font-bold mb-3">Page Not Found!</h2>
        <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
          Oops! This page went on an adventure without us. Let's go back and find your way!
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/"
            className="btn-kid bg-gradient-to-r from-violet-600 to-purple-600 text-white px-6 py-3 text-sm font-bold">
            🏠 Go Home
          </Link>
          <Link href="/child/dashboard"
            className="btn-kid border-2 border-border px-6 py-3 text-sm font-semibold hover:bg-secondary">
            📊 My Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
