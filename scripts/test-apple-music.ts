/**
 * Standalone test for Apple Music API credentials.
 * Run from mossapp/: npx tsx scripts/test-apple-music.ts
 * Loads .env.local and tests: key parse → JWT sign → API call.
 */
import * as jose from 'jose'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local
function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), '.env.local')
    const content = readFileSync(envPath, 'utf8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const eq = trimmed.indexOf('=')
        if (eq > 0) {
          const key = trimmed.slice(0, eq).trim()
          let val = trimmed.slice(eq + 1).trim()
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1)
          }
          process.env[key] = val
        }
      }
    }
  } catch (e) {
    console.error('Could not load .env.local:', e)
    process.exit(1)
  }
}

loadEnv()

async function main() {
  const teamId = process.env.APPLE_MUSIC_TEAM_ID?.trim()
  const keyId = process.env.APPLE_MUSIC_KEY_ID?.trim()
  const keyPath = process.env.APPLE_MUSIC_PRIVATE_KEY_PATH?.trim()
  const storefront = process.env.APPLE_MUSIC_STOREFRONT?.trim() || 'us'

  console.log('Config:')
  console.log('  TEAM_ID:', teamId || '(missing)')
  console.log('  KEY_ID:', keyId || '(missing)')
  console.log('  KEY_PATH:', keyPath || '(missing)')
  console.log('  STOREFRONT:', storefront)
  console.log('')

  if (!teamId || !keyId || !keyPath) {
    console.error('Missing required env vars. Check .env.local')
    process.exit(1)
  }

  // 1. Load key file
  const resolvedPath = resolve(process.cwd(), keyPath)
  console.log('1. Loading key from:', resolvedPath)
  let pem: string
  try {
    pem = readFileSync(resolvedPath, 'utf8')
  } catch (e) {
    console.error('   FAIL: File not found or unreadable:', (e as Error).message)
    process.exit(1)
  }
  const normalized = pem.replace(/\\n/g, '\n').replace(/\r\n/g, '\n').trim()
  console.log('   OK: File loaded, length:', normalized.length)

  // 2. Parse key
  console.log('2. Parsing PEM with jose.importPKCS8...')
  let key: CryptoKey
  try {
    key = await jose.importPKCS8(normalized, 'ES256') as CryptoKey
  } catch (e) {
    console.error('   FAIL:', (e as Error).message)
    process.exit(1)
  }
  console.log('   OK: Key parsed')

  // 3. Sign JWT
  console.log('3. Signing JWT...')
  let token: string
  try {
    token = await new jose.SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid: keyId })
      .setIssuer(teamId)
      .setExpirationTime('180d')
      .sign(key)
  } catch (e) {
    console.error('   FAIL:', (e as Error).message)
    process.exit(1)
  }
  console.log('   OK: JWT generated, length:', token.length)

  // 4. Call Apple Music API
  const url = `https://api.music.apple.com/v1/catalog/${storefront}/search?term=bohemian+rhapsody&types=songs&limit=3`
  console.log('4. Calling Apple Music API...')
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const body = await res.text()
    console.error('   FAIL: HTTP', res.status, body.slice(0, 200))
    process.exit(1)
  }

  const data = await res.json()
  const songs = data?.results?.songs?.data ?? []
  console.log('   OK: Got', songs.length, 'songs')
  for (const s of songs.slice(0, 3)) {
    console.log('      -', s.attributes?.name, 'by', s.attributes?.artistName)
  }
  console.log('')
  console.log('SUCCESS: Apple Music API is working.')
}

main().catch((e) => {
  console.error('Error:', e)
  process.exit(1)
})
