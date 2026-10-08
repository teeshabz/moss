import { existsSync } from 'fs'
import path from 'path'
import type { Metadata } from 'next'
import Link from 'next/link'
import { MossIcon } from '@/lib/components/MossIcon'
import { SmsOptInForm } from './SmsOptInForm'

export const metadata: Metadata = {
  title: 'weekly nudge · moss',
  description: 'Opt in to Moss text messages: a weekly reminder to share what moved you.',
}

const ONBOARDING_PREVIEW_SRC = '/sms-onboarding-preview.png'

export default function SmsPage() {
  const hasOnboardingPreview = existsSync(path.join(process.cwd(), 'public', ONBOARDING_PREVIEW_SRC))

  return (
    <main className="min-h-screen bg-black text-white flex flex-col px-8 py-10">
      <Link href="/" className="inline-flex items-center gap-2 self-start">
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

      <div className="flex-1 flex flex-col items-center justify-center py-12">
        <h1 className="text-lg md:text-xl font-bold mb-2 text-center">get your weekly nudge</h1>
        <p className="text-stone-500 text-sm mb-8 text-center max-w-md">
          a text once a week reminding you to share what moved you.
        </p>
        <SmsOptInForm />

        {hasOnboardingPreview && (
          <section className="w-full max-w-md mt-16 space-y-3 text-center">
            <h2 className="text-sm text-stone-400">where you&apos;ll see this</h2>
            <p className="text-xs text-stone-500 leading-relaxed">
              new members see the same opt-in on the moss sign-up screen, right after they click{' '}
              <Link href="/signup" className="underline text-stone-300 hover:text-white">
                sign up for moss
              </Link>
              :
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ONBOARDING_PREVIEW_SRC}
              alt="Moss sign-up screen showing username, phone number, name fields, and the unchecked 'text me my weekly nudge' checkbox with the SMS disclosure"
              className="w-full rounded-lg border border-stone-800"
            />          </section>
        )}
      </div>

      <footer className="flex justify-center gap-4 text-xs text-gray-500">
        <Link href="/terms" className="hover:text-gray-300 transition-colors">terms</Link>
        <Link href="/privacy" className="hover:text-gray-300 transition-colors">privacy</Link>
        <a href="mailto:hello.moss.app@gmail.com" className="hover:text-gray-300 transition-colors">
          hello.moss.app@gmail.com
        </a>
      </footer>
    </main>
  )
}
