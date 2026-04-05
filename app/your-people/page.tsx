import { Suspense } from 'react'
import YourPeoplePageClient from './YourPeoplePageClient'

export default function YourPeoplePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <p className="text-stone-500 lowercase">loading...</p>
        </div>
      }
    >
      <YourPeoplePageClient />
    </Suspense>
  )
}
