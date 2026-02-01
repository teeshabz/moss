'use client'

import { useState, useEffect, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MossIcon } from '@/lib/components/MossIcon'
import { generateAvatarColor } from '@/lib/utils'
import type { User } from '@/lib/types'

function LockIcon() {
  return (
    <svg
      className="size-3.5 text-stone-500 flex-shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  )
}

export default function EditProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [refreshingColor, setRefreshingColor] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [phoneNumber, setPhoneNumber] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch('/api/users/me')
        if (res.status === 401 || res.status === 404) {
          router.push('/login')
          return
        }
        if (!res.ok) {
          setError('Failed to load profile')
          setLoading(false)
          return
        }
        const data = await res.json()
        const u = data.user as User
        setUser(u)
        setPhoneNumber(u.phone_number ?? '')
        setFirstName(u.first_name ?? '')
        setLastName(u.last_name ?? '')
      } catch {
        setError('Failed to load profile')
      } finally {
        setLoading(false)
      }
    }
    loadUser()
  }, [router])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phoneNumber.trim() || null,
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Failed to save')
        setSaving(false)
        return
      }
      router.push(`/profile/${encodeURIComponent(user.username)}`)
    } catch {
      setError('Failed to save')
      setSaving(false)
    }
  }

  const handleRefreshColor = async () => {
    if (!user) return
    setError(null)
    setRefreshingColor(true)
    const newColor = generateAvatarColor()
    const previousColor = user.avatar_color
    setUser((prev) => (prev ? { ...prev, avatar_color: newColor } : null))
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_color: newColor }),
      })
      if (!res.ok) {
        setUser((prev) => (prev ? { ...prev, avatar_color: previousColor } : null))
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Failed to update color')
      }
    } catch {
      setUser((prev) => (prev ? { ...prev, avatar_color: previousColor } : null))
      setError('Failed to update color')
    } finally {
      setRefreshingColor(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-gray-400">thinking...</div>
      </div>
    )
  }

  if (error && !user) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
        <div className="text-red-400 mb-4">{error}</div>
        <Link href="/login" className="text-green-500 hover:text-green-400">
          ← back to login
        </Link>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="pt-6 pb-4 px-6 md:px-8 flex items-center justify-between">
        <Link
          href={`/profile/${encodeURIComponent(user.username)}`}
          className="text-gray-400 hover:text-gray-300 transition-colors text-lg"
          aria-label="Back to profile"
        >
          ←
        </Link>
        <Link href="/feed" className="flex items-center gap-2" aria-label="moss">
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

      {/* Main content - responsive: fields grow with viewport up to max width */}
      <div className="flex-1 w-full min-w-0 px-4 sm:px-6 md:px-8 pt-2 pb-8 max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl">
        <h1 className="text-2xl md:text-3xl font-bold mb-4 text-stone-200">edit profile</h1>

        {/* Profile color section */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-12 h-12 rounded-full flex-shrink-0"
            style={{ backgroundColor: user.avatar_color || '#374151' }}
          />
          <button
            type="button"
            onClick={handleRefreshColor}
            disabled={refreshingColor}
            className="text-stone-400 hover:text-stone-300 text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={refreshingColor ? 'Updating color…' : 'Refresh avatar color'}
          >
            <span aria-hidden className={refreshingColor ? 'animate-spin' : undefined}>↻</span>{' '}
            {refreshingColor ? 'refreshing…' : 'refresh color'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          {/* USERNAME - locked */}
          <div className="w-full">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] uppercase tracking-wider font-bold text-stone-600">
                username
              </label>
              <LockIcon />
            </div>
            <div className="w-full bg-stone-900/30 border-2 border-stone-800/50 rounded-lg px-3 py-2 text-stone-500 text-sm font-medium">
              {user.username}
            </div>
          </div>

          {/* EMAIL - locked */}
          <div className="w-full">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] uppercase tracking-wider font-bold text-stone-600">
                email
              </label>
              <LockIcon />
            </div>
            <div className="w-full bg-stone-900/30 border-2 border-stone-800/50 rounded-lg px-3 py-2 text-stone-500 text-sm font-medium">
              {user.email}
            </div>
          </div>

          {/* PHONE NUMBER */}
          <div className="w-full">
            <label htmlFor="phone_number" className="text-[10px] uppercase tracking-wider font-bold text-stone-500 block mb-1">
              phone number
            </label>
            <input
              id="phone_number"
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="w-full bg-stone-900/30 border-2 border-stone-800 rounded-lg px-3 py-2 text-stone-200 placeholder:text-stone-600 text-sm font-medium focus:border-stone-700 focus:outline-none transition-colors"
            />
          </div>

          {/* FIRST NAME - optional */}
          <div className="w-full">
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="first_name" className="text-[10px] uppercase tracking-wider font-bold text-stone-500">
                first name
              </label>
              <span className="text-[9px] uppercase tracking-wider text-stone-600">optional</span>
            </div>
            <input
              id="first_name"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="your first name"
              className="w-full bg-stone-900/30 border-2 border-stone-800 rounded-lg px-3 py-2 text-stone-200 placeholder:text-stone-600 text-sm font-medium focus:border-stone-700 focus:outline-none transition-colors"
            />
          </div>

          {/* LAST NAME - optional */}
          <div className="w-full">
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="last_name" className="text-[10px] uppercase tracking-wider font-bold text-stone-500">
                last name
              </label>
              <span className="text-[9px] uppercase tracking-wider text-stone-600">optional</span>
            </div>
            <input
              id="last_name"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="your last name"
              className="w-full bg-stone-900/30 border-2 border-stone-800 rounded-lg px-3 py-2 text-stone-200 placeholder:text-stone-600 text-sm font-medium focus:border-stone-700 focus:outline-none transition-colors"
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="rounded-full text-white font-medium px-5 py-1.5 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
            style={{ backgroundColor: '#2d5016' }}
          >
            {saving ? 'saving...' : 'save'}
          </button>
        </form>
      </div>
    </div>
  )
}
