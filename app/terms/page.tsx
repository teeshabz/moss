import type { Metadata } from 'next'
import { LegalPage } from '@/lib/components/LegalPage'

export const metadata: Metadata = {
  title: 'Terms of Service · moss',
}

export default function TermsPage() {
  return <LegalPage />
}
