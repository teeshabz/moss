import { requireUserId } from '@/lib/auth'
import { searchTMDBMovies } from '@/lib/tmdb'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/search/movies?q=...
 * Search TMDB. Requires auth. Returns { movies: MovieSearchResult[] }.
 */
export async function GET(request: Request) {
  try {
    const authResult = await requireUserId()
    if ('response' in authResult) {
      return authResult.response
    }
    const { userId } = authResult

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim()
    if (!q) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    const movies = await searchTMDBMovies(q, 10)

    return NextResponse.json({ movies })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Missing TMDB API key')) {
      return NextResponse.json(
        { error: 'Movie search is not configured' },
        { status: 503 }
      )
    }
    console.error('Error in /api/search/movies:', error)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 502 }
    )
  }
}
