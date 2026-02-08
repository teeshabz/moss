'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type {
  FollowListResponse,
  PaginatedUserResponse,
  SearchUser,
  UserMeResponse,
} from '@/lib/types'
import { MossIcon } from '@/lib/components/MossIcon'

export default function FindFriendsPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<UserMeResponse | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchCursor, setSearchCursor] = useState<string | undefined>()
  const [searchHasMore, setSearchHasMore] = useState(true)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [suggestedUsers, setSuggestedUsers] = useState<SearchUser[]>([])
  const [suggestedLoading, setSuggestedLoading] = useState(false)
  const [suggestedCursor, setSuggestedCursor] = useState<string | undefined>()
  const [suggestedHasMore, setSuggestedHasMore] = useState(true)
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const searchRequestRef = useRef<string | null>(null)
  const suggestionRequestRef = useRef<string | null>(null)
  const searchLoadingRef = useRef(false)
  const suggestedLoadingRef = useRef(false)

  const profileHref = useMemo(() => {
    const username = currentUser?.user?.username
    return username ? `/profile/${encodeURIComponent(username)}` : '/profile'
  }, [currentUser?.user?.username])

  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const res = await fetch('/api/users/me')
        if (res.ok) {
          const data: UserMeResponse = await res.json()
          setCurrentUser(data)
        } else if (res.status === 401) {
          router.push('/onboarding')
        }
      } catch {
        // ignore
      }
    }
    loadCurrentUser()
  }, [router])

  useEffect(() => {
    async function loadFollowing() {
      const username = currentUser?.user?.username
      if (!username) return
      try {
        const res = await fetch(
          `/api/users/${encodeURIComponent(username)}/following?limit=50`
        )
        if (!res.ok) return
        const data: FollowListResponse = await res.json()
        const ids = new Set<string>(data.users.map((user) => user.id))
        setFollowingIds(ids)
      } catch {
        // ignore
      }
    }
    loadFollowing()
  }, [currentUser?.user?.username])

  const loadSuggestions = useCallback(async (cursor?: string) => {
    if (suggestedLoadingRef.current) return
    const requestKey = cursor ?? 'start'
    if (suggestionRequestRef.current === requestKey) return
    suggestionRequestRef.current = requestKey
    try {
      suggestedLoadingRef.current = true
      setSuggestedLoading(true)
      const cursorParam = cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''
      const res = await fetch(`/api/users/suggestions?limit=20${cursorParam}`)
      if (!res.ok) {
        if (!cursor) setSuggestedUsers([])
        setSuggestedHasMore(false)
        return
      }
      const data: PaginatedUserResponse = await res.json()
      setSuggestedUsers((prev) => {
        if (!cursor) return data.users
        const existingIds = new Set(prev.map((user) => user.id))
        const newItems = data.users.filter((user) => !existingIds.has(user.id))
        return [...prev, ...newItems]
      })
      setSuggestedCursor(data.nextCursor)
      setSuggestedHasMore(Boolean(data.nextCursor))
    } catch {
      if (!cursor) setSuggestedUsers([])
      setSuggestedHasMore(false)
    } finally {
      suggestedLoadingRef.current = false
      setSuggestedLoading(false)
    }
  }, [])

  const loadSearchResults = useCallback(async (query: string, cursor?: string) => {
    if (searchLoadingRef.current) return
    const requestKey = `${query}|${cursor ?? 'start'}`
    if (searchRequestRef.current === requestKey) return
    searchRequestRef.current = requestKey
    try {
      searchLoadingRef.current = true
      setSearchLoading(true)
      const cursorParam = cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''
      const res = await fetch(
        `/api/search/users?q=${encodeURIComponent(query)}&limit=20${cursorParam}`
      )
      if (!res.ok) {
        if (!cursor) setSearchResults([])
        setSearchHasMore(false)
        return
      }
      const data: PaginatedUserResponse = await res.json()
      setSearchResults((prev) => {
        if (!cursor) return data.users
        const existingIds = new Set(prev.map((user) => user.id))
        const newItems = data.users.filter((user) => !existingIds.has(user.id))
        return [...prev, ...newItems]
      })
      setSearchCursor(data.nextCursor)
      setSearchHasMore(Boolean(data.nextCursor))
    } catch {
      if (!cursor) setSearchResults([])
      setSearchHasMore(false)
    } finally {
      searchLoadingRef.current = false
      setSearchLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!searchQuery.trim()) {
      if (suggestedUsers.length === 0) {
        loadSuggestions()
      }
      suggestionRequestRef.current = null
      return
    }

    setSearchResults([])
    setSearchCursor(undefined)
    setSearchHasMore(true)
    searchRequestRef.current = null

    searchDebounceRef.current = setTimeout(() => {
      loadSearchResults(searchQuery.trim())
    }, 250)

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current)
      }
    }
  }, [searchQuery, loadSearchResults, loadSuggestions, suggestedUsers.length])

  useEffect(() => {
    if (searchQuery.trim()) return
    if (suggestedUsers.length === 0 && !suggestedLoading) {
      loadSuggestions()
    }
  }, [searchQuery, suggestedUsers.length, suggestedLoading, loadSuggestions])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return
        const query = searchQuery.trim()
        if (query) {
          if (searchHasMore && !searchLoading && searchCursor) {
            loadSearchResults(query, searchCursor)
          }
        } else if (suggestedHasMore && !suggestedLoading && suggestedCursor) {
          loadSuggestions(suggestedCursor)
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [
    searchQuery,
    searchHasMore,
    searchLoading,
    searchCursor,
    suggestedHasMore,
    suggestedLoading,
    suggestedCursor,
    loadSearchResults,
    loadSuggestions,
  ])

  const handleFollowToggle = useCallback(async (user: SearchUser, isFollowing: boolean) => {
    if (updatingIds.has(user.id)) return
    setUpdatingIds((prev) => new Set(prev).add(user.id))
    try {
      const res = await fetch(
        `/api/users/${encodeURIComponent(user.username)}/follow`,
        { method: isFollowing ? 'DELETE' : 'POST' }
      )
      if (!res.ok) {
        throw new Error('Failed to update follow')
      }
      setFollowingIds((prev) => {
        const next = new Set(prev)
        if (isFollowing) {
          next.delete(user.id)
        } else {
          next.add(user.id)
        }
        return next
      })
    } catch (error) {
      console.error('Error updating follow:', error)
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev)
        next.delete(user.id)
        return next
      })
    }
  }, [updatingIds])

  return (
    <div className="min-h-screen bg-black text-white pb-28">
      <div className="sticky top-0 bg-black z-20">
        <div className="max-w-2xl mx-auto px-4 md:px-8 pt-6 pb-4 flex items-center justify-between">
          <Link href={profileHref} className="text-white text-2xl hover:text-gray-300">
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

        <div className="max-w-2xl mx-auto px-4 md:px-8 pt-2 pb-4">
          <h1 className="text-2xl font-bold text-stone-200 lowercase">find friends</h1>

          <div className="mt-3">
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
                placeholder="search by username"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-stone-900 text-stone-200 placeholder-stone-600 font-medium pl-11 pr-4 py-3 rounded-full outline-none border border-stone-800 focus:border-stone-700 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-8 pt-6 pb-24 overflow-y-auto scrollbar-hide">
          {searchLoading && searchQuery.trim() && searchResults.length === 0 && (
            <div className="text-stone-500 text-sm py-3">searching...</div>
          )}

          {(!searchQuery.trim() && suggestedLoading && suggestedUsers.length === 0) && (
            <div className="text-stone-500 text-sm py-3">loading...</div>
          )}

          {(searchQuery.trim() ? searchResults : suggestedUsers).map((user) => {
            const isFollowing = followingIds.has(user.id)
            const isUpdating = updatingIds.has(user.id)
            return (
              <div
                key={user.id}
                className="flex items-center justify-between py-3 border-b border-stone-800/50 last:border-0"
              >
                <button
                  type="button"
                  onClick={() => router.push(`/profile/${encodeURIComponent(user.username)}`)}
                  className="flex items-center gap-3 text-left min-w-0"
                >
                  <div
                    className="w-10 h-10 rounded-full flex-shrink-0"
                    style={{ backgroundColor: user.avatar_color }}
                  />
                  <span className="text-stone-200 font-bold lowercase truncate">
                    {user.username}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFollowToggle(user, isFollowing)}
                  disabled={isUpdating}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold lowercase transition-colors ${
                    isFollowing
                      ? 'bg-stone-800 text-stone-400'
                      : 'bg-[#2d5016] text-white'
                  } ${isUpdating ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {isFollowing ? 'following' : 'follow'}
                </button>
              </div>
            )
          })}
          <div ref={sentinelRef} className="h-6" />
        </div>

      <div className="fixed bottom-0 left-0 right-0 bg-black z-20">
        <div className="h-px bg-stone-800 flex-shrink-0" />
        <div className="max-w-2xl mx-auto px-4 md:px-8 py-4">
          <Link
            href="/feed?tab=following"
            className="w-full inline-flex items-center justify-center bg-stone-200 text-black rounded-full text-sm font-bold lowercase py-3 hover:bg-white transition-colors"
          >
            go to feed
          </Link>
        </div>
      </div>
    </div>
  )
}
