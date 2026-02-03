'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type {
  SearchUser,
  UserMeResponse,
  UserSearchResponse,
} from '@/lib/types'
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
    default:
      return null
  }
}

export default function SharePage() {
  const [user, setUser] = useState<UserMeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [hoveredType, setHoveredType] = useState<string | null>(null)
  const [searchExpanded, setSearchExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setSearchLoading(false)
      return
    }

    searchDebounceRef.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const res = await fetch(
          `/api/search/users?q=${encodeURIComponent(searchQuery.trim())}`
        )
        if (res.ok) {
          const data: UserSearchResponse = await res.json()
          setSearchResults(data.users)
        } else {
          setSearchResults([])
        }
      } catch {
        setSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    }, 300)

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current)
      }
    }
  }, [searchQuery])

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
      <div className="absolute left-1/2 -translate-x-1/2 top-24 md:top-32 flex flex-col items-center justify-center">
        <div className="flex justify-center gap-1 mb-2.5 items-center">
          {Array.from({ length: WEEKLY_POST_LIMIT }, (_, i) => i).map((index) => (
            <span key={index} className="inline-flex shrink-0" style={{ width: 28, height: 28 }}>
              <StarIcon
                color={index < filledStars ? '#8FA68E' : '#8FA68E4D'}
                size={28}
              />
            </span>
          ))}
        </div>
        <p
          className="text-xs uppercase tracking-wider font-bold"
          style={{ color: '#8FA68E' }}
        >
          SHARED THIS WEEK
        </p>
      </div>

      {/* Moss logo - same position as share/[type] */}
      <div className="absolute top-8 right-8 md:top-16 md:right-16">
        <Link
          href="/feed"
          className="flex items-center gap-2"
          aria-label="moss"
        >
          <MossIcon color="#2d5016" size={26} />
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
        </Link>
      </div>

      {/* Media Types List - Left aligned, lowered */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 pt-48 md:pt-56 pb-24">
        <div className="space-y-6 md:space-y-8">
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

      {/* Bottom Bar - Fixed (same as feed) */}
      <div className="fixed bottom-0 left-0 right-0 bg-black z-20">
        <div className="h-px bg-stone-800 flex-shrink-0" />

        {searchExpanded ? (
          <div className="flex flex-col w-full px-6 md:px-8 py-4">
            {searchQuery.trim() && (
              <div className="pb-4">
                {searchLoading ? (
                  <div className="text-stone-500 text-sm py-2">searching...</div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-1">
                    {searchResults.slice(0, 3).map((user) => (
                      <Link
                        key={user.id}
                        href={`/profile/${encodeURIComponent(user.username)}`}
                        onMouseDown={(e) => e.preventDefault()}
                        className="flex items-center gap-3 px-2 py-3 rounded-lg hover:bg-stone-800/50 transition-colors group"
                      >
                        <div
                          className="w-8 h-8 rounded-full flex-shrink-0"
                          style={{ backgroundColor: user.avatar_color }}
                        />
                        <span className="md:text-sm text-xs text-stone-200 font-bold lowercase group-hover:text-[#7a9b6f] transition-colors">
                          {user.username}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-stone-500 text-sm py-2">
                    no friends found :/
                  </div>
                )}
              </div>
            )}

            <div className="relative w-full">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="search friends"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-stone-900 text-stone-200 placeholder-stone-500 pl-11 pr-11 py-3 rounded-full outline-none border border-stone-700 focus:border-stone-600 text-sm h-10"
                autoFocus
                onBlur={() => {
                  setTimeout(() => {
                    setSearchExpanded(false)
                    setSearchQuery('')
                    setSearchResults([])
                  }, 150)
                }}
              />
              <button
                onMouseDown={(e) => {
                  e.preventDefault()
                  setSearchExpanded(false)
                  setSearchQuery('')
                  setSearchResults([])
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-400"
                aria-label="Close search"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto px-6 md:px-8 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5 flex-shrink-0 min-w-0">
              {user?.user?.username ? (
                <Link
                  href={`/profile/${encodeURIComponent(user.user.username)}`}
                  className="flex items-center gap-2.5 hover:opacity-90 transition-opacity min-w-0"
                >
                  <div
                    className="w-8 h-8 rounded-full flex-shrink-0 ring-2 ring-stone-400"
                    style={{ backgroundColor: user.user.avatar_color }}
                  />
                  <span className="text-base font-bold lowercase text-stone-200 truncate">
                    {user.user.username}
                  </span>
                </Link>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-full bg-stone-800 flex-shrink-0 ring-2 ring-stone-400" />
                  <span className="text-sm text-stone-500">...</span>
                </>
              )}
            </div>

            <button
              onClick={() => setSearchExpanded(true)}
              className="text-stone-400 hover:text-stone-300 transition-colors"
              aria-label="Search for friends"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
