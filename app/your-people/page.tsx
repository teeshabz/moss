'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type {
  FollowListResponse,
  FollowListUser,
  SearchUser,
  UserMeResponse,
  UserSearchResponse,
} from '@/lib/types'
import { MossIcon } from '@/lib/components/MossIcon'

type PeopleTab = 'following' | 'followers'

export default function YourPeoplePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<PeopleTab>('following')
  const [currentUser, setCurrentUser] = useState<UserMeResponse | null>(null)
  const [followingUsers, setFollowingUsers] = useState<FollowListUser[]>([])
  const [followerUsers, setFollowerUsers] = useState<FollowListUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())
  const [unfollowedIds, setUnfollowedIds] = useState<Set<string>>(new Set())
  const [searchExpanded, setSearchExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const loadList = useCallback(async (tab: PeopleTab) => {
    const username = currentUser?.user?.username
    if (!username) return
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(
        `/api/users/${encodeURIComponent(username)}/${tab}?limit=50`
      )
      if (!res.ok) {
        throw new Error('Failed to load people')
      }
      const data: FollowListResponse = await res.json()
      if (tab === 'following') {
        setFollowingUsers(data.users)
      } else {
        setFollowerUsers(data.users)
      }
    } catch (err) {
      console.error('Error loading your people:', err)
      setError('Failed to load your people. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [currentUser?.user?.username])

  useEffect(() => {
    loadList(activeTab)
  }, [activeTab, loadList])

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

  const handleViewProfile = useCallback((username: string) => {
    router.push(`/profile/${encodeURIComponent(username)}`)
  }, [router])

  const updateFollowingState = useCallback((username: string, isFollowing: boolean) => {
    setFollowerUsers((prev) =>
      prev.map((user) =>
        user.username === username ? { ...user, isFollowing } : user
      )
    )
  }, [])

  const handleUnfollow = useCallback(async (username: string) => {
    if (updatingIds.has(username)) return
    setUpdatingIds((prev) => new Set(prev).add(username))
    try {
      const res = await fetch(
        `/api/users/${encodeURIComponent(username)}/follow`,
        { method: 'DELETE' }
      )
      if (!res.ok) {
        throw new Error('Failed to unfollow')
      }
      setUnfollowedIds((prev) => new Set(prev).add(username))
      updateFollowingState(username, false)
    } catch (err) {
      console.error('Error unfollowing:', err)
      setError('Failed to unfollow. Please try again.')
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev)
        next.delete(username)
        return next
      })
    }
  }, [updatingIds, updateFollowingState])

  const handleFollowBack = useCallback(async (user: FollowListUser) => {
    if (updatingIds.has(user.username)) return
    setUpdatingIds((prev) => new Set(prev).add(user.username))
    try {
      const res = await fetch(
        `/api/users/${encodeURIComponent(user.username)}/follow`,
        { method: 'POST' }
      )
      if (!res.ok) {
        throw new Error('Failed to follow back')
      }
      setUnfollowedIds((prev) => {
        const next = new Set(prev)
        next.delete(user.username)
        return next
      })
      updateFollowingState(user.username, true)
      setFollowingUsers((prev) => {
        if (prev.some((row) => row.username === user.username)) return prev
        return [
          {
            ...user,
            isFollowing: true,
          },
          ...prev,
        ]
      })
    } catch (err) {
      console.error('Error following back:', err)
      setError('Failed to follow back. Please try again.')
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev)
        next.delete(user.username)
        return next
      })
    }
  }, [updatingIds, updateFollowingState])

  const activeUsers = activeTab === 'following' ? followingUsers : followerUsers

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="sticky top-0 bg-black/90 backdrop-blur-sm z-10">
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

        <div className="max-w-2xl mx-auto px-4 md:px-8 pb-4">
          <h1 className="text-xl font-bold text-stone-200 lowercase">your people</h1>
          <div className="border-b border-stone-700 mt-4">
            <div className="flex gap-6 justify-center">
              <button
                onClick={() => setActiveTab('following')}
                className={`pb-2 text-sm font-bold lowercase tracking-wider border-b-2 transition-colors ${
                  activeTab === 'following'
                    ? 'text-white border-[#7a9b6f]'
                    : 'text-stone-500 border-transparent hover:text-stone-400'
                }`}
              >
                following
              </button>
              <button
                onClick={() => setActiveTab('followers')}
                className={`pb-2 text-sm font-bold lowercase tracking-wider border-b-2 transition-colors ${
                  activeTab === 'followers'
                    ? 'text-white border-[#7a9b6f]'
                    : 'text-stone-500 border-transparent hover:text-stone-400'
                }`}
              >
                followers
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-8 pt-2">
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

        {loading && activeUsers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-stone-500">loading...</p>
          </div>
        ) : activeUsers.length === 0 ? (
          <div className="text-center py-16">
            {activeTab === 'following' ? (
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
              <p className="text-stone-500 text-lg">no followers yet</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col">
            {activeTab === 'following' && (
              <div className="pt-2 pb-3 flex justify-center">
                <Link
                  href="/find-friends"
                  className="inline-flex items-center px-5 py-2 rounded-full bg-[#2d5016] text-white text-sm font-bold lowercase hover:bg-[#3d6a1e] transition-colors"
                >
                  find friends
                </Link>
              </div>
            )}
            <div className="max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
              {activeUsers.map((user) => {
                const isUpdating = updatingIds.has(user.username)
                const isFollowing = activeTab === 'following'
                  ? !unfollowedIds.has(user.username)
                  : Boolean(user.isFollowing)

                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between py-3 border-b border-stone-800/50"
                  >
                    <button
                      type="button"
                      onClick={() => handleViewProfile(user.username)}
                      className="flex items-center gap-3 text-left min-w-0"
                    >
                      <div
                        className="w-10 h-10 rounded-full flex-shrink-0"
                        style={{ backgroundColor: user.avatar_color }}
                      />
                      <span className="text-sm font-bold lowercase text-stone-200 truncate">
                        {user.username}
                      </span>
                    </button>

                    {activeTab === 'following' ? (
                      <button
                        type="button"
                        onClick={() =>
                          isFollowing ? handleUnfollow(user.username) : handleFollowBack(user)
                        }
                        disabled={isUpdating}
                        className={`rounded-full px-4 py-1.5 text-xs font-bold lowercase transition-colors ${
                          isFollowing
                            ? 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                            : 'bg-[#2d5016] text-white hover:bg-[#3d6a1e]'
                        } ${isUpdating ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        {isFollowing ? 'following' : 'follow'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          isFollowing ? handleUnfollow(user.username) : handleFollowBack(user)
                        }
                        disabled={isUpdating}
                        className={`rounded-full px-4 py-1.5 text-xs font-bold lowercase transition-colors ${
                          isFollowing
                            ? 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                            : 'bg-[#2d5016] text-white hover:bg-[#3d6a1e]'
                        } ${isUpdating ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        {isFollowing ? 'following' : 'follow back'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom bar - search for friends */}
      <div className="fixed bottom-0 left-0 right-0 bg-black z-20">
        <div className="h-px bg-stone-800 flex-shrink-0" />

        {searchExpanded ? (
          <div className="flex items-end w-full max-w-2xl mx-auto px-4 md:px-8 py-4 gap-6">
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <div className="w-10" />
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
          <div className="max-w-2xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <div className="w-10" />
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
