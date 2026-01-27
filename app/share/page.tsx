'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { UserMeResponse } from '@/lib/types'

interface MediaType {
  label: string
  value: string
  color: string
  hoverColor: string
  icon: string
}

const mediaTypes: MediaType[] = [
  {
    label: 'book',
    value: 'book',
    color: '#C98B6A',
    hoverColor: '#E5A882',
    icon: 'book',
  },
  {
    label: 'article',
    value: 'article',
    color: '#D4A574',
    hoverColor: '#E8B88A',
    icon: 'square',
  },
  {
    label: 'movie',
    value: 'movie',
    color: '#A8C5D0',
    hoverColor: '#C4E0ED',
    icon: 'film',
  },
  {
    label: 'song',
    value: 'song',
    color: '#E5B8A8',
    hoverColor: '#F5D4C4',
    icon: 'song',
  },
  {
    label: 'album',
    value: 'album',
    color: '#C5A8D0',
    hoverColor: '#D9B8E8',
    icon: 'album',
  },
  {
    label: 'podcast',
    value: 'podcast',
    color: '#E8A87C',
    hoverColor: '#F8C89C',
    icon: 'podcast',
  },
]

// Icon components
function MediaIcon({ type, color }: { type: string; color: string }) {
  switch (type) {
    case 'square':
      // Square icon for article
      return (
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          style={{ color }}
        >
          <rect
            x="2"
            y="2"
            width="16"
            height="16"
            stroke="currentColor"
            strokeWidth="2"
            fill="currentColor"
          />
        </svg>
      )
    case 'film':
      // Film reel icon for movie
      return (
        <svg
          width="24"
          height="16"
          viewBox="0 0 24 16"
          fill="none"
          style={{ color }}
        >
          <rect
            x="2"
            y="4"
            width="20"
            height="8"
            rx="1"
            fill="currentColor"
          />
          <circle cx="6" cy="8" r="1.5" fill="#9CA3AF" />
          <circle cx="18" cy="8" r="1.5" fill="#9CA3AF" />
          <rect x="4" y="6" width="16" height="4" fill="#4B5563" />
        </svg>
      )
    default:
      // Simple geometric shapes for others
      return (
        <div
          className="w-4 h-4 rounded"
          style={{ backgroundColor: color }}
        />
      )
  }
}

export default function SharePage() {
  const [user, setUser] = useState<UserMeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [hoveredType, setHoveredType] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await fetch('/api/users/me')
        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login')
            return
          }
          const errorText = await response.text()
          throw new Error(`Failed to load user: ${response.status} ${errorText}`)
        }
        const data: UserMeResponse = await response.json()
        setUser(data)
      } catch (error) {
        console.error('Error loading user:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [router])

  const handleMediaTypeClick = (type: string) => {
    router.push(`/share/${type}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Calculate filled stars (0-3)
  const filledStars = Math.min(user.weeklyPostCount, 3)

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="absolute top-8 left-8 md:top-16 md:left-16">
        <Link
          href="/feed"
          className="text-white text-2xl hover:text-gray-300 transition-colors"
          aria-label="Back to feed"
        >
          ←
        </Link>
      </div>

      <div className="absolute top-8 right-8 md:top-16 md:right-16">
        <div className="flex items-center gap-2">
          <span className="text-green-500 text-xl">*</span>
          <span className="text-green-500 text-lg font-bold">moss</span>
        </div>
      </div>

      {/* Status Indicator - Centered */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 md:top-16 text-center">
        <div className="flex justify-center gap-1 mb-2">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className={`text-lg ${
                index < filledStars
                  ? 'text-green-500'
                  : 'text-green-500/30'
              }`}
            >
              ★
            </span>
          ))}
        </div>
        <p className="text-gray-400 text-xs uppercase tracking-wider">
          SHARED THIS WEEK
        </p>
      </div>

      {/* Media Types List - Centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-24">
        <div className="space-y-6 md:space-y-8">
          {mediaTypes.map((type) => {
            const isHovered = hoveredType === type.value
            return (
              <button
                key={type.value}
                onClick={() => handleMediaTypeClick(type.value)}
                onMouseEnter={() => setHoveredType(type.value)}
                onMouseLeave={() => setHoveredType(null)}
                className="relative flex items-center justify-center group transition-all"
                style={{
                  color: isHovered ? type.hoverColor : type.color,
                }}
              >
                {/* Icon container - always reserves space to keep text aligned */}
                <div className="w-6 flex-shrink-0">
                  {/* Icon - appears on hover */}
                  <div
                    className={`transition-all duration-200 ${
                      isHovered
                        ? 'opacity-100 translate-x-0'
                        : 'opacity-0 -translate-x-4'
                    }`}
                  >
                    <MediaIcon type={type.icon} color={type.color} />
                  </div>
                </div>
                {/* Media Type Text - always starts at same position */}
                <span
                  className="text-3xl md:text-4xl font-bold transition-colors duration-200"
                  style={{
                    color: isHovered ? type.hoverColor : type.color,
                  }}
                >
                  {type.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Footer - Username */}
      <div className="absolute bottom-8 left-8 md:bottom-16 md:left-16">
        <p className="text-gray-400 text-sm">{user.user.username}</p>
      </div>
    </div>
  )
}
