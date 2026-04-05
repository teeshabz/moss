'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MossIcon } from '@/lib/components/MossIcon'

interface MeUser {
  avatar_color: string | null
}

export default function WelcomePage() {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser()
  const router = useRouter()
  const [user, setUser] = useState<MeUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!clerkLoaded) return
    if (!clerkUser) {
      router.replace('/login')
    }
  }, [clerkLoaded, clerkUser, router])

  useEffect(() => {
    if (!clerkLoaded || !clerkUser) return

    let cancelled = false

    async function load() {
      let redirecting = false
      try {
        const res = await fetch('/api/users/me')
        if (cancelled) return

        if (res.status === 401) {
          redirecting = true
          router.replace('/login')
          return
        }

        if (res.ok) {
          const data = await res.json().catch(() => ({}))
          if (data?.user) {
            if (!cancelled) {
              setUser({ avatar_color: data.user.avatar_color ?? null })
            }
            return
          }
        }

        if (res.status === 404) {
          const reconcileRes = await fetch('/api/auth/reconcile-migration', {
            method: 'POST',
            credentials: 'include',
          })
          const reconcileData = await reconcileRes.json().catch(() => ({}))
          if (reconcileData.reconciled && !cancelled) {
            const again = await fetch('/api/users/me')
            if (again.ok) {
              const data = await again.json().catch(() => ({}))
              if (data?.user) {
                if (!cancelled) {
                  setUser({ avatar_color: data.user.avatar_color ?? null })
                }
                return
              }
            }
          }
          redirecting = true
          router.replace('/onboarding')
          return
        }

        if (!cancelled) {
          setError('Something went wrong. Please try again.')
        }
      } catch {
        if (!cancelled) {
          setError('Something went wrong. Please try again.')
        }
      } finally {
        if (!cancelled && !redirecting) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [clerkLoaded, clerkUser, router])

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
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-8">
        <div className="text-red-400 mb-4 text-center">{error}</div>
        <Link href="/feed" className="text-green-500 hover:text-green-400">
          go to feed
        </Link>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-gray-400">thinking...</div>
      </div>
    )
  }

  const avatarColor = user.avatar_color || '#374151'

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="absolute top-8 left-1/2 -translate-x-1/2 md:top-16">
        <div className="flex items-center justify-center gap-2">
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
      <div className="flex-1 flex flex-col justify-center px-8 py-12">
        <div className="w-full max-w-md mx-auto space-y-8 text-center">
          <div className="space-y-5">
            <div
              className="w-16 h-16 md:w-20 md:h-20 rounded-full mx-auto"
              style={{ backgroundColor: avatarColor }}
            />
            <h1 className="text-xl md:text-2xl font-bold text-stone-100 leading-snug">
              what moved you this week?
            </h1>
            <p className="text-base md:text-lg text-stone-500 leading-relaxed lowercase">
              share 3 things/week
            </p>
          </div>
          <div className="flex justify-end pt-2">
            <Link
              href="/feed"
              className="text-green-500 text-3xl md:text-4xl font-medium hover:text-green-400 transition-colors"
              aria-label="Go to feed"
              onClick={() => {
                try {
                  sessionStorage.setItem(
                    'moss_friends_feed_hint_from_welcome',
                    '1'
                  )
                } catch {
                  // ignore
                }
              }}
            >
              →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
