'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { SignOutButton } from '@clerk/nextjs'
import type {
  FeedResponse,
  ProfileResponse,
  PostWithRelations,
  PingItem,
  PingsResponse,
  UserMeResponse,
  SearchUser,
  UserSearchResponse,
} from '@/lib/types'
import { MossIcon } from '@/lib/components/MossIcon'
import {
  formatTimeAgo,
  getMediaTypeLabel,
  MediaTypeFilledIcon,
  PlusIcon,
} from '@/lib/components/PostHelpers'

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
  const [activeTab, setActiveTab] = useState<'shared' | 'saved' | 'pings'>(
    'shared'
  )
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [savedItems, setSavedItems] = useState<PostWithRelations[]>([])
  const [savedNextCursor, setSavedNextCursor] = useState<string | undefined>()
  const [savedLoading, setSavedLoading] = useState(false)
  const [savedLoadingMore, setSavedLoadingMore] = useState(false)
  const [savedError, setSavedError] = useState<string | null>(null)
  const [savedLoaded, setSavedLoaded] = useState(false)
  const [unsavingId, setUnsavingId] = useState<string | null>(null)
  const [smilingIds, setSmilingIds] = useState<Set<string>>(new Set())
  const [pings, setPings] = useState<PingItem[]>([])
  const [pingsLoading, setPingsLoading] = useState(false)
  const [pingsError, setPingsError] = useState<string | null>(null)
  const [pingsLoaded, setPingsLoaded] = useState(false)
  const [hasUnreadPings, setHasUnreadPings] = useState(false)
  const [searchExpanded, setSearchExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const loadProfile = useCallback(async (cursor?: string) => {
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
      if (cursor) {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                items: [...prev.items, ...data.items],
                nextCursor: data.nextCursor,
              }
            : data
        )
      } else {
        setProfile(data)
      }
    } catch {
      setError('Failed to load profile')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [username])

  const loadSaved = useCallback(async (cursor?: string) => {
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
  }, [isOwnProfile])

  const loadPings = useCallback(async () => {
    if (!isOwnProfile) return
    try {
      setPingsLoading(true)
      setPingsError(null)
      const res = await fetch('/api/users/me/pings')
      if (!res.ok) {
        if (res.status === 401) {
          setPingsError('Please log in to view pings')
        } else {
          setPingsError('Failed to load pings')
        }
        return
      }
      const data: PingsResponse = await res.json()
      setPings(data.items)
      setHasUnreadPings(data.items.some((ping) => !ping.seen_at))
      setPingsLoaded(true)
    } catch {
      setPingsError('Failed to load pings')
    } finally {
      setPingsLoading(false)
    }
  }, [isOwnProfile])

  useEffect(() => {
    if (!isOwnProfile) return
    let isCancelled = false

    async function checkUnreadPings() {
      try {
        const res = await fetch('/api/users/me/pings')
        if (!res.ok) return
        const data: PingsResponse = await res.json()
        if (!isCancelled) {
          setHasUnreadPings(data.items.some((ping) => !ping.seen_at))
        }
      } catch {
        // ignore
      }
    }

    checkUnreadPings()
    return () => {
      isCancelled = true
    }
  }, [isOwnProfile])

  useEffect(() => {
    if (username) loadProfile()
  }, [username, loadProfile])

  useEffect(() => {
    if (!isOwnProfile && activeTab !== 'shared') {
      setActiveTab('shared')
    }
  }, [activeTab, isOwnProfile])

  // Load saved when user clicks the saved tab (if not already loading/loaded)
  useEffect(() => {
    if (activeTab === 'saved' && isOwnProfile && !savedLoaded && !savedLoading) {
      loadSaved()
    }
  }, [activeTab, isOwnProfile, savedLoaded, savedLoading, loadSaved])

  // Load pings when user clicks the pings tab (if not already loading/loaded)
  useEffect(() => {
    if (activeTab === 'pings' && isOwnProfile && !pingsLoaded && !pingsLoading) {
      loadPings()
    }
  }, [activeTab, isOwnProfile, pingsLoaded, pingsLoading, loadPings])

  // Mark pings seen when entering the tab
  useEffect(() => {
    if (activeTab !== 'pings' || !isOwnProfile) return
    fetch('/api/users/me/pings/seen', { method: 'POST' }).catch(() => {})
    setHasUnreadPings(false)
  }, [activeTab, isOwnProfile])

  // Preload saved items in background when viewing own profile, so the tab feels instant
  useEffect(() => {
    if (isOwnProfile && !savedLoaded && !savedLoading) {
      loadSaved()
    }
  }, [isOwnProfile, savedLoaded, savedLoading, loadSaved])

  async function handleDeletePost(postId: string) {
    setDeleteConfirmId(null)
    setDeletingId(postId)
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' })
      if (res.ok && profile) {
        setProfile({
          ...profile,
          items: profile.items.filter((p) => p.id !== postId),
          postCount: Math.max(0, profile.postCount - 1),
        })
        setPings((prev) => {
          const next = prev.filter((ping) => ping.post_id !== postId)
          setHasUnreadPings(next.some((ping) => !ping.seen_at))
          return next
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

  const updateSmileInProfile = (postId: string, smiledByCurrentUser: boolean) => {
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((post) =>
              post.id === postId ? { ...post, smiledByCurrentUser } : post
            ),
          }
        : prev
    )
    setSavedItems((prev) =>
      prev.map((post) =>
        post.id === postId ? { ...post, smiledByCurrentUser } : post
      )
    )
  }

  const handleSmileToggle = async (postId: string, currentValue: boolean) => {
    const nextValue = !currentValue
    updateSmileInProfile(postId, nextValue)
    setSmilingIds((prev) => {
      const next = new Set(prev)
      next.add(postId)
      return next
    })

    try {
      const res = await fetch(`/api/posts/${postId}/smile`, {
        method: nextValue ? 'POST' : 'DELETE',
      })
      if (!res.ok) {
        throw new Error('Failed to smile')
      }
    } catch (error) {
      console.error('Error smiling at post:', error)
      updateSmileInProfile(postId, currentValue)
      setError('Failed to smile. Please try again.')
    } finally {
      setSmilingIds((prev) => {
        const next = new Set(prev)
        next.delete(postId)
        return next
      })
    }
  }

  if (loading && !profile) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-stone-500">thinking...</div>
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
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header: back + logo */}
      <div className="sticky top-0 bg-black/90 backdrop-blur-sm z-10">
        <div className="max-w-4xl mx-auto px-4 md:px-8 pt-6 pb-4 flex items-center justify-between">
          <Link href="/feed" className="text-white text-2xl hover:text-gray-300">
            ←
          </Link>
          <Link href="/feed" className="flex items-center gap-2">
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
          <div className="w-8" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-8 py-6">
        {/* Profile header: avatar, username, settings */}
        <div className="flex items-center gap-4 mb-4">
          {isOwnProfile ? (
            <Link
              href="/edit-profile"
              className="group relative w-12 h-12 md:w-16 md:h-16 rounded-full flex-shrink-0 block transition-opacity hover:opacity-80"
              style={{ backgroundColor: user.avatar_color }}
              aria-label="Edit profile"
            >
              <span
                className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-stone-900 rounded-full border border-stone-700 flex items-center justify-center"
                aria-hidden
              >
                <svg
                  className="w-[10px] h-[10px] text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </span>
            </Link>
          ) : (
            <div
              className="w-12 h-12 md:w-16 md:h-16 rounded-full flex-shrink-0"
              style={{ backgroundColor: user.avatar_color }}
            />
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold lowercase truncate">
              {user.username}
            </h1>
          </div>
          <div className="w-14" />
        </div>

        {/* Tabs */}
        <div className="border-b border-stone-700 mb-6">
          <div
            className={`flex items-center gap-6 ${
              isOwnProfile ? 'justify-center' : 'justify-start'
            }`}
          >
            <button
              onClick={() => setActiveTab('shared')}
              className={`pb-2 text-sm font-bold lowercase tracking-wider border-b-2 transition-colors ${
                activeTab === 'shared'
                  ? 'text-white border-[#7a9b6f]'
                  : 'text-stone-500 border-transparent hover:text-stone-400'
              }`}
            >
              shared
            </button>
            {isOwnProfile && (
              <button
                onClick={() => setActiveTab('saved')}
                className={`pb-2 text-sm font-bold lowercase tracking-wider border-b-2 transition-colors ${
                  activeTab === 'saved'
                    ? 'text-white border-[#7a9b6f]'
                    : 'text-stone-500 border-transparent hover:text-stone-400'
                }`}
              >
                saved
              </button>
            )}
            {isOwnProfile && (
              <button
                onClick={() => setActiveTab('pings')}
                className={`pb-2 text-sm font-bold lowercase tracking-wider border-b-2 transition-colors ${
                  activeTab === 'pings'
                    ? 'text-white border-[#7a9b6f]'
                    : 'text-stone-500 border-transparent hover:text-stone-400'
                } mr-2 relative`}
              >
                pings
                {hasUnreadPings && activeTab !== 'pings' && (
                  <span className="absolute -top-1 -right-2.5 w-2.5 h-2.5 bg-[#2d5016] rounded-full" />
                )}
              </button>
            )}
          </div>
        </div>

        {activeTab === 'shared' && (
          <div className="relative">
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
                <p className="text-stone-500">no shared items yet</p>
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
                        <span className="md:text-base text-sm text-stone-200 font-bold lowercase">
                          {post.user.username}
                        </span>
                        <span className="text-stone-700">·</span>
                        <span className="text-stone-400 flex items-center gap-1.5 text-sm">
                          <span className="text-stone-400">
                            <MediaTypeFilledIcon
                              mediaType={post.media_item.media_type}
                              size={12}
                            />
                          </span>
                          {getMediaTypeLabel(post.media_item.media_type)}
                        </span>
                        <span className="text-stone-700">·</span>
                        <span className="md:text-sm text-xs text-stone-600">
                          {formatTimeAgo(post.created_at)}
                        </span>
                        {isOwnProfile && (
                          <button
                            onClick={() => setDeleteConfirmId(post.id)}
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
                    <div className="flex gap-3 md:pl-11 pl-9">
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
                      {post.media_item.cover_url && (
                        <div className="md:w-14 md:h-14 w-12 h-12 flex-shrink-0 bg-stone-900 overflow-hidden rounded">
                          <Image
                            src={post.media_item.cover_url}
                            alt=""
                            className="w-full h-full object-cover"
                            width={56}
                            height={56}
                            sizes="(min-width: 768px) 56px, 48px"
                          />
                        </div>
                      )}
                    </div>

                    {!isOwnProfile && currentUser?.user?.id !== post.user.id && (
                      <div
                        className={`md:pl-11 pl-9 flex items-center w-full ${
                          post.note ? 'mt-3' : 'mt-2'
                        }`}
                      >
                        <button
                          onClick={() =>
                            handleSmileToggle(post.id, post.smiledByCurrentUser)
                          }
                          disabled={smilingIds.has(post.id)}
                          aria-pressed={post.smiledByCurrentUser}
                          aria-label={
                            post.smiledByCurrentUser
                              ? 'Remove smile'
                              : 'Smile at post'
                          }
                          className={`text-[14px] leading-none transition-colors duration-200 ${
                            post.smiledByCurrentUser
                              ? 'text-[#7a9b6f]'
                              : 'text-stone-600 hover:text-stone-400'
                          } ${smilingIds.has(post.id) ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <span
                            className={`inline-block transition-transform duration-300 ${
                              post.smiledByCurrentUser ? 'rotate-0' : '-rotate-90'
                            }`}
                          >
                            <svg
                              className="w-4 h-4"
                              viewBox="0 0 16 16"
                              fill="currentColor"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              aria-hidden="true"
                            >
                              <circle cx="5.4" cy="5.9" r="0.6" />
                              <circle cx="10.6" cy="5.9" r="0.6" />
                              <path d="M3.8 10.8c2.4 2.4 6.0 2.4 8.4 0" fill="none" />
                            </svg>
                          </span>
                        </button>
                      </div>
                    )}
                    {index < items.length - 1 && (
                      <div
                        className={`mb-6 pl-9 md:pl-11 ${
                          post.note ? 'mt-6' : 'mt-5'
                        }`}
                      >
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
                  {loadingMore ? 'thinking...' : 'Load more →'}
                </button>
              </div>
            )}

            {/* Delete confirmation modal */}
            {deleteConfirmId && (
              <div className="absolute inset-0 z-50 flex items-end justify-center pb-4 pt-24">
                <div className="bg-stone-950 border border-stone-700 max-w-[220px] w-full p-4 shadow-2xl relative">
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="absolute top-2 left-2 text-stone-500 hover:text-stone-300 transition-colors"
                    aria-label="Close"
                  >
                    <svg
                      width="12"
                      height="12"
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
                  <p className="text-stone-200 text-sm font-medium text-center mb-4">
                    delete this post?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="flex-1 py-2 text-sm font-medium text-stone-500 hover:text-stone-300 lowercase transition-colors"
                    >
                      no
                    </button>
                    <button
                      onClick={() => handleDeletePost(deleteConfirmId)}
                      className="flex-1 py-2 text-sm font-medium text-[#7a9b6f] hover:text-[#8fb084] lowercase transition-colors"
                    >
                      yes
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
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
                <p className="text-stone-500">loading saved items...</p>
              </div>
            ) : savedItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-stone-500">no saved posts yet</p>
                <p className="text-stone-600 text-xs mt-1">tap the + on any post to save it</p>
              </div>
            ) : (
              <div>
                {savedItems.map((post, index) => (
                  <div key={post.id}>
                    <div className="flex items-center gap-3 mb-3">
                      <Link
                        href={`/profile/${encodeURIComponent(post.user.username)}`}
                        className="flex-shrink-0 hover:opacity-90 transition-opacity"
                      >
                        <div
                          className="md:w-8 md:h-8 w-6 h-6 rounded-full"
                          style={{ backgroundColor: post.user.avatar_color }}
                        />
                      </Link>
                      <div className="flex items-baseline gap-2 flex-1 flex-wrap">
                        <Link
                          href={`/profile/${encodeURIComponent(post.user.username)}`}
                            className="md:text-base text-sm text-stone-200 font-bold lowercase hover:text-[#7a9b6f] transition-colors"
                        >
                          {post.user.username}
                        </Link>
                        <span className="text-stone-700">·</span>
                        <span className="text-stone-400 flex items-center gap-1.5 text-sm">
                          <span className="text-stone-400">
                            <MediaTypeFilledIcon
                              mediaType={post.media_item.media_type}
                              size={12}
                            />
                          </span>
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
                          <PlusIcon saved={true} size={18} />
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-3 md:pl-11 pl-9">
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
                      {post.media_item.cover_url && (
                        <div className="md:w-14 md:h-14 w-12 h-12 flex-shrink-0 bg-stone-900 overflow-hidden rounded">
                          <Image
                            src={post.media_item.cover_url}
                            alt=""
                            className="w-full h-full object-cover"
                            width={56}
                            height={56}
                            sizes="(min-width: 768px) 56px, 48px"
                          />
                        </div>
                      )}
                    </div>

                    {index < savedItems.length - 1 && (
                      <div
                        className={`mb-6 pl-9 md:pl-11 ${
                          post.note ? 'mt-6' : 'mt-5'
                        }`}
                      >
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
                  {savedLoadingMore ? 'thinking...' : 'Load more →'}
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === 'pings' && isOwnProfile && (
          <div>
            {pingsError && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded text-red-400 text-sm">
                {pingsError}
                <button
                  onClick={() => setPingsError(null)}
                  className="ml-2 underline"
                >
                  Dismiss
                </button>
              </div>
            )}
            {pingsLoading && pings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-stone-500">loading pings...</p>
              </div>
            ) : pings.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-stone-500">no pings yet</p>
              </div>
            ) : (
              <div>
                {pings.map((ping, index) => (
                  <div key={ping.id}>
                    <div className={`flex items-center gap-4 ${index === 0 ? 'pt-1 pb-4' : 'py-4'}`}>
                      <div
                        className="w-9 h-9 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor:
                            ping.actor?.avatar_color || '#3f3f46',
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-stone-200">
                          <span className="font-bold lowercase">
                            {ping.actor?.username || 'someone'}
                          </span>{' '}
                          <span className="text-stone-400">
                            smiled at &quot;{ping.postTitle || 'a post'}&quot;
                          </span>
                        </div>
                        <div className="text-xs text-stone-600 mt-1">
                          {formatTimeAgo(ping.created_at)}
                        </div>
                      </div>
                      <span className="text-[#7a9b6f] text-[14px] leading-none">
                        <span className="inline-block rotate-0">
                          <svg
                            className="w-4 h-4"
                            viewBox="0 0 16 16"
                            fill="currentColor"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            aria-hidden="true"
                          >
                            <circle cx="5.4" cy="5.9" r="0.6" />
                            <circle cx="10.6" cy="5.9" r="0.6" />
                            <path d="M3.8 10.8c2.4 2.4 6.0 2.4 8.4 0" fill="none" />
                          </svg>
                        </span>
                      </span>
                    </div>
                    {index < pings.length - 1 && (
                      <div className="h-px bg-stone-800" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom bar - search for friends */}
      <div className="fixed bottom-0 left-0 right-0 bg-black z-20">
        <div className="h-px bg-stone-800 flex-shrink-0" />

        {searchExpanded ? (
          <div className="flex items-end w-full max-w-4xl mx-auto px-4 md:px-8 py-4 gap-6">
            <div className="flex items-center gap-2.5 flex-shrink-0">
              {isOwnProfile ? (
                <SignOutButton>
                  <button
                    type="button"
                    className="text-white text-xs font-medium hover:text-stone-300 transition-colors lowercase"
                  >
                    sign out
                  </button>
                </SignOutButton>
              ) : (
                <div className="w-10" />
              )}
            </div>

            <div className="relative w-full max-w-[33%] min-w-[240px] ml-auto">
              {searchQuery.trim() && (
                <div className="absolute bottom-full right-0 mb-3 w-full">
                  {searchLoading ? (
                    <div className="text-stone-500 text-sm py-2">
                      searching...
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden bg-black border-stone-700">
                      <div className="space-y-1 p-2">
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
                            <span className="md:text-base text-sm text-stone-200 font-bold lowercase group-hover:text-[#7a9b6f] transition-colors">
                              {user.username}
                            </span>
                          </Link>
                        ))}
                      </div>
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
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5 flex-shrink-0">
              {isOwnProfile ? (
                <SignOutButton>
                  <button
                    type="button"
                    className="text-white text-xs font-medium hover:text-stone-300 transition-colors lowercase"
                  >
                    sign out
                  </button>
                </SignOutButton>
              ) : (
                <div className="w-10" />
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
