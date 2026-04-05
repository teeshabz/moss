'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { UserMeResponse } from '@/lib/types'
import { WEEKLY_POST_LIMIT } from '@/lib/api/weekly-limit'
import { MossIcon } from '@/lib/components/MossIcon'
import { StarIcon } from '@/lib/components/PostHelpers'
import {
  BookIcon,
  NewspaperIcon,
  FilmIcon,
  MusicIcon,
  DiscIcon,
  PodcastIcon,
  LiveIcon,
} from '@/lib/components/SharePageMediaIcons'

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
  {
    label: 'movie',
    value: 'movie',
    color: '#5a7a8c',
    hoverColor: '#5a7a8c',
    icon: 'movie',
  },
  {
    label: 'live',
    value: 'live',
    color: '#6a9a8f',
    hoverColor: '#6a9a8f',
    icon: 'live',
  },
]

// Icon component wrapper - renders appropriate icon based on type
function MediaIcon({ type, color }: { type: string; color: string }) {
  const iconProps = {
    size: 40,
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
      return <PodcastIcon {...iconProps} size={48} />
    case 'live':
      return <LiveIcon {...iconProps} />
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
        // summary=1 skips saved post IDs for faster response on share page
        const response = await fetch('/api/users/me?summary=1')
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

  // Show shell immediately; stars and bottom bar use placeholders until user loads
  const filledStars = user ? Math.min(user.weeklyPostCount, WEEKLY_POST_LIMIT) : 0

  return (
    <div className="min-h-screen bg-black text-white flex flex-col pb-24">
      {/* Arrow - same position as share/[type] */}
      <div className="absolute top-8 left-8 md:top-16 md:left-16">
        <Link
          href="/feed"
          className="text-white text-2xl hover:text-gray-300 transition-colors block"
          aria-label="Back to feed"
        >
          ←
        </Link>
      </div>

      {/* Stars + label - centered in gap between header and media types */}
      <div className="absolute left-1/2 -translate-x-1/2 top-20 md:top-28 flex flex-col items-center justify-center">
        <div className="flex justify-center gap-1 mb-1.5 md:mb-2 items-center">
          {Array.from({ length: WEEKLY_POST_LIMIT }, (_, i) => i).map((index) => (
            <span key={index} className="inline-flex shrink-0" style={{ width: 28, height: 28 }}>
              <StarIcon
                color={index < filledStars ? '#8FA68E' : '#8FA68E4D'}
                size={28}
              />
            </span>
          ))}
        </div>
        <p className="text-center text-base md:text-sm font-normal lowercase whitespace-nowrap text-stone-500">
          what moved you this week?
        </p>
      </div>

      {/* Moss icon - top right (feed), icon only */}
      <div className="absolute top-8 right-8 md:top-16 md:right-16">
        <Link
          href="/feed"
          className="inline-flex items-center justify-center"
          aria-label="moss"
        >
          <MossIcon color="#2d5016" size={26} />
        </Link>
      </div>

      {/* Media Types List - Left aligned, tucked under stars/headline */}
      <div
        className="flex-1 flex flex-col justify-start px-6 pt-[10.5rem] sm:pt-44 md:pt-48 overflow-y-auto min-h-0 pb-24 max-w-2xl mx-auto w-full"
      >
        <div className="space-y-1.5 sm:space-y-2 md:space-y-2.5">
          {mediaTypes.map((type) => {
            const isHovered = hoveredType === type.value
            return (
              <button
                key={type.value}
                onClick={() => handleMediaTypeClick(type.value)}
                onMouseEnter={() => setHoveredType(type.value)}
                onMouseLeave={() => setHoveredType(null)}
                className="relative flex items-center group transition-all"
              >
                {/* Icon - fixed width so label aligns across all media types */}
                <div
                  className={`flex-shrink-0 w-12 mr-6 transition-all duration-200 ${
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
                  className="text-[2.125rem] font-bold transition-all duration-200"
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

      {/* Bottom Bar - Fixed (same as feed) */}
      <div className="fixed bottom-0 left-0 right-0 bg-black z-20">
        <div className="h-px bg-stone-800 flex-shrink-0" />

        <div className="max-w-2xl mx-auto px-6 md:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center flex-shrink-0">
            {user?.user?.username ? (
              <Link
                href={`/profile/${encodeURIComponent(user.user.username)}`}
                className="flex items-center hover:opacity-90 transition-opacity"
                aria-label={`profile: ${user.user.username}`}
              >
                <div
                  className="w-8 h-8 rounded-full flex-shrink-0 ring-2 ring-stone-400"
                  style={{ backgroundColor: user.user.avatar_color }}
                />
              </Link>
            ) : (
              <div className="w-8 h-8 rounded-full bg-stone-800 flex-shrink-0 ring-2 ring-stone-400" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
