import { createServerComponentClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface GoogleBooksVolume {
  id: string
  volumeInfo?: {
    title?: string
    authors?: string[]
    imageLinks?: { thumbnail?: string }
  }
}

export interface BookSearchResult {
  id: string
  title: string
  authors: string
  thumbnail?: string
}

/** Normalize title for deduplication: main work title before " - ", " : ", or " by ". */
function normalizedTitleKey(title: string): string {
  const trimmed = title.trim()
  const segment = trimmed.split(/\s+-\s+|\s+:\s+|\s+by\s+/i)[0]
  return (segment ?? trimmed).toLowerCase().trim()
}

/** Normalize author for deduplication: first author only, lowercased. */
function normalizedAuthorKey(authors: string): string {
  const first = authors.split(',')[0]?.trim() ?? ''
  return first.toLowerCase()
}

/** Canonical key for title+author deduplication. */
function dedupeKey(book: BookSearchResult): string {
  return normalizedTitleKey(book.title) + '|' + normalizedAuthorKey(book.authors)
}

/**
 * GET /api/search/books?q=...
 * Search Google Books. Requires auth. Returns { books: BookSearchResult[] }.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createServerComponentClient()
    const {
      data: { user: authUser },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const apiKey = process.env.GOOGLE_BOOKS_API_KEY
    if (!apiKey || apiKey.trim() === '') {
      return NextResponse.json(
        { error: 'Search unavailable' },
        { status: 503 }
      )
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim()
    if (!q) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    const url = new URL('https://www.googleapis.com/books/v1/volumes')
    url.searchParams.set('q', q)
    url.searchParams.set('maxResults', '10')
    url.searchParams.set('printType', 'books')
    url.searchParams.set('key', apiKey)

    const res = await fetch(url.toString())
    if (!res.ok) {
      console.error('Google Books API error:', res.status, await res.text())
      return NextResponse.json(
        { error: 'Search failed' },
        { status: 502 }
      )
    }

    const data = (await res.json()) as { items?: GoogleBooksVolume[] }
    const items = data.items ?? []

    const mapped: BookSearchResult[] = items
      .filter((v) => v.id && v.volumeInfo?.title)
      .map((v) => ({
        id: v.id,
        title: v.volumeInfo!.title!.trim(),
        authors: (v.volumeInfo?.authors ?? []).join(', ').trim() || '',
        thumbnail: v.volumeInfo?.imageLinks?.thumbnail,
      }))

    // One result per title+author pair; prefer entry with thumbnail
    const seen = new Map<string, BookSearchResult>()
    for (const book of mapped) {
      const key = dedupeKey(book)
      const existing = seen.get(key)
      if (!existing) {
        seen.set(key, book)
      } else if (book.thumbnail && !existing.thumbnail) {
        seen.set(key, book)
      }
    }
    const books = Array.from(seen.values())

    return NextResponse.json({ books })
  } catch (error) {
    console.error('Error in /api/search/books:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
