'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { UserMeResponse } from '@/lib/types'
import { MossIcon } from '@/lib/components/MossIcon'
import { StarIcon } from '@/lib/components/PostHelpers'
import {
  BookIcon,
  NewspaperIcon,
  FilmIcon,
  MusicIcon,
  DiscIcon,
  PodcastIcon,
} from '@/lib/components/MediaIcons'

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
    color: '#c17a6f',
    hoverColor: '#c17a6f',
    icon: 'book',
  },
  {
    label: 'article',
    value: 'article',
    color: '#8b5a3c',
    hoverColor: '#8b5a3c',
    icon: 'article',
  },
  {
    label: 'movie',
    value: 'movie',
    color: '#5a7a8c',
    hoverColor: '#5a7a8c',
    icon: 'movie',
  },
  {
    label: 'song',
    value: 'song',
    color: '#b88b9d',
    hoverColor: '#b88b9d',
    icon: 'song',
  },
  {
    label: 'album',
    value: 'album',
    color: '#7d5a8f',
    hoverColor: '#7d5a8f',
    icon: 'album',
  },
  {
    label: 'podcast',
    value: 'podcast',
    color: '#e07a5f',
    hoverColor: '#e07a5f',
    icon: 'podcast',
  },
]

// Icon component wrapper - renders appropriate icon based on type
function MediaIcon({ type, color }: { type: string; color: string }) {
  const iconProps = {
    size: 32,
    className: '',
    style: { color } as React.CSSProperties,
  }

  switch (type) {
    case 'book':
      return <BookIcon {...iconProps} />
    case 'article':
      return <NewspaperIcon {...iconProps} />
    case 'movie':
      return <FilmIcon {...iconProps} />
    case 'song':
      return <MusicIcon {...iconProps} />
    case 'album':
      return <DiscIcon {...iconProps} />
    case 'podcast':
      return <PodcastIcon {...iconProps} />
    default:
      return null
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
          <MossIcon color="#2d5016" size={24} />
          <span
            className="text-2xl font-bold lowercase"
            style={{
              color: '#2d5016',
              fontFamily: 'monospace',
              letterSpacing: '0.1em',
              textRendering: 'geometricPrecision',
            }}
          >
            moss
          </span>
        </div>
      </div>

      {/* Status Indicator - Centered */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 md:top-16 text-center">
        <div className="flex justify-center gap-1 mb-2">
          {[0, 1, 2].map((index) => (
            <span key={index}>
              <StarIcon
                color={index < filledStars ? '#8FA68E' : '#8FA68E4D'}
                size={28}
              />
            </span>
          ))}
        </div>
        <p className="text-gray-500 text-[10px] uppercase tracking-wider">
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
              >
                {/* Icon - only visible on hover */}
                <div
                  className={`flex-shrink-0 mr-6 transition-all duration-200 ${
                    isHovered
                      ? 'opacity-100 translate-x-0'
                      : 'opacity-0 -translate-x-4'
                  }`}
                >
                  <MediaIcon
                    type={type.icon}
                    color={type.color}
                  />
                </div>
                {/* Media Type Text - becomes more faded on hover */}
                <span
                  className="text-3xl md:text-4xl font-bold transition-all duration-200"
                  style={{
                    color: type.color,
                    opacity: isHovered ? 0.5 : 1,
                  }}
                >
                  {type.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Footer - Username (links to profile) */}
      <div className="absolute bottom-8 left-8 md:bottom-16 md:left-16">
        <Link
          href={`/profile/${encodeURIComponent(user.user.username)}`}
          className="text-gray-400 text-sm hover:text-[#7a9b6f] transition-colors"
        >
          {user.user.username}
        </Link>
      </div>
    </div>
  )
}
