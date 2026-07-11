import Link from 'next/link';
import MarketingShell from '@/components/marketing/MarketingShell';
import { GARAGE, GITHUB_ISSUES, GITHUB_REPO, mono, RED, sans } from '@/components/marketing/tokens';
import { pageMetadata } from '@/lib/marketing/seo';

export const metadata = pageMetadata({
  title: 'About',
  description: 'About FLAT·SIX — a free, open-source DIY garage for the Boxster & Cayman (987, 981). Built by an owner, for owners.',
  path: '/about',
});

const PRINCIPLES = [
  { k: '$0', title: 'Free forever', body: 'No paywalls, no premium tier. Every feature, for everyone.' },
  { k: 'Open', title: 'Open source', body: 'All on GitHub. Read it, fork it, or help build it.' },
  { k: 'Private', title: 'No ads, no tracking', body: 'Your garage is yours. Nothing sold, nothing mined.' },
  { k: 'You', title: 'Owner-first', body: 'Built around how owners actually work on these cars.' },
];

const INVOLVE = [
  { title: 'Add a generation', body: 'Know the 986, 718 or 997 inside out? Help bring them into the garage.' },
  { title: 'Sharpen the data', body: 'Torque figures, part numbers, fault patterns — corrections always welcome.' },
  { title: 'Write a guide', body: 'Done a job on your car? Turn it into a guide the next owner can follow.' },
];

export default function AboutPage() {
  return (
    <MarketingShell active="about">
      <section style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid #141416' }}>
        <div style={{ position: 'absolute', left: '50%', top: -160, transform: 'translateX(-50%)', width: 900, height: 560, background: 'radial-gradient(circle,rgba(213,0,28,.16),transparent 62%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: 900, margin: '0 auto', padding: '96px 28px 72px', textAlign: 'center', animation: 'fadeUp .5s ease both' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 11, marginBottom: 22 }}>
            <span style={{ width: 24, height: 2, background: RED }} />
            <span style={{ font: `500 13px/1 ${sans}`, letterSpacing: '.14em', color: RED }}>About the project</span>
            <span style={{ width: 24, height: 2, background: RED }} />
          </div>
          <h1 style={{ margin: 0, font: `300 52px/1.08 ${sans}`, letterSpacing: '-.022em', color: '#fff' }}>
            Built by an owner,<br />for owners.
          </h1>
          <p style={{ maxWidth: 600, margin: '26px auto 0', font: `400 18px/1.7 ${sans}`, color: '#9E9EA3' }}>
            FLAT·SIX is a free, open-source garage for the Boxster &amp; Cayman — made by someone who just wanted a better way to look after his own.
          </p>
        </div>
      </section>

      <section className="twoCol" style={{ maxWidth: 1200, margin: '0 auto', padding: '88px 28px', display: 'grid', gridTemplateColumns: '1.15fr .85fr', gap: 56, alignItems: 'start' }}>
        <div>
          <div style={{ font: `500 13px/1 ${sans}`, letterSpacing: '.13em', color: RED, marginBottom: 18 }}>The story</div>
          <h2 style={{ margin: '0 0 24px', font: `300 34px/1.14 ${sans}`, letterSpacing: '-.02em', color: '#fff' }}>Why this exists.</h2>
          <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <p style={{ margin: 0, font: `400 17px/1.75 ${sans}`, color: '#B4B4B9' }}>
              I drive a 981 Boxster and do my own maintenance. When I started, the information I needed was everywhere and nowhere — buried in forum threads, scanned PDFs, half-remembered part numbers and a dozen open browser tabs.
            </p>
            <p style={{ margin: 0, font: `400 17px/1.75 ${sans}`, color: '#B4B4B9' }}>
              The knowledge existed; it just wasn&apos;t in one place, and it was never scoped to my exact car. So I built the thing I wished I had: one garage that knows my generation, keeps my whole service history, and puts fault finding, specs and plans a click away — with an AI that can help.
            </p>
            <p style={{ margin: 0, font: `400 17px/1.75 ${sans}`, color: '#B4B4B9' }}>
              Then I made it free and open source, because every Boxster and Cayman owner deserves the same tool. It&apos;s a labour of love, built in evenings and weekends — no ads, no catch. Just an owner giving the DIY community something genuinely useful.
            </p>
          </div>
        </div>
        <div style={{ background: 'radial-gradient(130% 120% at 60% 25%,#1C1C20,#0C0C0E)', border: '1px solid #232327', borderRadius: 14, padding: '22px 22px 20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ font: `600 12px/1 ${mono}`, letterSpacing: '.08em', color: '#76767B' }}>The car that started it</div>
          <img src="/assets/boxster-poster.png" alt="981 Boxster" style={{ width: '100%', display: 'block', margin: '6px 0 4px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 14, borderTop: '1px solid #232327' }}>
            <div>
              <div style={{ font: `400 16px/1.2 ${sans}`, color: '#fff' }}>Boxster · 981</div>
              <div style={{ marginTop: 4, font: `500 12px/1 ${mono}`, color: '#8A8A8F' }}>flat-six · mid-engine · manual</div>
            </div>
            <span style={{ font: `600 11px/1 ${mono}`, letterSpacing: '.06em', padding: '6px 9px', borderRadius: 3, background: RED, color: '#fff' }}>Daily</span>
          </div>
        </div>
      </section>

      <section style={{ borderTop: '1px solid #141416', borderBottom: '1px solid #141416', background: '#08080A' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 28px' }}>
          <h2 style={{ margin: '0 0 12px', font: `300 32px/1.14 ${sans}`, letterSpacing: '-.02em', color: '#fff' }}>What it stands for.</h2>
          <p style={{ margin: '0 0 40px', maxWidth: 560, font: `400 16px/1.65 ${sans}`, color: '#8A8A8F' }}>A few things we&apos;re not willing to compromise on.</p>
          <div className="aboutPrinciples" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 18 }}>
            {PRINCIPLES.map((p) => (
              <div key={p.k} style={{ background: '#121214', border: '1px solid #232327', borderRadius: 12, padding: '26px 24px' }}>
                <div style={{ font: `300 30px/1 ${sans}`, color: RED }}>{p.k}</div>
                <div style={{ margin: '16px 0 8px', font: `500 17px/1.2 ${sans}`, color: '#fff' }}>{p.title}</div>
                <p style={{ margin: 0, font: `400 14px/1.6 ${sans}`, color: '#8A8A8F' }}>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="twoCol" style={{ maxWidth: 1200, margin: '0 auto', padding: '88px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center' }}>
        <div>
          <div style={{ font: `500 13px/1 ${sans}`, letterSpacing: '.13em', color: RED, marginBottom: 18 }}>Get involved</div>
          <h2 style={{ margin: '0 0 18px', font: `300 34px/1.14 ${sans}`, letterSpacing: '-.02em', color: '#fff' }}>Help build it.</h2>
          <p style={{ margin: '0 0 26px', maxWidth: 480, font: `400 17px/1.7 ${sans}`, color: '#9E9EA3' }}>
            If you&apos;ve got an idea, found a bug, know the cars well, or want to add your generation — contributions are genuinely welcome. This gets better with every owner who pitches in.
          </p>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <a href={GITHUB_ISSUES} target="_blank" rel="noopener noreferrer" className="cta" style={{ height: 48, display: 'inline-flex', alignItems: 'center', gap: 9, padding: '0 22px', background: RED, color: '#fff', borderRadius: 3, font: `600 15px/1 ${sans}`, textDecoration: 'none' }}>
              Share an idea <span style={{ fontFamily: mono }}>→</span>
            </a>
            <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer" className="ghostDark" style={{ height: 48, display: 'inline-flex', alignItems: 'center', padding: '0 22px', background: 'transparent', color: '#D6D6DA', border: '1px solid #313135', borderRadius: 3, font: `600 15px/1 ${sans}`, textDecoration: 'none' }}>
              View on GitHub
            </a>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {INVOLVE.map((item) => (
            <div key={item.title} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', background: '#121214', border: '1px solid #232327', borderRadius: 12, padding: '22px 24px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: RED, marginTop: 7, flex: 'none' }} />
              <div>
                <div style={{ font: `500 16px/1.3 ${sans}`, color: '#fff' }}>{item.title}</div>
                <p style={{ margin: '6px 0 0', font: `400 14px/1.6 ${sans}`, color: '#8A8A8F' }}>{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ position: 'relative', overflow: 'hidden', borderTop: '1px solid #141416' }}>
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 1000, height: 480, background: 'radial-gradient(circle,rgba(213,0,28,.16),transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: 860, margin: '0 auto', padding: '96px 28px', textAlign: 'center' }}>
          <h2 style={{ margin: 0, font: `300 44px/1.1 ${sans}`, letterSpacing: '-.02em', color: '#fff' }}>Come build your garage.</h2>
          <p style={{ margin: '22px auto 0', maxWidth: 520, font: `400 17px/1.7 ${sans}`, color: '#9E9EA3' }}>
            It&apos;s free, it&apos;s open, and it&apos;s made for people who love these cars as much as you do.
          </p>
          <div style={{ marginTop: 34, display: 'flex', justifyContent: 'center' }}>
            <Link href={GARAGE} className="cta" style={{ height: 54, display: 'inline-flex', alignItems: 'center', gap: 11, padding: '0 32px', background: RED, color: '#fff', borderRadius: 3, font: `600 16px/1 ${sans}`, textDecoration: 'none' }}>
              Start your garage <span style={{ fontFamily: mono }}>→</span>
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
