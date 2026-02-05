import { getUserId } from '@/lib/auth'
import { searchAppleMusic } from '@/lib/apple-music'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/search/music?q=...&type=song|album
 * Search Apple Music catalog for songs and/or albums.
 * Requires auth. Returns { songs: SongResult[], albums: AlbumResult[] }.
 * type=song → songs only; type=album → albums only; omit → both.
 */
export async function GET(request: Request) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim()
    const typeParam = searchParams.get('type')?.toLowerCase()
    const storefront =
      process.env.APPLE_MUSIC_STOREFRONT?.trim() || 'us'

    if (!q) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    let types: ('songs' | 'albums')[]
    if (typeParam === 'song') {
      types = ['songs']
    } else if (typeParam === 'album') {
      types = ['albums']
    } else {
      types = ['songs', 'albums']
    }

    const { songs, albums } = await searchAppleMusic(q, types, storefront)

    return NextResponse.json({ songs, albums })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Missing Apple Music credentials')) {
      return NextResponse.json(
        { error: 'Music search is not configured' },
        { status: 503 }
      )
    }
    console.error('Error in /api/search/music:', error)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 502 }
    )
  }
}
