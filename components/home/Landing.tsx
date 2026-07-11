'use client';

import Link from 'next/link';
import MarketingShell from '@/components/marketing/MarketingShell';
import { GARAGE, GITHUB_ISSUES, GITHUB_REPO, mono, RED, sans } from '@/components/marketing/tokens';

const PAINTS = ['#C9CBCE', '#8A8C90', '#101012', '#ECECEE', '#D5001C'];

const FAULT = {
  symptom: 'Sweet coolant smell after a drive',
  causes: [
    { n: '01', name: 'Centre coolant pipe (plastic)', part: '981.106.665', sev: 'HIGH' as const },
    { n: '02', name: 'Water-pump weep hole', part: '9A1.106.011', sev: 'MED' as const },
    { n: '03', name: 'Expansion-tank cap seal', part: '999.673.323', sev: 'LOW' as const },
  ],
};

const HISTORY = [
  { date: 'Sep 2025', title: 'Annual oil service', meta: '41,980 mi · Mobil 1 0W-40 · $182' },
  { date: 'Mar 2025', title: 'Brake fluid flush', meta: '39,120 mi · ATE Type 200 · $58' },
  { date: 'Aug 2024', title: 'Plugs & air filter', meta: '35,400 mi · 6× NGK @30 Nm · $236' },
];

const PLAN = {
  title: 'Brake fluid flush',
  due: 'Due ~Apr 2026 · 44,000 mi',
  steps: [
    { done: true, text: 'Order ATE Type 200 (1 L)' },
    { done: false, text: 'Top reservoir, bleed RR → LF' },
    { done: false, text: 'Confirm firm pedal, log it' },
  ],
};

const TOOL = {
  spec: '265/40R19 on 9.5J',
  checks: [
    { label: 'Tyre ↔ rim', value: 'Ideal — 265 on 9.5J' },
    { label: 'Diameter', value: '−4 mm (−0.6%) vs OEM' },
    { label: 'Speedo', value: 'reads high 0.6%' },
    { label: 'Clearance', value: '+6 mm poke' },
  ],
};

const CARS = [
  { model: 'Boxster Spyder', gen: '987', meta: '2011 · 42,500 mi', active: true },
  { model: 'Cayman S', gen: '981', meta: '2014 · 38,120 mi', active: false },
];

const STATS = [
  { n: '200', label: 'fault codes indexed' },
  { n: '2', label: 'generations supported' },
  { n: 'Multi', label: 'vehicles per garage' },
  { n: 'DIY', label: 'wheel & alignment tools' },
];

function sevBg(sev: string) {
  if (sev === 'HIGH') return RED;
  if (sev === 'MED') return '#7A2A30';
  return '#2A2A2F';
}

function sevFg(sev: string) {
  if (sev === 'HIGH') return '#fff';
  if (sev === 'MED') return '#E7A6AC';
  return '#9A9AA0';
}

function barW(sev: string) {
  if (sev === 'HIGH') return '100%';
  if (sev === 'MED') return '58%';
  return '26%';
}

function FeatureArrow({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, font: `600 15px/1 ${sans}`, color: '#fff', textDecoration: 'none' }}>
      {label} <span style={{ fontFamily: mono, color: RED }}>→</span>
    </Link>
  );
}

export default function Landing() {
  return (
    <MarketingShell active="home">
      {/* HERO */}
      <section id="top" style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid #141416' }}>
        <div style={{ position: 'absolute', left: '52%', top: -160, width: 920, height: 680, background: 'radial-gradient(circle,rgba(213,0,28,.20),transparent 62%)', pointerEvents: 'none' }} />
        <div aria-hidden style={{ position: 'absolute', right: -60, top: -10, font: `700 380px/.8 ${mono}`, color: '#0E0E10', letterSpacing: '-.05em', userSelect: 'none', pointerEvents: 'none' }}>981</div>
        <div className="featureHero landingHero" style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', padding: '88px 28px 96px', display: 'grid', gridTemplateColumns: '1.02fr .98fr', gap: 56, alignItems: 'center' }}>
          <div style={{ animation: 'fadeUp .5s ease both' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 24 }}>
              <span style={{ width: 24, height: 2, background: RED }} />
              <span style={{ font: `500 13px/1 ${sans}`, letterSpacing: '.14em', color: RED }}>Free &amp; open source · Boxster &amp; Cayman</span>
            </div>
            <h1 style={{ margin: 0, font: `300 57px/1.06 ${sans}`, letterSpacing: '-.022em', color: '#fff' }}>
              Know every system.<br />
              Keep every record.<br />
              <span style={{ fontWeight: 500 }}>Ask any AI.</span>
            </h1>
            <p style={{ maxWidth: 484, margin: '26px 0 0', font: `400 17px/1.65 ${sans}`, color: '#9E9EA3' }}>
              A multi-car garage for the 987 and 981: a full 3D X-ray, fault finding, service history, plans and DIY wheel &amp; alignment tools — connected to Claude, OpenAI, or Gemini.
            </p>
            <div style={{ marginTop: 34, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <Link href={GARAGE} className="cta" style={{ height: 52, display: 'inline-flex', alignItems: 'center', gap: 10, padding: '0 28px', background: RED, color: '#fff', borderRadius: 3, font: `600 15px/1 ${sans}`, textDecoration: 'none' }}>
                Start your garage <span style={{ fontFamily: mono }}>→</span>
              </Link>
              <Link href="#inspector" className="ghostDark" style={{ height: 52, display: 'inline-flex', alignItems: 'center', padding: '0 26px', background: 'transparent', color: '#D6D6DA', border: '1px solid #313135', borderRadius: 3, font: `600 15px/1 ${sans}`, textDecoration: 'none' }}>
                See what it does
              </Link>
            </div>
          </div>
          <div style={{ animation: 'fadeUp .6s ease both' }}>
            <div style={{ background: '#121214', border: '1px solid #232327', borderRadius: 12, overflow: 'hidden', boxShadow: '0 34px 80px rgba(0,0,0,.55)' }}>
              <div style={{ height: 46, borderBottom: '1px solid #232327', display: 'flex', alignItems: 'center', gap: 11, padding: '0 16px' }}>
                <span style={{ font: `600 12px/1 ${mono}`, letterSpacing: '.06em', color: RED, border: `1px solid ${RED}`, borderRadius: 3, padding: '6px 8px' }}>X-ray</span>
                <span style={{ font: `500 13px/1 ${sans}`, color: '#8A8A8F' }}>All systems, stripped</span>
                <span style={{ marginLeft: 'auto', font: `500 12px/1 ${mono}`, letterSpacing: '.06em', color: '#5C5C61' }}>987 · 981</span>
              </div>
              <div style={{ background: 'radial-gradient(120% 100% at 50% 26%,#202024,#0C0C0E)', padding: '24px 22px' }}>
                <img src="/assets/xray-full.png" alt="Full 3D X-ray of every system" style={{ width: '100%', display: 'block', borderRadius: 6, filter: 'drop-shadow(0 22px 34px rgba(0,0,0,.55))' }} />
              </div>
              <div className="heroValueStrip" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', borderTop: '1px solid #232327' }}>
                {[
                  { k: 'X-ray', v: 'every system stripped' },
                  { k: '200', v: 'fault codes indexed' },
                  { k: 'AI', v: 'Claude · OpenAI · Gemini' },
                ].map((item, i) => (
                  <div key={item.k} style={{ padding: '16px 17px', borderRight: i < 2 ? '1px solid #232327' : undefined }}>
                    <div style={{ font: `300 24px/1 ${sans}`, color: '#fff' }}>{item.k}</div>
                    <div style={{ marginTop: 7, font: `400 13px/1.35 ${sans}`, color: '#7A7A7F' }}>{item.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* INSPECTOR */}
      <section id="inspector" style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid #141416' }}>
        <div style={{ position: 'absolute', left: -160, top: 180, width: 620, height: 620, background: 'radial-gradient(circle,rgba(213,0,28,.10),transparent 62%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', padding: '96px 28px 100px' }}>
          <div className="twoCol" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center', marginBottom: 52 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 18 }}>
                <span style={{ width: 20, height: 2, background: RED }} />
                <span style={{ font: `500 13px/1 ${sans}`, letterSpacing: '.13em', color: RED }}>The Inspector</span>
              </div>
              <h2 style={{ margin: 0, font: `300 42px/1.08 ${sans}`, letterSpacing: '-.02em', color: '#fff' }}>See it from the<br />outside in.</h2>
              <p style={{ maxWidth: 520, margin: '22px 0 28px', font: `400 17px/1.7 ${sans}`, color: '#9E9EA3' }}>
                Orbit a real 3D model in your colour, strip it to every assembly in X-ray, or follow coolant, fuel, air and wiring through the car — each part tied to numbers, torque and intervals for your generation.
              </p>
              <FeatureArrow href="/features/xray" label="Explore the 3D viewer" />
            </div>
            <div style={{ background: 'radial-gradient(130% 120% at 60% 30%,#1C1C20,#0C0C0E)', border: '1px solid #232327', borderRadius: 14, padding: '20px 20px 8px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: 20, top: 18, font: `600 12px/1 ${mono}`, letterSpacing: '.08em', color: '#76767B' }}>Layer 01 · 3D model</div>
              <img src="/assets/boxster-poster.png" alt="Boxster 3D model" style={{ width: '100%', display: 'block', marginTop: 6 }} />
              <div style={{ position: 'absolute', right: 18, bottom: 20, display: 'flex', gap: 8 }}>
                {PAINTS.map((p) => (
                  <span key={p} style={{ width: 16, height: 16, borderRadius: '50%', background: p, border: '1px solid rgba(255,255,255,.35)', boxShadow: '0 2px 6px rgba(0,0,0,.4)' }} />
                ))}
              </div>
            </div>
          </div>
          <div className="twoCol" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="darkCardHover" style={{ background: '#121214', border: '1px solid #232327', borderRadius: 14, padding: '24px 26px' }}>
              <div style={{ font: `600 12px/1 ${mono}`, letterSpacing: '.1em', color: RED, marginBottom: 14 }}>Layer 01</div>
              <h3 style={{ margin: '0 0 8px', font: `500 22px/1.2 ${sans}`, color: '#fff' }}>Orbit &amp; recolour</h3>
              <p style={{ margin: 0, font: `400 15px/1.6 ${sans}`, color: '#9A9AA0' }}>Drag to spin, scroll to zoom, and switch the paint to your spec — the body repaints live.</p>
            </div>
            <div className="darkCardHover" style={{ background: '#121214', border: '1px solid #232327', borderRadius: 14, padding: 0, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', alignItems: 'stretch' }}>
                <div style={{ padding: '24px 24px 24px 26px' }}>
                  <div style={{ font: `600 12px/1 ${mono}`, letterSpacing: '.1em', color: RED, marginBottom: 14 }}>Layer 02</div>
                  <h3 style={{ margin: '0 0 8px', font: `500 22px/1.2 ${sans}`, color: '#fff' }}>Where every part lives</h3>
                  <p style={{ margin: 0, font: `400 15px/1.6 ${sans}`, color: '#9A9AA0' }}>Trace coolant, fuel, air, exhaust and wiring, then open any system for part numbers and torque.</p>
                </div>
                <div style={{ background: '#0C0C0E', borderLeft: '1px solid #232327', minHeight: 150, backgroundImage: "url('/assets/xray-systems.png')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES HEADER */}
      <section id="features" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -140, top: 40, width: 560, height: 560, background: 'radial-gradient(circle,rgba(213,0,28,.08),transparent 62%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', padding: '100px 28px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 40, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 18 }}>
                <span style={{ width: 20, height: 2, background: RED }} />
                <span style={{ font: `500 13px/1 ${sans}`, letterSpacing: '.13em', color: RED }}>Everything you need</span>
              </div>
              <h2 style={{ margin: 0, font: `300 42px/1.06 ${sans}`, letterSpacing: '-.02em', color: '#fff' }}>Everything in one garage.</h2>
            </div>
            <p style={{ maxWidth: 400, margin: '0 0 6px', font: `400 16px/1.65 ${sans}`, color: '#8A8A8F' }}>
              Seven tools that keep your car&apos;s whole life in one place — history, plans, faults, DIY math and the AI you already use.
            </p>
          </div>
        </div>
      </section>

      {/* FAULT FINDING */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '56px 0' }}>
        <div style={{ position: 'absolute', left: -120, top: 0, width: 520, height: 520, background: 'radial-gradient(circle,rgba(213,0,28,.13),transparent 60%)', pointerEvents: 'none' }} />
        <div className="twoCol" style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', padding: '0 28px', display: 'grid', gridTemplateColumns: '.92fr 1.08fr', gap: 52, alignItems: 'center' }}>
          <div>
            <div style={{ font: `500 13px/1 ${sans}`, letterSpacing: '.13em', color: RED, marginBottom: 16 }}>Fault finding</div>
            <h3 style={{ margin: '0 0 16px', font: `400 30px/1.16 ${sans}`, color: '#fff' }}>Track a fault to its cause.</h3>
            <p style={{ margin: '0 0 22px', maxWidth: 440, font: `400 16px/1.7 ${sans}`, color: '#9A9AA0' }}>
              Pick a symptom and get the likely causes ranked for your generation — IMS and bore scoring on a 987.1, AOS and coolant pipes on a 981 — with the checks to run and the parts to order.
            </p>
            {['Ranked by likelihood for your exact generation', 'The checks to run first, in order', 'Part numbers ready to order'].map((t) => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 12, font: `400 15px/1.4 ${sans}`, color: '#C9C9CD', marginBottom: 13 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: RED, flex: 'none' }} />
                {t}
              </div>
            ))}
            <div style={{ marginTop: 26 }}>
              <FeatureArrow href="/features/fault-finding" label="Explore fault finding" />
            </div>
          </div>
          <div style={{ background: '#0E0E10', border: '1px solid #232327', borderRadius: 12, overflow: 'hidden', boxShadow: '0 24px 56px rgba(0,0,0,.4)' }}>
            <div style={{ height: 42, borderBottom: '1px solid #202024', display: 'flex', alignItems: 'center', gap: 9, padding: '0 15px' }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: RED }} />
              <span style={{ font: `500 12px/1 ${mono}`, letterSpacing: '.05em', color: '#8A8A8F' }}>flat-six / fault finding</span>
            </div>
            <div style={{ padding: '20px 22px' }}>
              <div style={{ font: `500 13px/1 ${sans}`, color: '#76767B', marginBottom: 8 }}>Symptom</div>
              <div style={{ font: `400 16px/1.35 ${sans}`, color: '#fff', marginBottom: 20 }}>{FAULT.symptom}</div>
              <div style={{ font: `500 13px/1 ${sans}`, color: '#76767B', marginBottom: 14 }}>Likely causes</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                {FAULT.causes.map((c) => (
                  <div key={c.n}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ font: `700 13px/1 ${mono}`, color: RED, width: 18, flex: 'none' }}>{c.n}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ font: `400 15px/1.25 ${sans}`, color: '#EDEDEF' }}>{c.name}</div>
                        <div style={{ marginTop: 3, font: `500 12px/1 ${mono}`, color: '#6E6E73' }}>Part {c.part}</div>
                      </div>
                      <span style={{ font: `600 11px/1 ${mono}`, letterSpacing: '.06em', padding: '5px 8px', borderRadius: 3, background: sevBg(c.sev), color: sevFg(c.sev) }}>{c.sev}</span>
                    </div>
                    <div style={{ marginTop: 8, marginLeft: 30, height: 4, borderRadius: 2, background: '#1C1C20', overflow: 'hidden' }}>
                      <div style={{ height: 4, borderRadius: 2, width: barW(c.sev), background: sevBg(c.sev) }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICE HISTORY + PLANS */}
      <section style={{ padding: '40px 0' }}>
        <div className="twoCol" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="darkCardHover" style={{ background: '#121214', border: '1px solid #232327', borderRadius: 14, padding: '28px 28px 24px' }}>
            <div style={{ font: `500 13px/1 ${sans}`, letterSpacing: '.12em', color: RED, marginBottom: 14 }}>Service history</div>
            <h3 style={{ margin: '0 0 10px', font: `400 24px/1.18 ${sans}`, color: '#fff' }}>Log every job, keep the record.</h3>
            <p style={{ margin: '0 0 20px', font: `400 15px/1.65 ${sans}`, color: '#9A9AA0' }}>Record each service with a checklist, mileage and cost — DIY or shop. Your full history stays with the car.</p>
            <div style={{ background: '#0B0B0C', border: '1px solid #202024', borderRadius: 9, padding: '6px 16px' }}>
              {HISTORY.map((r, i) => (
                <div key={r.title} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 0', borderTop: i > 0 ? '1px solid #1A1A1E' : undefined }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: RED, flex: 'none' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <span style={{ font: `400 15px/1.2 ${sans}`, color: '#EDEDEF' }}>{r.title}</span>
                      <span style={{ font: `600 11px/1 ${mono}`, letterSpacing: '.06em', color: RED, background: 'rgba(213,0,28,.14)', padding: '4px 6px', borderRadius: 3 }}>DIY</span>
                    </div>
                    <div style={{ marginTop: 5, font: `500 12px/1.3 ${mono}`, color: '#6E6E73' }}>{r.meta}</div>
                  </div>
                  <span style={{ font: `500 12px/1 ${mono}`, color: '#8A8A8F', flex: 'none' }}>{r.date}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 18 }}>
              <FeatureArrow href="/features/service-history" label="Service history" />
            </div>
          </div>
          <div className="darkCardHover" style={{ background: '#121214', border: '1px solid #232327', borderRadius: 14, padding: '28px 28px 24px' }}>
            <div style={{ font: `500 13px/1 ${sans}`, letterSpacing: '.12em', color: RED, marginBottom: 14 }}>Service plans</div>
            <h3 style={{ margin: '0 0 10px', font: `400 24px/1.18 ${sans}`, color: '#fff' }}>Plan what&apos;s coming up.</h3>
            <p style={{ margin: '0 0 20px', font: `400 15px/1.65 ${sans}`, color: '#9A9AA0' }}>Build plans with the steps and parts to order, tick things off, then turn a plan into a logged service in one click.</p>
            <div style={{ background: '#0B0B0C', border: '1px solid #202024', borderRadius: 9, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 4 }}>
                <span style={{ font: `400 16px/1.2 ${sans}`, color: '#fff' }}>{PLAN.title}</span>
                <span style={{ font: `600 11px/1 ${mono}`, letterSpacing: '.06em', color: RED, border: '1px solid rgba(213,0,28,.5)', padding: '4px 6px', borderRadius: 3 }}>Planned</span>
              </div>
              <div style={{ font: `500 12px/1 ${mono}`, color: '#76767B', marginBottom: 16 }}>{PLAN.due}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {PLAN.steps.map((s) => (
                  <div key={s.text} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <span style={{
                      width: 19, height: 19, borderRadius: 5, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      font: `700 11px/1 ${mono}`,
                      background: s.done ? RED : 'transparent',
                      color: s.done ? '#fff' : 'transparent',
                      border: s.done ? 'none' : '1px solid #3A3A3F',
                    }}>
                      {s.done ? '✓' : ''}
                    </span>
                    <span style={{ font: `400 14px/1.4 ${sans}`, color: s.done ? '#6E6E73' : '#D6D6DA', textDecoration: s.done ? 'line-through' : 'none' }}>{s.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 18 }}>
              <FeatureArrow href="/features/service-plans" label="Service plans" />
            </div>
          </div>
        </div>
      </section>

      {/* DIY TOOLS */}
      <section style={{ padding: '56px 0' }}>
        <div className="twoCol" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 28px', display: 'grid', gridTemplateColumns: '1.08fr .92fr', gap: 52, alignItems: 'center' }}>
          <div style={{ background: '#0E0E10', border: '1px solid #232327', borderRadius: 12, overflow: 'hidden', boxShadow: '0 24px 56px rgba(0,0,0,.4)' }}>
            <div style={{ height: 42, borderBottom: '1px solid #202024', display: 'flex', alignItems: 'center', gap: 9, padding: '0 15px' }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: RED }} />
              <span style={{ font: `500 12px/1 ${mono}`, letterSpacing: '.05em', color: '#8A8A8F' }}>flat-six / tools · will it fit?</span>
            </div>
            <div style={{ padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                <span style={{ font: `700 12px/1 ${mono}`, letterSpacing: '.06em', background: RED, color: '#fff', padding: '7px 11px', borderRadius: 3 }}>FITS</span>
                <span style={{ font: `500 17px/1 ${mono}`, color: '#fff' }}>{TOOL.spec}</span>
                <span style={{ marginLeft: 'auto', font: `500 12px/1 ${mono}`, letterSpacing: '.06em', color: '#5C5C61' }}>rear axle</span>
              </div>
              <div className="toolChecks" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
                {TOOL.checks.map((t) => (
                  <div key={t.label} style={{ background: '#141416', border: '1px solid #202024', borderRadius: 7, padding: '13px 15px' }}>
                    <div style={{ font: `500 12px/1 ${mono}`, letterSpacing: '.04em', color: '#76767B' }}>{t.label}</div>
                    <div style={{ marginTop: 6, font: `400 14px/1.3 ${sans}`, color: '#E6E6E9' }}>{t.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div>
            <div style={{ font: `500 13px/1 ${sans}`, letterSpacing: '.13em', color: RED, marginBottom: 16 }}>DIY tools</div>
            <h3 style={{ margin: '0 0 16px', font: `400 30px/1.16 ${sans}`, color: '#fff' }}>Will it fit? Do the math.</h3>
            <p style={{ margin: '0 0 22px', maxWidth: 440, font: `400 16px/1.7 ${sans}`, color: '#9A9AA0' }}>
              Save the wheels you own and check any tyre against them — rim fit, rolling diameter, speedo error, poke and clearance — plus offset, staggered-diameter and alignment calculators with visual diagrams. Our own math, no third-party site.
            </p>
            <FeatureArrow href="/features/tools" label="Open the DIY tools" />
          </div>
        </div>
      </section>

      {/* MULTI-CAR */}
      <section style={{ padding: '40px 0 96px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 28px' }}>
          <div className="multiCar" style={{ background: '#121214', border: '1px solid #232327', borderRadius: 14, padding: '34px 36px', display: 'grid', gridTemplateColumns: '.8fr 1.2fr', gap: 44, alignItems: 'center' }}>
            <div>
              <div style={{ font: `500 13px/1 ${sans}`, letterSpacing: '.13em', color: RED, marginBottom: 16 }}>Multi-car garage</div>
              <h3 style={{ margin: '0 0 14px', font: `400 28px/1.16 ${sans}`, color: '#fff' }}>Run more than one car.</h3>
              <p style={{ margin: '0 0 22px', font: `400 16px/1.7 ${sans}`, color: '#9A9AA0' }}>
                Add every Boxster and Cayman you own — 987 or 981 — and switch in one click. History, plans and AI context stay scoped to the car you&apos;re looking at.
              </p>
              <FeatureArrow href="/features/multi-car" label="See the garage" />
            </div>
            <div className="carCards" style={{ display: 'flex', gap: 14, alignItems: 'stretch' }}>
              {CARS.map((c) => (
                <div key={c.model} className="carCard" style={{ flex: 1, minWidth: 0, background: '#0E0E10', border: `1px solid ${c.active ? '#3A2024' : '#232327'}`, borderRadius: 10, padding: '18px 20px', transition: 'border-color .18s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 9, minHeight: 20 }}>
                    <span style={{ font: `600 12px/1 ${mono}`, letterSpacing: '.06em', color: '#8A8A8F' }}>{c.gen}</span>
                    {c.active && <span style={{ font: `600 11px/1 ${mono}`, letterSpacing: '.06em', padding: '5px 8px', borderRadius: 3, background: RED, color: '#fff' }}>Active</span>}
                  </div>
                  <div style={{ marginTop: 16, font: `400 18px/1.15 ${sans}`, color: '#fff' }}>{c.model}</div>
                  <div style={{ marginTop: 6, font: `500 12px/1 ${mono}`, color: '#8A8A8F' }}>{c.meta}</div>
                </div>
              ))}
              <div style={{ flex: 'none', width: 64, border: '1px dashed #313135', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5C5C61', font: `300 30px/1 ${sans}` }}>+</div>
            </div>
          </div>
        </div>
      </section>

      {/* AI */}
      <section id="ai" style={{ position: 'relative', overflow: 'hidden', borderTop: '1px solid #141416', borderBottom: '1px solid #141416', background: '#08080A' }}>
        <div style={{ position: 'absolute', left: '50%', top: -120, transform: 'translateX(-50%)', width: 900, height: 500, background: 'radial-gradient(circle,rgba(213,0,28,.12),transparent 60%)', pointerEvents: 'none' }} />
        <div className="aiGrid" style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', padding: '96px 28px 100px', display: 'grid', gridTemplateColumns: '.9fr 1.1fr', gap: 52, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 18 }}>
              <span style={{ width: 20, height: 2, background: RED }} />
              <span style={{ font: `500 13px/1 ${sans}`, letterSpacing: '.13em', color: RED }}>AI assistant</span>
            </div>
            <h2 style={{ margin: '0 0 20px', font: `300 40px/1.1 ${sans}`, letterSpacing: '-.02em', color: '#fff' }}>Manage it all just by chatting.</h2>
            <p style={{ margin: '0 0 26px', maxWidth: 460, font: `400 17px/1.7 ${sans}`, color: '#9E9EA3' }}>
              Connect your garage to Claude, OpenAI, or Gemini over MCP and simply talk to it. It logs services, looks up specs, answers fault questions and plans what&apos;s next — updating your garage with your approval.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 28 }}>
              {['Claude', 'OpenAI', 'Gemini'].map((p) => (
                <span key={p} style={{ font: `500 14px/1 ${sans}`, color: '#D6D6DA', border: '1px solid #2A2A2E', borderRadius: 20, padding: '9px 16px' }}>{p}</span>
              ))}
            </div>
            <FeatureArrow href="/features/ai" label="How the assistant works" />
          </div>
          <div style={{ background: '#121214', border: '1px solid #232327', borderRadius: 14, padding: 20, boxShadow: '0 28px 64px rgba(0,0,0,.5)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              <div style={{ alignSelf: 'flex-end', maxWidth: '82%', background: RED, color: '#fff', borderRadius: '14px 14px 4px 14px', padding: '13px 16px', font: `400 15px/1.5 ${sans}` }}>
                Just did an oil change at 42,180 miles — Mobil 1 0W-40, new Mahle filter and crush washer. Log it?
              </div>
              <div style={{ alignSelf: 'flex-start', maxWidth: '82%', background: '#1C1C20', color: '#E6E6E9', borderRadius: '14px 14px 14px 4px', padding: '13px 16px', font: `400 15px/1.5 ${sans}` }}>
                Done ✓ Added <strong style={{ color: '#fff' }}>Annual oil service</strong> to your history.
              </div>
              <div style={{ alignSelf: 'flex-start', maxWidth: '88%', background: '#0B0B0C', border: '1px solid #232327', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ font: `400 15px/1.2 ${sans}`, color: '#fff' }}>Annual oil service</span>
                  <span style={{ font: `600 11px/1 ${mono}`, letterSpacing: '.06em', color: RED, background: 'rgba(213,0,28,.14)', padding: '4px 6px', borderRadius: 3 }}>DIY</span>
                </div>
                <div style={{ marginTop: 7, font: `500 12px/1.3 ${mono}`, color: '#8A8A8F' }}>42,180 mi · Mobil 1 0W-40 (7.5 L) · Mahle OX 366D</div>
              </div>
              <div style={{ alignSelf: 'flex-start', maxWidth: '82%', background: '#1C1C20', color: '#E6E6E9', borderRadius: 14, padding: '13px 16px', font: `400 15px/1.5 ${sans}` }}>
                Want me to set the next one due in 12 months / 10,000 mi?
              </div>
              <div style={{ alignSelf: 'flex-end', maxWidth: '82%', background: RED, color: '#fff', borderRadius: 14, padding: '13px 16px', font: `400 15px/1.5 ${sans}` }}>
                Yes please. And what&apos;s the drain plug torque?
              </div>
              <div style={{ alignSelf: 'flex-start', maxWidth: '88%', background: '#1C1C20', color: '#E6E6E9', borderRadius: '14px 14px 14px 4px', padding: '13px 16px', font: `400 15px/1.5 ${sans}` }}>
                Set ✓ Next oil service ~52,180 mi. Drain plug is <strong style={{ color: '#fff' }}>50 Nm</strong> with a new aluminium crush washer each time.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '72px 28px' }}>
        <div className="statGrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}>
          {STATS.map((s) => (
            <div key={s.n} style={{ borderTop: '2px solid #232327', paddingTop: 20 }}>
              <div style={{ font: `300 46px/1 ${sans}`, color: '#fff' }}>{s.n}</div>
              <div style={{ marginTop: 10, font: `400 15px/1.4 ${sans}`, color: '#8A8A8F' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* OPEN SOURCE */}
      <section style={{ borderTop: '1px solid #141416' }}>
        <div className="twoCol" style={{ maxWidth: 1200, margin: '0 auto', padding: '88px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center' }}>
          <div>
            <div style={{ font: `500 13px/1 ${sans}`, letterSpacing: '.13em', color: RED, marginBottom: 16 }}>Open source</div>
            <h2 style={{ margin: '0 0 18px', font: `300 38px/1.12 ${sans}`, letterSpacing: '-.02em', color: '#fff' }}>A free project, built by an enthusiast.</h2>
            <p style={{ margin: '0 0 26px', maxWidth: 480, font: `400 17px/1.7 ${sans}`, color: '#9E9EA3' }}>
              FLAT·SIX is free and open source — no ads, no tracking, no paywall on the reference data. Built by a 981 owner who wanted to give the DIY community the tool he wished existed.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <Link href="/about" className="cta" style={{ height: 48, display: 'inline-flex', alignItems: 'center', gap: 9, padding: '0 22px', background: RED, color: '#fff', borderRadius: 3, font: `600 15px/1 ${sans}`, textDecoration: 'none' }}>
                Read the story <span style={{ fontFamily: mono }}>→</span>
              </Link>
              <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer" className="ghostDark" style={{ height: 48, display: 'inline-flex', alignItems: 'center', padding: '0 22px', background: 'transparent', color: '#D6D6DA', border: '1px solid #313135', borderRadius: 3, font: `600 15px/1 ${sans}`, textDecoration: 'none' }}>
                View on GitHub
              </a>
            </div>
          </div>
          <div className="featGrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { k: '$0', v: 'free, forever' },
              { k: 'Open', v: 'source on GitHub' },
              { k: 'No ads', v: 'no tracking, no catch' },
              { k: 'You', v: 'ideas & PRs welcome' },
            ].map((c) => (
              <div key={c.k} style={{ background: '#121214', border: '1px solid #232327', borderRadius: 12, padding: 24 }}>
                <div style={{ font: `300 34px/1 ${sans}`, color: '#fff' }}>{c.k}</div>
                <div style={{ marginTop: 9, font: `400 14px/1.4 ${sans}`, color: '#8A8A8F' }}>{c.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ position: 'relative', overflow: 'hidden', borderTop: '1px solid #141416' }}>
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 1000, height: 520, background: 'radial-gradient(circle,rgba(213,0,28,.18),transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: 900, margin: '0 auto', padding: '104px 28px', textAlign: 'center' }}>
          <h2 style={{ margin: 0, font: `300 48px/1.08 ${sans}`, letterSpacing: '-.02em', color: '#fff' }}>Know your car inside out.</h2>
          <p style={{ margin: '22px auto 0', maxWidth: 540, font: `400 17px/1.7 ${sans}`, color: '#9E9EA3' }}>
            It&apos;s free. Add one car or several, track faults and services, and connect the AI you already use — more models are on the way.
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
