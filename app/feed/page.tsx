'use client'

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type {
  FeedResponse,
  MediaType,
  NoteWithAuthor,
  NotesResponse,
  PostWithRelations,
  PingsResponse,
  SearchUser,
  UserMeResponse,
  UserSearchResponse,
} from '@/lib/types'
import { SHARE_MEDIA_ROW, parseFeedTypeParam } from '@/lib/share-media-config'
import { MossIcon } from '@/lib/components/MossIcon'
import { AboutText } from '@/lib/components/AboutDialog'
import {
  formatTimeAgo,
  getMediaTypeLabel,
  MediaTypeFilledIcon,
  PlusIcon,
} from '@/lib/components/PostHelpers'
import { MAX_POST_TEXT_LENGTH } from '@/lib/post-text-limit'

function FeedPageContent() {
  const [postsCache, setPostsCache] = useState<Record<string, PostWithRelations[]>>(
    {}
  )
  const [hasLoadedCache, setHasLoadedCache] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<UserMeResponse | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  /** Sync guard so rapid double-clicks don’t fire parallel save requests */
  const saveInFlightRef = useRef<Set<string>>(new Set())
  const [smilingIds, setSmilingIds] = useState<Set<string>>(new Set())
  const [hasUnreadPings, setHasUnreadPings] = useState(false)
  const [searchExpanded, setSearchExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [activeTab, setActiveTab] = useState<'community' | 'following'>('community')
  /** null = not read yet; avoid hint flash before localStorage */
  const [friendsFeedHintDismissed, setFriendsFeedHintDismissed] = useState<
    boolean | null
  >(null)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [notesDrawerPost, setNotesDrawerPost] = useState<PostWithRelations | null>(null)
  const [notesByPostId, setNotesByPostId] = useState<Record<string, NoteWithAuthor[]>>({})
  const [notesHasNoted, setNotesHasNoted] = useState<Record<string, boolean>>({})
  const [notesLoading, setNotesLoading] = useState(false)
  const [notesError, setNotesError] = useState<string | null>(null)
  const [noteInput, setNoteInput] = useState('')
  const [noteSending, setNoteSending] = useState(false)
  const [noteSendError, setNoteSendError] = useState<string | null>(null)
  const [noteDeletingIds, setNoteDeletingIds] = useState<Set<string>>(new Set())
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const prevPathnameRef = useRef<string | null>(null)

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam === 'following') {
      setActiveTab('following')
    } else if (tabParam === 'community') {
      setActiveTab('community')
    }
  }, [searchParams])

  const mediaFilter = useMemo(
    () => parseFeedTypeParam(searchParams.get('type')),
    [searchParams]
  )

  const feedCacheKey = `${activeTab}:${mediaFilter ?? 'all'}`

  useEffect(() => {
    const raw = searchParams.get('type')
    if (raw !== null && raw !== '' && parseFeedTypeParam(raw) === null) {
      const p = new URLSearchParams(searchParams.toString())
      p.delete('type')
      const q = p.toString()
      router.replace(q ? `/feed?${q}` : '/feed', { scroll: false })
    }
  }, [searchParams, router])

  const loadFeed = useCallback(
    async (mode: 'community' | 'following') => {
      const mf = parseFeedTypeParam(searchParams.get('type'))
      const cacheKey = `${mode}:${mf ?? 'all'}`
      try {
        const params = new URLSearchParams()
        if (mode === 'following') params.set('mode', 'following')
        if (mf) params.set('type', mf)
        const qs = params.toString()
        const response = await fetch(`/api/feed${qs ? `?${qs}` : ''}`)

        if (!response.ok) {
          if (response.status === 401) {
            router.push('/onboarding')
            return
          }
          throw new Error('Failed to load feed')
        }

        const data: FeedResponse = await response.json()

        setPostsCache((prev) => ({ ...prev, [cacheKey]: data.items }))
        setHasLoadedCache((prev) => ({ ...prev, [cacheKey]: true }))
        setError(null)
      } catch (error) {
        console.error('Error loading feed:', error)
        setError('Failed to load feed. Please try again.')
      } finally {
        setLoading(false)
      }
    },
    [router, searchParams]
  )

  const replaceFeedQuery = useCallback(
    (updates: { type: MediaType | null }) => {
      const p = new URLSearchParams(searchParams.toString())
      if (updates.type === null) {
        p.delete('type')
      } else {
        p.set('type', updates.type)
      }
      const q = p.toString()
      router.replace(q ? `/feed?${q}` : '/feed', { scroll: false })
    },
    [router, searchParams]
  )

  const loadNotes = useCallback(async (postId: string) => {
    try {
      setNotesLoading(true)
      setNotesError(null)
      const response = await fetch(`/api/posts/${postId}/notes`)
      if (!response.ok) {
        throw new Error('Failed to load notes')
      }
      const data: NotesResponse = await response.json()
      setNotesByPostId((prev) => ({
        ...prev,
        [postId]: data.items,
      }))
      setNotesHasNoted((prev) => ({
        ...prev,
        [postId]: data.hasNoted,
      }))
    } catch (error) {
      console.error('Error loading notes:', error)
      setNotesError('Failed to load notes. Please try again.')
    } finally {
      setNotesLoading(false)
    }
  }, [])

  const openNotesDrawer = useCallback((post: PostWithRelations) => {
    setNotesDrawerPost(post)
    setNoteInput('')
    setNoteSendError(null)
    loadNotes(post.id)
  }, [loadNotes])

  const closeNotesDrawer = useCallback(() => {
    setNotesDrawerPost(null)
    setNoteInput('')
    setNoteSendError(null)
  }, [])

  const handleSendNote = useCallback(async () => {
    if (!notesDrawerPost) return
    const trimmed = noteInput.trim()
    if (trimmed.length < 1 || trimmed.length > MAX_POST_TEXT_LENGTH) return

    try {
      setNoteSending(true)
      setNoteSendError(null)
      const response = await fetch(`/api/posts/${notesDrawerPost.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      })

      if (!response.ok) {
        throw new Error('Failed to send note')
      }

      const data: { note: NoteWithAuthor } = await response.json()
      setNotesByPostId((prev) => ({
        ...prev,
        [notesDrawerPost.id]: [
          ...(prev[notesDrawerPost.id] ?? []),
          data.note,
        ],
      }))
      setNotesHasNoted((prev) => ({
        ...prev,
        [notesDrawerPost.id]: true,
      }))
      setNoteInput('')
    } catch (error) {
      console.error('Error sending note:', error)
      setNoteSendError('couldn’t send note. try again.')
    } finally {
      setNoteSending(false)
    }
  }, [noteInput, notesDrawerPost])

  const handleDeleteNote = useCallback(async (noteId: string) => {
    if (!notesDrawerPost || noteDeletingIds.has(noteId)) return

    setNoteDeletingIds((prev) => new Set(prev).add(noteId))
    try {
      const response = await fetch(
        `/api/posts/${notesDrawerPost.id}/notes/${noteId}`,
        { method: 'DELETE' }
      )
      if (!response.ok) {
        throw new Error('Failed to delete note')
      }

      setNotesByPostId((prev) => ({
        ...prev,
        [notesDrawerPost.id]: (prev[notesDrawerPost.id] ?? []).filter(
          (note) => note.id !== noteId
        ),
      }))
      setNotesHasNoted((prev) => ({
        ...prev,
        [notesDrawerPost.id]: false,
      }))
    } catch (error) {
      console.error('Error deleting note:', error)
      setNotesError('Failed to delete note. Please try again.')
    } finally {
      setNoteDeletingIds((prev) => {
        const next = new Set(prev)
        next.delete(noteId)
        return next
      })
    }
  }, [notesDrawerPost, noteDeletingIds])

  const activeNotes = notesDrawerPost
    ? notesByPostId[notesDrawerPost.id] ?? []
    : []
  const hasNoted = notesDrawerPost
    ? notesHasNoted[notesDrawerPost.id] ?? false
    : false
  const noteIsValid = noteInput.trim().length >= 1
    && noteInput.trim().length <= MAX_POST_TEXT_LENGTH

  useEffect(() => {
    if (hasLoadedCache[feedCacheKey]) {
      setLoading(false)
      return
    }
    setError(null)
    setLoading(true)
    loadFeed(activeTab)
  }, [activeTab, feedCacheKey, hasLoadedCache, loadFeed])

  useEffect(() => {
    const ac = new AbortController()
    async function loadUser() {
      try {
        const res = await fetch('/api/users/me', { signal: ac.signal })
        if (!res.ok) return
        const data: UserMeResponse = await res.json()
        if (ac.signal.aborted) return
        setCurrentUser(data)
        // Only apply server snapshot if this fetch is still current — stale
        // responses (e.g. Strict Mode double mount) must not overwrite optimistic unsave.
        if (Array.isArray(data.postIds)) {
          setSavedIds(new Set(data.postIds))
        }
      } catch {
        if (ac.signal.aborted) return
      }
    }
    loadUser()
    return () => ac.abort()
  }, [])

  useEffect(() => {
    const id = currentUser?.user?.id
    if (!id) return
    try {
      setFriendsFeedHintDismissed(
        localStorage.getItem(`moss_friends_feed_hint_${id}`) === '1'
      )
    } catch {
      setFriendsFeedHintDismissed(false)
    }
  }, [currentUser?.user?.id])

  /** First visit to /feed only: once they navigate away (or dismiss), never show again. */
  useEffect(() => {
    const id = currentUser?.user?.id
    if (!id) return
    const prev = prevPathnameRef.current
    prevPathnameRef.current = pathname
    if (prev === '/feed' && pathname !== '/feed') {
      try {
        localStorage.setItem(`moss_friends_feed_hint_${id}`, '1')
      } catch {
        // ignore
      }
      setFriendsFeedHintDismissed(true)
    }
  }, [pathname, currentUser?.user?.id])

  const dismissFriendsFeedHint = useCallback(() => {
    const id = currentUser?.user?.id
    if (!id) return
    try {
      localStorage.setItem(`moss_friends_feed_hint_${id}`, '1')
    } catch {
      // ignore
    }
    setFriendsFeedHintDismissed(true)
  }, [currentUser?.user?.id])

  /** Everyone tab + first visit to /feed (not dismissed, not left feed yet this “lifetime”) */
  const showFriendsFeedHint =
    activeTab === 'community' &&
    friendsFeedHintDismissed !== null &&
    !friendsFeedHintDismissed

  useEffect(() => {
    if (!currentUser?.user?.id) return
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

    const timeoutId = setTimeout(() => {
      checkUnreadPings()
    }, 800)
    return () => {
      isCancelled = true
      clearTimeout(timeoutId)
    }
  }, [currentUser?.user?.id])

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

  const toggleSave = async (postId: string, post?: PostWithRelations) => {
    if (saveInFlightRef.current.has(postId)) return
    saveInFlightRef.current.add(postId)

    const wasSaved = savedIds.has(postId)
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
      saveInFlightRef.current.delete(postId)
    }
  }

  const updateSmileInLists = (postId: string, smiledByCurrentUser: boolean) => {
    setPostsCache((prev) => {
      const next = { ...prev }
      for (const key of Object.keys(next)) {
        next[key] = next[key].map((post) =>
          post.id === postId ? { ...post, smiledByCurrentUser } : post
        )
      }
      return next
    })
  }

  const handleSmileToggle = async (
    postId: string,
    currentValue: boolean
  ) => {
    const nextValue = !currentValue
    updateSmileInLists(postId, nextValue)
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
      updateSmileInLists(postId, currentValue)
      setError('Failed to smile. Please try again.')
    } finally {
      setSmilingIds((prev) => {
        const next = new Set(prev)
        next.delete(postId)
        return next
      })
    }
  }

  const posts = postsCache[feedCacheKey] ?? []
  const onlyOwnPosts =
    activeTab === 'following' &&
    posts.length > 0 &&
    !!currentUser?.user?.id &&
    posts.every((post) => post.user.id === currentUser.user.id)
  const showFilteredEmpty =
    Boolean(mediaFilter) && !loading && posts.length === 0
  const showFollowingEmptyState =
    !mediaFilter &&
    activeTab === 'following' &&
    !loading &&
    (posts.length === 0 || onlyOwnPosts)
  const showEmptyState =
    !loading &&
    (showFilteredEmpty ||
      (activeTab === 'following'
        ? showFollowingEmptyState
        : posts.length === 0))

  if (loading && posts.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-stone-500">thinking...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white pb-32">
      {/* Header with tabs - sticky together */}
      <div className="sticky top-0 bg-black/90 backdrop-blur-sm z-10">
        <div className="max-w-2xl mx-auto px-6 md:px-8">
          {/* Moss logo (left) + avatar (right), top-aligned */}
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
              {currentUser?.user?.username ? (
                <Link
                  href={`/profile/${encodeURIComponent(currentUser.user.username)}`}
                  className="flex items-start hover:opacity-90 transition-opacity"
                  aria-label={`profile: ${currentUser.user.username}`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex-shrink-0 ring-2 ring-stone-400 relative"
                    style={{ backgroundColor: currentUser.user.avatar_color }}
                  >
                    {hasUnreadPings && (
                      <span className="absolute -top-0.5 -left-0.5 w-2.5 h-2.5 bg-[#2d5016] ring-2 ring-black rounded-full" />
                    )}
                  </div>
                </Link>
              ) : (
                <div className="w-8 h-8 rounded-full bg-stone-800 flex-shrink-0 ring-2 ring-stone-400" />
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-stone-700 mt-4">
            <div className="flex gap-6 justify-center">
              <button
                onClick={() => setActiveTab('community')}
                className={`pb-2 text-sm font-bold lowercase tracking-wider border-b-2 transition-colors ${
                  activeTab === 'community'
                    ? 'text-white border-[#7a9b6f]'
                    : 'text-stone-500 border-transparent hover:text-stone-400'
                }`}
              >
                everyone
              </button>
              <button
                onClick={() => setActiveTab('following')}
                className={`pb-2 text-sm font-bold lowercase tracking-wider border-b-2 transition-colors ${
                  activeTab === 'following'
                    ? 'text-white border-[#7a9b6f]'
                    : 'text-stone-500 border-transparent hover:text-stone-400'
                }`}
              >
                friends
              </button>
            </div>
          </div>

          {/* Media type filter — 1fr | icons | 1fr keeps icons centered; × sits at left of right column (next to icons) */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center py-3 mb-1 min-w-0">
            <div className="min-w-0" aria-hidden />
            <div className="flex items-center justify-center gap-2.5 sm:gap-3 overflow-x-auto min-w-0 max-w-full">
              {SHARE_MEDIA_ROW.map((row) => {
                const selected = mediaFilter === row.mediaType
                const iconSize = 16
                return (
                  <button
                    key={row.mediaType}
                    type="button"
                    onClick={() =>
                      replaceFeedQuery({
                        type: selected ? null : row.mediaType,
                      })
                    }
                    className={`flex-shrink-0 p-0.5 rounded-md transition-opacity hover:opacity-90 ${
                      selected ? '' : 'opacity-45 hover:opacity-70'
                    }`}
                    aria-label={
                      selected
                        ? `Show all posts (clear ${getMediaTypeLabel(row.mediaType)} filter)`
                        : `Filter by ${getMediaTypeLabel(row.mediaType)}`
                    }
                    aria-pressed={selected}
                  >
                    <MediaTypeFilledIcon
                      mediaType={row.mediaType}
                      size={iconSize}
                      color={selected ? row.color : undefined}
                      className={selected ? '' : 'text-stone-500'}
                    />
                  </button>
                )
              })}
            </div>
            <div className="flex items-center justify-start pl-3 min-w-0 self-center">
              {mediaFilter !== null && (
                <button
                  type="button"
                  onClick={() => replaceFeedQuery({ type: null })}
                  className="w-6 h-6 flex items-center justify-center rounded text-stone-500 hover:text-stone-300 text-sm leading-none transition-colors shrink-0"
                  aria-label="Clear filter, show all posts"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {showFriendsFeedHint && (
            <div className="relative mt-4 mb-2 rounded-lg border border-stone-700/90 bg-stone-950/80 px-3 py-2.5 pr-9">
              <p className="text-xs md:text-sm text-stone-400 leading-relaxed m-0">
                you&apos;re seeing posts from everyone,
                <br />
                try{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('following')}
                  className="font-semibold text-[#7a9b6f] hover:text-[#8fb084] transition-colors lowercase"
                >
                  friends
                </button>
                {' '}
                for a more personal feed.
              </p>
              <button
                type="button"
                onClick={dismissFriendsFeedHint}
                className="absolute right-2 top-2.5 p-1 text-stone-500 hover:text-stone-300 transition-colors"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Feed Content */}
      <div className="max-w-2xl mx-auto px-6 md:px-8 mt-5">
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded text-red-400 text-sm">
            <p>{error}</p>
            <button
              onClick={() => {
                setError(null)
                setHasLoadedCache((prev) => {
                  const next = { ...prev }
                  delete next[feedCacheKey]
                  return next
                })
                setLoading(true)
                loadFeed(activeTab)
              }}
              className="mt-2 text-red-300 hover:text-red-200 underline"
            >
              Try again
            </button>
          </div>
        )}

        <>
            {showEmptyState ? (
              <div className="text-center py-16">
                {showFilteredEmpty && mediaFilter ? (
                  <p className="text-stone-500 text-lg mb-4 lowercase">
                    no {getMediaTypeLabel(mediaFilter)} shared recently
                  </p>
                ) : activeTab === 'following' ? (
                  <>
                    <p className="text-stone-500 text-lg mb-4">
                      you&apos;re not following anyone yet
                    </p>
                    <Link
                      href="/find-friends"
                      className="inline-flex items-center px-5 py-2 rounded-full bg-[#2d5016] text-white text-sm font-bold lowercase hover:bg-[#3d6a1e] transition-colors"
                    >
                      find friends
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-stone-500 text-lg mb-4">No posts yet</p>
                    <Link
                      href="/share"
                      className="text-[#7a9b6f] hover:text-[#8fb084] transition-colors"
                    >
                      Share something →
                    </Link>
                  </>
                )}
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
                      </div>
                    </div>

                    {/* Content Row - Text + Thumbnail */}
                    <div className="flex gap-3 md:pl-11 pl-9">
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

                    {currentUser?.user?.id && (
                      <div
                        className={`md:pl-11 pl-9 flex gap-3 ${
                          post.note ? 'mt-1.5' : 'mt-1'
                        }`}
                      >
                        {(() => {
                          const isOwnPost = currentUser.user.id === post.user.id
                          const hasNotes =
                            (notesByPostId[post.id]?.length ?? (post.hasNotes ? 1 : 0)) > 0

                          if (isOwnPost) {
                            return (
                              <div className="flex-1 flex items-center">
                                {hasNotes && (
                                  <button
                                    onClick={() => openNotesDrawer(post)}
                                    aria-label="Open notes"
                                    className="text-stone-600 hover:text-stone-400 -mt-1 transition-opacity duration-200 flex-shrink-0"
                                  >
                                    <svg
                                      className="w-4 h-4"
                                      viewBox="0 0 16 16"
                                      fill="none"
                                      strokeWidth="1.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      aria-hidden="true"
                                    >
                                      <rect
                                        x="3"
                                        y="2.5"
                                        width="10"
                                        height="11"
                                        rx="1.5"
                                        fill="#fff"
                                        stroke="#fff"
                                      />
                                      <path d="M5.5 6h5" stroke="#000" />
                                      <path d="M5.5 8.5h5" stroke="#000" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            )
                          }

                          return (
                            <div className="flex-1 flex items-center justify-between">
                              <div className="flex items-center">
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
                                <button
                                  onClick={() => openNotesDrawer(post)}
                                  aria-label="Open notes"
                                  className={`ml-2.5 -mt-1 transition-opacity duration-200 flex-shrink-0 ${
                                    hasNotes ? 'hover:opacity-80' : 'text-stone-600 hover:text-stone-400'
                                  }`}
                                >
                                  <svg
                                    className="w-4 h-4"
                                    viewBox="0 0 16 16"
                                    fill="none"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                  >
                                    <rect
                                      x="3"
                                      y="2.5"
                                      width="10"
                                      height="11"
                                      rx="1.5"
                                      fill={hasNotes ? '#fff' : '#000'}
                                      stroke={hasNotes ? '#fff' : 'currentColor'}
                                    />
                                    <path
                                      d="M5.5 6h5"
                                      stroke={hasNotes ? '#000' : 'currentColor'}
                                    />
                                    <path
                                      d="M5.5 8.5h5"
                                      stroke={hasNotes ? '#000' : 'currentColor'}
                                    />
                                  </svg>
                                </button>
                              </div>
                              <button
                                onClick={() => toggleSave(post.id, post)}
                                aria-pressed={savedIds.has(post.id)}
                                aria-label={savedIds.has(post.id) ? 'Unsave post' : 'Save post'}
                                className={`-mt-1 flex-shrink-0 transition-none ${
                                  savedIds.has(post.id)
                                    ? 'text-[#7a9b6f] hover:text-[#8fb084]'
                                    : 'text-stone-600 hover:text-stone-400'
                                }`}
                              >
                                <PlusIcon saved={savedIds.has(post.id)} size={18} />
                              </button>
                            </div>
                          )
                        })()}
                        <div className="md:w-14 md:h-14 w-12 h-12 flex-shrink-0" aria-hidden="true" />
                      </div>
                    )}
                  </div>

                  {/* Thin divider - between posts (not before first) */}
                  {index < posts.length - 1 && (
                    <div
                      className={`mb-2 pl-9 md:pl-11 ${
                        post.note ? 'mt-1' : 'mt-0.5'
                      }`}
                    >
                      <div className="h-px bg-stone-800" />
                    </div>
                  )}
                    </div>
                  ))}
                </div>

                {!loading && (
                  <div className="text-center py-8">
                    {posts.length > 0 && (
                      <div className="mb-6 flex justify-center">
                        <div className="h-px bg-stone-800 w-1/2" />
                      </div>
                    )}
                    <p className="text-stone-500 text-sm">
                      that&apos;s the latest.
                      <br />
                      to see more, visit a friend&apos;s profile.
                    </p>
                  </div>
                )}
              </>
            )}
        </>

      </div>

      {/* Bottom Bar - Fixed */}
      <div className="fixed bottom-0 left-0 right-0 bg-black z-20">
        {/* Separator line */}
        <div className="h-px bg-stone-800 flex-shrink-0" />

        {searchExpanded ? (
          /* Partial-width search mode with about visible */
          <div className="relative flex items-end w-full px-6 md:px-8 py-6 gap-6">
            <button
              onClick={() => setAboutOpen(true)}
              type="button"
              className="text-stone-500 text-xs font-medium hover:text-stone-400 transition-colors lowercase"
            >
              about
            </button>

            <Link
              href="/share"
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-[#2d5016] text-black shadow-md transition-colors hover:bg-[#3a6b1e] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7a9b6f] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              aria-label="Share something new"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <rect x="9.5" y="2" width="5" height="20" />
                <rect x="2" y="9.5" width="20" height="5" />
              </svg>
            </Link>

            <div className="relative w-full max-w-[33%] min-w-[240px] ml-auto">
              {/* Search results - floating above input */}
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
                            <span className="md:text-sm text-xs text-stone-200 font-bold lowercase group-hover:text-[#7a9b6f] transition-colors">
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
          /* Collapsed mode - about left, share center, search right */
          <div className="relative max-w-2xl mx-auto px-6 md:px-8 py-6 flex items-center justify-between">
            <button
              onClick={() => setAboutOpen(true)}
              type="button"
              className="text-stone-500 text-xs font-medium hover:text-stone-400 transition-colors lowercase"
            >
              about
            </button>
            <Link
              href="/share"
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-[#2d5016] text-black shadow-md transition-colors hover:bg-[#3a6b1e] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7a9b6f] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              aria-label="Share something new"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <rect x="9.5" y="2" width="5" height="20" />
                <rect x="2" y="9.5" width="20" height="5" />
              </svg>
            </Link>
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

      {/* About modal */}
      {aboutOpen && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setAboutOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="about-title"
        >
          <div
            className="bg-black border border-stone-800 rounded-lg max-w-[420px] w-full p-8 flex flex-col items-center text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-6" id="about-title">
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
            <AboutText />
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

      {/* Notes drawer */}
      {notesDrawerPost && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 px-4 pb-4"
          onClick={closeNotesDrawer}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-2xl bg-black border border-stone-800 rounded-2xl pt-3 pb-6 px-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeNotesDrawer}
              aria-label="Close notes"
              className="absolute right-4 top-4 text-stone-500 hover:text-stone-300 transition-colors"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            <div className="mx-auto h-1 w-10 rounded-full bg-stone-700 mb-4" />
            <div className="flex items-start gap-3 mb-4">
              <div
                className="w-9 h-9 rounded-full flex-shrink-0"
                style={{ backgroundColor: notesDrawerPost.user.avatar_color }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-stone-500">
                  <span className="text-stone-200 font-bold lowercase">
                    {notesDrawerPost.user.username}
                  </span>
                  <span className="text-stone-700">·</span>
                  <span className="flex items-center gap-1.5 text-stone-500">
                    <MediaTypeFilledIcon
                      mediaType={notesDrawerPost.media_item.media_type}
                      size={12}
                    />
                    {getMediaTypeLabel(notesDrawerPost.media_item.media_type)}
                  </span>
                </div>
                <div className="text-stone-200 text-base font-medium mt-1">
                  <span className="font-bold">{notesDrawerPost.media_item.title}</span>
                  {notesDrawerPost.media_item.creator && (
                    <span className="text-stone-500 ml-1">
                      by {notesDrawerPost.media_item.creator}
                    </span>
                  )}
                </div>
                {notesDrawerPost.note && (
                  <p className="text-stone-500 text-sm mt-1">
                    {notesDrawerPost.note}
                  </p>
                )}
              </div>
            </div>

            <div className="h-px bg-stone-800 mb-4" />

            <div className="text-xs uppercase tracking-wider text-stone-500 mb-2">
              notes
            </div>

            {notesLoading ? (
              <p className="text-stone-500 text-sm">loading notes...</p>
            ) : notesError ? (
              <p className="text-red-400 text-sm">{notesError}</p>
            ) : activeNotes.length === 0 ? (
              <p className="text-stone-500 text-sm">no notes yet</p>
            ) : (
              <div className="space-y-4">
                {activeNotes.map((note) => (
                  <div key={note.id} className="flex items-start gap-3">
                    <div
                      className="w-7 h-7 rounded-full flex-shrink-0"
                      style={{ backgroundColor: note.user.avatar_color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 text-xs text-stone-500">
                        <div className="flex items-center gap-2">
                          <span className="text-stone-200 font-bold lowercase">
                            {note.user.username}
                          </span>
                          <span className="text-stone-700">·</span>
                          <span>{formatTimeAgo(note.created_at)}</span>
                        </div>
                        {currentUser?.user?.id === note.user_id && (
                          <button
                            type="button"
                            onClick={() => handleDeleteNote(note.id)}
                            disabled={noteDeletingIds.has(note.id)}
                            className="text-stone-500 hover:text-stone-300 transition-colors disabled:opacity-50"
                            aria-label="Delete note"
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
                        )}
                      </div>
                      <p className="text-stone-300 text-sm mt-1">{note.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {hasNoted ? (
              <p className="text-stone-500 text-xs mt-6 italic text-right">
                you already left a note
              </p>
            ) : (
              <form
                className="mt-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (noteIsValid && !noteSending) {
                    handleSendNote()
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-7 h-7 rounded-full flex-shrink-0"
                    style={{ backgroundColor: currentUser?.user.avatar_color ?? '#3f3f46' }}
                  />
                  <input
                    type="text"
                    value={noteInput}
                    onChange={(e) => {
                      if (e.target.value.length <= MAX_POST_TEXT_LENGTH) {
                        setNoteInput(e.target.value)
                      }
                    }}
                    maxLength={MAX_POST_TEXT_LENGTH}
                    placeholder="leave a note..."
                    className="flex-1 bg-stone-900 text-stone-200 placeholder-stone-500 px-4 py-2 rounded-full outline-none border border-stone-800 focus:border-stone-700 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!noteIsValid || noteSending}
                    className={`text-sm font-medium transition-colors ${
                      noteIsValid && !noteSending
                        ? 'text-[#7a9b6f] hover:text-[#8fb084]'
                        : 'text-stone-600 cursor-not-allowed'
                    }`}
                  >
                    {noteSending ? 'sending...' : 'send'}
                  </button>
                </div>
                {noteSendError && (
                  <p className="text-red-400 text-xs mt-2">{noteSendError}</p>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function FeedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-stone-500">thinking...</div>
        </div>
      }
    >
      <FeedPageContent />
    </Suspense>
  )
}
