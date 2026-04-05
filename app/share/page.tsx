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
import { SHARE_MEDIA_ROW } from '@/lib/share-media-config'

const mediaTypes = SHARE_MEDIA_ROW.map((row) => ({
  label: row.mediaType.toLowerCase(),
  value: row.mediaType.toLowerCase(),
  color: row.color,
  hoverColor: row.color,
  icon: row.mediaType.toLowerCase(),
}))

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
  const [aboutOpen, setAboutOpen] = useState(false)
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
      }
    }

    loadUser()
  }, [router])

  const handleMediaTypeClick = (type: string) => {
    router.push(`/share/${type}`)
  }

  // Stars use count from user when loaded; avatar placeholder until then
  const filledStars = user ? Math.min(user.weeklyPostCount, WEEKLY_POST_LIMIT) : 0

  return (
    <div className="min-h-screen bg-black text-white flex flex-col pb-32">
      {/* Header - same row as home (feed): moss left, avatar right */}
      <div className="sticky top-0 bg-black/90 backdrop-blur-sm z-10">
        <div className="max-w-2xl mx-auto px-6 md:px-8">
          <div className="pt-5 pb-3 flex items-start justify-between gap-4">
            <Link
              href="/feed"
              className="flex items-center gap-2 flex-shrink-0 min-w-0"
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
            <div className="flex shrink-0">
              {user?.user?.username ? (
                <Link
                  href={`/profile/${encodeURIComponent(user.user.username)}`}
                  className="flex items-start hover:opacity-90 transition-opacity"
                  aria-label={`profile: ${user.user.username}`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex-shrink-0 ring-2 ring-stone-400 relative"
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

      <div className="max-w-2xl mx-auto w-full px-6 md:px-8 flex flex-col flex-1 min-h-0">
        {/* Stars + label */}
        <div className="flex flex-col items-center justify-center pt-6 pb-8">
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

        {/* Media types */}
        <div className="flex-1 flex flex-col justify-start overflow-y-auto min-h-0 pb-4">
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
      </div>

      {/* Footer - about only, bottom left */}
      <div className="fixed bottom-0 left-0 right-0 bg-black z-20">
        <div className="h-px bg-stone-800 flex-shrink-0" />
        <div className="max-w-2xl mx-auto px-6 md:px-8 py-6 flex items-center justify-start">
          <button
            onClick={() => setAboutOpen(true)}
            type="button"
            className="text-stone-500 text-xs font-medium hover:text-stone-400 transition-colors lowercase"
          >
            about
          </button>
        </div>
      </div>

      {aboutOpen && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setAboutOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-about-title"
        >
          <div
            className="bg-black border border-stone-800 rounded-lg max-w-[420px] w-full p-8 flex flex-col items-center text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-6" id="share-about-title">
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
            </div>
            <p className="text-stone-400 text-sm leading-relaxed lowercase">
              moss is a place to connect through the media that moves you. to encourage sharing the things that really resonate, you can share up to 3 things per week.
            </p>
            <button
              onClick={() => setAboutOpen(false)}
              type="button"
              className="mt-6 text-white text-xs font-medium hover:text-stone-300 transition-colors lowercase"
            >
              close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
