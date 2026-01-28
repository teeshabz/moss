'use client'

import React, { Component, ReactNode } from 'react'
import Link from 'next/link'
import { MossIcon } from './MossIcon'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Error Boundary component to catch React errors and display a fallback UI
 * Must be a class component (React doesn't support error boundaries with hooks)
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console for debugging
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI matching app design
      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
          <div className="max-w-md w-full text-center">
            {/* Logo */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <MossIcon color="#2d5016" size={32} />
              <h1 className="text-3xl font-bold" style={{ color: '#2d5016' }}>
                moss
              </h1>
            </div>

            {/* Error Message */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-200 mb-2">
                Something went wrong
              </h2>
              <p className="text-gray-400 text-sm mb-4">
                We encountered an unexpected error. Please try refreshing the page.
              </p>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 text-left">
                  <summary className="text-xs text-gray-500 cursor-pointer mb-2">
                    Error details (dev only)
                  </summary>
                  <pre className="text-xs text-red-400 bg-gray-900 p-3 rounded overflow-auto max-h-40">
                    {this.state.error.toString()}
                    {this.state.error.stack && (
                      <div className="mt-2 text-gray-500">
                        {this.state.error.stack}
                      </div>
                    )}
                  </pre>
                </details>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 rounded font-medium text-white transition-all"
                style={{
                  backgroundColor: '#2d5016',
                  boxShadow: '0 4px 6px -1px rgba(45, 80, 22, 0.4)',
                }}
              >
                Refresh Page
              </button>
              <Link
                href="/feed"
                className="text-gray-400 hover:text-gray-300 text-sm transition-colors"
              >
                Go to Feed →
              </Link>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
