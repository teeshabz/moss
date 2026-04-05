'use client'

import { useState, useEffect, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MossIcon } from '@/lib/components/MossIcon'
import { formatPhoneInputDisplay, normalizeProfilePhoneToE164 } from '@/lib/utils'

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

function validatePhoneInput(raw: string): string | null {
  const t = raw.trim()
  if (!t) return 'Phone number is required'
  if (!normalizeProfilePhoneToE164(t)) {
    return 'Enter a valid US number like (555) 555-5555, or international with +country code'
  }
  return null
}

export default function OnboardingPage() {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser()
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const router = useRouter()
  const clerkNamePrefilled = useRef(false)

  useEffect(() => {
    if (!clerkLoaded || !clerkUser || clerkNamePrefilled.current) return
    clerkNamePrefilled.current = true
    const fn = clerkUser.firstName?.trim()
    const ln = clerkUser.lastName?.trim()
    if (fn) setFirstName(fn)
    if (ln) setLastName(ln)
  }, [clerkLoaded, clerkUser])

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
        setShowForm(true)
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
    const phoneErr = validatePhoneInput(phoneNumber)
    if (phoneErr) {
      setCreateError(phoneErr)
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          phone_number: phoneNumber.trim(),
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCreateError(data.error || 'Failed to create user')
        setCreating(false)
        return
      }
      router.push('/welcome')
    } catch (err) {
      setCreateError('Something went wrong. Please try again.')
      console.error('Error creating user:', err)
    } finally {
      setCreating(false)
    }
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

  // No profile yet: show setup form
  if (showForm) {
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
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-24">
          <h1 className="text-lg md:text-xl font-bold mb-8 text-center">
            hey, welcome
          </h1>
          <form onSubmit={handleCreateUser} className="w-full max-w-md space-y-6">
              <div>
                <label htmlFor="username" className="block text-gray-400 text-sm mb-2">
                  username <span className="text-gray-300" aria-hidden>*</span>
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
                  autoComplete="username"
                />
              </div>
              <div>
                <label htmlFor="phone_number" className="block text-gray-400 text-sm mb-2">
                  phone number <span className="text-gray-300" aria-hidden>*</span>
                </label>
                <input
                  id="phone_number"
                  type="tel"
                  inputMode="numeric"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(formatPhoneInputDisplay(e.target.value))}
                  required
                  className="w-full bg-transparent border-0 border-b border-gray-600 focus:border-green-500 focus:outline-none text-white text-lg pb-2 transition-colors placeholder:text-sm placeholder:text-gray-600"
                  placeholder="(555) 555-5555"
                  maxLength={20}
                  disabled={creating}
                  autoComplete="tel-national"
                />
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <label htmlFor="first_name" className="text-gray-400 text-sm">
                  first name
                </label>
                <label htmlFor="last_name" className="text-gray-400 text-sm">
                  last name
                </label>
                <input
                  id="first_name"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full min-w-0 bg-transparent border-0 border-b border-gray-600 focus:border-green-500 focus:outline-none text-white text-lg pb-2 transition-colors"
                  disabled={creating}
                  autoComplete="given-name"
                />
                <input
                  id="last_name"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full min-w-0 bg-transparent border-0 border-b border-gray-600 focus:border-green-500 focus:outline-none text-white text-lg pb-2 transition-colors"
                  disabled={creating}
                  autoComplete="family-name"
                />
              </div>
              {createError && (
                <div className="text-red-400 text-sm">{createError}</div>
              )}
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={creating}
                  className="text-green-500 text-3xl md:text-4xl font-medium hover:text-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  aria-label={creating ? 'Creating account' : 'Continue'}
                >
                  →
                </button>
              </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-gray-400">thinking...</div>
    </div>
  )
}
