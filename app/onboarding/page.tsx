'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface User {
  id: string
  username: string
  email: string
  avatar_color: string
}

export default function OnboardingPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function loadUser() {
      try {
        // Get authenticated user
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser()

        if (authError || !authUser) {
          router.push('/login')
          return
        }

        // Check if user exists in public.users table
        const { data: dbUser, error: dbError } = await supabase
          .from('users')
          .select('id, username, email, avatar_color')
          .eq('id', authUser.id)
          .single()

        if (dbError || !dbUser) {
          // User doesn't exist in public.users - create it
          let username = authUser.user_metadata?.username

          // Try to get from localStorage as backup
          if (!username && typeof window !== 'undefined') {
            username = localStorage.getItem('pending_username')
          }

          // Fallback to email prefix if still no username
          if (!username) {
            username = authUser.email?.split('@')[0] || 'user'
          }

          // Create user in public.users table
          const response = await fetch('/api/users/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              username: username.toLowerCase(),
            }),
          })

          if (!response.ok) {
            const errorData = await response.json()
            setError(errorData.error || 'Failed to create user')
            setLoading(false)
            return
          }

          // Fetch the newly created user
          const { data: newUser } = await supabase
            .from('users')
            .select('id, username, email, avatar_color')
            .eq('id', authUser.id)
            .single()

          if (newUser) {
            setUser(newUser)
          } else {
            setError('User created but could not be retrieved')
          }
        } else {
          // User exists - use the data
          setUser(dbUser)
        }
      } catch (err) {
        setError('Something went wrong. Please try again.')
        console.error('Error loading user:', err)
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [router, supabase])

  const handleGoToFeed = () => {
    router.push('/feed')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
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

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Logo - top left */}
      <div className="absolute top-8 left-8 md:top-16 md:left-16">
        <div className="flex items-center gap-2">
          <span className="text-green-500 text-2xl">*</span>
          <h1 className="text-2xl md:text-3xl font-bold text-green-500">MOSS</h1>
        </div>
      </div>

      {/* Main content - centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {/* Avatar circle */}
        <div
          className="w-24 h-24 md:w-32 md:h-32 rounded-full mb-6"
          style={{ backgroundColor: user.avatar_color }}
        />

        {/* Username */}
        <h2 className="text-2xl md:text-3xl font-bold mb-2">{user.username}</h2>

        {/* Email */}
        <p className="text-gray-400 text-sm md:text-base mb-12">{user.email}</p>

        {/* Welcome message */}
        <h1 className="text-4xl md:text-5xl font-bold mb-4">welcome!</h1>

        {/* Prompt */}
        <p className="text-gray-400 text-lg md:text-xl mb-16">what moved you this week?</p>

        {/* Navigation arrow */}
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
