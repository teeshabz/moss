'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { MossIcon } from '@/lib/components/MossIcon'

export default function Error({
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
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8">
      <div className="flex flex-col items-center justify-center max-w-lg text-center">
        <div className="flex items-center gap-2 mb-4">
          <MossIcon color="#2d5016" size={36} />
          <h1
            className="text-4xl font-bold lowercase"
            style={{
              color: '#2d5016',
              fontFamily: 'monospace',
              letterSpacing: '0.1em',
              textRendering: 'geometricPrecision',
            }}
          >
            moss
          </h1>
        </div>
        <p className="text-stone-400 mb-6">something went wrong</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="px-6 py-3 rounded-full bg-[#2d5016] text-white font-medium hover:bg-[#3a6b1e] transition-colors"
          >
            try again
          </button>
          <Link
            href="/"
            className="px-6 py-3 rounded-full border border-stone-600 text-stone-300 font-medium hover:border-stone-500 hover:text-white transition-colors"
          >
            go home
          </Link>
        </div>
      </div>
    </div>
  )
}
