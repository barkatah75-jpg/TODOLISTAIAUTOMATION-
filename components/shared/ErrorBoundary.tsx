'use client'

import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] gap-4 p-6 text-center">
          <div className="text-5xl">😵</div>
          <div>
            <h2 className="font-bold text-lg text-foreground mb-1">Something went wrong</h2>
            <p className="text-sm text-muted-foreground mb-3">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-purple-500 text-white rounded-xl text-sm font-semibold hover:bg-purple-600 transition"
            >
              🔄 Try Again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
