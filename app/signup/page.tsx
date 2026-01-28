'use client'

import { useState, FormEvent } from 'react'
import { createClientComponentClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MossIcon } from '@/lib/components/MossIcon'

export default function SignupPage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()

  const validateUsername = (username: string): string | null => {
    if (username.length < 3 || username.length > 20) {
      return 'Username must be between 3 and 20 characters'
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return 'Username can only contain letters, numbers, and underscores'
    }
    const reserved = ['moss', 'api', 'admin', 'support', 'tali']
    if (reserved.includes(username.toLowerCase())) {
      return 'This username is reserved'
    }
    return null
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validate username
    const usernameError = validateUsername(username)
    if (usernameError) {
      setError(usernameError)
      setLoading(false)
      return
    }

    try {
      // Use signUp() to create account and send confirmation email
      // Generate a random password (required by Supabase but never used)
      // Since we use magic links, this password is never actually used
      const randomPassword = crypto.randomUUID() + crypto.randomUUID()
      
      const { error } = await supabase.auth.signUp({
        email,
        password: randomPassword, // Required by Supabase but never used (magic link only)
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?type=signup`,
          data: {
            username: username.toLowerCase(), // Store in user metadata
          },
        },
      })

      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        // Store username in localStorage as backup for callback route
        localStorage.setItem('pending_username', username.toLowerCase())
        
        // Check if user is immediately authenticated (email confirmation disabled)
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          // Email confirmation is disabled - user is already authenticated
          // Create user in public.users table immediately
          try {
            const response = await fetch('/api/users/create', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                username: username.toLowerCase(),
              }),
            })
            
            if (response.ok) {
              // User created successfully - redirect to feed
              router.push('/feed')
            } else {
              // Error creating user - redirect to onboarding to handle it
              router.push('/onboarding')
            }
          } catch (err) {
            // Error - redirect to onboarding
            router.push('/onboarding')
          }
        } else {
          // Email confirmation is enabled - show "check your email" message
          setEmailSent(true)
        }
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        <div className="flex-1 flex items-center justify-start pl-8 md:pl-16 pt-16">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-2">link has been sent!</h1>
            <p className="text-gray-400 text-lg md:text-xl ml-4">check your email</p>
            <p className="text-gray-500 text-sm md:text-base ml-4 mt-4">after confirming your email, you'll be able to login</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Logo - top left */}
      <div className="absolute top-8 left-8 md:top-16 md:left-16">
        <div className="flex items-center gap-2 mb-2">
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

      {/* Main content - centered left */}
      <div className="flex-1 flex items-center justify-start pl-8 md:pl-16">
        <div className="w-full max-w-md">
          {/* Description text */}
          <div className="mb-12 text-gray-300 text-sm md:text-base leading-relaxed max-w-md">
            <p className="mb-2">
              Moss is a place to connect through the media that moves you. To encourage sharing the things that really resonate, you can share up to 3 things per week.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
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
                disabled={loading}
                pattern="[a-zA-Z0-9_]+"
                minLength={3}
                maxLength={20}
              />
            </div>

            <div className="mb-8">
              <label htmlFor="email" className="block text-gray-400 text-sm mb-2">
                email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-transparent border-0 border-b border-gray-600 focus:border-green-500 focus:outline-none text-white text-lg pb-2 transition-colors"
                placeholder=""
                disabled={loading}
              />
            </div>

            {error && (
              <div className="mb-4 text-red-400 text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="text-green-500 text-lg font-medium hover:text-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'sending...' : 'get magic link →'}
            </button>
          </form>
        </div>
      </div>

      {/* Footer - bottom left */}
      <div className="absolute bottom-8 left-8 md:bottom-16 md:left-16">
        <Link href="/login" className="text-gray-400 text-sm hover:text-gray-300 transition-colors">
          ← back to login
        </Link>
      </div>
    </div>
  )
}
