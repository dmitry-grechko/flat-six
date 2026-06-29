'use client';

import { useState } from 'react';
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

type Pin = {
  id: string;
  name: string;
  sys: string;
  ix: number;
  iy: number;
  part: string;
  torque: string;
  interval: string;
};

const PREVIEW: Record<'front' | 'engine', Pin[]> = {
  front: [
    { id: 'cabin', name: 'Cabin / Pollen Filter', sys: 'HVAC', ix: 31, iy: 42, part: '991.572.219.01', torque: 'Clip-in', interval: 'Yearly / 20k mi' },
    { id: 'battery', name: 'Auxiliary Battery', sys: 'ELECTRICAL', ix: 19, iy: 41, part: 'AGM 12V 70Ah', torque: 'Terminal 6 Nm', interval: '4–6 yr' },
    { id: 'cooling', name: 'Front Radiators', sys: 'COOLING', ix: 14, iy: 54, part: '981.106.034', torque: 'Clamp 4 Nm', interval: 'Coolant 4 yr' },
    { id: 'fbrakes', name: 'Front Brakes', sys: 'BRAKES', ix: 21, iy: 66, part: 'Pads 981.351.939', torque: 'Bolts 130 Nm', interval: 'Inspect yearly' },
  ],
  engine: [
    { id: 'airfilter', name: 'Air Filter & Intake', sys: 'ENGINE', ix: 60, iy: 37, part: '981.110.131.00', torque: 'Airbox 4 Nm', interval: '6 yr / 40k mi' },
    { id: 'plugs', name: 'Spark Plugs', sys: 'ENGINE', ix: 66, iy: 44, part: 'NGK 999.170.225.90 ×6', torque: '30 Nm', interval: '4 yr / 40k mi' },
    { id: 'oil', name: 'Engine Oil & Filter', sys: 'ENGINE', ix: 62, iy: 57, part: 'Mahle OX 366D', torque: 'Drain 50 Nm', interval: 'Yearly · 0W-40 7.5 L' },
    { id: 'trans', name: 'PDK Transaxle', sys: 'TRANSMISSION', ix: 76, iy: 51, part: 'Fluid 999.917.547.00', torque: '45 Nm', interval: '4 yr / 40k mi' },
  ],
};

const COLORS = ['#C6C8CA', '#E8E8EA', '#131316', '#D5001C', '#27364E', '#EFC03B'];

const STATS = [
  { k: '16', label: 'systems mapped' },
  { k: '7.5 L', label: '0W-40 oil capacity' },
  { k: '130 Nm', label: 'wheel-bolt torque' },
  { k: '2012–16', label: '981 generation' },
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
  const [view, setView] = useState<'front' | 'engine'>('front');
  const [sel, setSel] = useState<string | null>(null);

  const list = PREVIEW[view];
  const selected = list.find((c) => c.id === sel) || null;
  const setLayer = (v: 'front' | 'engine') => {
    setView(v);
    setSel(null);
  };

  const seg = (on: boolean): React.CSSProperties => ({
    height: 30,
    padding: '0 14px',
    border: 'none',
    font: `600 10px/1 ${mono}`,
    letterSpacing: '.08em',
    cursor: 'pointer',
    background: on ? '#0B0B0C' : 'transparent',
    color: on ? '#fff' : '#6E6E73',
  });

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
        <div style={{ position: 'absolute', right: -60, top: 40, font: `700 420px/.8 ${mono}`, color: '#121214', letterSpacing: '-.04em', userSelect: 'none', pointerEvents: 'none' }}>981</div>
        <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', padding: '84px 28px 92px', display: 'grid', gridTemplateColumns: '1.05fr .95fr', gap: 56, alignItems: 'center' }} className="heroGrid landingHero">
          {/* copy */}
          <div style={{ animation: 'fadeUp .5s ease' }}>
            <div style={{ font: `500 12px/1 ${mono}`, letterSpacing: '.26em', color: RED, marginBottom: 22 }}>FREE &amp; OPEN SOURCE · PORSCHE 981</div>
            <h1 style={{ margin: 0, font: `300 56px/1.04 ${sans}`, letterSpacing: '-.02em' }}>
              Every component<br />of your Boxster.<br />
              <span style={{ fontWeight: 500 }}>One garage.</span>
            </h1>
            <p style={{ maxWidth: 468, margin: '26px 0 0', font: `400 16px/1.65 ${sans}`, color: '#9A9AA0' }}>
              Explore your Boxster or Cayman in 3D and factory cutaways, keep a full service history, plan what&rsquo;s next — and let an AI assistant help with all of it. Free, and open source.
            </p>
            <div style={{ marginTop: 34, display: 'flex', gap: 13, flexWrap: 'wrap' }}>
              <Link href={GARAGE} className="cta" style={{ ...ctaStyle, height: 50, display: 'flex', alignItems: 'center', gap: 10, padding: '0 26px' }}>
                Start your garage <span style={{ fontFamily: mono }}>→</span>
              </Link>
              <a href="#inspect" className="ghost" style={{ height: 50, display: 'flex', alignItems: 'center', padding: '0 24px', background: 'transparent', color: '#C9C9CD', border: '1px solid #313135', borderRadius: 2, font: `600 12px/1 ${sans}`, letterSpacing: '.1em', textTransform: 'uppercase', transition: 'all .15s' }}>
                See what it does
              </a>
            </div>
            <div style={{ marginTop: 46, display: 'flex', gap: 30, flexWrap: 'wrap', font: `500 11px/1 ${mono}`, letterSpacing: '.14em', color: '#5C5C61' }}>
              <span>2.7 / 3.4 / 3.8 FLAT-6</span>
              <span>PDK · MANUAL</span>
              <span>2012–2016</span>
            </div>
          </div>

          {/* inspector card */}
          <div style={{ animation: 'fadeUp .6s ease' }}>
            <div style={{ background: '#fff', borderRadius: 6, boxShadow: '0 30px 70px rgba(0,0,0,.5)', overflow: 'hidden' }}>
              <div style={{ height: 46, borderBottom: '1px solid #EAEAEC', display: 'flex', alignItems: 'center', gap: 9, padding: '0 14px' }}>
                <div style={{ display: 'flex', background: '#F4F4F5', border: '1px solid #E2E2E4', borderRadius: 3, overflow: 'hidden' }}>
                  <button onClick={() => setLayer('front')} style={seg(view === 'front')}>FRONT</button>
                  <button onClick={() => setLayer('engine')} style={seg(view === 'engine')}>ENGINE</button>
                </div>
                <div style={{ marginLeft: 'auto', font: `500 9px/1 ${mono}`, letterSpacing: '.12em', color: '#B4B4B8' }}>981 FACTORY CUTAWAY</div>
              </div>
              <div style={{ position: 'relative', background: 'radial-gradient(120% 95% at 50% 35%,#FCFCFD,#E7E7EA)', padding: 20 }}>
                <div style={{ position: 'relative', width: '100%' }}>
                  <img
                    src="/assets/cutaway-981.jpg"
                    alt={`Porsche 981 ${view} cutaway`}
                    style={{ width: '100%', display: 'block', filter: 'drop-shadow(0 16px 26px rgba(0,0,0,.2))' }}
                  />
                  {list.map((p, i) => {
                    const active = p.id === sel;
                    return (
                      <button
                        key={p.id}
                        className="pin"
                        onClick={() => setSel((cur) => (cur === p.id ? null : p.id))}
                        style={{ position: 'absolute', left: `${p.ix}%`, top: `${p.iy}%`, transform: 'translate(-50%,-50%)', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', zIndex: active ? 20 : 10 }}
                      >
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            background: active ? RED : '#0B0B0C',
                            color: '#fff',
                            font: `600 11px/1 ${mono}`,
                            border: '2px solid #fff',
                            boxShadow: '0 2px 7px rgba(0,0,0,.4)',
                            animation: active ? 'hsPulse 1.6s infinite' : undefined,
                          }}
                        >
                          {i + 1}
                        </span>
                        <span
                          className="pinlabel"
                          style={{
                            pointerEvents: 'none',
                            position: 'absolute',
                            left: '50%',
                            bottom: 34,
                            transform: 'translateX(-50%)',
                            whiteSpace: 'nowrap',
                            background: '#0B0B0C',
                            color: '#fff',
                            padding: '4px 8px',
                            borderRadius: 3,
                            font: `500 9px/1 ${mono}`,
                            opacity: active ? 1 : 0,
                            transition: 'opacity .15s',
                          }}
                        >
                          {p.name}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* detail / hint */}
                {selected ? (
                  <div style={{ marginTop: 14, background: '#0B0B0C', color: '#fff', borderRadius: 4, padding: '14px 16px', animation: 'fadeUp .2s ease' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
                      <span style={{ font: `600 9px/1 ${mono}`, letterSpacing: '.1em', color: RED, border: `1px solid ${RED}`, borderRadius: 2, padding: '4px 6px' }}>{selected.sys}</span>
                      <span style={{ font: `500 14px/1 ${sans}` }}>{selected.name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
                      {[
                        ['PART', selected.part],
                        ['TORQUE', selected.torque],
                        ['INTERVAL', selected.interval],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <div style={{ font: `500 8.5px/1 ${mono}`, letterSpacing: '.1em', color: '#76767B', marginBottom: 4 }}>{k}</div>
                          <div style={{ font: `500 11px/1.3 ${mono}`, color: '#fff' }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 14, border: '1px dashed #D2D2D6', borderRadius: 4, padding: '13px 16px', font: `400 12px/1.4 ${sans}`, color: '#9A9AA0', textAlign: 'center' }}>
                    Click a numbered node to see part numbers, torque &amp; intervals
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== INSPECT: 3D + INTERNALS (real renders) ===== */}
      <section id="inspect" style={{ maxWidth: 1200, margin: '0 auto', padding: '86px 28px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 30, flexWrap: 'wrap', marginBottom: 28 }}>
          <div>
            <div style={{ font: `500 11px/1 ${mono}`, letterSpacing: '.22em', color: RED, marginBottom: 14 }}>THE INSPECTOR</div>
            <h2 style={{ margin: 0, font: `300 38px/1.1 ${sans}`, letterSpacing: '-.015em', color: '#0B0B0C', maxWidth: 560 }}>
              See the whole car —<br />outside and in.
            </h2>
          </div>
          <p style={{ maxWidth: 380, margin: 0, font: `400 15px/1.65 ${sans}`, color: '#6E6E73' }}>
            A real 3D model you can orbit, zoom and repaint to your colour — then X-ray it or drop into factory cutaways to
            see exactly where every part lives.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }} className="twoCol">
          {/* 3D model — real render */}
          <div style={{ background: '#0B0B0C', borderRadius: 8, overflow: 'hidden', color: '#fff', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, background: 'radial-gradient(120% 100% at 50% 30%,#1A1A1D,#0B0B0C)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 20px 0' }}>
              <img src="/assets/boxster-poster.png" alt="Porsche 981 Boxster 3D model" style={{ width: '92%', maxWidth: 420, display: 'block', filter: 'drop-shadow(0 24px 40px rgba(0,0,0,.55))' }} />
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

          {/* internals — real X-ray render */}
          <div style={{ background: '#fff', border: '1px solid #E3E3E5', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, background: 'radial-gradient(120% 100% at 50% 40%,#FCFCFD,#ECECEE)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <img src="/assets/xray-internals.png" alt="Porsche 981 internals X-ray view" style={{ width: '100%', maxWidth: 520, display: 'block', filter: 'drop-shadow(0 16px 26px rgba(0,0,0,.16))' }} />
            </div>
            <div style={{ padding: '20px 26px 24px' }}>
              <div style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.16em', color: '#9A9AA0' }}>LAYER 02 · X-RAY &amp; CUTAWAY</div>
              <h3 style={{ margin: '12px 0 8px', font: `400 22px/1.15 ${sans}`, color: '#0B0B0C' }}>See what&rsquo;s underneath</h3>
              <p style={{ margin: 0, font: `400 14px/1.6 ${sans}`, color: '#6E6E73' }}>
                Engine, oil filter, plugs, transaxle — every system pinned to a real part number, torque and interval.
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
        body="Pick a symptom and get the likely causes ranked, what to check, and the exact parts to order — from coolant pipes to the AOS."
        visual={<FaultPanel />}
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
              Connect your garage to Claude (or another AI assistant) and simply talk to it. It logs services, looks up
              specs and plans what&rsquo;s next — updating your garage with your approval. No commands to learn.
            </p>
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
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', font: `700 320px/.8 ${mono}`, color: '#121214', userSelect: 'none', pointerEvents: 'none' }}>981</div>
          <div style={{ position: 'relative' }}>
            <h2 style={{ margin: 0, font: `300 40px/1.1 ${sans}`, letterSpacing: '-.02em', color: '#fff' }}>Know your 981 inside out.</h2>
            <p style={{ margin: '18px auto 0', maxWidth: 440, font: `400 15px/1.6 ${sans}`, color: '#9A9AA0' }}>It&rsquo;s free. Add your car, pick your spec, and open the garage.</p>
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
          <div style={{ font: `400 12px/1 ${sans}`, color: '#9A9AA0' }}>Free &amp; open-source DIY maintenance for the Porsche 981 Boxster &amp; Cayman</div>
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
}: {
  kicker: string;
  title: string;
  body: string;
  visual: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <section style={{ maxWidth: 1200, margin: '0 auto', padding: '34px 28px' }}>
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
        <span style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.14em', color: '#9A9AA0' }}>FLAT·SIX MCP · CONNECTED</span>
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
