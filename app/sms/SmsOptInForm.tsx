'use client'

import { useEffect, useState, FormEvent } from 'react'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { formatPhoneInputDisplay, normalizeProfilePhoneToE164 } from '@/lib/utils'
import { SMS_CONSENT_DISCLOSURE, SMS_CONSENT_LABEL } from '@/lib/sms-consent'

type Status =
  | { kind: 'idle' }
  | { kind: 'needs-account' }
  | { kind: 'needs-onboarding' }
  | { kind: 'saved'; optedIn: boolean }
  | { kind: 'error'; message: string }

export function SmsOptInForm() {
  const { isSignedIn, isLoaded } = useUser()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [smsOptIn, setSmsOptIn] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    let cancelled = false
    fetch('/api/users/me?summary=1')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const phone = data?.user?.phone_number
        if (!cancelled && phone) setPhoneNumber(formatPhoneInputDisplay(phone))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [isLoaded, isSignedIn])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const phoneE164 = normalizeProfilePhoneToE164(phoneNumber)
    if (!phoneE164) {
      setStatus({
        kind: 'error',
        message: 'enter a valid US number like (555) 555-5555, or international with +country code',
      })
      return
    }

    if (!isSignedIn) {
      setStatus({ kind: 'needs-account' })
      return
    }

    setSaving(true)
    setStatus({ kind: 'idle' })
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          smsOptIn
            ? { phone_number: phoneE164, sms_opt_in: true, sms_consent_source: 'sms_page' }
            : { phone_number: phoneE164 }
        ),
      })
      if (res.status === 401 || res.status === 404) {
        setStatus({ kind: 'needs-onboarding' })
        return
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStatus({ kind: 'error', message: data.error ?? 'something went wrong. please try again.' })
        return
      }
      if (smsOptIn && !data.user?.sms_opt_in) {
        setStatus({ kind: 'error', message: "we couldn't turn on your weekly nudge. please try again." })
        return
      }
      setStatus({ kind: 'saved', optedIn: smsOptIn })
    } catch {
      setStatus({ kind: 'error', message: 'something went wrong. please try again.' })
    } finally {
      setSaving(false)
    }
  }

  if (status.kind === 'saved') {
    return (
      <div className="w-full max-w-md space-y-4 text-center">
        <p className="text-stone-200 text-lg">
          {status.optedIn ? "you're in." : 'phone number saved.'}
        </p>
        <p className="text-stone-400 text-sm leading-relaxed">
          {status.optedIn
            ? 'moss will text you your weekly nudge. reply STOP anytime to cancel.'
            : 'check the box anytime to get your weekly nudge.'}
        </p>
        <Link href="/feed" className="inline-block text-green-500 hover:text-green-400 text-sm">
          go to your feed →
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
      <div>
        <label htmlFor="phone_number" className="block text-gray-400 text-sm mb-2">
          phone number <span className="text-gray-300" aria-hidden>*</span>
        </label>
        <input
          id="phone_number"
          type="tel"
          inputMode="numeric"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(formatPhoneInputDisplay(e.target.value))}
          required
          className="w-full bg-transparent border-0 border-b border-gray-600 focus:border-green-500 focus:outline-none text-white text-lg pb-2 transition-colors placeholder:text-sm placeholder:text-gray-600"
          placeholder="(555) 555-5555"
          maxLength={20}
          disabled={saving}
          autoComplete="tel-national"
        />
      </div>

      <div className="flex items-start gap-3 pt-1">
        <input
          id="sms_opt_in"
          type="checkbox"
          checked={smsOptIn}
          onChange={(e) => setSmsOptIn(e.target.checked)}
          disabled={saving}
          aria-describedby="sms_opt_in_disclosure"
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-600 bg-transparent accent-green-500 focus:ring-green-500"
        />
        <div className="space-y-1.5">
          <label htmlFor="sms_opt_in" className="block text-sm text-gray-400 leading-5 select-none">
            {SMS_CONSENT_LABEL}
          </label>
          <p id="sms_opt_in_disclosure" className="text-xs text-gray-500 leading-relaxed">
            {SMS_CONSENT_DISCLOSURE}{' '}
            <Link href="/terms" className="underline hover:text-gray-300">
              Terms
            </Link>
            {' · '}
            <Link href="/privacy" className="underline hover:text-gray-300">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>

      {status.kind === 'error' && <div className="text-red-400 text-sm">{status.message}</div>}

      {status.kind === 'needs-account' && (
        <div className="space-y-3 text-sm text-stone-300">
          <p>create a moss account or log in to finish turning on your weekly nudge.</p>
          <div className="flex gap-3">
            <Link
              href="/signup"
              className="px-5 py-2 rounded-full bg-[#2d5016] text-white hover:bg-[#3a6b1e] transition-colors"
            >
              sign up
            </Link>
            <Link
              href="/login?redirect_url=/sms"
              className="px-5 py-2 rounded-full border border-[#2d5016] text-gray-300 hover:text-white transition-colors"
            >
              log in
            </Link>
          </div>
        </div>
      )}

      {status.kind === 'needs-onboarding' && (
        <div className="space-y-2 text-sm text-stone-300">
          <p>finish setting up your moss account to turn on your weekly nudge.</p>
          <Link href="/onboarding" className="text-green-500 hover:text-green-400">
            finish setup →
          </Link>
        </div>
      )}

      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-full bg-[#2d5016] text-white text-[15px] font-medium hover:bg-[#3a6b1e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'saving...' : 'submit'}
        </button>
      </div>
    </form>
  )
}
