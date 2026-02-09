'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { SignOutButton } from '@clerk/nextjs'
import type {
  FeedResponse,
  NoteWithAuthor,
  NotesResponse,
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
  const NOTE_MAX_LENGTH = 60
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
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
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [smilingIds, setSmilingIds] = useState<Set<string>>(new Set())
  const [pings, setPings] = useState<PingItem[]>([])
  const [pingsLoading, setPingsLoading] = useState(false)
  const [pingsError, setPingsError] = useState<string | null>(null)
  const [pingsLoaded, setPingsLoaded] = useState(false)
  const [hasUnreadPings, setHasUnreadPings] = useState(false)
  const [postSliderPost, setPostSliderPost] = useState<PostWithRelations | null>(null)
  const [postSliderLoading, setPostSliderLoading] = useState(false)
  const [postSliderError, setPostSliderError] = useState<string | null>(null)
  const [searchExpanded, setSearchExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [notesDrawerPost, setNotesDrawerPost] = useState<PostWithRelations | null>(null)
  const [notesByPostId, setNotesByPostId] = useState<Record<string, NoteWithAuthor[]>>({})
  const [notesHasNoted, setNotesHasNoted] = useState<Record<string, boolean>>({})
  const [notesLoading, setNotesLoading] = useState(false)
  const [notesError, setNotesError] = useState<string | null>(null)
  const [noteInput, setNoteInput] = useState('')
  const [noteSending, setNoteSending] = useState(false)
  const [noteSendError, setNoteSendError] = useState<string | null>(null)
  const [noteDeletingIds, setNoteDeletingIds] = useState<Set<string>>(new Set())
  const [followUpdating, setFollowUpdating] = useState(false)
  const [pingsFollowByActorId, setPingsFollowByActorId] = useState<Record<string, boolean>>({})
  const [pingsFollowUpdatingActorId, setPingsFollowUpdatingActorId] = useState<string | null>(null)

  const isOwnProfile =
    currentUser?.user?.username?.toLowerCase() === username?.toLowerCase()

  useEffect(() => {
    async function loadCurrentUser() {
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

    const timeoutId = setTimeout(() => {
      checkUnreadPings()
    }, 800)
    return () => {
      isCancelled = true
      clearTimeout(timeoutId)
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

  // Open pings tab when returning from a ping link (e.g. back from another user's profile)
  useEffect(() => {
    if (searchParams.get('tab') === 'pings' && isOwnProfile) {
      setActiveTab('pings')
    }
  }, [searchParams, isOwnProfile])

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
        setSavedItems((prev) => prev.filter((item) => item.id !== postId))
      } else if (post && isOwnProfile) {
        setSavedItems((prev) => [post, ...prev])
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

  const openPostInSlider = useCallback(
    async (postId: string) => {
      const inProfile = profile?.items.find((p) => p.id === postId)
      if (inProfile) {
        setPostSliderPost(inProfile)
        setPostSliderError(null)
        return
      }
      setPostSliderLoading(true)
      setPostSliderError(null)
      try {
        const res = await fetch(`/api/posts/${postId}`)
        if (!res.ok) {
          if (res.status === 404) throw new Error('Post not found')
          throw new Error('Failed to load post')
        }
        const post: PostWithRelations = await res.json()
        setPostSliderPost(post)
      } catch (e) {
        setPostSliderError(e instanceof Error ? e.message : 'Failed to load post')
        setPostSliderPost(null)
      } finally {
        setPostSliderLoading(false)
      }
    },
    [profile?.items]
  )

  const closePostSlider = useCallback(() => {
    setPostSliderPost(null)
    setPostSliderError(null)
  }, [])

  const handleSendNote = useCallback(async () => {
    if (!notesDrawerPost) return
    const trimmed = noteInput.trim()
    if (trimmed.length < 1 || trimmed.length > NOTE_MAX_LENGTH) return

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
  }, [noteInput, notesDrawerPost, NOTE_MAX_LENGTH])

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
    && noteInput.trim().length <= NOTE_MAX_LENGTH

  const isFollowing = Boolean(profile?.user.isFollowing)

  const handleFollowToggle = useCallback(async () => {
    if (!profile || isOwnProfile || followUpdating) return
    const nextValue = !isFollowing
    setFollowUpdating(true)
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            user: {
              ...prev.user,
              isFollowing: nextValue,
              followerCount: Math.max(
                0,
                (prev.user.followerCount ?? 0) + (nextValue ? 1 : -1)
              ),
            },
          }
        : prev
    )
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(username)}/follow`, {
        method: nextValue ? 'POST' : 'DELETE',
      })
      if (!res.ok) {
        throw new Error('Failed to update follow')
      }
    } catch (error) {
      console.error('Error updating follow:', error)
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              user: {
                ...prev.user,
                isFollowing: !nextValue,
                followerCount: Math.max(
                  0,
                  (prev.user.followerCount ?? 0) + (nextValue ? -1 : 1)
                ),
              },
            }
          : prev
      )
      setError('Failed to update follow. Please try again.')
    } finally {
      setFollowUpdating(false)
    }
  }, [profile, isOwnProfile, followUpdating, isFollowing, username])

  const handlePingFollowToggle = useCallback(
    async (ping: PingItem) => {
      if (!ping.actor?.username || pingsFollowUpdatingActorId) return
      const actorId = ping.actor_user_id
      const current = pingsFollowByActorId[actorId] ?? ping.actorIsFollowing ?? false
      const nextValue = !current
      setPingsFollowUpdatingActorId(actorId)
      setPingsFollowByActorId((prev) => ({ ...prev, [actorId]: nextValue }))
      try {
        const res = await fetch(
          `/api/users/${encodeURIComponent(ping.actor.username)}/follow`,
          { method: nextValue ? 'POST' : 'DELETE' }
        )
        if (!res.ok) throw new Error('Failed to update follow')
      } catch (error) {
        console.error('Error updating follow from ping:', error)
        setPingsFollowByActorId((prev) => ({ ...prev, [actorId]: current }))
      } finally {
        setPingsFollowUpdatingActorId(null)
      }
    },
    [pingsFollowByActorId, pingsFollowUpdatingActorId]
  )

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
      {/* Header: back + logo + profile header + tabs */}
      <div className="sticky top-0 bg-black/90 backdrop-blur-sm z-10">
        <div className="max-w-4xl mx-auto px-4 md:px-8 pt-6 pb-4 flex items-center justify-between">
          {searchParams.get('from') === 'pings' &&
          currentUser?.user?.username &&
          !isOwnProfile ? (
            <Link
              href={`/profile/${encodeURIComponent(currentUser.user.username)}?tab=pings`}
              className="text-white text-2xl hover:text-gray-300"
            >
              ←
            </Link>
          ) : (
            <Link href="/feed" className="text-white text-2xl hover:text-gray-300">
              ←
            </Link>
          )}
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
          {/* Profile header: avatar, username, settings */}
          <div className="flex items-center gap-4 mb-2">
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
            <h1
              className={`font-bold lowercase truncate ${
                isOwnProfile ? 'text-2xl' : 'text-lg'
              }`}
            >
              {user.username}
            </h1>
          </div>
          {isOwnProfile ? (
            <div className="w-14" />
          ) : (
            <button
              type="button"
              onClick={handleFollowToggle}
              disabled={followUpdating}
              className={`rounded-full px-5 py-2 text-sm font-bold lowercase transition-colors ${
                isFollowing
                  ? 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                  : 'bg-[#2d5016] text-white hover:bg-[#3d6a1e]'
              } ${followUpdating ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {isFollowing ? 'following' : 'follow'}
            </button>
          )}
        </div>

          {isOwnProfile && (
            <Link
              href="/your-people"
              className="inline-block mt-2 text-stone-500 text-xs font-medium lowercase hover:text-stone-300 transition-colors relative z-10 pointer-events-auto"
            >
              your people →
            </Link>
          )}

          {/* Tabs */}
          <div className={`border-b border-stone-700 ${isOwnProfile ? 'mt-4' : 'mt-2'}`}>
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
                  onClick={() => {
                    setActiveTab('pings')
                    setHasUnreadPings(false)
                  }}
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
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-8 pt-2 pb-6">

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
                {items.map((post: PostWithRelations, index) => {
                  const hasNotes =
                    (notesByPostId[post.id]?.length ?? (post.hasNotes ? 1 : 0)) > 0
                  const isOwnPost = currentUser?.user?.id === post.user.id
                  return (
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
                          <p className="md:text-sm text-xs text-stone-400 leading-relaxed line-clamp-3 mt-1 font-medium w-full text-left">
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

                    <div
                      className={`md:pl-11 pl-9 flex gap-3 ${
                        post.note ? 'mt-1.5' : 'mt-1'
                      }`}
                    >
                      <div className="flex-1 flex items-center justify-between">
                        <div className="flex items-center">
                          {currentUser?.user?.id && !isOwnPost && (
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
                          )}
                          {(() => {
                            const hasNotes =
                              (notesByPostId[post.id]?.length ?? (post.hasNotes ? 1 : 0)) > 0
                            return (
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
                            )
                          })()}
                        </div>
                        {currentUser?.user?.id && currentUser.user.id !== post.user.id && (
                          <button
                            onClick={() => toggleSave(post.id, post)}
                            disabled={savingIds.has(post.id)}
                            aria-pressed={savedIds.has(post.id)}
                            aria-label={savedIds.has(post.id) ? 'Unsave post' : 'Save post'}
                            className={`-mt-1 transition-colors duration-200 flex-shrink-0 ${
                              savedIds.has(post.id)
                                ? 'text-[#7a9b6f]'
                                : 'text-stone-600 hover:text-[#7a9b6f]'
                            } ${savingIds.has(post.id) ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            <PlusIcon saved={savedIds.has(post.id)} size={18} />
                          </button>
                        )}
                      </div>
                      <div className="md:w-14 md:h-14 w-12 h-12 flex-shrink-0" aria-hidden="true" />
                    </div>
                    {index < items.length - 1 && (
                      <div
                        className="mb-2 pl-9 md:pl-11 mt-1.5"
                      >
                        <div className="h-px bg-stone-800" />
                      </div>
                    )}
                  </div>
                )
                })}
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

            {deleteConfirmId && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
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
          <div className="mt-0">
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
                      <div className="mb-2 pl-9 md:pl-11 mt-2">
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
          </div>
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
                {pings.map((ping, index) => {
                  const actorUsername = ping.actor?.username
                  const profileHref = actorUsername ? `/profile/${encodeURIComponent(actorUsername)}` : null
                  const isPostPing = (ping.type === 'smile' || ping.type === 'note') && ping.post_id
                  return (
                  <div key={ping.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (isPostPing) {
                          openPostInSlider(ping.post_id!)
                        } else if (ping.type === 'follow' && profileHref) {
                          router.push(`${profileHref}?from=pings`)
                        }
                      }}
                      className={`w-full text-left flex items-center gap-4 rounded-lg transition-colors hover:bg-stone-900/40 ${index === 0 ? 'pt-1 pb-4' : 'py-4'}`}
                      aria-label={
                        ping.type === 'follow'
                          ? `View ${ping.actor?.username || 'user'} profile`
                          : `Open ${ping.postTitle || 'post'}`
                      }
                    >
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
                            {ping.type === 'note'
                              ? `added a note to "${ping.postTitle || 'a post'}"`
                              : ping.type === 'follow'
                                ? 'followed you'
                                : `smiled at "${ping.postTitle || 'a post'}"`}
                          </span>
                        </div>
                        <div className="text-xs text-stone-600 mt-1">
                          {formatTimeAgo(ping.created_at)}
                        </div>
                      </div>
                      {ping.type === 'follow' && ping.actor?.username && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handlePingFollowToggle(ping)
                          }}
                          disabled={pingsFollowUpdatingActorId === ping.actor_user_id}
                          className={`rounded-full px-4 py-1.5 text-xs font-bold lowercase transition-colors flex-shrink-0 ${
                            pingsFollowByActorId[ping.actor_user_id] ?? ping.actorIsFollowing
                              ? 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                              : 'bg-[#2d5016] text-white hover:bg-[#3d6a1e]'
                          } ${pingsFollowUpdatingActorId === ping.actor_user_id ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          {pingsFollowByActorId[ping.actor_user_id] ?? ping.actorIsFollowing
                            ? 'following'
                            : 'follow'}
                        </button>
                      )}
                      {ping.type !== 'follow' && (
                        <span className="text-[#7a9b6f] text-[14px] leading-none">
                          <span className="inline-block rotate-0">
                            {ping.type === 'note' ? (
                              <svg
                                className="w-4 h-4"
                                viewBox="0 0 16 16"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <rect x="3" y="2.5" width="10" height="11" rx="1.5" />
                                <path d="M5.5 6h5" />
                                <path d="M5.5 8.5h5" />
                              </svg>
                            ) : (
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
                            )}
                          </span>
                        </span>
                      )}
                    </button>
                    {index < pings.length - 1 && (
                      <div className="h-px bg-stone-800" />
                    )}
                  </div>
                  )
                })}
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

            {activeNotes.length > 0 && (
              <div className="h-px bg-stone-800 mb-4" />
            )}

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

            {notesDrawerPost && currentUser?.user?.id === notesDrawerPost.user.id ? (
              <p className="text-stone-500 text-xs mt-4 italic text-right">
                you can’t note your own post
              </p>
            ) : hasNoted ? (
              <p className="text-stone-500 text-sm mt-4 italic text-right">
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
                      if (e.target.value.length <= NOTE_MAX_LENGTH) {
                        setNoteInput(e.target.value)
                      }
                    }}
                    maxLength={NOTE_MAX_LENGTH}
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

      {/* Post slider (from pings: smile/note) - same slide-up as notes drawer */}
      {(postSliderPost || postSliderLoading || postSliderError) && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 px-4 pb-4"
          onClick={closePostSlider}
          role="dialog"
          aria-modal="true"
          aria-label="Post"
        >
          <div
            className="w-full max-w-2xl bg-black border border-stone-800 rounded-2xl pt-3 pb-6 px-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closePostSlider}
              aria-label="Close"
              className="absolute right-4 top-4 text-stone-500 hover:text-stone-300 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            <div className="mx-auto h-1 w-10 rounded-full bg-stone-700 mb-4" />
            <div>
              {postSliderLoading && (
                <div className="py-12 text-center text-stone-500">loading post...</div>
              )}
              {postSliderError && (
                <div className="py-8 text-center">
                  <p className="text-red-400 text-sm mb-4">{postSliderError}</p>
                  <button
                    type="button"
                    onClick={closePostSlider}
                    className="text-[#7a9b6f] hover:text-[#8fb084] text-sm font-medium"
                  >
                    close
                  </button>
                </div>
              )}
              {postSliderPost && !postSliderLoading && (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-8 h-8 rounded-full flex-shrink-0"
                      style={{ backgroundColor: postSliderPost.user.avatar_color }}
                    />
                    <div className="flex items-baseline gap-2 flex-1 flex-wrap min-w-0">
                      <span className="text-sm text-stone-200 font-bold lowercase">
                        {postSliderPost.user.username}
                      </span>
                      <span className="text-stone-700">·</span>
                      <span className="text-stone-400 flex items-center gap-1.5 text-xs">
                        <MediaTypeFilledIcon
                          mediaType={postSliderPost.media_item.media_type}
                          size={12}
                        />
                        {getMediaTypeLabel(postSliderPost.media_item.media_type)}
                      </span>
                      <span className="text-stone-700">·</span>
                      <span className="text-xs text-stone-600">
                        {formatTimeAgo(postSliderPost.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-base text-stone-200 leading-relaxed font-medium">
                        <span className="font-bold">{postSliderPost.media_item.title}</span>
                        {postSliderPost.media_item.creator && (
                          <span className="text-stone-500 ml-1">
                            by {postSliderPost.media_item.creator}
                          </span>
                        )}
                      </div>
                      {postSliderPost.note && (
                        <p className="text-sm text-stone-400 leading-relaxed mt-1">
                          {postSliderPost.note}
                        </p>
                      )}
                    </div>
                    {postSliderPost.media_item.cover_url && (
                      <div className="w-14 h-14 flex-shrink-0 bg-stone-900 overflow-hidden rounded">
                        <Image
                          src={postSliderPost.media_item.cover_url}
                          alt=""
                          className="w-full h-full object-cover"
                          width={56}
                          height={56}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-4 pt-3">
                    {currentUser?.user?.id && currentUser.user.id !== postSliderPost.user.id && (
                      <>
                        <button
                          onClick={() =>
                            handleSmileToggle(postSliderPost.id, postSliderPost.smiledByCurrentUser)
                          }
                          disabled={smilingIds.has(postSliderPost.id)}
                          aria-pressed={postSliderPost.smiledByCurrentUser}
                          className={`text-sm transition-colors ${
                            postSliderPost.smiledByCurrentUser
                              ? 'text-[#7a9b6f]'
                              : 'text-stone-600 hover:text-stone-400'
                          }`}
                        >
                          <span className={postSliderPost.smiledByCurrentUser ? '' : 'inline-block -rotate-90'}>
                            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                              <circle cx="5.4" cy="5.9" r="0.6" />
                              <circle cx="10.6" cy="5.9" r="0.6" />
                              <path d="M3.8 10.8c2.4 2.4 6.0 2.4 8.4 0" fill="none" />
                            </svg>
                          </span>
                        </button>
                        <button
                          onClick={() => {
                            closePostSlider()
                            openNotesDrawer(postSliderPost)
                          }}
                          aria-label="Open notes"
                          className="text-stone-600 hover:text-stone-400 transition-colors"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="2.5" width="10" height="11" rx="1.5" />
                            <path d="M5.5 6h5" />
                            <path d="M5.5 8.5h5" />
                          </svg>
                        </button>
                        <button
                          onClick={() => toggleSave(postSliderPost.id, postSliderPost)}
                          disabled={savingIds.has(postSliderPost.id)}
                          aria-pressed={savedIds.has(postSliderPost.id)}
                          className={`transition-colors ${
                            savedIds.has(postSliderPost.id)
                              ? 'text-[#7a9b6f]'
                              : 'text-stone-600 hover:text-[#7a9b6f]'
                          }`}
                        >
                          <PlusIcon saved={savedIds.has(postSliderPost.id)} size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
