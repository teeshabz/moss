'use client'

import { Suspense, useState, FormEvent } from 'react'
import { createClientComponentClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { MossIcon } from '@/lib/components/MossIcon'

function LoginPageContent() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/feed'

  const supabase = createClientComponentClient()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Check if account exists before sending magic link
      const checkResponse = await fetch('/api/auth/check-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const checkData = await checkResponse.json()

      if (!checkData.exists) {
        setError("couldn't find account")
        setLoading(false)
        return
      }

      if (!checkData.verified) {
        setError('Please verify your email first. Check your inbox for the confirmation link.')
        setLoading(false)
        return
      }

      // Account exists and is verified - send login magic link
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?type=login&next=${encodeURIComponent(redirect)}`,
        },
      })

      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        setEmailSent(true)
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        {/* Logo - top left */}
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
        <div className="flex-1 flex items-start justify-start pl-8 md:pl-16 pt-24 md:pt-32">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-2">
              link has been sent!
            </h1>
            <p className="text-gray-400 text-lg md:text-xl">check your email</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Logo and tagline - top left */}
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
        <p className="text-gray-400 text-sm md:text-base">share what moves you</p>
      </div>

      {/* Main content - centered left */}
      <div className="flex-1 flex items-center justify-start pl-8 md:pl-16">
        <form onSubmit={handleSubmit} className="w-full max-w-md">
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
            {loading ? 'sending...' : 'connect →'}
          </button>
        </form>
      </div>

      {/* Footer - bottom left */}
      <div className="absolute bottom-8 left-8 md:bottom-16 md:left-16">
        <Link href="/signup" className="text-gray-400 text-sm hover:text-gray-300 transition-colors">
          need an account?
        </Link>
        <div className="text-gray-500 text-xs mt-2">BETA</div>
      </div>
    </div>
  )
}

function LoginPageFallback() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
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
        <p className="text-gray-400 text-sm md:text-base">share what moves you</p>
      </div>
      <div className="flex-1 flex items-center justify-start pl-8 md:pl-16">
        <p className="text-gray-500 text-lg">Loading...</p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  )
}
