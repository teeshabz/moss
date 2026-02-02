'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MossIcon } from '@/lib/components/MossIcon'

interface User {
  id: string
  username: string
  email: string
  avatar_color: string
}

const RESERVED_USERNAMES = ['moss', 'api', 'admin', 'support']

function validateUsername(username: string): string | null {
  if (username.length < 3 || username.length > 20) {
    return 'Username must be between 3 and 20 characters'
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return 'Username can only contain letters, numbers, and underscores'
  }
  if (RESERVED_USERNAMES.includes(username.toLowerCase())) {
    return 'This username is reserved'
  }
  return null
}

export default function OnboardingPage() {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser()
  const [dbUser, setDbUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const router = useRouter()

  // Redirect if not signed in
  useEffect(() => {
    if (!clerkLoaded) return
    if (!clerkUser) {
      router.push('/login')
      return
    }
  }, [clerkLoaded, clerkUser, router])

  // Check if user has a row in public.users; if not, try reconcile (migration id mismatch)
  useEffect(() => {
    if (!clerkLoaded || !clerkUser) return

    async function checkUser() {
      let redirecting = false
      try {
        let res = await fetch('/api/users/me')
        if (res.status === 401) {
          redirecting = true
          router.push('/login')
          return
        }
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            redirecting = true
            router.push('/feed')
            return
          }
        }
        if (res.status === 404) {
          const reconcileRes = await fetch('/api/auth/reconcile-migration', { method: 'POST', credentials: 'include' })
          const reconcileData = await reconcileRes.json().catch(() => ({}))
          if (reconcileData.reconciled) {
            redirecting = true
            router.push('/feed')
            return
          }
        }
        setDbUser(null)
      } catch (err) {
        setError('Something went wrong. Please try again.')
        console.error('Error loading user:', err)
      } finally {
        if (!redirecting) setLoading(false)
      }
    }

    checkUser()
  }, [clerkLoaded, clerkUser, router])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError(null)
    const err = validateUsername(username.trim())
    if (err) {
      setCreateError(err)
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim().toLowerCase() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCreateError(data.error || 'Failed to create user')
        setCreating(false)
        return
      }
      setDbUser(data.user)
    } catch (err) {
      setCreateError('Something went wrong. Please try again.')
      console.error('Error creating user:', err)
    } finally {
      setCreating(false)
    }
  }

  const handleGoToFeed = () => {
    router.push('/feed')
  }

  if (!clerkLoaded || !clerkUser) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-gray-400">thinking...</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-gray-400">thinking...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <div className="text-red-400 mb-4">{error}</div>
        <Link href="/login" className="text-green-500 hover:text-green-400">
          ← back to login
        </Link>
      </div>
    )
  }

  // No db user yet: show username form
  if (!dbUser) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        <div className="absolute top-8 left-8 md:top-16 md:left-16">
          <div className="flex items-center gap-2">
            <MossIcon color="#2d5016" size={24} />
            <h1
              className="text-2xl font-bold lowercase"
              style={{
                color: '#2d5016',
                fontFamily: 'monospace',
                letterSpacing: '0.1em',
                textRendering: 'geometricPrecision',
              }}
            >
              moss
            </h1>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-8">pick a username</h1>
          <form onSubmit={handleCreateUser} className="w-full max-w-sm">
            <div className="mb-6">
              <label htmlFor="username" className="block text-gray-400 text-sm mb-2">
                username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-transparent border-0 border-b border-gray-600 focus:border-green-500 focus:outline-none text-white text-lg pb-2 transition-colors"
                placeholder=""
                disabled={creating}
                pattern="[a-zA-Z0-9_]+"
                minLength={3}
                maxLength={20}
              />
            </div>
            {createError && (
              <div className="mb-4 text-red-400 text-sm">{createError}</div>
            )}
            <button
              type="submit"
              disabled={creating}
              className="text-green-500 text-lg font-medium hover:text-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'creating...' : 'continue →'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Have db user: show welcome screen
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="absolute top-8 left-8 md:top-16 md:left-16">
        <div className="flex items-center gap-2">
          <MossIcon color="#2d5016" size={24} />
          <h1
            className="text-2xl font-bold lowercase"
            style={{
              color: '#2d5016',
              fontFamily: 'monospace',
              letterSpacing: '0.1em',
              textRendering: 'geometricPrecision',
            }}
          >
            moss
          </h1>
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div
          className="w-24 h-24 md:w-32 md:h-32 rounded-full mb-6"
          style={{ backgroundColor: dbUser.avatar_color }}
        />
        <h2 className="text-2xl md:text-3xl font-bold mb-2">{dbUser.username}</h2>
        <p className="text-gray-400 text-sm md:text-base mb-12">{dbUser.email}</p>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">welcome!</h1>
        <p className="text-gray-400 text-lg md:text-xl mb-16">what moved you this week?</p>
        <button
          onClick={handleGoToFeed}
          className="text-green-500 text-3xl md:text-4xl font-medium hover:text-green-400 transition-colors cursor-pointer"
          aria-label="Go to feed"
        >
          →
        </button>
      </div>
    </div>
  )
}
