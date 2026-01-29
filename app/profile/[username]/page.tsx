'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type {
  FeedResponse,
  ProfileResponse,
  PostWithRelations,
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
  if (diffInSeconds < 60) return 'just now'
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h ago`
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

function StarIcon({ color, size = 16 }: { color: string; size?: number }) {
  const points: string[] = []
  const centerX = 12
  const centerY = 12
  const outerRadius = 10
  const innerRadius = 6
  for (let i = 0; i < 12; i++) {
    const outerAngle = (i * 2 * Math.PI) / 12 - Math.PI / 2
    points.push(
      `${centerX + outerRadius * Math.cos(outerAngle)},${centerY + outerRadius * Math.sin(outerAngle)}`
    )
    const innerAngle = ((i + 0.5) * 2 * Math.PI) / 12 - Math.PI / 2
    points.push(
      `${centerX + innerRadius * Math.cos(innerAngle)},${centerY + innerRadius * Math.sin(innerAngle)}`
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ color }}>
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

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const username = params.username as string
  const [profile, setProfile] = useState<ProfileResponse | null>(null)
  const [currentUser, setCurrentUser] = useState<UserMeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [activeTab, setActiveTab] = useState<'shared' | 'saved'>('shared')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [savedItems, setSavedItems] = useState<PostWithRelations[]>([])
  const [savedNextCursor, setSavedNextCursor] = useState<string | undefined>()
  const [savedLoading, setSavedLoading] = useState(false)
  const [savedLoadingMore, setSavedLoadingMore] = useState(false)
  const [savedError, setSavedError] = useState<string | null>(null)
  const [savedLoaded, setSavedLoaded] = useState(false)
  const [unsavingId, setUnsavingId] = useState<string | null>(null)
  const [shareHovered, setShareHovered] = useState(false)

  const isOwnProfile =
    currentUser?.user?.username?.toLowerCase() === username?.toLowerCase()

  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const res = await fetch('/api/users/me')
        if (res.ok) {
          const data: UserMeResponse = await res.json()
          setCurrentUser(data)
        }
      } catch {
        // not required for viewing profile
      }
    }
    loadCurrentUser()
  }, [])

  async function loadProfile(cursor?: string) {
    if (!username) return
    try {
      if (!cursor) setLoading(true)
      else setLoadingMore(true)
      setError(null)
      setNotFound(false)
      const url = cursor
        ? `/api/users/${encodeURIComponent(username)}?cursor=${encodeURIComponent(cursor)}`
        : `/api/users/${encodeURIComponent(username)}`
      const res = await fetch(url)
      if (!res.ok) {
        if (res.status === 404) {
          setNotFound(true)
          setProfile(null)
        } else {
          setError('Failed to load profile')
        }
        return
      }
      const data: ProfileResponse = await res.json()
      if (cursor && profile) {
        setProfile({
          ...profile,
          items: [...profile.items, ...data.items],
          nextCursor: data.nextCursor,
        })
      } else {
        setProfile(data)
      }
    } catch {
      setError('Failed to load profile')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  async function loadSaved(cursor?: string) {
    if (!isOwnProfile) return
    try {
      if (!cursor) setSavedLoading(true)
      else setSavedLoadingMore(true)
      setSavedError(null)
      const url = cursor
        ? `/api/users/me/saved?cursor=${encodeURIComponent(cursor)}`
        : '/api/users/me/saved'
      const res = await fetch(url)
      if (!res.ok) {
        if (res.status === 401) {
          setSavedError('Please log in to view saved items')
        } else {
          setSavedError('Failed to load saved items')
        }
        return
      }
      const data: FeedResponse = await res.json()
      if (cursor) {
        setSavedItems((prev) => [...prev, ...data.items])
      } else {
        setSavedItems(data.items)
        setSavedLoaded(true)
      }
      setSavedNextCursor(data.nextCursor)
    } catch {
      setSavedError('Failed to load saved items')
    } finally {
      if (!cursor) setSavedLoaded(true)
      setSavedLoading(false)
      setSavedLoadingMore(false)
    }
  }

  useEffect(() => {
    if (username) loadProfile()
  }, [username])

  useEffect(() => {
    if (!isOwnProfile && activeTab === 'saved') {
      setActiveTab('shared')
    }
  }, [activeTab, isOwnProfile])

  useEffect(() => {
    if (activeTab === 'saved' && isOwnProfile && !savedLoaded && !savedLoading) {
      loadSaved()
    }
  }, [activeTab, isOwnProfile, savedLoaded, savedLoading])

  async function handleDeletePost(postId: string) {
    if (!confirm('Delete this post?')) return
    setDeletingId(postId)
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' })
      if (res.ok && profile) {
        setProfile({
          ...profile,
          items: profile.items.filter((p) => p.id !== postId),
          postCount: Math.max(0, profile.postCount - 1),
        })
      } else {
        setError('Failed to delete post')
      }
    } catch {
      setError('Failed to delete post')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleUnsave(postId: string) {
    setUnsavingId(postId)
    try {
      const res = await fetch(`/api/posts/${postId}/save`, { method: 'DELETE' })
      if (res.ok) {
        setSavedItems((prev) => prev.filter((item) => item.id !== postId))
      } else {
        setSavedError('Failed to remove saved item')
      }
    } catch {
      setSavedError('Failed to remove saved item')
    } finally {
      setUnsavingId(null)
    }
  }

  if (loading && !profile) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-stone-500">Loading...</div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
        <p className="text-stone-500 text-lg mb-4">User not found</p>
        <Link href="/feed" className="text-[#7a9b6f] hover:text-[#8fb084]">
          Back to feed
        </Link>
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
        <p className="text-red-400 text-lg mb-4">{error}</p>
        <button
          onClick={() => loadProfile()}
          className="text-[#7a9b6f] hover:text-[#8fb084]"
        >
          Try again
        </button>
      </div>
    )
  }

  if (!profile) return null

  const { user, items, nextCursor } = profile

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header: back + logo */}
      <div className="sticky top-0 bg-black/90 backdrop-blur-sm z-10 border-b border-stone-800">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <Link href="/feed" className="text-white text-2xl hover:text-gray-300">
            ←
          </Link>
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
          <div className="w-8" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-8 py-8">
        {/* Profile header: avatar, username, settings */}
        <div className="flex items-center gap-4 mb-8">
          <div
            className="w-16 h-16 md:w-20 md:h-20 rounded-full flex-shrink-0"
            style={{ backgroundColor: user.avatar_color }}
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold lowercase truncate">
              {user.username}
            </h1>
          </div>
          <Link
            href="/share"
            className="flex items-center gap-2 transition-colors"
            style={{ color: shareHovered ? '#8fb084' : '#7a9b6f' }}
            onMouseEnter={() => setShareHovered(true)}
            onMouseLeave={() => setShareHovered(false)}
            aria-label="Share"
          >
            <StarIcon color={shareHovered ? '#8fb084' : '#7a9b6f'} size={18} />
            <span className="text-2xl font-bold">share</span>
          </Link>
        </div>

        {/* Tabs */}
        <div className="border-b border-stone-700 mb-6">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('shared')}
              className={`pb-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${
                activeTab === 'shared'
                  ? 'text-white border-[#7a9b6f]'
                  : 'text-stone-500 border-transparent hover:text-stone-400'
              }`}
            >
              Shared
            </button>
            {isOwnProfile && (
              <button
                onClick={() => setActiveTab('saved')}
                className={`pb-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${
                  activeTab === 'saved'
                    ? 'text-white border-[#7a9b6f]'
                    : 'text-stone-500 border-transparent hover:text-stone-400'
                }`}
              >
                Saved
              </button>
            )}
          </div>
        </div>

        {activeTab === 'shared' && (
          <>
            {error && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded text-red-400 text-sm">
                {error}
                <button
                  onClick={() => setError(null)}
                  className="ml-2 underline"
                >
                  Dismiss
                </button>
              </div>
            )}
            {items.length === 0 && !loading ? (
              <div className="text-center py-12">
                <p className="text-stone-500">No shared items yet</p>
              </div>
            ) : (
              <div>
                {items.map((post: PostWithRelations, index) => (
                  <div key={post.id}>
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="md:w-8 md:h-8 w-6 h-6 rounded-full flex-shrink-0"
                        style={{ backgroundColor: post.user.avatar_color }}
                      />
                      <div className="flex items-baseline gap-2 flex-1 flex-wrap">
                        <span className="md:text-sm text-xs text-stone-200 font-bold lowercase">
                          {post.user.username}
                        </span>
                        <span className="text-stone-700">·</span>
                        <span className="md:text-sm text-xs text-stone-500">
                          {getMediaTypeLabel(post.media_item.media_type)}
                        </span>
                        <span className="text-stone-700">·</span>
                        <span className="md:text-sm text-xs text-stone-600">
                          {formatTimeAgo(post.created_at)}
                        </span>
                        {isOwnProfile && (
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            disabled={deletingId === post.id}
                            className="ml-auto text-stone-500 hover:text-red-400 transition-colors disabled:opacity-50"
                            aria-label="Delete post"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-4 md:pl-11 pl-9">
                      <div className="flex-1 min-w-0">
                        <div className="md:text-base text-sm text-stone-200 leading-relaxed mb-1 font-medium">
                          <span className="font-bold">
                            {post.media_item.title}
                          </span>
                          {post.media_item.creator && (
                            <span className="text-stone-500 ml-1">
                              by {post.media_item.creator}
                            </span>
                          )}
                        </div>
                        {post.note && (
                          <p className="md:text-sm text-xs text-stone-400 leading-relaxed line-clamp-3 mt-1 font-medium">
                            {post.note}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0 mt-0.5 flex items-center justify-center">
                        <MediaTypeFilledIcon
                          mediaType={post.media_item.media_type}
                          color={post.user.avatar_color}
                          size={48}
                        />
                      </div>
                    </div>
                    {index < items.length - 1 && (
                      <div className="mt-6 mb-6 pl-9 md:pl-11">
                        <div className="h-px bg-stone-800" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {nextCursor && (
              <div className="text-center py-8">
                <button
                  onClick={() => loadProfile(nextCursor)}
                  disabled={loadingMore}
                  className="text-[#7a9b6f] hover:text-[#8fb084] disabled:opacity-50"
                >
                  {loadingMore ? 'Loading...' : 'Load more →'}
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === 'saved' && isOwnProfile && (
          <>
            {savedError && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded text-red-400 text-sm">
                {savedError}
                <button
                  onClick={() => setSavedError(null)}
                  className="ml-2 underline"
                >
                  Dismiss
                </button>
              </div>
            )}
            {savedLoading && savedItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-stone-500">Loading saved items...</p>
              </div>
            ) : savedItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-stone-500">No saved items yet</p>
              </div>
            ) : (
              <div>
                {savedItems.map((post, index) => (
                  <div key={post.id}>
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="md:w-8 md:h-8 w-6 h-6 rounded-full flex-shrink-0"
                        style={{ backgroundColor: post.user.avatar_color }}
                      />
                      <div className="flex items-baseline gap-2 flex-1 flex-wrap">
                        <span className="md:text-sm text-xs text-stone-200 font-bold lowercase">
                          {post.user.username}
                        </span>
                        <span className="text-stone-700">·</span>
                        <span className="md:text-sm text-xs text-stone-500">
                          {getMediaTypeLabel(post.media_item.media_type)}
                        </span>
                        <span className="text-stone-700">·</span>
                        <span className="md:text-sm text-xs text-stone-600">
                          {formatTimeAgo(post.created_at)}
                        </span>
                        <button
                          onClick={() => handleUnsave(post.id)}
                          disabled={unsavingId === post.id}
                          className={`ml-auto transition-colors ${
                            unsavingId === post.id
                              ? 'text-stone-500 opacity-60 cursor-not-allowed'
                              : 'text-[#7a9b6f] hover:text-[#8fb084]'
                          }`}
                          aria-label="Unsave post"
                        >
                          <PlusIcon saved={true} size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-4 md:pl-11 pl-9">
                      <div className="flex-1 min-w-0">
                        <div className="md:text-base text-sm text-stone-200 leading-relaxed mb-1 font-medium">
                          <span className="font-bold">
                            {post.media_item.title}
                          </span>
                          {post.media_item.creator && (
                            <span className="text-stone-500 ml-1">
                              by {post.media_item.creator}
                            </span>
                          )}
                        </div>
                        {post.note && (
                          <p className="md:text-sm text-xs text-stone-400 leading-relaxed line-clamp-3 mt-1 font-medium">
                            {post.note}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0 mt-0.5 flex items-center justify-center">
                        <MediaTypeFilledIcon
                          mediaType={post.media_item.media_type}
                          color={post.user.avatar_color}
                          size={48}
                        />
                      </div>
                    </div>
                    {index < savedItems.length - 1 && (
                      <div className="mt-6 mb-6 pl-9 md:pl-11">
                        <div className="h-px bg-stone-800" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {savedNextCursor && (
              <div className="text-center py-8">
                <button
                  onClick={() => loadSaved(savedNextCursor)}
                  disabled={savedLoadingMore}
                  className="text-[#7a9b6f] hover:text-[#8fb084] disabled:opacity-50"
                >
                  {savedLoadingMore ? 'Loading...' : 'Load more →'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
