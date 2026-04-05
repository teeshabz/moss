'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import type {
  FollowListResponse,
  FollowListUser,
  UserMeResponse,
} from '@/lib/types'
import { MossIcon } from '@/lib/components/MossIcon'

export default function ProfileFollowingPage() {
  const params = useParams()
  const router = useRouter()
  const username = params.username as string

  const [users, setUsers] = useState<FollowListUser[]>([])
  const [followingCount, setFollowingCount] = useState<number | null>(null)
  const [nextCursor, setNextCursor] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())
  const [viewerId, setViewerId] = useState<string | null>(null)

  useEffect(() => {
    async function loadMe() {
      try {
        const res = await fetch('/api/users/me')
        if (res.ok) {
          const data: UserMeResponse = await res.json()
          if (data.user?.id) setViewerId(data.user.id)
        }
      } catch {
        // ignore; follow buttons still work for other rows
      }
    }
    loadMe()
  }, [])

  const load = useCallback(
    async (cursor?: string) => {
      if (!username) return
      try {
        if (cursor) setLoadingMore(true)
        else {
          setLoading(true)
          setError(null)
        }
        const u = encodeURIComponent(username)
        const url = cursor
          ? `/api/users/${u}/following?limit=50&cursor=${encodeURIComponent(cursor)}`
          : `/api/users/${u}/following?limit=50`
        const res = await fetch(url)
        if (!res.ok) {
          if (res.status === 404) {
            setError('User not found')
          } else if (res.status === 401) {
            router.push('/login')
            return
          } else {
            throw new Error('Failed to load')
          }
          return
        }
        const data: FollowListResponse = await res.json()
        setUsers((prev) => (cursor ? [...prev, ...data.users] : data.users))
        setNextCursor(data.nextCursor)
        if (typeof data.followingCount === 'number') {
          setFollowingCount(data.followingCount)
        }
      } catch {
        setError('Failed to load following. Please try again.')
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [username, router]
  )

  useEffect(() => {
    load()
  }, [load])

  const handleViewProfile = useCallback(
    (u: string) => {
      router.push(
        `/profile/${encodeURIComponent(u)}?from=following&listOwner=${encodeURIComponent(username)}`
      )
    },
    [router, username]
  )

  const handleUnfollow = useCallback(async (targetUsername: string) => {
    if (updatingIds.has(targetUsername)) return
    setUpdatingIds((prev) => new Set(prev).add(targetUsername))
    try {
      const res = await fetch(
        `/api/users/${encodeURIComponent(targetUsername)}/follow`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error('Failed to unfollow')
      setUsers((prev) =>
        prev.map((u) =>
          u.username === targetUsername ? { ...u, isFollowing: false } : u
        )
      )
    } catch {
      setError('Failed to unfollow. Please try again.')
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev)
        next.delete(targetUsername)
        return next
      })
    }
  }, [updatingIds])

  const handleFollow = useCallback(
    async (userRow: FollowListUser) => {
      if (updatingIds.has(userRow.username)) return
      setUpdatingIds((prev) => new Set(prev).add(userRow.username))
      try {
        const res = await fetch(
          `/api/users/${encodeURIComponent(userRow.username)}/follow`,
          { method: 'POST' }
        )
        if (!res.ok) throw new Error('Failed to follow')
        setUsers((prev) =>
          prev.map((u) =>
            u.username === userRow.username ? { ...u, isFollowing: true } : u
          )
        )
      } catch {
        setError('Failed to follow. Please try again.')
      } finally {
        setUpdatingIds((prev) => {
          const next = new Set(prev)
          next.delete(userRow.username)
          return next
        })
      }
    },
    [updatingIds]
  )

  return (
    <div className="min-h-screen bg-black text-white pb-14">
      <div className="sticky top-0 bg-black/90 backdrop-blur-sm z-10 border-b border-stone-700">
        <div className="max-w-2xl mx-auto px-4 md:px-8 pt-6 pb-4 flex items-center justify-between">
          <div className="w-8 flex-shrink-0" aria-hidden />
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
          <h1 className="text-xl font-bold text-stone-200 lowercase m-0">
            {username}&apos;s people
          </h1>
          <p className="text-xs text-stone-500 lowercase mt-1 m-0">
            {followingCount === null
              ? 'following: …'
              : `following: ${followingCount}`}
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-8 pt-2">
        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded text-red-400 text-sm">
            {error}
            <button
              type="button"
              onClick={() => setError(null)}
              className="ml-2 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {loading && users.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-stone-500">loading...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-stone-500 text-lg">not following anyone yet</p>
          </div>
        ) : (
          <div className="flex flex-col pr-1">
            <div>
              {users.map((userRow) => {
                const isUpdating = updatingIds.has(userRow.username)
                const isFollowing = Boolean(userRow.isFollowing)
                const isViewer = viewerId !== null && userRow.id === viewerId

                return (
                  <div
                    key={userRow.id}
                    className="flex items-center justify-between py-3 border-b border-stone-800/50"
                  >
                    <button
                      type="button"
                      onClick={() => handleViewProfile(userRow.username)}
                      className="flex items-center gap-3 text-left min-w-0"
                    >
                      <div
                        className="w-10 h-10 rounded-full flex-shrink-0"
                        style={{ backgroundColor: userRow.avatar_color }}
                      />
                      <span className="text-sm font-bold lowercase text-stone-200 truncate">
                        {userRow.username}
                      </span>
                    </button>

                    {!isViewer && (
                      <button
                        type="button"
                        onClick={() =>
                          isFollowing
                            ? handleUnfollow(userRow.username)
                            : handleFollow(userRow)
                        }
                        disabled={isUpdating}
                        className={`rounded-full px-3 py-1 text-xs font-bold lowercase transition-colors ${
                          isFollowing
                            ? 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                            : 'bg-[#2d5016] text-white hover:bg-[#3d6a1e]'
                        } ${isUpdating ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        {isFollowing ? 'following' : 'follow'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {nextCursor && (
              <div className="flex justify-center pt-4 pb-2">
                <button
                  type="button"
                  onClick={() => load(nextCursor)}
                  disabled={loadingMore}
                  className="text-sm font-bold lowercase text-stone-400 hover:text-stone-200 transition-colors disabled:opacity-50"
                >
                  {loadingMore ? 'loading...' : 'load more'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
