'use client'

import { SignIn, SignedOut, useAuth } from '@clerk/nextjs'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MossIcon } from '@/lib/components/MossIcon'
import { mossClerkAppearance } from '@/lib/clerk-appearance'

export default function LoginPage() {
  const { isSignedIn } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isSignedIn) {
      router.replace('/feed')
    }
  }, [isSignedIn, router])

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Logo and tagline - centered at top */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 md:top-16 z-10 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <MossIcon color="#2d5016" size={36} />
          <h1
            className="text-4xl font-bold lowercase"
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

      {/* When signed out: show Clerk SignIn - centered, middle of page */}
      <SignedOut>
        <div className="flex-1 flex items-center justify-center min-w-0 px-4 sm:px-8 md:px-16">
          <SignIn
            appearance={mossClerkAppearance}
            fallbackRedirectUrl="/onboarding"
            signUpUrl="/signup"
          />
        </div>
      </SignedOut>

      {/* Footer - centered */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 md:bottom-16 text-center">
        <div className="text-gray-500 text-xs mt-2">BETA</div>
      </div>
    </div>
  )
}
