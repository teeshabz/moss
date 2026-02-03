'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type {
  FeedResponse,
  PostWithRelations,
  SearchUser,
  UserMeResponse,
  UserSearchResponse,
} from '@/lib/types'
import { MossIcon } from '@/lib/components/MossIcon'
import {
  formatTimeAgo,
  getMediaTypeLabel,
  MediaTypeFilledIcon,
  PlusIcon,
} from '@/lib/components/PostHelpers'

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
  const [searchExpanded, setSearchExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const backgroundFeedLoadedRef = useRef(false)
  const [activeTab, setActiveTab] = useState<'everyone' | 'saved'>('everyone')
  const [savedPosts, setSavedPosts] = useState<PostWithRelations[]>([])
  const [savedNextCursor, setSavedNextCursor] = useState<string | undefined>()
  const [savedHasMore, setSavedHasMore] = useState(false)
  const [savedLoading, setSavedLoading] = useState(false)
  const [savedLoaded, setSavedLoaded] = useState(false)
  const [unsavingId, setUnsavingId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (activeTab === 'everyone') {
      loadFeed()
    }
  }, [activeTab])

  // Load saved when user clicks the saved tab (if not already loading/loaded)
  useEffect(() => {
    if (activeTab === 'saved' && !savedLoaded && !savedLoading) {
      loadSavedPosts()
    }
  }, [activeTab, savedLoaded, savedLoading])

  // Preload saved posts in background once we have a user, so the tab feels instant
  useEffect(() => {
    if (!currentUser?.user?.id || savedLoaded || savedLoading) return
    loadSavedPosts()
  }, [currentUser?.user?.id, savedLoaded, savedLoading])

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch('/api/users/me')
        if (res.ok) {
          const data: UserMeResponse = await res.json()
          setCurrentUser(data)
          if (data.postIds?.length !== undefined) {
            setSavedIds(new Set(data.postIds))
          }
        }
      } catch {
        // ignore
      }
    }
    loadUser()
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

  async function loadFeed(cursor?: string) {
    if (!cursor) backgroundFeedLoadedRef.current = false
    try {
      const url = cursor
        ? `/api/feed?cursor=${encodeURIComponent(cursor)}`
        : '/api/feed?limit=10'
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
        // Append to existing posts (pagination), dedupe by id to avoid duplicate keys
        setPosts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id))
          const newItems = data.items.filter((p) => !existingIds.has(p.id))
          return [...prev, ...newItems]
        })
      } else {
        // Replace posts (initial load)
        setPosts(data.items)
      }

      setNextCursor(data.nextCursor)
      setHasMore(!!data.nextCursor)
      setError(null) // Clear any previous errors on success
      // Load next page in background once so more content appears quickly (initial load only)
      if (!cursor && data.nextCursor && data.items.length > 0 && !backgroundFeedLoadedRef.current) {
        backgroundFeedLoadedRef.current = true
        loadFeed(data.nextCursor)
      }
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

  const loadSavedPosts = async (cursor?: string) => {
    try {
      if (!cursor) setSavedLoading(true)
      const url = cursor
        ? `/api/users/me/saved?cursor=${encodeURIComponent(cursor)}`
        : '/api/users/me/saved'
      const response = await fetch(url)

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Failed to load saved posts')
      }

      const data: FeedResponse = await response.json()

      if (cursor) {
        setSavedPosts((prev) => [...prev, ...data.items])
      } else {
        setSavedPosts(data.items)
        setSavedLoaded(true)
      }

      setSavedNextCursor(data.nextCursor)
      setSavedHasMore(!!data.nextCursor)
    } catch (error) {
      console.error('Error loading saved posts:', error)
      setError('Failed to load saved posts. Please try again.')
    } finally {
      setSavedLoading(false)
      if (!cursor) setSavedLoaded(true)
    }
  }

  const toggleSave = async (postId: string, post?: PostWithRelations) => {
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

      if (wasSaved) {
        setSavedPosts((prev) => prev.filter((p) => p.id !== postId))
      } else if (post) {
        setSavedPosts((prev) => [post, ...prev])
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

  const handleUnsave = async (postId: string) => {
    setUnsavingId(postId)
    try {
      const res = await fetch(`/api/posts/${postId}/save`, { method: 'DELETE' })
      if (res.ok) {
        setSavedPosts((prev) => prev.filter((item) => item.id !== postId))
        setSavedIds((prev) => {
          const next = new Set(prev)
          next.delete(postId)
          return next
        })
      } else {
        setError('Failed to remove saved item')
      }
    } catch {
      setError('Failed to remove saved item')
    } finally {
      setUnsavingId(null)
    }
  }

  if (loading && posts.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-stone-500">thinking...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header with tabs - sticky together */}
      <div className="sticky top-0 bg-black/90 backdrop-blur-sm z-10">
        <div className="max-w-2xl mx-auto px-6 md:px-8">
          {/* Moss logo - top middle */}
          <div className="pt-2 pb-1.5 flex justify-center">
            <Link href="/feed" className="flex items-center gap-2 flex-shrink-0" aria-label="moss">
              <MossIcon color="#2d5016" size={22} />
              <span
                className="text-xl font-bold lowercase"
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

          {/* Profile (left) and Share (right) - same level */}
          <div className="pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5 flex-shrink-0 min-w-0">
              {currentUser?.user?.username ? (
                <Link
                  href={`/profile/${encodeURIComponent(currentUser.user.username)}`}
                  className="flex items-center gap-2 hover:opacity-90 transition-opacity min-w-0"
                >
                  <div
                    className="w-8 h-8 rounded-full flex-shrink-0 ring-2 ring-stone-400"
                    style={{ backgroundColor: currentUser.user.avatar_color }}
                  />
                  <span className="text-base font-bold lowercase text-stone-200 truncate ml-0.5">
                    {currentUser.user.username}
                  </span>
                </Link>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-full bg-stone-800 flex-shrink-0 ring-2 ring-stone-400" />
                  <span className="text-sm text-stone-500">...</span>
                </>
              )}
            </div>
            <Link
              href="/share"
              className="px-3 py-1.5 text-sm font-bold lowercase tracking-wider transition-colors rounded-md bg-[#2d5016] text-white hover:bg-[#3a6b1e]"
              onMouseEnter={() => setShareHovered(true)}
              onMouseLeave={() => setShareHovered(false)}
            >
              share
            </Link>
          </div>

          {/* Tabs */}
          <div className="border-b border-stone-700">
            <div className="flex gap-6 justify-center">
              <button
                onClick={() => setActiveTab('everyone')}
                className={`pb-2 text-sm font-bold lowercase tracking-wider border-b-2 transition-colors ${
                  activeTab === 'everyone'
                    ? 'text-white border-[#7a9b6f]'
                    : 'text-stone-500 border-transparent hover:text-stone-400'
                }`}
              >
                home
              </button>
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
            </div>
          </div>
        </div>
      </div>

      {/* Feed Content */}
      <div className="max-w-2xl mx-auto px-6 md:px-8 mt-6">

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded text-red-400 text-sm">
            <p>{error}</p>
            <button
              onClick={() => {
                setError(null)
                if (activeTab === 'everyone') {
                  loadFeed()
                } else {
                  loadSavedPosts()
                }
              }}
              className="mt-2 text-red-300 hover:text-red-200 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Home Tab Content */}
        {activeTab === 'everyone' && (
          <>
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
                            onClick={() => toggleSave(post.id, post)}
                            disabled={savingIds.has(post.id)}
                            aria-pressed={savedIds.has(post.id)}
                            aria-label={savedIds.has(post.id) ? 'Unsave post' : 'Save post'}
                            className={`ml-auto transition-colors duration-200 flex-shrink-0 ${
                              savedIds.has(post.id)
                                ? 'text-[#7a9b6f]'
                                : 'text-stone-600 hover:text-[#7a9b6f]'
                            } ${savingIds.has(post.id) ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            <PlusIcon saved={savedIds.has(post.id)} size={18} />
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
                      {loading ? 'thinking...' : 'Load more →'}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Saved Tab Content */}
        {activeTab === 'saved' && (
          <>
            {savedLoading && savedPosts.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-stone-500">thinking...</div>
              </div>
            ) : savedPosts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-stone-500">no saved posts yet</p>
                <p className="text-stone-600 text-xs mt-1">tap the + on any post to save it</p>
              </div>
            ) : (
              <>
                <div>
                  {savedPosts.map((post, index) => (
                    <div key={post.id}>
                      {/* Post Content */}
                      <div>
                        {/* Header Row - Avatar + Metadata + Unsave */}
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
                            {/* Unsave button (bold plus) */}
                            <button
                              onClick={() => handleUnsave(post.id)}
                              disabled={unsavingId === post.id}
                              aria-label="Unsave post"
                              className={`ml-auto transition-colors duration-200 flex-shrink-0 text-[#7a9b6f] hover:text-[#8fb084] ${
                                unsavingId === post.id ? 'opacity-60 cursor-not-allowed' : ''
                              }`}
                            >
                              <PlusIcon saved={true} size={18} />
                            </button>
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
                      {index < savedPosts.length - 1 && (
                        <div className="mt-6 mb-6 pl-9 md:pl-11">
                          <div className="h-px bg-stone-800" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Load More Button */}
                {savedHasMore && (
                  <div className="text-center py-8">
                    <button
                      onClick={() => loadSavedPosts(savedNextCursor)}
                      disabled={savedLoading}
                      className="text-[#7a9b6f] hover:text-[#8fb084] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savedLoading ? 'thinking...' : 'Load more →'}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Bottom Bar - Fixed */}
      <div className="fixed bottom-0 left-0 right-0 bg-black z-20">
        {/* Separator line */}
        <div className="h-px bg-stone-800 flex-shrink-0" />

        {searchExpanded ? (
          /* Full-width search mode */
          <div className="flex flex-col w-full px-6 md:px-8 py-4">
            {/* Search results - above input, sizes to 1-3 results */}
            {searchQuery.trim() && (
              <div className="pb-4">
                {searchLoading ? (
                  <div className="text-stone-500 text-sm py-2">
                    searching...
                  </div>
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

            {/* Search input - full width */}
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
          /* Collapsed mode - search right */
          <div className="max-w-2xl mx-auto px-6 md:px-8 py-3 flex items-center justify-end">
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
