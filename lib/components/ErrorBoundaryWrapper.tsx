'use client'

import { ErrorBoundary } from './ErrorBoundary'

/**
 * Client component wrapper for ErrorBoundary
 * Allows ErrorBoundary to be used in server components (like root layout)
 */
export function ErrorBoundaryWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  return <ErrorBoundary>{children}</ErrorBoundary>
}
