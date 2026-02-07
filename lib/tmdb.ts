const BASE_URL = 'https://api.themoviedb.org/3'
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p'

export interface MovieSearchResult {
  id: string
  title: string
  director: string
  thumbnail?: string
  externalUrl?: string
  genres: string[]
}

interface TMDBMovieResult {
  id: number
  title?: string
  original_title?: string
  poster_path?: string
  genre_ids?: number[]
}

interface TMDBSearchResponse {
  results?: TMDBMovieResult[]
}

interface TMDBCreditsResponse {
  crew?: { job?: string; name?: string }[]
}

interface TMDBGenre {
  id: number
  name: string
}

interface TMDBGenresResponse {
  genres?: TMDBGenre[]
}

function posterUrl(path: string | undefined, size = 'w342'): string | undefined {
  if (!path) return undefined
  return `${IMAGE_BASE_URL}/${size}${path}`
}

async function tmdbFetch<T>(
  path: string,
  params: Record<string, string> = {}
): Promise<T> {
  const apiKey = process.env.TMDB_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('Missing TMDB API key')
  }

  const url = new URL(`${BASE_URL}${path}`)
  url.searchParams.set('api_key', apiKey)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  const res = await fetch(url.toString())
  if (!res.ok) {
    const body = await res.text()
    console.error('TMDB API error:', res.status, body)
    throw new Error(`TMDB API error: ${res.status}`)
  }
  return (await res.json()) as T
}

async function fetchDirector(movieId: number): Promise<string> {
  const credits = await tmdbFetch<TMDBCreditsResponse>(
    `/movie/${movieId}/credits`,
    { language: 'en-US' }
  )
  const director = credits.crew?.find((c) => c.job === 'Director')?.name
  return director?.trim() || ''
}

async function fetchGenreMap(): Promise<Map<number, string>> {
  const data = await tmdbFetch<TMDBGenresResponse>('/genre/movie/list', {
    language: 'en-US',
  })
  const map = new Map<number, string>()
  for (const genre of data.genres ?? []) {
    if (typeof genre.id === 'number' && genre.name) {
      map.set(genre.id, genre.name)
    }
  }
  return map
}

export async function searchTMDBMovies(
  term: string,
  limit = 10
): Promise<MovieSearchResult[]> {
  const data = await tmdbFetch<TMDBSearchResponse>('/search/movie', {
    query: term.trim(),
    include_adult: 'false',
    language: 'en-US',
    page: '1',
  })

  const results = (data.results ?? [])
    .filter((movie) => movie.id && (movie.title || movie.original_title))
    .slice(0, limit)

  if (results.length === 0) return []

  const genreMap = await fetchGenreMap()

  const movies = await Promise.all(
    results.map(async (movie) => {
      const title = (movie.title ?? movie.original_title ?? '').trim()
      const director = await fetchDirector(movie.id)
      const genres = (movie.genre_ids ?? [])
        .map((id) => genreMap.get(id))
        .filter((name): name is string => !!name)

      return {
        id: String(movie.id),
        title,
        director,
        thumbnail: posterUrl(movie.poster_path),
        externalUrl: `https://www.themoviedb.org/movie/${movie.id}`,
        genres,
      }
    })
  )

  return movies
}
