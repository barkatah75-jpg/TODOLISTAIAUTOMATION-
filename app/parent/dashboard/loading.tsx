export default function ParentDashboardLoading() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      <div className="h-14 bg-secondary border-b" />
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-secondary rounded-2xl shimmer" />
          ))}
        </div>
        {/* Child tabs */}
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-9 w-28 bg-secondary rounded-full shimmer" />
          ))}
        </div>
        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="h-52 bg-secondary rounded-2xl shimmer" />
          <div className="h-52 bg-secondary rounded-2xl shimmer" />
        </div>
        {/* Pending */}
        <div className="space-y-2">
          <div className="h-4 w-36 bg-secondary rounded-full" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-secondary rounded-2xl shimmer" />
          ))}
        </div>
      </div>
    </div>
  )
}
