import * as jose from 'jose'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const BASE_URL = 'https://api.music.apple.com/v1/catalog'

export interface SongResult {
  id: string
  title: string
  creator: string
  albumName?: string
  coverUrl?: string
  externalUrl?: string
  type: 'song'
}

export interface AlbumResult {
  id: string
  title: string
  creator: string
  coverUrl?: string
  externalUrl?: string
  type: 'album'
}

interface AppleSongAttributes {
  name?: string
  artistName?: string
  albumName?: string
  url?: string
  artwork?: {
    url?: string
    width?: number
    height?: number
  }
}

interface AppleAlbumAttributes {
  name?: string
  artistName?: string
  url?: string
  artwork?: {
    url?: string
    width?: number
    height?: number
  }
}

interface AppleResource<T> {
  id: string
  type: string
  attributes?: T
}

/** Replace {w} and {h} placeholders in Apple artwork URLs with dimensions. */
function artworkUrl(raw: string | undefined, size = 300): string | undefined {
  if (!raw || typeof raw !== 'string') return undefined
  return raw.replace(/{w}/g, String(size)).replace(/{h}/g, String(size))
}

/** Normalize PEM: replace literal \n with real newlines, fix line endings. */
function normalizePem(pem: string): string {
  return pem
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()
}

/** Load private key from env or file. Prefer file path to avoid escaping issues. */
function loadPrivateKey(): string {
  const keyPath = process.env.APPLE_MUSIC_PRIVATE_KEY_PATH?.trim()
  if (keyPath) {
    const resolved = resolve(process.cwd(), keyPath)
    return normalizePem(readFileSync(resolved, 'utf8'))
  }

  const privateKey = process.env.APPLE_MUSIC_PRIVATE_KEY?.trim()
  if (!privateKey) {
    throw new Error(
      'Missing Apple Music private key: set APPLE_MUSIC_PRIVATE_KEY or APPLE_MUSIC_PRIVATE_KEY_PATH'
    )
  }

  return normalizePem(privateKey)
}

/** Generate a signed JWT for Apple Music API. Tokens can last up to 180 days. */
export async function generateDeveloperToken(): Promise<string> {
  const teamId = process.env.APPLE_MUSIC_TEAM_ID?.trim()
  const keyId = process.env.APPLE_MUSIC_KEY_ID?.trim()
  const keyPem = loadPrivateKey()

  if (!teamId || !keyId) {
    throw new Error(
      'Missing Apple Music credentials: APPLE_MUSIC_TEAM_ID, APPLE_MUSIC_KEY_ID'
    )
  }

  // Use jose (avoids Node crypto ERR_OSSL_UNSUPPORTED with Apple's .p8 keys)
  const key = await jose.importPKCS8(keyPem, 'ES256')
  const jwt = await new jose.SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setExpirationTime('180d')
    .sign(key)
  return jwt
}

/** Search Apple Music catalog for songs and/or albums. */
export async function searchAppleMusic(
  term: string,
  types: ('songs' | 'albums')[],
  storefront = 'us'
): Promise<{ songs: SongResult[]; albums: AlbumResult[] }> {
  const token = await generateDeveloperToken()
  const typesParam = types.join(',')

  const url = new URL(`${BASE_URL}/${storefront}/search`)
  url.searchParams.set('term', term.trim())
  url.searchParams.set('types', typesParam)
  url.searchParams.set('limit', '10')

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    const body = await res.text()
    console.error('Apple Music API error:', res.status, body)
    throw new Error(`Apple Music API error: ${res.status}`)
  }

  const data = (await res.json()) as {
    results?: {
      songs?: { data?: AppleResource<AppleSongAttributes>[] }
      albums?: { data?: AppleResource<AppleAlbumAttributes>[] }
    }
  }

  const songs: SongResult[] = []
  const albums: AlbumResult[] = []

  const songData = data.results?.songs?.data ?? []
  for (const s of songData) {
    const attrs = s.attributes
    if (!attrs?.name) continue
    const artwork = attrs.artwork?.url
    const externalUrl =
      attrs.url ?? `https://music.apple.com/${storefront}/song/${s.id}`
    songs.push({
      id: s.id,
      title: attrs.name,
      creator: attrs.artistName ?? '',
      albumName: attrs.albumName,
      coverUrl: artworkUrl(artwork),
      externalUrl,
      type: 'song',
    })
  }

  const albumData = data.results?.albums?.data ?? []
  for (const a of albumData) {
    const attrs = a.attributes
    if (!attrs?.name) continue
    const artwork = attrs.artwork?.url
    const externalUrl =
      attrs.url ?? `https://music.apple.com/${storefront}/album/${a.id}`
    albums.push({
      id: a.id,
      title: attrs.name,
      creator: attrs.artistName ?? '',
      coverUrl: artworkUrl(artwork),
      externalUrl,
      type: 'album',
    })
  }

  return { songs, albums }
}
