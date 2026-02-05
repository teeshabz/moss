'use client'

import { useState, FormEvent, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { CreatePostRequest, MediaType } from '@/lib/types'
import {
  BookIcon,
  NewspaperIcon,
  FilmIcon,
  MusicIcon,
  DiscIcon,
  PodcastIcon,
  ShowIcon,
} from '@/lib/components/SharePageMediaIcons'
import { MossIcon } from '@/lib/components/MossIcon'

const validTypes = ['book', 'article', 'movie', 'song', 'album', 'podcast', 'show']

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
  show: {
    color: '#6a9a8f',
    label: 'show',
    fields: [
      {
        label: 'TITLE',
        name: 'title',
        placeholder: 'enter show title...',
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
    case 'show':
      return <ShowIcon size={24} style={{ color }} />
    default:
      return null
  }
}

export default function ShareTypePage() {
  const params = useParams()
  const router = useRouter()
  const type = params.type as string

  // Redirect to share page if invalid type
  if (!validTypes.includes(type)) {
    router.push('/share')
    return null
  }

  // Get config for this media type (only book implemented for now)
  const config = mediaTypeConfig[type]

  // If no config, show placeholder
  if (!config) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        <div className="absolute top-8 left-8 md:top-16 md:left-16">
          <Link
            href="/share"
            className="text-white text-2xl hover:text-gray-300 transition-colors"
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
      </div>
    )
  }

  // Form state
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [noteLimitReached, setNoteLimitReached] = useState(false)
  const [buttonClicked, setButtonClicked] = useState(false)

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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    
    // Enforce 60 character limit for all fields except article URL
    const isArticleUrl = type === 'article' && name === 'url'
    if (!isArticleUrl && value.length > 60) return
    if (name === 'note') setNoteLimitReached(value.length === 60)
    
    // If user edits title or author while a book was selected, treat as manual entry
    if (type === 'book' && selectedBook && (name === 'title' || name === 'author')) {
      setSelectedBook(null)
    }
    // If user edits title or artist while music was selected, treat as manual entry
    if ((type === 'song' || type === 'album') && selectedMusic && (name === 'title' || name === 'artist')) {
      setSelectedMusic(null)
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
      } else if (type === 'show') {
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

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="absolute top-8 left-8 md:top-16 md:left-16">
        <Link
          href="/share"
          className="text-white text-2xl hover:text-gray-300 transition-colors mb-4 block"
          aria-label="Back to share"
        >
          ←
        </Link>
        {/* Media type title with icon */}
        <div className="flex flex-col">
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
          {type === 'show' && (
            <span className="text-xs text-stone-500 mt-0.5">
              theater, live performance, concert
            </span>
          )}
        </div>
      </div>

      {/* Moss Logo - top right */}
      <div className="absolute top-8 right-8 md:top-16 md:right-16">
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
      </div>

      {/* Form */}
      <div className="flex-1 flex flex-col items-start justify-center px-8 md:px-16 py-24 mt-12 md:mt-16">
        <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-8">
          {type === 'book' && (
            <div className="w-full space-y-2">
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
                  {bookSearchResults.length > 0 && !bookSearchLoading && (
                    <ul className="mt-2 border rounded-lg overflow-hidden" style={{ borderColor: config.color }}>
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
                              <img
                                src={book.thumbnail}
                                alt=""
                                className="w-8 h-10 object-cover rounded flex-shrink-0"
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
          {(type === 'song' || type === 'album') && (
            <div className="w-full space-y-2">
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
                  {musicSearchResults.length > 0 && !musicSearchLoading && (
                    <ul className="mt-2 border rounded-lg overflow-hidden" style={{ borderColor: config.color }}>
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
                              <img
                                src={item.coverUrl}
                                alt=""
                                className="w-10 h-10 object-cover rounded flex-shrink-0"
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
                    maxLength={60}
                    rows={4}
                    className={`w-full rounded-lg px-4 py-3 text-stone-200 placeholder-stone-500 focus:outline-none transition-all text-lg md:text-xl font-medium ${
                      type === 'book' || type === 'song' || type === 'album' ? 'border' : 'border-2'
                    } ${errors[field.name] ? 'border-red-500' : type === 'book' || type === 'song' || type === 'album' ? '' : ''}`}
                    style={(type === 'book' || type === 'song' || type === 'album') && !errors[field.name]
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
                    {...(type === 'article' && field.name === 'url' ? {} : { maxLength: 60 })}
                    className={`w-full rounded-lg px-4 py-3 text-stone-200 placeholder-stone-500 focus:outline-none transition-all text-lg md:text-xl font-medium ${
                      type === 'book' || type === 'song' || type === 'album' ? 'border' : 'border-2'
                    } ${errors[field.name] ? 'border-red-500' : ''}`}
                    style={(type === 'book' || type === 'song' || type === 'album') && !errors[field.name]
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
    </div>
  )
}
