'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { FeedResponse, PostWithRelations } from '@/lib/types'

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

export default function FeedPage() {
  const [posts, setPosts] = useState<PostWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [nextCursor, setNextCursor] = useState<string | undefined>()
  const [hasMore, setHasMore] = useState(false)
  const router = useRouter()

  useEffect(() => {
    loadFeed()
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
    } catch (error) {
      console.error('Error loading feed:', error)
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

  if (loading && posts.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 bg-black/80 backdrop-blur-sm border-b border-gray-800 z-10">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link href="/feed" className="flex items-center gap-2">
            <span className="text-green-500 text-xl">*</span>
            <span className="text-green-500 text-lg font-bold">moss</span>
          </Link>

          {/* Share Button */}
          <Link
            href="/share"
            className="flex items-center gap-2 text-green-500 hover:text-green-400 transition-colors"
          >
            <span className="text-lg">★</span>
            <span className="text-sm font-medium">share</span>
          </Link>
        </div>
      </div>

      {/* Feed Content */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
        {posts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg mb-4">No posts yet</p>
            <Link
              href="/share"
              className="text-green-500 hover:text-green-400 transition-colors"
            >
              Share something →
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-0">
              {posts.map((post, index) => (
                <div key={post.id}>
                  {/* Post Content */}
                  <div className="py-6 flex gap-4">
                    {/* Left: User info and content */}
                    <div className="flex-1">
                      {/* User info */}
                      <div className="flex items-center gap-2 mb-3">
                        <div
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: post.user.avatar_color }}
                        />
                        <span className="text-sm text-gray-300">
                          {post.user.username}
                        </span>
                        <span className="text-gray-600">·</span>
                        <span className="text-sm text-gray-500 capitalize">
                          {getMediaTypeLabel(post.media_item.media_type)}
                        </span>
                        <span className="text-gray-600">·</span>
                        <span className="text-sm text-gray-500">
                          {formatTimeAgo(post.created_at)}
                        </span>
                      </div>

                      {/* Title */}
                      <h2 className="text-xl font-bold mb-1">
                        {post.media_item.title}
                      </h2>

                      {/* Creator */}
                      {post.media_item.creator && (
                        <p className="text-gray-400 text-sm mb-2">
                          by {post.media_item.creator}
                        </p>
                      )}

                      {/* Note */}
                      {post.note && (
                        <p className="text-gray-500 text-sm mb-3">
                          {post.note}
                        </p>
                      )}
                    </div>

                    {/* Right: Thumbnail and icon */}
                    <div className="flex items-start gap-2">
                      {post.media_item.cover_url && (
                        <div
                          className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0"
                          style={{
                            border: `2px solid ${post.user.avatar_color}40`,
                          }}
                        >
                          <img
                            src={post.media_item.cover_url}
                            alt={post.media_item.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      {/* Diamond icon placeholder */}
                      <button className="text-gray-600 hover:text-gray-400 transition-colors mt-1">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <path d="M8 2L12 6L8 14L4 6L8 2Z" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Divider - wavy line */}
                  {index < posts.length - 1 && (
                    <div className="border-t border-gray-800">
                      <svg
                        width="100%"
                        height="4"
                        viewBox="0 0 100 4"
                        preserveAspectRatio="none"
                        className="text-gray-800"
                      >
                        <path
                          d="M0,2 Q25,0 50,2 T100,2"
                          stroke="currentColor"
                          strokeWidth="1"
                          fill="none"
                        />
                      </svg>
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
                  className="text-green-500 hover:text-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Loading...' : 'Load more →'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
