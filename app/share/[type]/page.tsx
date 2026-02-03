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
} from '@/lib/components/SharePageMediaIcons'
import { MossIcon } from '@/lib/components/MossIcon'

const validTypes = ['book', 'article', 'movie', 'song', 'album', 'podcast']

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
  type BookResult = { id: string; title: string; authors: string; thumbnail?: string }
  const [bookSearchQuery, setBookSearchQuery] = useState('')
  const [bookSearchResults, setBookSearchResults] = useState<BookResult[]>([])
  const [bookSearchLoading, setBookSearchLoading] = useState(false)
  const [bookSearchError, setBookSearchError] = useState<string | null>(null)
  const [selectedBook, setSelectedBook] = useState<BookResult | null>(null)
  const bookSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

      if (type === 'book' && selectedBook) {
        title = selectedBook.title
        creator = selectedBook.authors
        source = 'google_books'
        sourceId = selectedBook.id
        coverUrl = selectedBook.thumbnail
      } else if (type === 'book') {
        creator = formData.author?.trim() || ''
      } else if (type === 'movie') {
        creator = formData.director?.trim() || ''
      } else if (type === 'song' || type === 'album') {
        creator = formData.artist?.trim() || ''
      } else if (type === 'podcast') {
        creator = formData.host?.trim() || ''
      } else if (type === 'article') {
        creator = formData.author?.trim() || ''
      }

      // Prepare request body based on media type
      const requestBody: CreatePostRequest = {
        media: {
          mediaType: type.toUpperCase() as MediaType,
          title,
          creator,
          externalUrl: type === 'article' ? formData.url?.trim() : undefined,
          source,
          sourceId,
          coverUrl,
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
        <div className="flex items-center gap-3">
          <MediaIcon type={type} color={config.color} />
          <h1
            className="text-3xl md:text-4xl font-bold"
            style={{ color: config.color }}
          >
            {config.label}
          </h1>
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
              <input
                id="book-search"
                type="text"
                value={bookSearchQuery}
                onChange={(e) => setBookSearchQuery(e.target.value)}
                placeholder="title or author..."
                className="w-full border-2 rounded-lg px-4 py-3 text-stone-200 placeholder-stone-500 focus:outline-none transition-all text-lg md:text-xl font-medium"
                style={{
                  background: 'linear-gradient(to bottom, rgba(28, 25, 23, 0.5), rgba(31, 27, 24, 0.5))',
                  borderColor: bookSearchQuery ? config.color : '#374151',
                }}
              />
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
                    className={`w-full border-2 rounded-lg px-4 py-3 text-stone-200 placeholder-stone-500 focus:outline-none transition-all text-lg md:text-xl font-medium ${
                      errors[field.name]
                        ? 'border-red-500'
                        : ''
                    }`}
                    style={{
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
                    className={`w-full border-2 rounded-lg px-4 py-3 text-stone-200 placeholder-stone-500 focus:outline-none transition-all text-lg md:text-xl font-medium ${
                      errors[field.name]
                        ? 'border-red-500'
                        : ''
                    }`}
                    style={{
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
