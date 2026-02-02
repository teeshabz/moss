'use client'

import { SignUp } from '@clerk/nextjs'
import Link from 'next/link'
import { MossIcon } from '@/lib/components/MossIcon'
import { mossClerkAppearance } from '@/lib/clerk-appearance'

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Logo - top left */}
      <div className="absolute top-8 left-8 md:top-16 md:left-16 z-10">
        <div className="flex items-center gap-2 mb-2">
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

      {/* Clerk SignUp - main content area */}
      <div className="flex-1 flex items-center justify-start min-w-0 px-4 sm:px-8 md:px-16 pt-24 md:pt-32">
        <SignUp
          appearance={mossClerkAppearance}
          fallbackRedirectUrl="/onboarding"
          signInUrl="/login"
        />
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
