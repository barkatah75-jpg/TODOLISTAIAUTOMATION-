export default function ChildDashboardLoading() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      {/* Navbar skeleton */}
      <div className="h-14 bg-secondary border-b" />

      <div className="max-w-2xl mx-auto px-4 pb-24 pt-4 space-y-5">
        {/* Greeting + XP */}
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="h-3 w-24 bg-secondary rounded-full" />
              <div className="h-7 w-40 bg-secondary rounded-full" />
            </div>
            <div className="h-8 w-24 bg-secondary rounded-full" />
          </div>
          <div className="h-2 w-full bg-secondary rounded-full" />
        </div>

        {/* Progress card */}
        <div className="h-32 bg-secondary rounded-3xl shimmer" />

        {/* Quick actions */}
        <div>
          <div className="h-4 w-28 bg-secondary rounded-full mb-3" />
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 bg-secondary rounded-2xl shimmer" />
            ))}
          </div>
        </div>

        {/* Tasks */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="h-4 w-28 bg-secondary rounded-full" />
            <div className="h-4 w-16 bg-secondary rounded-full" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-secondary rounded-2xl shimmer" />
            ))}
          </div>
        </div>

        {/* Missions */}
        <div>
          <div className="h-4 w-32 bg-secondary rounded-full mb-3" />
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-16 bg-secondary rounded-2xl shimmer" />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom nav skeleton */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-background border-t" />
    </div>
  )
}
