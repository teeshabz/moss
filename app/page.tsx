import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { MossIcon } from '@/lib/components/MossIcon'

export default async function Home() {
  const { userId } = await auth()
  if (userId) {
    redirect('/feed')
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8">
      <div className="flex flex-col items-center justify-center flex-1 w-full max-w-lg text-center">
        {/* Logo: icon + "moss" (same as login) */}
        <div className="flex items-center gap-2 mb-4">
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

        {/* Tagline */}
        <p className="text-gray-400 text-lg mb-10">
          connect through media that moves you
        </p>

        {/* Enter → login */}
        <Link
          href="/login"
          className="px-8 py-3 rounded-full bg-[#2d5016] text-white font-medium hover:bg-[#3a6b1e] transition-colors"
        >
          enter
        </Link>
      </div>

      {/* Footer */}
      <footer className="text-gray-400 text-sm mt-auto pb-8 flex flex-col items-center gap-2">
        <a
          href="mailto:hello.moss.app@gmail.com"
          className="hover:text-gray-300 transition-colors"
        >
          contact: hello.moss.app@gmail.com
        </a>
        <div className="flex gap-4 text-xs text-gray-500">
          <Link href="/terms" className="hover:text-gray-300 transition-colors">
            terms
          </Link>
          <Link href="/privacy" className="hover:text-gray-300 transition-colors">
            privacy
          </Link>
        </div>
      </footer>
    </main>
  )
}
