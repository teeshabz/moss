'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

const validTypes = ['book', 'article', 'movie', 'song', 'album', 'podcast']

export default function ShareTypePage() {
  const params = useParams()
  const router = useRouter()
  const type = params.type as string

  // Redirect to share page if invalid type
  if (!validTypes.includes(type)) {
    router.push('/share')
    return null
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="absolute top-8 left-8 md:top-16 md:left-16">
        <Link
          href="/share"
          className="text-white text-2xl hover:text-gray-300 transition-colors"
          aria-label="Back to share"
        >
          ←
        </Link>
      </div>

      {/* Main content - placeholder */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-4 capitalize">
          Share {type}
        </h1>
        <p className="text-gray-400 text-lg">Coming soon...</p>
      </div>
    </div>
  )
}
