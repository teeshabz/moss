'use client'

import { useState, FormEvent, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import type { CreatePostRequest, MediaType, UserMeResponse } from '@/lib/types'
import {
  BookIcon,
  NewspaperIcon,
  FilmIcon,
  MusicIcon,
  DiscIcon,
  PodcastIcon,
  LiveIcon,
} from '@/lib/components/SharePageMediaIcons'
import { MossIcon } from '@/lib/components/MossIcon'
import { AboutText } from '@/lib/components/AboutDialog'
import { MAX_POST_TEXT_LENGTH } from '@/lib/post-text-limit'

const validTypes = ['book', 'article', 'movie', 'song', 'album', 'podcast', 'live']

// Media type configuration
const mediaTypeConfig: Record<
  string,
  {
    color: string
    label: string
    fields: {
      label: string
      name: string
      placeholder: string
      required: boolean
      type: 'text' | 'textarea' | 'url'
    }[]
  }
> = {
  book: {
    color: '#c17a6f',
    label: 'book',
    fields: [
      {
        label: 'BOOK TITLE',
        name: 'title',
        placeholder: 'enter book title...',
        required: true,
        type: 'text',
      },
      {
        label: 'AUTHOR',
        name: 'author',
        placeholder: 'who wrote it?',
        required: true,
        type: 'text',
      },
      {
        label: 'NOTE',
        name: 'note',
        placeholder: 'your thoughts...',
        required: false,
        type: 'text',
      },
    ],
  },
  article: {
    color: '#8b5a3c',
    label: 'article',
    fields: [
      {
        label: 'LINK',
        name: 'url',
        placeholder: 'enter article URL...',
        required: true,
        type: 'url',
      },
      {
        label: 'TITLE',
        name: 'title',
        placeholder: 'enter article title...',
        required: true,
        type: 'text',
      },
      {
        label: 'AUTHOR',
        name: 'author',
        placeholder: 'who wrote it?',
        required: true,
        type: 'text',
      },
      {
        label: 'NOTE',
        name: 'note',
        placeholder: 'your thoughts...',
        required: false,
        type: 'text',
      },
    ],
  },
  movie: {
    color: '#5a7a8c',
    label: 'movie',
    fields: [
      {
        label: 'MOVIE TITLE',
        name: 'title',
        placeholder: 'enter movie title...',
        required: true,
        type: 'text',
      },
      {
        label: 'DIRECTOR',
        name: 'director',
        placeholder: 'who directed it?',
        required: true,
        type: 'text',
      },
      {
        label: 'NOTE',
        name: 'note',
        placeholder: 'your thoughts...',
        required: false,
        type: 'text',
      },
    ],
  },
  song: {
    color: '#b88b9d',
    label: 'song',
    fields: [
      {
        label: 'SONG TITLE',
        name: 'title',
        placeholder: 'enter song title...',
        required: true,
        type: 'text',
      },
      {
        label: 'ARTIST',
        name: 'artist',
        placeholder: 'who performed it?',
        required: true,
        type: 'text',
      },
      {
        label: 'NOTE',
        name: 'note',
        placeholder: 'your thoughts...',
        required: false,
        type: 'text',
      },
    ],
  },
  album: {
    color: '#7d5a8f',
    label: 'album',
    fields: [
      {
        label: 'ALBUM NAME',
        name: 'title',
        placeholder: 'enter album name...',
        required: true,
        type: 'text',
      },
      {
        label: 'ARTIST',
        name: 'artist',
        placeholder: 'who created it?',
        required: true,
        type: 'text',
      },
      {
        label: 'NOTE',
        name: 'note',
        placeholder: 'your thoughts...',
        required: false,
        type: 'text',
      },
    ],
  },
  podcast: {
    color: '#e07a5f',
    label: 'podcast',
    fields: [
      {
        label: 'TITLE',
        name: 'title',
        placeholder: 'enter podcast title...',
        required: true,
        type: 'text',
      },
      {
        label: 'HOST',
        name: 'host',
        placeholder: 'who hosts it?',
        required: true,
        type: 'text',
      },
      {
        label: 'NOTE',
        name: 'note',
        placeholder: 'your thoughts...',
        required: false,
        type: 'text',
      },
    ],
  },
  live: {
    color: '#6a9a8f',
    label: 'live',
    fields: [
      {
        label: 'TITLE',
        name: 'title',
        placeholder: 'enter live title...',
        required: true,
        type: 'text',
      },
      {
        label: 'CREATOR',
        name: 'creator',
        placeholder: 'who created it?',
        required: true,
        type: 'text',
      },
      {
        label: 'THOUGHTS',
        name: 'note',
        placeholder: 'your thoughts...',
        required: false,
        type: 'text',
      },
    ],
  },
}

// Icon component - uses new icon components
function MediaIcon({ type, color }: { type: string; color: string }) {
  switch (type) {
    case 'book':
      return <BookIcon size={24} style={{ color }} />
    case 'article':
      return <NewspaperIcon size={24} style={{ color }} />
    case 'movie':
      return <FilmIcon size={24} style={{ color }} />
    case 'song':
      return <MusicIcon size={24} style={{ color }} />
    case 'album':
      return <DiscIcon size={24} style={{ color }} />
    case 'podcast':
      return <PodcastIcon size={24} style={{ color }} />
    case 'live':
      return <LiveIcon size={24} style={{ color }} />
    default:
      return null
  }
}

export default function ShareTypePage() {
  const params = useParams()
  const router = useRouter()
  const type = params.type as string
  const isValidType = validTypes.includes(type)
  const config = mediaTypeConfig[type]

  // Form state
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [noteLimitReached, setNoteLimitReached] = useState(false)
  const [buttonClicked, setButtonClicked] = useState(false)
  const [me, setMe] = useState<UserMeResponse | null>(null)
  const [aboutOpen, setAboutOpen] = useState(false)

  // Book search (only used when type === 'book')
  type BookResult = { id: string; title: string; authors: string; thumbnail?: string; infoLink?: string }
  const [bookSearchQuery, setBookSearchQuery] = useState('')
  const [bookSearchResults, setBookSearchResults] = useState<BookResult[]>([])
  const [bookSearchLoading, setBookSearchLoading] = useState(false)
  const [bookSearchError, setBookSearchError] = useState<string | null>(null)
  const [selectedBook, setSelectedBook] = useState<BookResult | null>(null)
  const bookSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Music search (only used when type === 'song' or type === 'album')
  type MusicResult = { id: string; title: string; creator: string; albumName?: string; coverUrl?: string; externalUrl?: string; type: 'song' | 'album' }
  const [musicSearchQuery, setMusicSearchQuery] = useState('')
  const [musicSearchResults, setMusicSearchResults] = useState<MusicResult[]>([])
  const [musicSearchLoading, setMusicSearchLoading] = useState(false)
  const [musicSearchError, setMusicSearchError] = useState<string | null>(null)
  const [selectedMusic, setSelectedMusic] = useState<MusicResult | null>(null)
  const musicSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Movie search (only used when type === 'movie')
  type MovieResult = { id: string; title: string; director: string; thumbnail?: string; externalUrl?: string; genres?: string[] }
  const [movieSearchQuery, setMovieSearchQuery] = useState('')
  const [movieSearchResults, setMovieSearchResults] = useState<MovieResult[]>([])
  const [movieSearchLoading, setMovieSearchLoading] = useState(false)
  const [movieSearchError, setMovieSearchError] = useState<string | null>(null)
  const [selectedMovie, setSelectedMovie] = useState<MovieResult | null>(null)
  const movieSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Hide search results once the user moves on to other fields, so the list doesn't push the share button off screen
  const [searchResultsHidden, setSearchResultsHidden] = useState(false)

  const handleFormFocus = (e: React.FocusEvent<HTMLFormElement>) => {
    const target = e.target as HTMLElement
    const isTextField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'
    if (!isTextField) return
    setSearchResultsHidden(!target.closest('[data-search-area]'))
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setSearchResultsHidden(e.key === 'Escape')
  }

  useEffect(() => {
    if (!isValidType) {
      router.push('/share')
    }
  }, [isValidType, router])

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await fetch('/api/users/me?summary=1')
        if (!response.ok) return
        const data: UserMeResponse = await response.json()
        setMe(data)
      } catch {
        /* ignore */
      }
    }
    loadUser()
  }, [])

  // Debounced book search when type === 'book'
  useEffect(() => {
    if (type !== 'book') return
    const q = bookSearchQuery.trim()
    if (q.length < 2) {
      setBookSearchResults([])
      setBookSearchError(null)
      return
    }
    if (bookSearchDebounceRef.current) clearTimeout(bookSearchDebounceRef.current)
    bookSearchDebounceRef.current = setTimeout(async () => {
      setBookSearchLoading(true)
      setBookSearchError(null)
      try {
        const res = await fetch(`/api/search/books?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        if (!res.ok) {
          setBookSearchResults([])
          setBookSearchError(data.error || 'Search failed')
          return
        }
        setBookSearchResults(data.books ?? [])
      } catch {
        setBookSearchResults([])
        setBookSearchError('Search failed')
      } finally {
        setBookSearchLoading(false)
      }
    }, 300)
    return () => {
      if (bookSearchDebounceRef.current) clearTimeout(bookSearchDebounceRef.current)
    }
  }, [type, bookSearchQuery])

  // Debounced music search when type === 'song' or 'album'
  useEffect(() => {
    if (type !== 'song' && type !== 'album') return
    const q = musicSearchQuery.trim()
    if (q.length < 2) {
      setMusicSearchResults([])
      setMusicSearchError(null)
      return
    }
    if (musicSearchDebounceRef.current) clearTimeout(musicSearchDebounceRef.current)
    musicSearchDebounceRef.current = setTimeout(async () => {
      setMusicSearchLoading(true)
      setMusicSearchError(null)
      try {
        const res = await fetch(`/api/search/music?q=${encodeURIComponent(q)}&type=${type}`)
        const data = await res.json()
        if (!res.ok) {
          setMusicSearchResults([])
          setMusicSearchError(data.error || 'Search failed')
          return
        }
        const results = type === 'song' ? (data.songs ?? []) : (data.albums ?? [])
        setMusicSearchResults(results)
      } catch {
        setMusicSearchResults([])
        setMusicSearchError('Search failed')
      } finally {
        setMusicSearchLoading(false)
      }
    }, 300)
    return () => {
      if (musicSearchDebounceRef.current) clearTimeout(musicSearchDebounceRef.current)
    }
  }, [type, musicSearchQuery])

  // Debounced movie search when type === 'movie'
  useEffect(() => {
    if (type !== 'movie') return
    const q = movieSearchQuery.trim()
    if (q.length < 2) {
      setMovieSearchResults([])
      setMovieSearchError(null)
      return
    }
    if (movieSearchDebounceRef.current) clearTimeout(movieSearchDebounceRef.current)
    movieSearchDebounceRef.current = setTimeout(async () => {
      setMovieSearchLoading(true)
      setMovieSearchError(null)
      try {
        const res = await fetch(`/api/search/movies?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        if (!res.ok) {
          setMovieSearchResults([])
          setMovieSearchError(data.error || 'Search failed')
          return
        }
        setMovieSearchResults(data.movies ?? [])
      } catch {
        setMovieSearchResults([])
        setMovieSearchError('Search failed')
      } finally {
        setMovieSearchLoading(false)
      }
    }, 300)
    return () => {
      if (movieSearchDebounceRef.current) clearTimeout(movieSearchDebounceRef.current)
    }
  }, [type, movieSearchQuery])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    
    // Enforce max length for all fields except article URL
    const isArticleUrl = type === 'article' && name === 'url'
    if (!isArticleUrl && value.length > MAX_POST_TEXT_LENGTH) return
    if (name === 'note') setNoteLimitReached(value.length === MAX_POST_TEXT_LENGTH)
    
    // If user edits title or author while a book was selected, treat as manual entry
    if (type === 'book' && selectedBook && (name === 'title' || name === 'author')) {
      setSelectedBook(null)
    }
    // If user edits title or artist while music was selected, treat as manual entry
    if ((type === 'song' || type === 'album') && selectedMusic && (name === 'title' || name === 'artist')) {
      setSelectedMusic(null)
    }
    // If user edits title or director while movie was selected, treat as manual entry
    if (type === 'movie' && selectedMovie && (name === 'title' || name === 'director')) {
      setSelectedMovie(null)
    }
    
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
    setSubmitError(null)
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    config.fields.forEach((field) => {
      if (field.required) {
        const value = formData[field.name]?.trim()
        if (!value || value.length === 0) {
          newErrors[field.name] = `${field.label} is required`
        } else if (field.type === 'url') {
          // Basic URL validation (backend will enforce HTTPS)
          try {
            const url = new URL(value)
            if (url.protocol !== 'https:' && url.protocol !== 'http:') {
              newErrors[field.name] = 'URL must be valid'
            }
          } catch {
            newErrors[field.name] = 'URL must be valid'
          }
        }
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    setButtonClicked(true)

    if (!validateForm()) {
      setButtonClicked(false)
      return
    }

    setLoading(true)

    try {
      // Map creator field based on media type; for book from Google, use selectedBook for alignment
      let creator = ''
      let title = formData.title.trim()
      let source: string | undefined
      let sourceId: string | undefined
      let coverUrl: string | undefined

      let externalUrl: string | undefined
      let metadata: Record<string, unknown> | undefined = undefined
      if (type === 'book' && selectedBook) {
        title = selectedBook.title
        creator = selectedBook.authors
        source = 'google_books'
        sourceId = selectedBook.id
        coverUrl = selectedBook.thumbnail
        externalUrl = selectedBook.infoLink?.trim() || undefined
      } else if (type === 'movie' && selectedMovie) {
        title = selectedMovie.title
        creator = selectedMovie.director
        source = 'tmdb'
        sourceId = selectedMovie.id
        coverUrl = selectedMovie.thumbnail
        externalUrl = selectedMovie.externalUrl?.trim() || undefined
        metadata = selectedMovie.genres && selectedMovie.genres.length > 0
          ? { genres: selectedMovie.genres }
          : undefined
      } else if ((type === 'song' || type === 'album') && selectedMusic) {
        title = selectedMusic.title
        creator = selectedMusic.creator
        source = 'apple_music'
        sourceId = selectedMusic.id
        coverUrl = selectedMusic.coverUrl
        externalUrl = selectedMusic.externalUrl?.trim() || undefined
        metadata = type === 'song' && selectedMusic.albumName
          ? { albumName: selectedMusic.albumName, appleMusicId: selectedMusic.id }
          : { appleMusicId: selectedMusic.id }
      } else if (type === 'book') {
        creator = formData.author?.trim() || ''
      } else if (type === 'movie') {
        creator = formData.director?.trim() || ''
      } else if (type === 'song' || type === 'album') {
        creator = formData.artist?.trim() || ''
      } else if (type === 'podcast') {
        creator = formData.host?.trim() || ''
      } else if (type === 'live') {
        creator = formData.creator?.trim() || ''
      } else if (type === 'article') {
        creator = formData.author?.trim() || ''
        externalUrl = formData.url?.trim() || undefined
      }

      // Prepare request body based on media type
      const requestBody: CreatePostRequest = {
        media: {
          mediaType: type.toUpperCase() as MediaType,
          title,
          creator,
          externalUrl,
          source,
          sourceId,
          coverUrl,
          metadata,
        },
        note: formData.note?.trim() || undefined,
      }

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 409) {
          setSubmitError(data.error || "you've already posted 3 times this week. come back next week!")
        } else if (response.status === 400) {
          setSubmitError(data.error || 'Validation error')
        } else {
          setSubmitError(data.error || 'Failed to create post')
        }
        setLoading(false)
        setButtonClicked(false)
        return
      }

      // Success - redirect to feed
      router.push('/feed')
    } catch (error) {
      console.error('Error submitting form:', error)
      setSubmitError('Something went wrong. Please try again.')
      setLoading(false)
      setButtonClicked(false)
    }
  }

  if (!isValidType) {
    return null
  }

  // If no config, show placeholder
  if (!config) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col pb-32">
        <div className="sticky top-0 bg-black/90 backdrop-blur-sm z-10">
          <div className="max-w-2xl mx-auto px-6 md:px-8">
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
                {me?.user?.username ? (
                  <Link
                    href={`/profile/${encodeURIComponent(me.user.username)}`}
                    className="flex items-start hover:opacity-90 transition-opacity"
                    aria-label={`profile: ${me.user.username}`}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex-shrink-0 ring-2 ring-stone-400 relative"
                      style={{ backgroundColor: me.user.avatar_color }}
                    />
                  </Link>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-stone-800 flex-shrink-0 ring-2 ring-stone-400" />
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-6 md:px-8 w-full pt-4">
          <Link
            href="/share"
            className="text-white text-2xl hover:text-gray-300 transition-colors inline-block"
            aria-label="Back to share"
          >
            ←
          </Link>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 capitalize">
            Share {type}
          </h1>
          <p className="text-gray-400 text-lg">Coming soon...</p>
        </div>
        <div className="fixed bottom-0 left-0 right-0 bg-black z-20">
          <div className="h-px bg-stone-800 flex-shrink-0" />
          <div className="max-w-2xl mx-auto px-6 md:px-8 py-6 flex items-center justify-start">
            <button
              onClick={() => setAboutOpen(true)}
              type="button"
              className="text-stone-500 text-xs font-medium hover:text-stone-400 transition-colors lowercase"
            >
              about
            </button>
          </div>
        </div>
        {aboutOpen && (
          <div
            className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setAboutOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-type-about-title"
          >
            <div
              className="bg-black border border-stone-800 rounded-lg max-w-[420px] w-full p-8 flex flex-col items-center text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-6" id="share-type-about-title">
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
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col pb-32">
      {/* Header - moss left, avatar right (same as home) */}
      <div className="sticky top-0 bg-black/90 backdrop-blur-sm z-10">
        <div className="max-w-2xl mx-auto px-6 md:px-8">
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
              {me?.user?.username ? (
                <Link
                  href={`/profile/${encodeURIComponent(me.user.username)}`}
                  className="flex items-start hover:opacity-90 transition-opacity"
                  aria-label={`profile: ${me.user.username}`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex-shrink-0 ring-2 ring-stone-400 relative"
                    style={{ backgroundColor: me.user.avatar_color }}
                  />
                </Link>
              ) : (
                <div className="w-8 h-8 rounded-full bg-stone-800 flex-shrink-0 ring-2 ring-stone-400" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Back + media type title */}
      <div className="max-w-2xl mx-auto px-6 md:px-8 w-full pt-2 pb-6">
        <Link
          href="/share"
          className="text-white text-2xl hover:text-gray-300 transition-colors inline-block"
          aria-label="Back to share"
        >
          ←
        </Link>
        <div className="flex flex-col mt-4">
          <div className="flex items-baseline gap-3">
            <div className="shrink-0">
              <MediaIcon type={type} color={config.color} />
            </div>
            <h1
              className="text-3xl md:text-4xl font-bold leading-none"
              style={{ color: config.color }}
            >
              {config.label}
            </h1>
          </div>
          {type === 'live' && (
            <span className="text-xs text-stone-500 mt-0.5">
              theater, live performance, concert
            </span>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 flex flex-col items-start justify-center px-6 md:px-8 pb-8 mx-auto w-full max-w-2xl">
        <form onSubmit={handleSubmit} onFocus={handleFormFocus} className="w-full max-w-2xl space-y-8">
          {type === 'book' && (
            <div className="w-full space-y-2" data-search-area>
              <label
                htmlFor="book-search"
                className="text-sm uppercase tracking-wider font-bold block mb-2"
                style={{ color: config.color }}
              >
                search for a book
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" aria-hidden>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </span>
                <input
                  id="book-search"
                  type="text"
                  value={bookSearchQuery}
                  onChange={(e) => setBookSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="title or author..."
                  className="w-full border-2 rounded-3xl pl-12 pr-4 py-3 text-stone-200 placeholder-stone-500 focus:outline-none transition-all text-lg md:text-xl font-medium"
                  style={{
                    background: 'linear-gradient(to bottom, rgba(28, 25, 23, 0.5), rgba(31, 27, 24, 0.5))',
                    borderColor: config.color,
                  }}
                />
              </div>
              {selectedBook ? (
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  <span className="text-stone-400 text-sm normal-case">selected: {selectedBook.title}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBook(null)
                      setFormData((prev) => ({ ...prev, title: '', author: '' }))
                    }}
                    className="text-sm underline hover:no-underline"
                    style={{ color: config.color }}
                  >
                    enter manually
                  </button>
                </div>
              ) : (
                <>
                  {bookSearchLoading && <p className="text-stone-500 text-sm mt-1">searching...</p>}
                  {bookSearchError && <p className="text-red-400 text-sm mt-1">{bookSearchError}</p>}
                  {bookSearchResults.length > 0 && !bookSearchLoading && !searchResultsHidden && (
                    <ul className="mt-2 border rounded-lg overflow-y-auto max-h-64" style={{ borderColor: config.color }}>
                      {bookSearchResults.map((book) => (
                        <li key={book.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBook(book)
                              setFormData((prev) => ({
                                ...prev,
                                title: book.title,
                                author: book.authors,
                              }))
                              setBookSearchResults([])
                              setBookSearchQuery('')
                            }}
                            className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-stone-800/80 transition-colors"
                          >
                            {book.thumbnail && (
                              <Image
                                src={book.thumbnail}
                                alt=""
                                className="w-8 h-10 object-cover rounded flex-shrink-0"
                                width={32}
                                height={40}
                                sizes="32px"
                              />
                            )}
                            <span className="text-stone-200 font-medium truncate flex-1">{book.title}</span>
                            {book.authors ? (
                              <span className="text-stone-500 text-sm truncate max-w-[40%]">{book.authors}</span>
                            ) : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {bookSearchQuery.trim().length >= 2 && !bookSearchLoading && bookSearchResults.length === 0 && !bookSearchError && (
                    <p className="text-stone-500 text-sm mt-1">No results. Enter manually below.</p>
                  )}
                </>
              )}
            </div>
          )}
          {type === 'movie' && (
            <div className="w-full space-y-2" data-search-area>
              <label
                htmlFor="movie-search"
                className="text-sm uppercase tracking-wider font-bold block mb-2"
                style={{ color: config.color }}
              >
                search for a movie
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" aria-hidden>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </span>
                <input
                  id="movie-search"
                  type="text"
                  value={movieSearchQuery}
                  onChange={(e) => setMovieSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="title or director..."
                  className="w-full border-2 rounded-3xl pl-12 pr-4 py-3 text-stone-200 placeholder-stone-500 focus:outline-none transition-all text-lg md:text-xl font-medium"
                  style={{
                    background: 'linear-gradient(to bottom, rgba(28, 25, 23, 0.5), rgba(31, 27, 24, 0.5))',
                    borderColor: config.color,
                  }}
                />
              </div>
              {selectedMovie ? (
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  <span className="text-stone-400 text-sm normal-case">selected: {selectedMovie.title}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMovie(null)
                      setFormData((prev) => ({ ...prev, title: '', director: '' }))
                    }}
                    className="text-sm underline hover:no-underline"
                    style={{ color: config.color }}
                  >
                    enter manually
                  </button>
                </div>
              ) : (
                <>
                  {movieSearchLoading && <p className="text-stone-500 text-sm mt-1">searching...</p>}
                  {movieSearchError && <p className="text-red-400 text-sm mt-1">{movieSearchError}</p>}
                  {movieSearchResults.length > 0 && !movieSearchLoading && !searchResultsHidden && (
                    <ul className="mt-2 border rounded-lg overflow-y-auto max-h-64" style={{ borderColor: config.color }}>
                      {movieSearchResults.map((movie) => (
                        <li key={movie.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMovie(movie)
                              setFormData((prev) => ({
                                ...prev,
                                title: movie.title,
                                director: movie.director,
                              }))
                              setMovieSearchResults([])
                              setMovieSearchQuery('')
                            }}
                            className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-stone-800/80 transition-colors"
                          >
                            {movie.thumbnail && (
                              <Image
                                src={movie.thumbnail}
                                alt=""
                                className="w-10 h-14 object-cover rounded flex-shrink-0"
                                width={40}
                                height={56}
                                sizes="40px"
                              />
                            )}
                            <span className="text-stone-200 font-medium truncate flex-1">{movie.title}</span>
                            {movie.director ? (
                              <span className="text-stone-500 text-sm truncate max-w-[40%]">{movie.director}</span>
                            ) : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {movieSearchQuery.trim().length >= 2 && !movieSearchLoading && movieSearchResults.length === 0 && !movieSearchError && (
                    <p className="text-stone-500 text-sm mt-1">No results. Enter manually below.</p>
                  )}
                </>
              )}
            </div>
          )}
          {(type === 'song' || type === 'album') && (
            <div className="w-full space-y-2" data-search-area>
              <label
                htmlFor="music-search"
                className="text-sm uppercase tracking-wider font-bold block mb-2"
                style={{ color: config.color }}
              >
                search for a {type}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" aria-hidden>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </span>
                <input
                  id="music-search"
                  type="text"
                  value={musicSearchQuery}
                  onChange={(e) => setMusicSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="title or artist..."
                  className="w-full border-2 rounded-3xl pl-12 pr-4 py-3 text-stone-200 placeholder-stone-500 focus:outline-none transition-all text-lg md:text-xl font-medium"
                  style={{
                    background: 'linear-gradient(to bottom, rgba(28, 25, 23, 0.5), rgba(31, 27, 24, 0.5))',
                    borderColor: config.color,
                  }}
                />
              </div>
              {selectedMusic ? (
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  <span className="text-stone-400 text-sm normal-case">selected: {selectedMusic.title}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMusic(null)
                      setFormData((prev) => ({ ...prev, title: '', artist: '' }))
                    }}
                    className="text-sm underline hover:no-underline"
                    style={{ color: config.color }}
                  >
                    enter manually
                  </button>
                </div>
              ) : (
                <>
                  {musicSearchLoading && <p className="text-stone-500 text-sm mt-1">searching...</p>}
                  {musicSearchError && <p className="text-red-400 text-sm mt-1">{musicSearchError}</p>}
                  {musicSearchResults.length > 0 && !musicSearchLoading && !searchResultsHidden && (
                    <ul className="mt-2 border rounded-lg overflow-y-auto max-h-64" style={{ borderColor: config.color }}>
                      {musicSearchResults.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMusic(item)
                              setFormData((prev) => ({
                                ...prev,
                                title: item.title,
                                artist: item.creator,
                              }))
                              setMusicSearchResults([])
                              setMusicSearchQuery('')
                            }}
                            className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-stone-800/80 transition-colors"
                          >
                            {item.coverUrl && (
                              <Image
                                src={item.coverUrl}
                                alt=""
                                className="w-10 h-10 object-cover rounded flex-shrink-0"
                                width={40}
                                height={40}
                                sizes="40px"
                              />
                            )}
                            <span className="text-stone-200 font-medium truncate flex-1">{item.title}</span>
                            {item.creator ? (
                              <span className="text-stone-500 text-sm truncate max-w-[40%]">{item.creator}</span>
                            ) : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {musicSearchQuery.trim().length >= 2 && !musicSearchLoading && musicSearchResults.length === 0 && !musicSearchError && (
                    <p className="text-stone-500 text-sm mt-1">No results. Enter manually below.</p>
                  )}
                </>
              )}
            </div>
          )}
          {config.fields.map((field) => {
            const isNoteField = field.name === 'note'

            return (
              <div key={field.name} className="w-full">
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor={field.name}
                    className="text-sm uppercase tracking-wider font-bold"
                    style={{ color: config.color }}
                  >
                    {field.label}
                  </label>
                  {isNoteField ? (
                    <span className="text-xs text-stone-500">optional</span>
                  ) : null}
                </div>
                {field.type === 'textarea' ? (
                  <textarea
                    id={field.name}
                    name={field.name}
                    value={formData[field.name] || ''}
                    onChange={handleInputChange}
                    placeholder={field.placeholder}
                    required={field.required}
                    maxLength={MAX_POST_TEXT_LENGTH}
                    rows={4}
                    className={`w-full rounded-lg px-4 py-3 text-stone-200 placeholder-stone-500 focus:outline-none transition-all text-lg md:text-xl font-medium ${
                      type === 'book' || type === 'song' || type === 'album' || type === 'movie' ? 'border' : 'border-2'
                    } ${errors[field.name] ? 'border-red-500' : type === 'book' || type === 'song' || type === 'album' || type === 'movie' ? '' : ''}`}
                    style={(type === 'book' || type === 'song' || type === 'album' || type === 'movie') && !errors[field.name]
                      ? {
                          background: 'linear-gradient(to bottom, rgba(28, 25, 23, 0.5), rgba(31, 27, 24, 0.5))',
                          borderColor: errors[field.name] ? '#EF4444' : '#71717a',
                        }
                      : {
                          background: 'linear-gradient(to bottom, rgba(28, 25, 23, 0.5), rgba(31, 27, 24, 0.5))',
                          borderColor: errors[field.name]
                            ? '#EF4444'
                            : formData[field.name]
                              ? config.color
                              : '#374151',
                          boxShadow: formData[field.name] && !errors[field.name]
                            ? `0 0 12px ${config.color}20`
                            : 'none',
                        }}
                  />
                ) : (
                  <input
                    id={field.name}
                    name={field.name}
                    type={field.type === 'url' ? 'url' : 'text'}
                    value={formData[field.name] || ''}
                    onChange={handleInputChange}
                    placeholder={field.placeholder}
                    required={field.required}
                    {...(type === 'article' && field.name === 'url' ? {} : { maxLength: MAX_POST_TEXT_LENGTH })}
                    className={`w-full rounded-lg px-4 py-3 text-stone-200 placeholder-stone-500 focus:outline-none transition-all text-lg md:text-xl font-medium ${
                      type === 'book' || type === 'song' || type === 'album' || type === 'movie' ? 'border' : 'border-2'
                    } ${errors[field.name] ? 'border-red-500' : ''}`}
                    style={(type === 'book' || type === 'song' || type === 'album' || type === 'movie') && !errors[field.name]
                      ? {
                          background: 'linear-gradient(to bottom, rgba(28, 25, 23, 0.5), rgba(31, 27, 24, 0.5))',
                          borderColor: errors[field.name] ? '#EF4444' : '#71717a',
                        }
                      : {
                          background: 'linear-gradient(to bottom, rgba(28, 25, 23, 0.5), rgba(31, 27, 24, 0.5))',
                          borderColor: errors[field.name]
                            ? '#EF4444'
                            : formData[field.name]
                              ? config.color
                              : '#374151',
                          boxShadow: formData[field.name] && !errors[field.name]
                            ? `0 0 12px ${config.color}20`
                            : 'none',
                        }}
                  />
                )}
                {errors[field.name] && (
                  <p className="text-red-400 text-sm mt-1">{errors[field.name]}</p>
                )}
                {isNoteField && noteLimitReached && (
                  <p className="text-red-400 text-sm mt-1">reached character limit!</p>
                )}
              </div>
            )
          })}

          {submitError && (
            <div className="text-red-400 text-sm">{submitError}</div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="min-w-[7.5rem] px-6 py-3 rounded font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: buttonClicked ? config.color : 'transparent',
              color: buttonClicked ? 'white' : config.color,
              border: `2px solid ${config.color}`,
              boxShadow: buttonClicked
                ? `0 4px 6px -1px ${config.color}40, 0 2px 4px -1px ${config.color}20`
                : 'none',
            }}
          >
            {loading ? 'sharing...' : 'share'}
          </button>
        </form>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-black z-20">
        <div className="h-px bg-stone-800 flex-shrink-0" />
        <div className="max-w-2xl mx-auto px-6 md:px-8 py-6 flex items-center justify-start">
          <button
            onClick={() => setAboutOpen(true)}
            type="button"
            className="text-stone-500 text-xs font-medium hover:text-stone-400 transition-colors lowercase"
          >
            about
          </button>
        </div>
      </div>

      {aboutOpen && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setAboutOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-form-about-title"
        >
          <div
            className="bg-black border border-stone-800 rounded-lg max-w-[420px] w-full p-8 flex flex-col items-center text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-6" id="share-form-about-title">
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
    </div>
  )
}
