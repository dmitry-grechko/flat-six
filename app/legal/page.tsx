import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy & Terms',
  description: 'Privacy policy and terms of use for FLAT·SIX, an open-source DIY maintenance app for the Porsche 981 Boxster / Cayman.',
  alternates: { canonical: '/legal' },
  openGraph: {
    title: 'Privacy & Terms · FLAT·SIX',
    description: 'Privacy policy and terms of use for FLAT·SIX — a free, open-source Porsche 981 garage.',
    url: '/legal',
    type: 'article',
  },
};

const mono = "'JetBrains Mono',monospace";
const sans = "'Helvetica Neue',Arial,sans-serif";
const RED = 'var(--red)';

const LAST_UPDATED = 'June 2026';

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
    <div style={{ fontFamily: sans, color: '#0B0B0C', background: '#ECECEE', minHeight: '100vh' }}>
      {/* nav */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(11,11,12,.96)', borderBottom: '1px solid #1C1C1F' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', height: 64, padding: '0 28px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div style={{ width: 12, height: 12, background: RED }} />
            <div style={{ font: `700 14px/1 ${mono}`, letterSpacing: '.3em', color: '#fff' }}>FLAT·SIX</div>
          </Link>
          <Link href="/" style={{ marginLeft: 'auto', font: `500 12px/1 ${mono}`, letterSpacing: '.08em', color: '#9A9AA0' }}>
            ← BACK
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '72px 28px 100px' }}>
        <div style={{ font: `500 11px/1 ${mono}`, letterSpacing: '.22em', color: RED, marginBottom: 16 }}>PRIVACY &amp; TERMS</div>
        <h1 style={{ margin: 0, font: `300 44px/1.08 ${sans}`, letterSpacing: '-.02em', color: '#0B0B0C' }}>The short, honest version.</h1>
        <p style={{ margin: '20px 0 0', font: `400 16px/1.65 ${sans}`, color: '#6E6E73', maxWidth: 640 }}>
          FLAT·SIX is a free, open-source hobby project — not a company, not a product, and not affiliated with Porsche AG.
          There is no business here, so there is not much to hide behind. This page says plainly what happens to your data
          and the terms under which you use the app.
        </p>
        <div style={{ marginTop: 18, font: `500 11px/1.4 ${mono}`, letterSpacing: '.08em', color: '#9A9AA0' }}>
          LAST UPDATED · {LAST_UPDATED}
        </div>

        {/* ===== PRIVACY ===== */}
        <Section id="privacy" kicker="01 · PRIVACY" title="Privacy">
          <P>
            This project is run by an individual as open-source software. It is not a commercial service, and your data is
            never sold, rented, shared for advertising, or used to train anything. There are no ad networks and no
            third-party analytics or tracking pixels.
          </P>

          <H3>What is stored</H3>
          <P>
            To sign in, the app stores your <strong>email address</strong>, used only to send the magic sign-in link and to
            identify your account. If you choose to use the app, it stores the data <strong>you</strong> enter: your
            vehicle details and your service records (dates, mileage, parts, costs and notes). That is the entire scope.
          </P>

          <H3>Where it is stored</H3>
          <P>
            Accounts and your records live in a <strong>Supabase</strong> (PostgreSQL) database, protected by row-level
            security so each account can only read and write its own rows. Supabase processes this data on the project
            owner&rsquo;s behalf as a hosting provider. Reference data — component diagrams, part numbers and torque specs —
            is static and shared by everyone; it is not personal data.
          </P>

          <H3>Claude / MCP</H3>
          <P>
            If you connect your garage to Claude over MCP, requests run with your approval and can read and write the same
            records you can. Nothing is sent to an AI model unless you initiate it. The project owner does not pipe your
            data into any model in the background.
          </P>

          <H3>Cookies</H3>
          <P>
            The only cookies set are the session cookies required to keep you signed in. There are no marketing or
            tracking cookies.
          </P>

          <H3>Your control</H3>
          <P>
            Your records belong to you. You can edit or delete them at any time from within the app, and you can request
            deletion of your account and all associated data. Because the project is open source, you are also free to run
            your own copy and keep everything entirely on infrastructure you control.
          </P>
        </Section>

        {/* ===== TERMS ===== */}
        <Section id="terms" kicker="02 · TERMS" title="Terms of use">
          <H3>It&rsquo;s a hobby project, provided as-is</H3>
          <P>
            FLAT·SIX is provided free of charge, &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without warranty of any
            kind. There is no service-level agreement, no guarantee of uptime, and the project may change or shut down at
            any time. Use it at your own risk.
          </P>

          <H3>Not professional advice</H3>
          <P>
            Part numbers, torque values, intervals, diagrams and fault-finding guidance are provided for reference and
            convenience only. They may be incomplete, out of date, or wrong. Always confirm against the official Porsche
            workshop documentation and a qualified technician before working on a vehicle. You are responsible for any work
            you carry out and for your own safety.
          </P>

          <H3>Not affiliated with Porsche</H3>
          <P>
            This is an independent, unofficial project. &ldquo;Porsche&rdquo;, &ldquo;Boxster&rdquo;, &ldquo;Cayman&rdquo;,
            model names and any trademarks are the property of Dr. Ing. h.c. F. Porsche AG. FLAT·SIX is not endorsed by,
            sponsored by, or affiliated with Porsche AG in any way.
          </P>

          <H3>Your content</H3>
          <P>
            You keep ownership of the records you enter. You are responsible for what you store and for having the right to
            store it. Please don&rsquo;t use the app to break the law or to store other people&rsquo;s personal data without
            their consent.
          </P>

          <H3>Liability</H3>
          <P>
            To the maximum extent permitted by law, the project and its maintainer(s) are not liable for any damages, loss
            of data, vehicle damage, injury, or other harm arising from use of the app or reliance on its information.
          </P>

          <H3>Open source</H3>
          <P>
            FLAT·SIX is open-source software and is governed by the terms of the licence published in its repository. If
            anything in that licence conflicts with this page, the licence prevails for the source code itself.
          </P>
        </Section>

        <div style={{ marginTop: 64, paddingTop: 28, borderTop: '1px solid #DCDCDE', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ width: 10, height: 10, background: RED }} />
          <div style={{ font: `700 12px/1 ${mono}`, letterSpacing: '.28em', color: '#0B0B0C' }}>FLAT·SIX</div>
          <Link href="/" style={{ font: `400 13px/1 ${sans}`, color: '#6E6E73' }}>Back to home</Link>
          <div style={{ marginLeft: 'auto', font: `500 10px/1 ${mono}`, letterSpacing: '.1em', color: '#B4B4B8' }}>NOT AFFILIATED WITH PORSCHE AG</div>
        </div>
      </main>
    </div>
  );
}
