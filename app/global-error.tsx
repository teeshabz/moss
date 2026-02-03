'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#000', color: '#fff', fontFamily: 'system-ui, sans-serif', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: '#78716c', marginBottom: '1.5rem' }}>something went wrong</p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '9999px',
              background: '#2d5016',
              color: '#fff',
              border: 'none',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            try again
          </button>
        </div>
      </body>
    </html>
  )
}
