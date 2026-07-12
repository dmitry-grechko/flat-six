import Link from 'next/link';
import MarketingShell from '@/components/marketing/MarketingShell';
import { mono, sans, RED } from '@/components/marketing/tokens';

export const metadata = {
  title: 'Privacy & Terms',
  description:
    'Privacy policy and terms of use for FLAT·SIX, operated by Themis Grove LLC — a free, open-source DIY maintenance app for the Boxster & Cayman (987, 981, and more).',
  alternates: { canonical: '/legal' },
  openGraph: {
    title: 'Privacy & Terms · FLAT·SIX',
    description:
      'Privacy policy and terms of use for FLAT·SIX — operated by Themis Grove LLC. Independent and unofficial.',
    url: '/legal',
    type: 'article',
  },
};

const LAST_UPDATED = 'July 2026';
const OPERATOR = 'Themis Grove LLC';
const GITHUB_ISSUES = 'https://github.com/dmitry-grechko/flat-six/issues';

function Section({ id, kicker, title, children }: { id: string; kicker: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ marginTop: 64 }}>
      <div style={{ font: `500 11px/1 ${mono}`, letterSpacing: '.22em', color: RED, marginBottom: 14 }}>{kicker}</div>
      <h2 style={{ margin: '0 0 18px', font: `300 32px/1.12 ${sans}`, letterSpacing: '-.015em', color: '#0B0B0C' }}>{title}</h2>
      {children}
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: '0 0 16px', font: `400 15px/1.7 ${sans}`, color: '#3A3A3E', maxWidth: 720 }}>{children}</p>;
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 style={{ margin: '28px 0 10px', font: `500 17px/1.3 ${sans}`, color: '#0B0B0C' }}>{children}</h3>;
}

export default function LegalPage() {
  return (
    <MarketingShell>
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '72px 28px 100px' }}>
        <div style={{ background: '#fff', border: '1px solid #E3E3E5', borderRadius: 8, padding: '48px 40px 56px' }}>
          <div style={{ font: `500 11px/1 ${mono}`, letterSpacing: '.22em', color: RED, marginBottom: 16 }}>PRIVACY &amp; TERMS</div>
          <h1 style={{ margin: 0, font: `300 44px/1.08 ${sans}`, letterSpacing: '-.02em', color: '#0B0B0C' }}>The short, honest version.</h1>
          <p style={{ margin: '20px 0 0', font: `400 16px/1.65 ${sans}`, color: '#6E6E73', maxWidth: 640 }}>
            FLAT·SIX is a free, open-source DIY garage operated by <strong style={{ color: '#0B0B0C', fontWeight: 500 }}>{OPERATOR}</strong>.
            It is independent and unofficial. This page explains what happens to your data and the terms under which you use the app.
          </p>
          <div style={{ marginTop: 18, font: `500 11px/1.4 ${mono}`, letterSpacing: '.08em', color: '#9A9AA0' }}>
            LAST UPDATED · {LAST_UPDATED} · OPERATOR · {OPERATOR.toUpperCase()}
          </div>

          <Section id="privacy" kicker="01 · PRIVACY" title="Privacy">
            <P>
              FLAT·SIX is operated by {OPERATOR}. The service is provided free of charge as open-source software. Your personal
              data is never sold, rented, shared for advertising, or used to train models. There are no ad networks. We use
              Google Analytics to understand which features help owners — but only if you accept in the consent banner; if you
              decline, no analytics scripts or cookies load. The desktop app sends no analytics at all.
            </P>
            <H3>What is stored</H3>
            <P>
              To sign in, the app stores your <strong>email address</strong>, used only to send the magic sign-in link and to
              identify your account. If you choose to use the app, it stores the data <strong>you</strong> enter: your
              vehicle details and your service records (dates, mileage, parts, costs and notes). That is the entire scope of
              personal data we hold about you.
            </P>
            <H3>Where it is stored</H3>
            <P>
              Accounts and your records live in a <strong>Supabase</strong> (PostgreSQL) database, protected by row-level
              security so each account can only read and write its own rows. Supabase processes this data on behalf of{' '}
              {OPERATOR} as a hosting provider. Reference data — component diagrams, part numbers, torque specs, and similar —
              is static and shared by everyone; it is not personal data.
            </P>
            <H3>Claude / MCP</H3>
            <P>
              If you connect your garage to Claude (or another MCP client), requests run with your approval and can read and
              write the same records you can. Nothing is sent to an AI model unless you initiate it. {OPERATOR} does not pipe
              your data into any model in the background.
            </P>
            <H3>Cookies</H3>
            <P>
              We set the session cookies required to keep you signed in. If you accept analytics in the consent banner, Google
              Analytics also sets measurement cookies; if you decline, none are set. There are no advertising cookies.
            </P>
            <H3>Your control</H3>
            <P>
              Your records belong to you. You can edit or delete them at any time from within the app. To request deletion of
              your account and all associated data, use the account controls in Settings or open a request on{' '}
              <a href={GITHUB_ISSUES} target="_blank" rel="noopener noreferrer" style={{ color: '#D5001C' }}>
                GitHub Issues
              </a>
              . Because the project is open source, you are also free to run your own copy and keep everything on
              infrastructure you control.
            </P>
          </Section>

          <Section id="terms" kicker="02 · TERMS" title="Terms of use">
            <H3>Operator</H3>
            <P>
              FLAT·SIX is operated by {OPERATOR}. By using the app, you agree to these terms. If you do not agree, do not use
              the service.
            </P>
            <H3>Provided as-is</H3>
            <P>
              FLAT·SIX is provided free of charge, &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without warranty of any
              kind. There is no service-level agreement, no guarantee of uptime, and the service may change or shut down at
              any time. Use it at your own risk.
            </P>
            <H3>Not professional advice</H3>
            <P>
              Part numbers, torque values, intervals, diagrams, fault codes, and fault-finding guidance are provided for
              reference and convenience only. They may be incomplete, out of date, or wrong. Always confirm against the
              official workshop documentation and a qualified technician before working on a vehicle. You are
              responsible for any work you carry out and for your own safety.
            </P>
            <H3>Not affiliated with Porsche</H3>
            <P>
              This is an independent, unofficial project. &ldquo;Porsche&rdquo;, &ldquo;Boxster&rdquo;, &ldquo;Cayman&rdquo;,
              model names, and any related trademarks are the property of Dr. Ing. h.c. F. Porsche AG. FLAT·SIX is not
              endorsed by, sponsored by, or affiliated with Porsche AG in any way. {OPERATOR} does not claim any affiliation
              with, or endorsement by, Porsche AG.
            </P>
            <H3>Reference content &amp; third-party materials</H3>
            <P>
              The app includes reference information such as specifications, fault codes, diagrams, and related materials
              compiled for DIY convenience. {OPERATOR} does not claim ownership of Porsche trademarks, logos, or
              documentation belonging to rights holders. Trademarks remain with their respective owners.
            </P>
            <P>
              If you believe content on FLAT·SIX infringes your rights, please open a request on{' '}
              <a href={GITHUB_ISSUES} target="_blank" rel="noopener noreferrer" style={{ color: '#D5001C' }}>
                GitHub Issues
              </a>{' '}
              with enough detail to identify the material. We will review good-faith notices and may remove or modify content
              where appropriate.
            </P>
            <H3>Your content</H3>
            <P>
              You keep ownership of the records you enter. You are responsible for what you store and for having the right to
              store it. Please don&rsquo;t use the app to break the law or to store other people&rsquo;s personal data without
              their consent.
            </P>
            <H3>Liability</H3>
            <P>
              To the maximum extent permitted by law, {OPERATOR} and its members, officers, and agents are not liable for any
              damages, loss of data, vehicle damage, injury, or other harm arising from use of the app or reliance on its
              information.
            </P>
            <H3>Open source</H3>
            <P>
              FLAT·SIX is open-source software and is governed by the terms of the licence published in its repository. If
              anything in that licence conflicts with this page, the licence prevails for the source code itself.
            </P>
          </Section>

          <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid #E3E3E5', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Link href="/" style={{ font: `400 13px/1 ${sans}`, color: '#6E6E73' }}>← Back to home</Link>
            <div style={{ marginLeft: 'auto', font: `500 10px/1 ${mono}`, letterSpacing: '.1em', color: '#B4B4B8' }}>NOT AFFILIATED WITH PORSCHE AG</div>
          </div>
        </div>
      </main>
    </MarketingShell>
  );
}
