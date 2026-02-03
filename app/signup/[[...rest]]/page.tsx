'use client'

import { SignUp } from '@clerk/nextjs'
import Link from 'next/link'
import { MossIcon } from '@/lib/components/MossIcon'
import { mossClerkAppearanceSignUp } from '@/lib/clerk-appearance'

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Logo - centered at top */}
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
      </div>

      {/* Clerk SignUp - main content area, centered, middle of page */}
      <div className="flex-1 flex items-center justify-center min-w-0 px-4 sm:px-8 md:px-16">
        <SignUp
          appearance={mossClerkAppearanceSignUp}
          fallbackRedirectUrl="/onboarding"
          signInUrl="/login"
        />
      </div>

      {/* Footer - centered */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 md:bottom-16 text-center">
        <Link href="/login" className="text-gray-400 text-sm hover:text-gray-300 transition-colors">
          ← back to login
        </Link>
        <div className="text-gray-500 text-xs mt-2">BETA</div>
      </div>
    </div>
  )
}
