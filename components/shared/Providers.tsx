'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { PWAInstallBanner } from './PWAInstallBanner'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60 * 1000, refetchOnWindowFocus: false },
  },
})

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Register service worker for PWA
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(console.error)
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <PWAInstallBanner />
    </QueryClientProvider>
  )
}
