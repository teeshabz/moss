import type { Metadata } from 'next'
import { LegalPage } from '@/lib/components/LegalPage'

export const metadata: Metadata = {
  title: 'Privacy Policy · moss',
}

export default function PrivacyPage() {
  return <LegalPage />
}
