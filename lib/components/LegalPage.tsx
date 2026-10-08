import Link from 'next/link'
import { MossIcon } from '@/lib/components/MossIcon'
import { SMS_CONSENT_LABEL } from '@/lib/sms-consent'

const SUPPORT_EMAIL = 'hello.moss.app@gmail.com'
const OPERATOR = 'Natalia Shalaby'

function Email() {
  return (
    <a href={`mailto:${SUPPORT_EMAIL}`} className="underline hover:text-stone-200">
      {SUPPORT_EMAIL}
    </a>
  )
}

function H2({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-xl font-bold text-stone-100 pt-6 scroll-mt-8">
      {children}
    </h2>
  )
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="font-semibold text-stone-200 pt-2">{children}</h3>
}

export function LegalPage() {
  return (
    <main className="min-h-screen bg-black text-stone-400 px-6 md:px-8 py-12">
      <div className="max-w-2xl mx-auto space-y-4 leading-relaxed">
        <Link href="/" className="inline-flex items-center gap-2 mb-6">
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

        <h1 className="text-2xl md:text-3xl font-bold text-stone-100">Terms &amp; Privacy</h1>
        <p className="text-sm text-stone-500">Last updated: October 4, 2026</p>

        <p>
          Moss is a small social app for sharing the books, movies, songs, and other things that
          moved you with friends — up to 3 a week. Moss is run by {OPERATOR} at{' '}
          <a href="https://moss-app.co" className="underline hover:text-stone-200">
            moss-app.co
          </a>
          . Questions? Email <Email />.
        </p>

        <nav className="text-sm flex gap-4">
          <a href="#privacy" className="underline hover:text-stone-200">Privacy Policy</a>
          <a href="#terms" className="underline hover:text-stone-200">Terms of Service</a>
          <a href="#sms" className="underline hover:text-stone-200">Text messages</a>
        </nav>

        <H2 id="privacy">Privacy Policy</H2>

        <H3>What we collect</H3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Your name, email, username, and mobile number</li>
          <li>What you share on Moss: posts, notes, reactions, and follows</li>
          <li>Whether you&apos;ve opted in to texts</li>
          <li>Basic device and usage data that helps us run and improve Moss</li>
        </ul>

        <H3>How we use it</H3>
        <p>To run Moss, tell you about your account, and send texts you&apos;ve opted in to.</p>

        <H3>Who we share it with</H3>
        <p>
          Only the services that help run Moss, and only what they need: Clerk (sign-in), Supabase
          (database), Vercel (hosting and analytics), and Twilio (texts). We may also disclose
          information if the law requires it. We never sell your data.
        </p>
        <p>
          <strong className="text-stone-200">Your phone number stays with us.</strong> We do not
          sell, rent, or share your mobile number, text opt-in status, or consent with third
          parties or affiliates for marketing. Text messaging opt-in data and consent will not be
          shared with any third party.
        </p>

        <H3>Keeping and deleting your data</H3>
        <p>
          We keep your data while your account is active. To see, correct, or delete it, email{' '}
          <Email />. We use reasonable safeguards to protect it, though no system is perfectly
          secure.
        </p>

        <H3>Kids</H3>
        <p>Moss isn&apos;t for children under 13, and we don&apos;t knowingly collect their data.</p>

        <H2 id="terms">Terms of Service</H2>
        <p>By using Moss, you agree to these terms.</p>

        <H3>Your account</H3>
        <p>
          You must be at least 13 to use Moss. Keep your login safe — you&apos;re responsible for
          activity on your account.
        </p>

        <H3>Be decent</H3>
        <p>
          Don&apos;t harass people, post illegal or infringing content, or try to break Moss. We may
          remove content or accounts that do.
        </p>

        <H3>Your content</H3>
        <p>
          What you post stays yours. By posting it, you let Moss display it to other users so the
          app can work.
        </p>

        <H3>Our stuff</H3>
        <p>The Moss name, design, and app belong to {OPERATOR}.</p>

        <H3>No guarantees</H3>
        <p>
          Moss is provided &quot;as is.&quot; To the extent the law allows, we aren&apos;t liable
          for indirect or consequential damages from using it. These terms are governed by the laws
          of the State of New York.
        </p>

        <H2 id="sms">Text messages (Moss weekly nudge)</H2>
        <p>
          If you check &quot;{SMS_CONSENT_LABEL}&quot; during signup, in your profile settings, or at{' '}
          <a href="https://moss-app.co/sms" className="underline hover:text-stone-200">
            moss-app.co/sms
          </a>
          , you agree to receive recurring texts from Moss: a weekly reminder to share what moved you,
          plus occasional account updates.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-stone-200">Frequency:</strong> approx. 1 message per week</li>
          <li><strong className="text-stone-200">Cost:</strong> message and data rates may apply</li>
          <li>
            <strong className="text-stone-200">Stop anytime:</strong> reply STOP, or turn texts off
            in your profile
          </li>
          <li>
            <strong className="text-stone-200">Help:</strong> reply HELP, or email <Email />
          </li>
          <li>Texts are optional and not a condition of using Moss</li>
          <li>Carriers are not liable for delayed or undelivered messages</li>
        </ul>

        <H2>Changes</H2>
        <p>
          We may update this page from time to time. When we do, we&apos;ll change the &quot;Last
          updated&quot; date above.
        </p>
      </div>
    </main>
  )
}
