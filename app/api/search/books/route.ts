import { requireUserId } from '@/lib/auth'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface GoogleBooksVolume {
  id: string
  volumeInfo?: {
    title?: string
    authors?: string[]
    imageLinks?: { thumbnail?: string }
    infoLink?: string
  }
}

export interface BookSearchResult {
  id: string
  title: string
  authors: string
  thumbnail?: string
  infoLink?: string
}

/** Normalize title for work-key deduplication: strip subtitle, parentheticals, "--by Author". */
function normalizedTitleKey(title: string): string {
  const trimmed = title.trim()
  const segment = (trimmed.split(/\s+-\s+|\s+:\s+|\s+by\s+/i)[0] ?? trimmed).trim()
  // Strip parentheticals e.g. "(Young Readers Edition)", "(Pulitzer Prize Winner)"
  const withoutParens = segment.replace(/\s*\([^)]*\)/g, '').trim()
  // Strip trailing "--by Author" suffix
  const withoutBy = withoutParens.replace(/\s*--by\s+.+$/i, '').trim()
  return withoutBy.toLowerCase()
}

/** Normalize author for summary detection: first author only, lowercased. */
function normalizedAuthorKey(authors: string): string {
  const first = authors.split(',')[0]?.trim() ?? ''
  return first.toLowerCase()
}

const SUMMARY_AUTHOR_BLOCKLIST = [
  'bookhabits',
  'daily books',
  'alpha minds',
  'bright summaries',
]

/** True if the book is a summary, study guide, or book analysis. */
function isSummary(book: BookSearchResult): boolean {
  const titleLower = book.title.toLowerCase()
  if (titleLower.startsWith('summary') || titleLower === 'summary') return true
  if (titleLower.includes('(book analysis)') || titleLower.includes('(conversation starters)')) return true
  if (titleLower.includes('study guide')) return true
  const author = normalizedAuthorKey(book.authors)
  return SUMMARY_AUTHOR_BLOCKLIST.some((block) => author.includes(block) || block.includes(author))
}

/** Simple relevance score: title match + thumbnail. Higher is better. */
function scoreBook(book: BookSearchResult, userQuery: string): number {
  const q = userQuery.toLowerCase().trim()
  const title = book.title.toLowerCase()
  let score = 0
  if (title.startsWith(q)) score += 2
  else if (title.includes(q)) score += 1
  if (book.thumbnail) score += 1
  return score
}

/**
 * GET /api/search/books?q=...
 * Search Google Books. Requires auth. Returns { books: BookSearchResult[] }.
 */
export async function GET(request: Request) {
  try {
    const authResult = await requireUserId()
    if ('response' in authResult) {
      return authResult.response
    }
    const { userId } = authResult

    const apiKey = process.env.GOOGLE_BOOKS_API_KEY?.trim()

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim()
    if (!q) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    // If short query or one word, bias toward title match (intitle:)
    const words = q.split(/\s+/).filter(Boolean)
    const addIntitle = q.length < 6 || words.length === 1
    const apiQ = addIntitle
      ? words.length === 1
        ? `${q} intitle:${q}`
        : `${q} intitle:"${q}"`
      : q

    const url = new URL('https://www.googleapis.com/books/v1/volumes')
    url.searchParams.set('q', apiQ)
    url.searchParams.set('printType', 'books')
    url.searchParams.set('langRestrict', 'en')
    url.searchParams.set('orderBy', 'relevance')
    url.searchParams.set('maxResults', '40')
    url.searchParams.set('projection', 'lite')
    if (apiKey) {
      url.searchParams.set('key', apiKey)
    }

    const res = await fetch(url.toString())
    if (!res.ok) {
      const body = await res.text()
      console.error('Google Books API error:', res.status, body)
      // 403 often means invalid/restricted API key or quota
      const message =
        res.status === 403
          ? 'Search unavailable. Check GOOGLE_BOOKS_API_KEY or try without it.'
          : 'Search failed'
      return NextResponse.json(
        { error: message },
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
        infoLink: v.volumeInfo?.infoLink,
      }))

    // Exclude summaries and study guides
    const withoutSummaries = mapped.filter((b) => !isSummary(b))

    // One result per work (normalized title only); prefer thumbnail then shorter title
    const seen = new Map<string, BookSearchResult>()
    for (const book of withoutSummaries) {
      const key = normalizedTitleKey(book.title)
      const existing = seen.get(key)
      if (!existing) {
        seen.set(key, book)
      } else {
        // Prefer: (a) has thumbnail and existing does not, (b) shorter title when thumbnail same
        const preferCurrent =
          (book.thumbnail && !existing.thumbnail) ||
          ((!!book.thumbnail === !!existing.thumbnail) && book.title.length < existing.title.length)
        if (preferCurrent) seen.set(key, book)
      }
    }
    const deduped = Array.from(seen.values())

    // Simple score + sort, then slice to 10
    const books = deduped
      .sort((a, b) => scoreBook(b, q) - scoreBook(a, q))
      .slice(0, 10)

    return NextResponse.json({ books })
  } catch (error) {
    console.error('Error in /api/search/books:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
