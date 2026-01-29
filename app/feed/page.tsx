'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type {
  FeedResponse,
  PostWithRelations,
  SavedIdsResponse,
  UserMeResponse,
} from '@/lib/types'
import { MossIcon } from '@/lib/components/MossIcon'
import {
  BookIcon,
  NewspaperIcon,
  FilmIcon,
  MusicIcon,
  DiscIcon,
  PodcastIcon,
} from '@/lib/components/MediaIcons'

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'just now'
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours}h ago`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  return `${diffInDays}d ago`
}

function getMediaTypeLabel(mediaType: string): string {
  return mediaType.toLowerCase()
}

function MediaTypeFilledIcon({
  mediaType,
  size = 14,
  className,
  color,
}: {
  mediaType: string
  size?: number
  className?: string
  color?: string
}) {
  const style = { color: color ?? 'currentColor' }
  switch (mediaType.toUpperCase()) {
    case 'BOOK':
      return <BookIcon size={size} className={className} style={style} />
    case 'ARTICLE':
      return <NewspaperIcon size={size} className={className} style={style} />
    case 'MOVIE':
      return <FilmIcon size={size} className={className} style={style} />
    case 'SONG':
      return <MusicIcon size={size} className={className} style={style} />
    case 'ALBUM':
      return <DiscIcon size={size} className={className} style={style} />
    case 'PODCAST':
      return <PodcastIcon size={size} className={className} style={style} />
    default:
      return <MusicIcon size={size} className={className} style={style} />
  }
}

// 12-pointed circular star icon
function StarIcon({ color, size = 16 }: { color: string; size?: number }) {
  // Create 12 points evenly distributed around a circle
  // For a 12-pointed star, we alternate between outer and inner radius
  const points: string[] = []
  const centerX = 12
  const centerY = 12
  const outerRadius = 10
  const innerRadius = 6

  for (let i = 0; i < 12; i++) {
    // Outer point
    const outerAngle = (i * 2 * Math.PI) / 12 - Math.PI / 2 // Start from top
    const outerX = centerX + outerRadius * Math.cos(outerAngle)
    const outerY = centerY + outerRadius * Math.sin(outerAngle)
    points.push(`${outerX},${outerY}`)

    // Inner point (halfway between outer points)
    const innerAngle = ((i + 0.5) * 2 * Math.PI) / 12 - Math.PI / 2
    const innerX = centerX + innerRadius * Math.cos(innerAngle)
    const innerY = centerY + innerRadius * Math.sin(innerAngle)
    points.push(`${innerX},${innerY}`)
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ color }}
    >
      <polygon points={points.join(' ')} fill="currentColor" />
    </svg>
  )
}

function PlusIcon({
  saved,
  size = 14,
  className,
}: {
  saved: boolean
  size?: number
  className?: string
}) {
  const strokeWidth = saved ? 2.5 : 1.5
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

export default function FeedPage() {
  const [posts, setPosts] = useState<PostWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [nextCursor, setNextCursor] = useState<string | undefined>()
  const [hasMore, setHasMore] = useState(false)
  const [shareHovered, setShareHovered] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<UserMeResponse | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const router = useRouter()

  useEffect(() => {
    loadFeed()
  }, [])

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch('/api/users/me')
        if (res.ok) {
          const data: UserMeResponse = await res.json()
          setCurrentUser(data)
        }
      } catch {
        // ignore
      }
    }
    loadUser()
  }, [])

  useEffect(() => {
    async function loadSavedIds() {
      try {
        const res = await fetch('/api/users/me/saved-ids')
        if (!res.ok) return
        const data: SavedIdsResponse = await res.json()
        setSavedIds(new Set(data.postIds))
      } catch {
        // ignore
      }
    }
    loadSavedIds()
  }, [])

  async function loadFeed(cursor?: string) {
    try {
      const url = cursor
        ? `/api/feed?cursor=${encodeURIComponent(cursor)}`
        : '/api/feed'
      const response = await fetch(url)

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Failed to load feed')
      }

      const data: FeedResponse = await response.json()

      if (cursor) {
        // Append to existing posts (pagination)
        setPosts((prev) => [...prev, ...data.items])
      } else {
        // Replace posts (initial load)
        setPosts(data.items)
      }

      setNextCursor(data.nextCursor)
      setHasMore(!!data.nextCursor)
      setError(null) // Clear any previous errors on success
    } catch (error) {
      console.error('Error loading feed:', error)
      setError('Failed to load feed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLoadMore = () => {
    if (nextCursor && !loading) {
      setLoading(true)
      loadFeed(nextCursor)
    }
  }

  const toggleSave = async (postId: string) => {
    const wasSaved = savedIds.has(postId)
    setSavingIds((prev) => {
      const next = new Set(prev)
      next.add(postId)
      return next
    })
    setSavedIds((prev) => {
      const next = new Set(prev)
      if (wasSaved) next.delete(postId)
      else next.add(postId)
      return next
    })

    try {
      const res = await fetch(`/api/posts/${postId}/save`, {
        method: wasSaved ? 'DELETE' : 'POST',
      })
      if (!res.ok) {
        throw new Error('Failed to update save')
      }
    } catch (error) {
      console.error('Error toggling save:', error)
      setSavedIds((prev) => {
        const next = new Set(prev)
        if (wasSaved) next.add(postId)
        else next.delete(postId)
        return next
      })
      setError('Failed to update save. Please try again.')
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev)
        next.delete(postId)
        return next
      })
    }
  }

  if (loading && posts.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-stone-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 bg-black/90 backdrop-blur-sm z-10 mb-8">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link href="/feed" className="flex items-center gap-2">
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
          </Link>

          {/* Share Button */}
          <Link
            href="/share"
            className="flex items-center gap-2 transition-colors"
            style={{ color: shareHovered ? '#8fb084' : '#7a9b6f' }}
            onMouseEnter={() => setShareHovered(true)}
            onMouseLeave={() => setShareHovered(false)}
          >
            <StarIcon color={shareHovered ? '#8fb084' : '#7a9b6f'} size={18} />
            <span className="text-2xl font-bold">share</span>
          </Link>
        </div>
      </div>

      {/* Feed Content */}
      <div className="max-w-2xl mx-auto px-6 md:px-8 pb-20">
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded text-red-400 text-sm">
            <p>{error}</p>
            <button
              onClick={() => {
                setError(null)
                loadFeed()
              }}
              className="mt-2 text-red-300 hover:text-red-200 underline"
            >
              Try again
            </button>
          </div>
        )}
        {posts.length === 0 && !loading ? (
          <div className="text-center py-16">
            <p className="text-stone-500 text-lg mb-4">No posts yet</p>
            <Link
              href="/share"
              className="text-[#7a9b6f] hover:text-[#8fb084] transition-colors"
            >
              Share something →
            </Link>
          </div>
        ) : (
          <>
            <div>
              {posts.map((post, index) => (
                <div key={post.id}>
                  {/* Post Content */}
                  <div>
                    {/* Header Row - Avatar + Metadata + Diamond */}
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="md:w-8 md:h-8 w-6 h-6 rounded-full flex-shrink-0"
                        style={{ backgroundColor: post.user.avatar_color }}
                      />
                      <div className="flex items-baseline gap-2 flex-1">
                        <Link
                          href={`/profile/${encodeURIComponent(post.user.username)}`}
                          className="md:text-sm text-xs text-stone-200 font-bold lowercase hover:text-[#7a9b6f] transition-colors"
                        >
                          {post.user.username}
                        </Link>
                        <span className="text-stone-700">·</span>
                        <span className="md:text-sm text-xs text-stone-500">
                          {getMediaTypeLabel(post.media_item.media_type)}
                        </span>
                        <span className="text-stone-700">·</span>
                        <span className="md:text-sm text-xs text-stone-600">
                          {formatTimeAgo(post.created_at)}
                        </span>
                        {/* Plus icon (thin when unsaved, bold when saved) */}
                        {currentUser?.user?.id !== post.user.id && (
                          <button
                            onClick={() => toggleSave(post.id)}
                            disabled={savingIds.has(post.id)}
                            aria-pressed={savedIds.has(post.id)}
                            aria-label={savedIds.has(post.id) ? 'Unsave post' : 'Save post'}
                            className={`ml-auto transition-colors duration-200 flex-shrink-0 ${
                              savedIds.has(post.id)
                                ? 'text-[#7a9b6f]'
                                : 'text-stone-600 hover:text-[#7a9b6f]'
                            } ${savingIds.has(post.id) ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            <PlusIcon saved={savedIds.has(post.id)} size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Content Row - Text + Thumbnail */}
                    <div className="flex gap-4 md:pl-11 pl-9">
                      {/* Left: Text content */}
                      <div className="flex-1">
                        {/* Title and Creator */}
                        <div className="md:text-base text-sm text-stone-200 leading-relaxed mb-1 font-medium">
                          <span className="font-bold">{post.media_item.title}</span>
                          {post.media_item.creator && (
                            <span className="text-stone-500 ml-1">
                              by {post.media_item.creator}
                            </span>
                          )}
                        </div>

                        {/* Note */}
                        {post.note && (
                          <p className="md:text-sm text-xs text-stone-400 leading-relaxed line-clamp-3 mt-1 font-medium">
                            {post.note}
                          </p>
                        )}
                      </div>

                      {/* Right: Large media-type icon (sharer's profile color) */}
                      <div className="flex-shrink-0 mt-0.5 flex items-center justify-center">
                        <MediaTypeFilledIcon
                          mediaType={post.media_item.media_type}
                          color={post.user.avatar_color}
                          size={48}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Thin divider - between posts (not before first) */}
                  {index < posts.length - 1 && (
                    <div className="mt-6 mb-6 pl-9 md:pl-11">
                      <div className="h-px bg-stone-800" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="text-center py-8">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="text-[#7a9b6f] hover:text-[#8fb084] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Loading...' : 'Load more →'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer - Username (links to profile) */}
      {currentUser?.user?.username && (
        <div className="fixed bottom-8 left-8 md:bottom-16 md:left-16">
          <Link
            href={`/profile/${encodeURIComponent(currentUser.user.username)}`}
            className="text-stone-500 text-sm hover:text-[#7a9b6f] transition-colors"
          >
            {currentUser.user.username}
          </Link>
        </div>
      )}
    </div>
  )
}
