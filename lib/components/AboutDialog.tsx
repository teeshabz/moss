'use client'

import { useState } from 'react'
import { MossIcon } from '@/lib/components/MossIcon'

export function AboutText() {
  return (
    <div className="space-y-5 text-stone-400 text-sm leading-relaxed lowercase">
      <p>
        moss is a space to commemorate the media that stays with you, and keep tabs on what your
        friends are watching, reading, and listening to.
      </p>
      <p>
        to encourage sharing the things that really resonate, you can share up to 3 things a week.
      </p>
    </div>
  )
}

export function AboutDialog({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-title"
    >
      <div
        className="bg-black border border-stone-800 rounded-lg max-w-[420px] w-full p-8 flex flex-col items-center text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-6" id="about-title">
          <MossIcon color="#2d5016" size={26} />
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
        </div>
        <AboutText />
        <button
          onClick={onClose}
          type="button"
          className="mt-6 text-white text-xs font-medium hover:text-stone-300 transition-colors lowercase"
        >
          close
        </button>
      </div>
    </div>
  )
}

export function HowItWorksLink() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-gray-500 text-xs hover:text-gray-300 transition-colors underline underline-offset-4"
      >
        how it works
      </button>
      {open && <AboutDialog onClose={() => setOpen(false)} />}
    </>
  )
}
