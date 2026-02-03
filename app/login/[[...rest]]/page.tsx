'use client'

import { SignIn, SignedIn, SignedOut, SignOutButton } from '@clerk/nextjs'
import Link from 'next/link'
import { MossIcon } from '@/lib/components/MossIcon'
import { mossClerkAppearance } from '@/lib/clerk-appearance'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Logo and tagline - top left */}
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
        <p className="text-gray-400 text-sm md:text-base">share what moves you</p>
      </div>

      {/* When already signed in: show message + sign out */}
      <SignedIn>
        <div className="flex-1 flex flex-col items-center justify-center min-w-0 px-4 sm:px-8 md:px-16 pt-24 md:pt-32 text-center">
          <p className="text-gray-400 mb-4 lowercase">you&apos;re already signed in</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/feed"
              className="px-4 py-2 rounded-full bg-[#2d5016] text-white text-sm font-medium hover:bg-[#3a6b1e] transition-colors"
            >
              go to feed
            </Link>
            <SignOutButton>
              <button
                type="button"
                className="px-4 py-2 rounded-full border border-gray-600 text-gray-300 text-sm font-medium hover:border-gray-500 hover:text-white transition-colors"
              >
                sign out
              </button>
            </SignOutButton>
          </div>
        </div>
      </SignedIn>

      {/* When signed out: show Clerk SignIn */}
      <SignedOut>
        <div className="flex-1 flex items-center justify-start min-w-0 px-4 sm:px-8 md:px-16 pt-24 md:pt-32">
          <SignIn
            appearance={mossClerkAppearance}
            fallbackRedirectUrl="/onboarding"
            signUpUrl="/signup"
          />
        </div>
      </SignedOut>

      {/* Footer - bottom left */}
      <div className="absolute bottom-8 left-8 md:bottom-16 md:left-16">
        <SignedIn>
          <Link href="/feed" className="text-gray-400 text-sm hover:text-gray-300 transition-colors">
            go to feed
          </Link>
        </SignedIn>
        <div className="text-gray-500 text-xs mt-2">BETA</div>
      </div>
    </div>
  )
}
