'use client';

import Link from 'next/link';

const mono = "'JetBrains Mono',monospace";
const sans = "'Helvetica Neue',Arial,sans-serif";
const RED = 'var(--red)';

// Where the marketing CTAs point. /garage is auth-gated, so signed-out users
// land on /auth/login automatically.
const GARAGE = '/garage';
const SIGN_IN = '/auth/login';
const GITHUB_REPO = 'https://github.com/dmitry-grechko/flat-six';
const GITHUB_ISSUES = 'https://github.com/dmitry-grechko/flat-six/issues';

const COLORS = ['#C6C8CA', '#E8E8EA', '#131316', '#D5001C', '#27364E', '#EFC03B'];

const HERO_VALUE = [
  { k: 'X-RAY', v: 'Every system stripped' },
  { k: '17k+', v: 'Workshop pages' },
  { k: 'AI', v: 'Claude · OpenAI · Gemini' },
];

const STATS = [
  { k: '17k+', label: 'workshop manual pages' },
  { k: '100+', label: 'factory documents' },
  { k: '3 GB', label: 'of searchable knowledge' },
  { k: 'Multi', label: 'vehicles per garage' },
];

const DOC_CATS = [
  { cat: 'WORKSHOP', title: 'Factory service manuals', meta: '987.1 · 987.2 · 981 · ~17,700 pages' },
  { cat: 'DIAGNOSTIC', title: 'DME, PDK, OBD & Mode 6', meta: 'Trouble codes · summary tables' },
  { cat: 'TRAINING', title: 'Porsche training books', meta: 'Engine · chassis · electrical' },
  { cat: 'SIT', title: 'Service Information Technik', meta: 'Yearbooks · model intros' },
];

// Faithful sample data for the in-page "screenshots" of the real app screens.
const LOG = [
  { date: 'SEP 12 · 2025', title: 'Annual Oil Service', tag: 'DIY', meta: '41,980 mi · Mobil 1 0W-40 · $182' },
  { date: 'MAR 04 · 2025', title: 'Brake Fluid Flush', tag: 'DIY', meta: '39,120 mi · ATE Type 200 · $58' },
  { date: 'AUG 20 · 2024', title: 'Plugs & Air Filter', tag: 'DIY', meta: '35,400 mi · 6× NGK @30 Nm · $236' },
];

const PLAN_ITEMS = [
  { label: 'Order ATE Type 200 (1 L)', done: true },
  { label: 'Top reservoir, bleed RR → LF', done: false },
  { label: 'Confirm firm pedal, log it', done: false },
];

const FAULTS = [
  { cause: 'Centre coolant pipe (plastic)', part: '981.106.665', likely: 'High' },
  { cause: 'Water-pump weep hole', part: '9A1.106.011', likely: 'Med' },
  { cause: 'Expansion tank cap seal', part: '999.673.323', likely: 'Low' },
];

const ctaStyle: React.CSSProperties = {
  background: RED,
  color: '#fff',
  borderRadius: 2,
  font: `600 12px/1 ${sans}`,
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  transition: 'background .15s',
};

export default function Landing() {
  return (
    <div className="landing" style={{ fontFamily: sans, color: '#0B0B0C', background: '#ECECEE' }}>
      {/* ===== NAV ===== */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(11,11,12,.96)', borderBottom: '1px solid #1C1C1F' }}>
        <div className="landingNav" style={{ maxWidth: 1200, margin: '0 auto', height: 64, padding: '0 28px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div style={{ width: 12, height: 12, background: RED }} />
            <div style={{ font: `700 14px/1 ${mono}`, letterSpacing: '.3em', color: '#fff' }}>FLAT·SIX</div>
          </div>
          <nav className="landingNavLinks" style={{ marginLeft: 36, display: 'flex', gap: 28 }}>
            {[
              ['#inspect', 'Inspect'],
              ['#do', 'Features'],
              ['#tools', 'Tools'],
              ['#documents', 'Documents'],
              ['#ai', 'Assistant'],
              ['#opensource', 'Open source'],
            ].map(([href, label]) => (
              <a key={href} href={href} className="navlink" style={{ font: `500 13px/1 ${sans}`, color: '#9A9AA0', transition: 'color .15s' }}>
                {label}
              </a>
            ))}
          </nav>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 18 }}>
            <Link href={SIGN_IN} style={{ font: `500 13px/1 ${sans}`, color: '#C9C9CD' }}>
              Sign in
            </Link>
            <Link href={GARAGE} className="cta" style={{ ...ctaStyle, height: 38, display: 'flex', alignItems: 'center', padding: '0 18px', font: `600 11px/1 ${sans}`, letterSpacing: '.1em' }}>
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section style={{ position: 'relative', background: '#0B0B0C', color: '#fff', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -40, top: 48, font: `700 280px/.8 ${mono}`, color: '#121214', letterSpacing: '-.04em', userSelect: 'none', pointerEvents: 'none' }}>FLAT</div>
        <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', padding: '72px 28px 40px', display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: 48, alignItems: 'center' }} className="heroGrid landingHero">
          {/* copy */}
          <div style={{ animation: 'fadeUp .5s ease' }}>
            <div style={{ font: `500 12px/1 ${mono}`, letterSpacing: '.26em', color: RED, marginBottom: 22 }}>FREE &amp; OPEN SOURCE · BOXSTER &amp; CAYMAN</div>
            <h1 style={{ margin: 0, font: `300 52px/1.04 ${sans}`, letterSpacing: '-.02em' }}>
              Know every system.<br />
              Keep every record.<br />
              <span style={{ fontWeight: 500 }}>Ask any AI.</span>
            </h1>
            <p style={{ maxWidth: 440, margin: '24px 0 0', font: `400 16px/1.65 ${sans}`, color: '#9A9AA0' }}>
              A multi-car garage for the 987 and 981: full 3D X-ray, 17,000+ pages of factory documents, service history, plans &amp; DIY wheel/alignment tools — connected to Claude, OpenAI, or Gemini.
            </p>
            <div style={{ marginTop: 32, display: 'flex', gap: 13, flexWrap: 'wrap' }}>
              <Link href={GARAGE} className="cta" style={{ ...ctaStyle, height: 50, display: 'flex', alignItems: 'center', gap: 10, padding: '0 26px' }}>
                Start your garage <span style={{ fontFamily: mono }}>→</span>
              </Link>
              <a href="#inspect" className="ghostDark" style={{ height: 50, display: 'flex', alignItems: 'center', padding: '0 24px', background: 'transparent', color: '#C9C9CD', border: '1px solid #313135', borderRadius: 2, font: `600 12px/1 ${sans}`, letterSpacing: '.1em', textTransform: 'uppercase', transition: 'all .15s' }}>
                See what it does
              </a>
            </div>
          </div>

          {/* product shot — full X-ray */}
          <div style={{ animation: 'fadeUp .6s ease' }}>
            <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 30px 70px rgba(0,0,0,.55)', overflow: 'hidden' }}>
              <div style={{ height: 44, borderBottom: '1px solid #EAEAEC', display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: RED }} />
                <span style={{ font: `600 10px/1 ${mono}`, letterSpacing: '.12em', color: '#0B0B0C' }}>X-RAY ON</span>
                <span style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.1em', color: '#9A9AA0' }}>ALL SYSTEMS · STRIPPED</span>
                <span style={{ marginLeft: 'auto', font: `500 9px/1 ${mono}`, letterSpacing: '.12em', color: '#B4B4B8' }}>987 · 981</span>
              </div>
              <div style={{ background: '#F4F4F5', padding: '10px 10px 0' }}>
                <img
                  src="/assets/xray-full.png"
                  alt="Full X-ray view of every Porsche system — engine, brakes, cooling, wiring and more"
                  style={{ width: '100%', display: 'block', borderRadius: 4 }}
                />
              </div>
              <div className="heroValueStrip" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', borderTop: '1px solid #EAEAEC' }}>
                {HERO_VALUE.map((item, i) => (
                  <div
                    key={item.k}
                    style={{
                      padding: '14px 16px',
                      borderLeft: i > 0 ? '1px solid #EAEAEC' : undefined,
                    }}
                  >
                    <div style={{ font: `600 11px/1 ${mono}`, letterSpacing: '.1em', color: RED }}>{item.k}</div>
                    <div style={{ marginTop: 6, font: `400 12px/1.3 ${sans}`, color: '#6E6E73' }}>{item.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== INSPECT: 3D + CUTAWAY ===== */}
      <section id="inspect" style={{ maxWidth: 1200, margin: '0 auto', padding: '86px 28px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 30, flexWrap: 'wrap', marginBottom: 28 }}>
          <div>
            <div style={{ font: `500 11px/1 ${mono}`, letterSpacing: '.22em', color: RED, marginBottom: 14 }}>THE INSPECTOR</div>
            <h2 style={{ margin: 0, font: `300 38px/1.1 ${sans}`, letterSpacing: '-.015em', color: '#0B0B0C', maxWidth: 560 }}>
              Outside, X-ray,<br />and every line.
            </h2>
          </div>
          <p style={{ maxWidth: 380, margin: 0, font: `400 15px/1.65 ${sans}`, color: '#6E6E73' }}>
            Orbit a real 3D model in your colour, strip it to every assembly in X-ray, or follow coolant, fuel, air and
            wiring through the car — each part tied to numbers, torque and intervals for your generation.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }} className="twoCol">
          {/* 3D model — real render */}
          <div style={{ background: '#0B0B0C', borderRadius: 8, overflow: 'hidden', color: '#fff', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, background: 'radial-gradient(120% 100% at 50% 30%,#1A1A1D,#0B0B0C)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 20px 0' }}>
              <img src="/assets/boxster-poster.png" alt="Porsche Boxster 3D model" style={{ width: '92%', maxWidth: 420, display: 'block', filter: 'drop-shadow(0 24px 40px rgba(0,0,0,.55))' }} />
            </div>
            <div style={{ padding: '20px 26px 24px' }}>
              <div style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.16em', color: '#76767B' }}>LAYER 01 · 3D MODEL</div>
              <h3 style={{ margin: '12px 0 8px', font: `400 22px/1.15 ${sans}` }}>Orbit &amp; recolour</h3>
              <p style={{ margin: '0 0 14px', font: `400 14px/1.6 ${sans}`, color: '#9A9AA0' }}>
                Drag to spin, scroll to zoom, and switch the paint to your spec — the body repaints live.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                {COLORS.map((hex) => (
                  <span key={hex} style={{ width: 24, height: 24, borderRadius: '50%', background: hex, border: '1px solid rgba(255,255,255,.18)' }} />
                ))}
              </div>
            </div>
          </div>

          {/* systems / flow layer */}
          <div style={{ background: '#fff', border: '1px solid #E3E3E5', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, background: '#eff0f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/assets/xray-systems.png" alt="X-ray systems view with coolant, fuel, air and exhaust lines" style={{ width: '100%', display: 'block' }} />
            </div>
            <div style={{ padding: '20px 26px 24px' }}>
              <div style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.16em', color: '#9A9AA0' }}>LAYER 02 · LINES &amp; FLOWS</div>
              <h3 style={{ margin: '12px 0 8px', font: `400 22px/1.15 ${sans}`, color: '#0B0B0C' }}>Where every part lives</h3>
              <p style={{ margin: 0, font: `400 14px/1.6 ${sans}`, color: '#6E6E73' }}>
                Trace coolant, fuel, air, exhaust and wiring through the car — then open any system for part numbers,
                torque and the matching service interval.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== WHAT YOU CAN DO (visual rows) ===== */}
      <section id="do" style={{ maxWidth: 1200, margin: '0 auto', padding: '70px 28px 10px' }}>
        <div style={{ font: `500 11px/1 ${mono}`, letterSpacing: '.22em', color: RED, marginBottom: 14 }}>WHAT YOU CAN DO</div>
        <h2 style={{ margin: '0 0 8px', font: `300 38px/1.1 ${sans}`, letterSpacing: '-.015em', color: '#0B0B0C' }}>Everything in one garage.</h2>
      </section>

      {/* Row 1: service history */}
      <FeatureRow
        kicker="SERVICE HISTORY"
        title="Log every job, keep the record."
        body="Record each service with a checklist, mileage and cost — DIY or shop. Edit or delete any entry, and your full history stays with the car."
        visual={<HistoryPanel />}
      />

      {/* Row 2: plans (visual first) */}
      <FeatureRow
        reverse
        kicker="SERVICE PLANS"
        title="Plan what's coming up."
        body="Build plans for upcoming jobs with the steps and parts to order, tick things off as you go, then turn a plan into a logged service in one click."
        visual={<PlanPanel />}
      />

      {/* Row 3: fault finding */}
      <FeatureRow
        kicker="FAULT FINDING"
        title="Track a fault to its cause."
        body="Pick a symptom and get the likely causes ranked for your generation — IMS and bore scoring on a 987.1, AOS and coolant pipes on a 981 — plus what to check and the parts to order."
        visual={<FaultPanel />}
      />

      {/* Row 4: documents library */}
      <FeatureRow
        id="documents"
        reverse
        kicker="DOCUMENTS"
        title="The factory library, in your garage."
        body="Workshop manuals, diagnostic books, Service Information Technik, and Porsche training material — over 100 factory documents and ~17,000 workshop pages, scoped to whichever car you're working on. Searchable by your AI assistant too."
        visual={<DocumentsPanel />}
      />

      {/* Row 5: DIY tools */}
      <FeatureRow
        id="tools"
        kicker="DIY TOOLS"
        title="Will it fit? Do the math."
        body="Native wheel & tyre tools — save the disks you own and check any tyre against them (rim fit, rolling diameter, speedo error, poke &amp; clearance), plus tyre-size, offset, staggered-diameter and alignment calculators with visual diagrams. Our own math, no third-party site."
        visual={<ToolsPanel />}
      />

      {/* Row 6: multi-vehicle */}
      <FeatureRow
        reverse
        kicker="MULTI-CAR GARAGE"
        title="Run more than one Porsche."
        body="Add every Boxster and Cayman you own — 987 or 981 — and switch between them in one click. History, plans, documents and AI context stay scoped to the car you're looking at."
        visual={<VehiclesPanel />}
      />

      {/* ===== AI ASSISTANT (chat) ===== */}
      <section id="ai" style={{ background: '#0B0B0C', color: '#fff', marginTop: 40 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '84px 28px', display: 'grid', gridTemplateColumns: '.92fr 1.08fr', gap: 56, alignItems: 'center' }} className="aiGrid">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <span style={{ color: RED, fontFamily: mono, fontSize: 20 }}>∗</span>
              <span style={{ font: `500 11px/1 ${mono}`, letterSpacing: '.22em', color: '#9A9AA0' }}>AI ASSISTANT</span>
            </div>
            <h2 style={{ margin: 0, font: `300 36px/1.12 ${sans}`, letterSpacing: '-.015em' }}>
              Manage it all<br />just by chatting.
            </h2>
            <p style={{ maxWidth: 440, margin: '22px 0 0', font: `400 15px/1.65 ${sans}`, color: '#9A9AA0' }}>
              Connect your garage to Claude, OpenAI, or Gemini over MCP and simply talk to it. It searches the factory
              docs, logs services, looks up specs and plans what&rsquo;s next — updating your garage with your approval.
            </p>
            <div style={{ marginTop: 22, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {['Claude', 'OpenAI', 'Gemini'].map((name) => (
                <span
                  key={name}
                  style={{
                    font: `500 11px/1 ${mono}`,
                    letterSpacing: '.08em',
                    color: '#C9C9CD',
                    border: '1px solid #313135',
                    borderRadius: 2,
                    padding: '8px 12px',
                  }}
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
          <ChatThread />
        </div>
      </section>

      {/* ===== STATS STRIP ===== */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '54px 28px' }}>
        <div style={{ borderTop: '1px solid #DCDCDE', borderBottom: '1px solid #DCDCDE', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }} className="statGrid">
          {STATS.map((s, i) => (
            <div key={s.label} style={{ padding: '30px 26px', borderLeft: i > 0 ? '1px solid #DCDCDE' : undefined }}>
              <div style={{ font: `300 40px/1 ${sans}`, color: '#0B0B0C', letterSpacing: '-.01em' }}>{s.k}</div>
              <div style={{ marginTop: 10, font: `500 11px/1.4 ${mono}`, letterSpacing: '.06em', color: '#9A9AA0' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== OPEN SOURCE ===== */}
      <section id="opensource" style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 28px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '.9fr 1.1fr', gap: 56, alignItems: 'center' }} className="logGrid">
          <div>
            <div style={{ font: `500 11px/1 ${mono}`, letterSpacing: '.22em', color: RED, marginBottom: 14 }}>OPEN SOURCE</div>
            <h2 style={{ margin: 0, font: `300 36px/1.12 ${sans}`, letterSpacing: '-.015em', color: '#0B0B0C' }}>
              A free project,<br />built by an enthusiast.
            </h2>
            <p style={{ maxWidth: 430, margin: '22px 0 0', font: `400 15px/1.65 ${sans}`, color: '#6E6E73' }}>
              FLAT·SIX is a free, open-source labour of love — no company, no ads, no catch. If you&rsquo;ve got an idea,
              found a bug, or want to help build it, I&rsquo;d genuinely love to hear from you.
            </p>
            <div style={{ marginTop: 28, display: 'flex', gap: 13, flexWrap: 'wrap' }}>
              <a href={GITHUB_ISSUES} target="_blank" rel="noopener noreferrer" className="cta" style={{ ...ctaStyle, height: 48, display: 'inline-flex', alignItems: 'center', gap: 10, padding: '0 24px' }}>
                Share an idea <span style={{ fontFamily: mono }}>→</span>
              </a>
              <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer" className="ghost" style={{ height: 48, display: 'inline-flex', alignItems: 'center', padding: '0 22px', background: 'transparent', color: '#0B0B0C', border: '1px solid #C9C9CD', borderRadius: 2, font: `600 12px/1 ${sans}`, letterSpacing: '.1em', textTransform: 'uppercase', transition: 'all .15s' }}>
                View on GitHub
              </a>
            </div>
          </div>
          <div style={{ background: '#0B0B0C', borderRadius: 8, padding: '34px 32px', color: '#fff' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }} className="statGrid">
              {[
                ['$0', 'free, forever'],
                ['Open', 'source on GitHub'],
                ['No ads', 'no tracking, no catch'],
                ['You', 'ideas & PRs welcome'],
              ].map(([k, v]) => (
                <div key={v}>
                  <div style={{ font: `300 30px/1 ${sans}`, letterSpacing: '-.01em' }}>{k}</div>
                  <div style={{ marginTop: 8, font: `500 11px/1.4 ${mono}`, letterSpacing: '.06em', color: '#9A9AA0' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 28px 90px' }}>
        <div style={{ position: 'relative', background: '#0B0B0C', borderRadius: 8, overflow: 'hidden', padding: '64px 28px', textAlign: 'center' }}>
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', font: `700 220px/.8 ${mono}`, color: '#121214', userSelect: 'none', pointerEvents: 'none' }}>FLAT</div>
          <div style={{ position: 'relative' }}>
            <h2 style={{ margin: 0, font: `300 40px/1.1 ${sans}`, letterSpacing: '-.02em', color: '#fff' }}>Know your car inside out.</h2>
            <p style={{ margin: '18px auto 0', maxWidth: 480, font: `400 15px/1.6 ${sans}`, color: '#9A9AA0' }}>It&rsquo;s free. Add one car or several, dig into the factory docs, and connect the AI you already use — more models are on the way.</p>
            <Link href={GARAGE} className="cta" style={{ ...ctaStyle, marginTop: 30, height: 52, display: 'inline-flex', alignItems: 'center', gap: 10, padding: '0 30px' }}>
              Start your garage <span style={{ fontFamily: mono }}>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer style={{ borderTop: '1px solid #DCDCDE' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '30px 28px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ width: 10, height: 10, background: RED }} />
          <div style={{ font: `700 12px/1 ${mono}`, letterSpacing: '.28em', color: '#0B0B0C' }}>FLAT·SIX</div>
          <div style={{ font: `400 12px/1 ${sans}`, color: '#9A9AA0' }}>Free &amp; open-source DIY maintenance for the Porsche Boxster &amp; Cayman — multi-car, 987, 981 &amp; more</div>
          <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer" style={{ font: `400 12px/1 ${sans}`, color: '#6E6E73', transition: 'color .15s' }}>GitHub</a>
          <Link href="/legal" style={{ font: `400 12px/1 ${sans}`, color: '#6E6E73', transition: 'color .15s' }}>Privacy &amp; Terms</Link>
          <div style={{ marginLeft: 'auto', font: `500 10px/1 ${mono}`, letterSpacing: '.1em', color: '#B4B4B8' }}>NOT AFFILIATED WITH PORSCHE AG</div>
        </div>
      </footer>
    </div>
  );
}

/* ============================================================
   Visual building blocks — faithful in-page renders of the
   real app screens (same design system as /history, /plans…).
   ============================================================ */

function FeatureRow({
  kicker,
  title,
  body,
  visual,
  reverse,
  id,
}: {
  kicker: string;
  title: string;
  body: string;
  visual: React.ReactNode;
  reverse?: boolean;
  id?: string;
}) {
  return (
    <section id={id} style={{ maxWidth: 1200, margin: '0 auto', padding: '34px 28px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center' }} className="twoCol">
        <div style={{ order: reverse ? 2 : 1 }}>
          <div style={{ font: `500 11px/1 ${mono}`, letterSpacing: '.22em', color: RED, marginBottom: 14 }}>{kicker}</div>
          <h3 style={{ margin: 0, font: `300 30px/1.15 ${sans}`, letterSpacing: '-.015em', color: '#0B0B0C' }}>{title}</h3>
          <p style={{ maxWidth: 420, margin: '18px 0 0', font: `400 15px/1.65 ${sans}`, color: '#6E6E73' }}>{body}</p>
        </div>
        <div style={{ order: reverse ? 1 : 2 }}>{visual}</div>
      </div>
    </section>
  );
}

/** Wrapper that frames a panel like a screenshot (window chrome + shadow). */
function Screenshot({ tab, children }: { tab: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E3E3E5', borderRadius: 8, overflow: 'hidden', boxShadow: '0 24px 50px rgba(0,0,0,.12)' }}>
      <div style={{ height: 40, borderBottom: '1px solid #F0F0F1', display: 'flex', alignItems: 'center', gap: 7, padding: '0 14px' }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#E0E0E2' }} />
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#E0E0E2' }} />
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#E0E0E2' }} />
        <span style={{ marginLeft: 'auto', font: `500 9px/1 ${mono}`, letterSpacing: '.14em', color: '#B4B4B8' }}>{tab}</span>
      </div>
      {children}
    </div>
  );
}

function HistoryPanel() {
  return (
    <Screenshot tab="FLAT·SIX / SERVICE HISTORY">
      {LOG.map((r, i) => (
        <div key={r.title} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '15px 18px', borderTop: i ? '1px solid #F0F0F1' : 'none' }}>
          <div style={{ font: `500 10px/1.4 ${mono}`, color: '#9A9AA0', width: 84, flexShrink: 0 }}>{r.date}</div>
          <div style={{ width: 1, alignSelf: 'stretch', background: '#EEEEF0' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ font: `400 15px/1.2 ${sans}`, color: '#0B0B0C' }}>{r.title}</span>
              <span style={{ font: `600 8px/1 ${mono}`, letterSpacing: '.1em', color: RED, background: 'rgba(213,0,28,.1)', padding: '3px 6px', borderRadius: 2 }}>{r.tag}</span>
            </div>
            <div style={{ marginTop: 5, font: `500 10px/1 ${mono}`, color: '#9A9AA0' }}>{r.meta}</div>
          </div>
        </div>
      ))}
    </Screenshot>
  );
}

function PlanPanel() {
  return (
    <Screenshot tab="FLAT·SIX / SERVICE PLANS">
      <div style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
          <span style={{ font: `400 16px/1.2 ${sans}`, color: '#0B0B0C' }}>Brake Fluid Flush</span>
          <span style={{ font: `600 8px/1 ${mono}`, letterSpacing: '.1em', color: '#C77700', background: 'rgba(199,119,0,.12)', padding: '3px 6px', borderRadius: 2 }}>PLANNED</span>
        </div>
        <div style={{ font: `500 10px/1 ${mono}`, color: '#9A9AA0', marginBottom: 14 }}>DUE ~APR 2026 · 44,000 MI</div>
        {PLAN_ITEMS.map((it) => (
          <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
            <span
              style={{
                width: 16, height: 16, borderRadius: 3, flexShrink: 0,
                border: `1.5px solid ${it.done ? RED : '#CFCFD3'}`, background: it.done ? RED : '#fff',
                color: '#fff', font: '11px/14px system-ui', textAlign: 'center',
              }}
            >
              {it.done ? '✓' : ''}
            </span>
            <span style={{ font: `400 13.5px/1.4 ${sans}`, color: it.done ? '#9A9AA0' : '#1A1A1E', textDecoration: it.done ? 'line-through' : 'none' }}>{it.label}</span>
          </div>
        ))}
        <div style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 8, height: 34, padding: '0 14px', background: RED, color: '#fff', borderRadius: 2, font: `600 10px/1 ${sans}`, letterSpacing: '.1em', textTransform: 'uppercase' }}>
          Start service →
        </div>
      </div>
    </Screenshot>
  );
}

function FaultPanel() {
  return (
    <Screenshot tab="FLAT·SIX / FAULT FINDING">
      <div style={{ padding: 18 }}>
        <div style={{ font: `500 9px/1 ${mono}`, letterSpacing: '.12em', color: '#9A9AA0', marginBottom: 6 }}>SYMPTOM</div>
        <div style={{ font: `400 16px/1.2 ${sans}`, color: '#0B0B0C', marginBottom: 16 }}>Sweet coolant smell after a drive</div>
        <div style={{ font: `500 9px/1 ${mono}`, letterSpacing: '.12em', color: '#9A9AA0', marginBottom: 10 }}>LIKELY CAUSES</div>
        {FAULTS.map((f, i) => (
          <div key={f.cause} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: i ? '1px solid #F0F0F1' : 'none' }}>
            <span style={{ font: `500 11px/1 ${mono}`, color: '#B4B4B8', width: 18 }}>{String(i + 1).padStart(2, '0')}</span>
            <div style={{ flex: 1 }}>
              <div style={{ font: `400 13.5px/1.3 ${sans}`, color: '#1A1A1E' }}>{f.cause}</div>
              <div style={{ marginTop: 3, font: `500 10px/1 ${mono}`, color: '#9A9AA0' }}>Part {f.part}</div>
            </div>
            <span
              style={{
                font: `600 8px/1 ${mono}`, letterSpacing: '.08em', padding: '4px 7px', borderRadius: 2,
                color: f.likely === 'High' ? RED : f.likely === 'Med' ? '#C77700' : '#1E8E4E',
                background: f.likely === 'High' ? 'rgba(213,0,28,.1)' : f.likely === 'Med' ? 'rgba(199,119,0,.12)' : 'rgba(30,142,78,.1)',
              }}
            >
              {f.likely.toUpperCase()}
            </span>
          </div>
        ))}
      </div>
    </Screenshot>
  );
}

const FIT_CHECKS = [
  { label: 'Tyre ↔ rim', text: 'Ideal — 265 on 9.5J', warn: false },
  { label: 'Diameter', text: '−4 mm (−0.6%) vs OEM', warn: false },
  { label: 'Speedo', text: 'reads high 0.6%', warn: false },
  { label: 'Clearance', text: '+6 mm poke — check fender', warn: true },
];

function ToolsPanel() {
  return (
    <Screenshot tab="FLAT·SIX / TOOLS">
      <div style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 3 }}>
          <span style={{ font: `700 11px/1 ${mono}`, letterSpacing: '.08em', color: '#1E8E4E' }}>FITS</span>
          <span style={{ font: `400 15px/1.2 ${sans}`, color: '#0B0B0C' }}>265/40R19 on 9.5J</span>
        </div>
        <div style={{ font: `500 9px/1 ${mono}`, letterSpacing: '.12em', color: '#9A9AA0', marginBottom: 12 }}>WILL IT FIT? · REAR</div>
        {FIT_CHECKS.map((c, i) => (
          <div key={c.label} style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '9px 0', borderTop: i ? '1px solid #F0F0F1' : 'none' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: c.warn ? '#C77700' : '#1E8E4E', transform: 'translateY(1px)' }} />
            <span style={{ font: `500 10px/1.3 ${mono}`, letterSpacing: '.04em', color: '#9A9AA0', width: 74, flexShrink: 0, textTransform: 'uppercase' }}>{c.label}</span>
            <span style={{ font: `400 13px/1.4 ${sans}`, color: '#3A3A3E' }}>{c.text}</span>
          </div>
        ))}
      </div>
    </Screenshot>
  );
}

function DocumentsPanel() {
  return (
    <Screenshot tab="FLAT·SIX / DOCUMENTS">
      <div style={{ padding: '14px 18px 6px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #F0F0F1' }}>
        <span style={{ font: `600 9px/1 ${mono}`, letterSpacing: '.1em', color: RED, background: 'rgba(213,0,28,.1)', padding: '4px 7px', borderRadius: 2 }}>987</span>
        <span style={{ font: `500 11px/1 ${mono}`, color: '#9A9AA0' }}>69 documents · factory library</span>
      </div>
      {DOC_CATS.map((d, i) => (
        <div key={d.title} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderTop: i ? '1px solid #F0F0F1' : 'none' }}>
          <span style={{ font: `600 8px/1 ${mono}`, letterSpacing: '.1em', color: '#76767B', width: 78, flexShrink: 0 }}>{d.cat}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: `400 14px/1.25 ${sans}`, color: '#0B0B0C' }}>{d.title}</div>
            <div style={{ marginTop: 4, font: `500 10px/1 ${mono}`, color: '#9A9AA0' }}>{d.meta}</div>
          </div>
          <span style={{ font: `500 14px/1 ${mono}`, color: '#C9C9CD' }}>→</span>
        </div>
      ))}
    </Screenshot>
  );
}

function VehiclesPanel() {
  const cars = [
    { name: 'Boxster Spyder', gen: '987', year: '2011', mi: '42,500 mi', active: true },
    { name: 'Cayman S', gen: '981', year: '2014', mi: '38,120 mi', active: false },
  ];
  return (
    <Screenshot tab="FLAT·SIX / YOUR GARAGE">
      <div style={{ padding: '12px 18px 4px', font: `500 9px/1 ${mono}`, letterSpacing: '.12em', color: '#9A9AA0' }}>2 CARS</div>
      {cars.map((c, i) => (
        <div
          key={c.name}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '14px 18px',
            borderTop: i ? '1px solid #F0F0F1' : 'none',
            background: c.active ? 'rgba(213,0,28,.04)' : '#fff',
          }}
        >
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.active ? RED : '#D2D2D6', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ font: `400 15px/1.2 ${sans}`, color: '#0B0B0C' }}>{c.name}</span>
              <span style={{ font: `600 8px/1 ${mono}`, letterSpacing: '.1em', color: c.active ? RED : '#9A9AA0', background: c.active ? 'rgba(213,0,28,.1)' : '#F4F4F5', padding: '3px 6px', borderRadius: 2 }}>{c.gen}</span>
            </div>
            <div style={{ marginTop: 5, font: `500 10px/1 ${mono}`, color: '#9A9AA0' }}>{c.year} · {c.mi}</div>
          </div>
          {c.active && <span style={{ font: `600 9px/1 ${mono}`, letterSpacing: '.1em', color: RED }}>ACTIVE</span>}
        </div>
      ))}
      <div style={{ padding: '14px 18px 18px', borderTop: '1px solid #F0F0F1' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 34, padding: '0 14px', border: '1px dashed #CFCFD3', borderRadius: 2, font: `600 10px/1 ${sans}`, letterSpacing: '.1em', textTransform: 'uppercase', color: '#6E6E73' }}>
          + Add another car
        </div>
      </div>
    </Screenshot>
  );
}

function ChatThread() {
  const userBubble: React.CSSProperties = {
    alignSelf: 'flex-end',
    maxWidth: '82%',
    background: RED,
    color: '#fff',
    borderRadius: 14,
    borderBottomRightRadius: 4,
    padding: '11px 15px',
    font: `400 14px/1.5 ${sans}`,
  };
  const botBubble: React.CSSProperties = {
    alignSelf: 'flex-start',
    maxWidth: '88%',
    background: '#17171A',
    border: '1px solid #232327',
    color: '#E6E6E8',
    borderRadius: 14,
    borderBottomLeftRadius: 4,
    padding: '12px 15px',
    font: `400 14px/1.55 ${sans}`,
  };

  return (
    <div style={{ background: '#0F0F11', border: '1px solid #232327', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 24px 60px rgba(0,0,0,.5)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 6, borderBottom: '1px solid #1C1C1F' }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#3CD37A' }} />
        <span style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.14em', color: '#9A9AA0' }}>FLAT·SIX MCP · CLAUDE · OPENAI · GEMINI</span>
      </div>

      <div style={userBubble}>
        Just did an oil change at 42,180 miles — Mobil 1 0W-40, new Mahle filter and crush washer. Log it?
      </div>

      <div style={botBubble}>
        Done ✓ Added <strong style={{ color: '#fff' }}>Annual Oil Service</strong> to your history.
        <div style={{ marginTop: 10, background: '#0B0B0C', border: '1px solid #232327', borderRadius: 8, padding: '11px 13px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
            <span style={{ font: `400 14px/1.1 ${sans}`, color: '#fff' }}>Annual Oil Service</span>
            <span style={{ font: `600 8px/1 ${mono}`, letterSpacing: '.1em', color: RED, background: 'rgba(213,0,28,.14)', padding: '3px 6px', borderRadius: 2 }}>DIY</span>
          </div>
          <div style={{ font: `500 10px/1.5 ${mono}`, color: '#8A8A8F' }}>
            42,180 mi · Mobil 1 0W-40 (7.5 L) · Mahle OX 366D
          </div>
        </div>
        Want me to set the next one due in 12 months / 10,000 mi?
      </div>

      <div style={userBubble}>Yes please. And what&rsquo;s the drain plug torque?</div>

      <div style={botBubble}>
        Set ✓ Next oil service ~52,180 mi. Drain plug is <strong style={{ color: '#fff' }}>50 Nm</strong> with a new
        aluminium crush washer each time.
      </div>
    </div>
  );
}
