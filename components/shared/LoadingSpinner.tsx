interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  label?: string
  className?: string
}

export function LoadingSpinner({ size = 'md', label, className = '' }: LoadingSpinnerProps) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }
  const borderSizes = { sm: 'border-2', md: 'border-2', lg: 'border-4' }

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className={`${sizes[size]} ${borderSizes[size]} border-purple-500 border-t-transparent rounded-full animate-spin`} />
      {label && <p className="text-sm text-muted-foreground animate-pulse">{label}</p>}
    </div>
  )
}

export function PageLoader({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="text-5xl animate-bounce">✨</div>
        <LoadingSpinner size="lg" />
        <p className="text-muted-foreground text-sm font-medium">{label}</p>
      </div>
    </div>
  )
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-card border rounded-2xl p-4 animate-pulse ${className}`}>
      <div className="h-4 bg-muted rounded w-3/4 mb-3" />
      <div className="h-3 bg-muted rounded w-1/2 mb-2" />
      <div className="h-3 bg-muted rounded w-2/3" />
    </div>
  )
}
