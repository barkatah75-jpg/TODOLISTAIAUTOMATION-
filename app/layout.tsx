import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'react-hot-toast'
import { Providers } from '@/components/shared/Providers'
import '@/styles/globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: { default: 'AIVANA Kids OS', template: '%s | AIVANA Kids OS' },
  description: 'AI-powered platform for kids to learn, grow, and have fun!',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'AIVANA' },
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    title: 'AIVANA Kids OS',
    description: 'AI-powered platform for kids to learn, grow, and have fun!',
    siteName: 'AIVANA Kids OS',
  },
}

export const viewport: Viewport = {
  themeColor: [{ media: '(prefers-color-scheme: light)', color: '#7C3AED' }, { media: '(prefers-color-scheme: dark)', color: '#1e1b4b' }],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <Providers>
            {children}
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 3000,
                style: { borderRadius: '12px', fontSize: '14px' },
              }}
            />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
