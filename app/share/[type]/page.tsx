'use client'

import { useState, FormEvent } from 'react'
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
} from '@/lib/components/MediaIcons'
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
        placeholder: 'Enter book title...',
        required: true,
        type: 'text',
      },
      {
        label: 'AUTHOR',
        name: 'author',
        placeholder: 'Who wrote it?',
        required: true,
        type: 'text',
      },
      {
        label: 'NOTE',
        name: 'note',
        placeholder: 'Your thoughts...',
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
        placeholder: 'Enter article URL...',
        required: true,
        type: 'url',
      },
      {
        label: 'TITLE',
        name: 'title',
        placeholder: 'Enter article title...',
        required: true,
        type: 'text',
      },
      {
        label: 'AUTHOR',
        name: 'author',
        placeholder: 'Who wrote it?',
        required: true,
        type: 'text',
      },
      {
        label: 'NOTE',
        name: 'note',
        placeholder: 'Your thoughts...',
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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    
    // Enforce 60 character limit for note field
    if (name === 'note') {
      if (value.length > 60) {
        // Don't allow typing beyond 60 characters
        return
      }
      // Show message when exactly at 60 characters
      setNoteLimitReached(value.length === 60)
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
      // Map creator field based on media type
      let creator = ''
      if (type === 'book') {
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
          title: formData.title.trim(),
          creator: creator,
          externalUrl: type === 'article' ? formData.url?.trim() : undefined,
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
          setSubmitError(data.error || 'Weekly limit reached')
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
          <MossIcon color="#2d5016" size={24} />
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
      <div className="flex-1 flex flex-col items-start justify-center px-8 md:px-16 py-24 mt-24 md:mt-32">
        <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-8">
          {config.fields.map((field) => {
            const isNoteField = field.name === 'note'
            const noteLength = formData.note?.length || 0

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
                    <span className="text-xs text-stone-500">
                      {noteLength}/60
                    </span>
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
            className="px-6 py-3 rounded font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: buttonClicked ? config.color : 'transparent',
              color: buttonClicked ? 'white' : config.color,
              border: `2px solid ${config.color}`,
              boxShadow: buttonClicked
                ? `0 4px 6px -1px ${config.color}40, 0 2px 4px -1px ${config.color}20`
                : 'none',
            }}
          >
            {loading ? 'Sharing...' : 'share'}
          </button>
        </form>
      </div>
    </div>
  )
}
