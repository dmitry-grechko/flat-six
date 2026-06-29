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

const FEATURES = [
  { no: '01', title: '3D + cutaway inspector', body: 'Orbit a 3D model and recolour it to your paint, or drop into factory cutaways. Every system pinned and clickable.' },
  { no: '02', title: 'Real part numbers & torque', body: 'Mahle OX 366D. Drain plug 50 Nm. Wheel bolts 130 Nm. Mobil 1 0W-40, 7.5 L. The numbers that matter, on the part.' },
  { no: '03', title: 'DIY service log', body: 'Record every job with a checklist, mileage and cost — DIY or shop. Reset reminders and track what is due next.' },
  { no: '04', title: 'Fault finding', body: 'Pick a symptom and get likely causes, diagnostic checks and the parts to order — from coolant pipes to AOS to PDK.' },
  { no: '05', title: 'Claude over MCP', body: 'Connect your garage to Claude and let it log services, look up specs and diagnose faults from any chat.' },
  { no: '06', title: 'RAG knowledge base', body: 'Workshop manual, owner handbook and technical bulletins indexed and searchable, grounded to your exact build.' },
];

const STATS = [
  { k: '16', label: 'systems mapped' },
  { k: '7.5 L', label: '0W-40 oil capacity' },
  { k: '130 Nm', label: 'wheel-bolt torque' },
  { k: '2012–16', label: '981 generation' },
];

const MCP = [
  { name: 'log_service', desc: 'Create a service record from text or a photo of a receipt.' },
  { name: 'lookup_part', desc: 'Return part numbers, specs and torque for any component.' },
  { name: 'diagnose_fault', desc: 'Walk a symptom → cause → fix using live OBD codes.' },
  { name: 'search_manual', desc: 'RAG search across indexed manuals and TSBs.' },
];

const LOG = [
  { date: 'SEP 12 · 2025', title: 'Annual Oil Service', tag: 'DIY', meta: '41,980 mi · Mobil 1 0W-40 · £182' },
  { date: 'MAR 04 · 2025', title: 'Brake Fluid Flush', tag: 'DIY', meta: '39,120 mi · ATE Type 200 · £58' },
  { date: 'AUG 20 · 2024', title: 'Plugs & Air Filter', tag: 'DIY', meta: '35,400 mi · 6× NGK @30 Nm · £236' },
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
              ['#inspector', 'Inspector'],
              ['#features', 'Features'],
              ['#ai', 'Claude / MCP'],
              ['#log', 'Service Log'],
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
            <div style={{ font: `500 12px/1 ${mono}`, letterSpacing: '.26em', color: RED, marginBottom: 22 }}>DIY MAINTENANCE OS · PORSCHE 981</div>
            <h1 style={{ margin: 0, font: `300 56px/1.04 ${sans}`, letterSpacing: '-.02em' }}>
              Every component<br />of your Boxster.<br />
              <span style={{ fontWeight: 500 }}>One garage.</span>
            </h1>
            <p style={{ maxWidth: 468, margin: '26px 0 0', font: `400 16px/1.65 ${sans}`, color: '#9A9AA0' }}>
              Inspect your 981 in 3D and factory cutaways, with real part numbers and torque specs on every system. Log every DIY job, chase down faults, and let Claude work alongside you over MCP.
            </p>
            <div style={{ marginTop: 34, display: 'flex', gap: 13, flexWrap: 'wrap' }}>
              <Link href={GARAGE} className="cta" style={{ ...ctaStyle, height: 50, display: 'flex', alignItems: 'center', gap: 10, padding: '0 26px' }}>
                Start your garage <span style={{ fontFamily: mono }}>→</span>
              </Link>
              <a href="#inspector" className="ghost" style={{ height: 50, display: 'flex', alignItems: 'center', padding: '0 24px', background: 'transparent', color: '#C9C9CD', border: '1px solid #313135', borderRadius: 2, font: `600 12px/1 ${sans}`, letterSpacing: '.1em', textTransform: 'uppercase', transition: 'all .15s' }}>
                Explore the inspector
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

      {/* ===== INSPECTOR BAND ===== */}
      <section id="inspector" style={{ maxWidth: 1200, margin: '0 auto', padding: '86px 28px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 30, flexWrap: 'wrap', marginBottom: 8 }}>
          <div>
            <div style={{ font: `500 11px/1 ${mono}`, letterSpacing: '.22em', color: RED, marginBottom: 14 }}>THE INSPECTOR</div>
            <h2 style={{ margin: 0, font: `300 38px/1.1 ${sans}`, letterSpacing: '-.015em', color: '#0B0B0C', maxWidth: 560 }}>
              One inspector,<br />two layers.
            </h2>
          </div>
          <p style={{ maxWidth: 380, margin: 0, font: `400 15px/1.65 ${sans}`, color: '#6E6E73' }}>
            A real 3D model for the outside — orbit it, zoom it, recolour it to your paint. Factory cutaways for the inside — engine, oil, plugs, transaxle. Same pins, same data.
          </p>
        </div>
      </section>

      {/* two-layer cards */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 28px 18px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }} className="twoCol">
          <div style={{ background: '#0B0B0C', borderRadius: 6, overflow: 'hidden', color: '#fff', minHeight: 300, position: 'relative' }}>
            <div style={{ padding: '24px 26px' }}>
              <div style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.16em', color: '#76767B' }}>LAYER 01</div>
              <h3 style={{ margin: '12px 0 8px', font: `400 23px/1.15 ${sans}` }}>3D model · orbit &amp; recolour</h3>
              <p style={{ margin: 0, maxWidth: 420, font: `400 14px/1.6 ${sans}`, color: '#9A9AA0' }}>
                Drag to spin, scroll to zoom, and switch the paint to GT Silver, Guards Red or your own spec — the body repaints live.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, padding: '0 26px 24px' }}>
              {COLORS.map((hex) => (
                <span key={hex} style={{ width: 26, height: 26, borderRadius: '50%', background: hex, border: '1px solid rgba(255,255,255,.18)' }} />
              ))}
            </div>
            <div style={{ position: 'absolute', right: -30, bottom: -50, font: `700 200px/.8 ${mono}`, color: '#131316', userSelect: 'none' }}>3D</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #E3E3E5', borderRadius: 6, overflow: 'hidden', minHeight: 300 }}>
            <div style={{ padding: '24px 26px' }}>
              <div style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.16em', color: '#9A9AA0' }}>LAYER 02</div>
              <h3 style={{ margin: '12px 0 8px', font: `400 23px/1.15 ${sans}`, color: '#0B0B0C' }}>Factory cutaway · internals</h3>
              <p style={{ margin: 0, maxWidth: 420, font: `400 14px/1.6 ${sans}`, color: '#6E6E73' }}>
                See exactly where the oil filter, plugs, drive belt and transaxle live — the parts a skin model can&rsquo;t show.
              </p>
            </div>
            <div style={{ background: 'radial-gradient(120% 95% at 50% 40%,#FCFCFD,#ECECEE)', padding: '6px 26px 16px', textAlign: 'center' }}>
              <img src="/assets/engine-flat-six.jpg" alt="Porsche flat-six engine cutaway" style={{ width: '88%', maxWidth: 420, filter: 'drop-shadow(0 14px 22px rgba(0,0,0,.18))' }} />
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 28px 20px' }}>
        <div style={{ font: `500 11px/1 ${mono}`, letterSpacing: '.22em', color: RED, marginBottom: 14 }}>BUILT FOR DIY</div>
        <h2 style={{ margin: '0 0 40px', font: `300 38px/1.1 ${sans}`, letterSpacing: '-.015em', color: '#0B0B0C' }}>Everything the workshop manual won&rsquo;t.</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }} className="featGrid">
          {FEATURES.map((f) => (
            <div key={f.no} className="fcard" style={{ background: '#fff', border: '1px solid #E3E3E5', borderRadius: 5, padding: 24, transition: 'all .18s' }}>
              <div style={{ font: `600 11px/1 ${mono}`, letterSpacing: '.1em', color: RED, marginBottom: 18 }}>{f.no}</div>
              <h3 style={{ margin: '0 0 9px', font: `500 17px/1.25 ${sans}`, color: '#0B0B0C' }}>{f.title}</h3>
              <p style={{ margin: 0, font: `400 13.5px/1.6 ${sans}`, color: '#6E6E73' }}>{f.body}</p>
            </div>
          ))}
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

      {/* ===== MCP / AI ===== */}
      <section id="ai" style={{ background: '#0B0B0C', color: '#fff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '84px 28px', display: 'grid', gridTemplateColumns: '.95fr 1.05fr', gap: 56, alignItems: 'center' }} className="aiGrid">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <span style={{ color: RED, fontFamily: mono, fontSize: 20 }}>∗</span>
              <span style={{ font: `500 11px/1 ${mono}`, letterSpacing: '.22em', color: '#9A9AA0' }}>CLAUDE / MCP</span>
            </div>
            <h2 style={{ margin: 0, font: `300 36px/1.12 ${sans}`, letterSpacing: '-.015em' }}>
              Your garage,<br />wired to Claude.
            </h2>
            <p style={{ maxWidth: 430, margin: '22px 0 0', font: `400 15px/1.65 ${sans}`, color: '#9A9AA0' }}>
              Expose your garage as an MCP server. Ask Claude in any chat to log a service from a photo of a receipt, pull a torque spec, or walk a fault with your live OBD codes — reading and writing here with your approval.
            </p>
            <div style={{ marginTop: 22, background: '#141416', border: '1px solid #232327', borderRadius: 3, padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 12, maxWidth: 430 }}>
              <span style={{ font: `500 10px/1 ${mono}`, color: '#76767B' }}>ENDPOINT</span>
              <span style={{ font: `500 12px/1 ${mono}`, color: '#fff', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>mcp://flatsix.garage/v1/123456</span>
              <span style={{ font: `500 10px/1 ${mono}`, color: RED }}>COPY</span>
            </div>
          </div>
          <div className="landingMcpGrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {MCP.map((t) => (
              <div key={t.name} style={{ background: '#141416', border: '1px solid #232327', borderRadius: 4, padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3CD37A' }} />
                  <span style={{ font: `500 13px/1 ${mono}`, color: '#fff' }}>{t.name}</span>
                </div>
                <div style={{ font: `400 13px/1.5 ${sans}`, color: '#8A8A8F' }}>{t.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SERVICE LOG ===== */}
      <section id="log" style={{ maxWidth: 1200, margin: '0 auto', padding: '84px 28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '.9fr 1.1fr', gap: 56, alignItems: 'center' }} className="logGrid">
          <div>
            <div style={{ font: `500 11px/1 ${mono}`, letterSpacing: '.22em', color: RED, marginBottom: 14 }}>SERVICE HISTORY</div>
            <h2 style={{ margin: 0, font: `300 36px/1.12 ${sans}`, letterSpacing: '-.015em', color: '#0B0B0C' }}>Every job, on the record.</h2>
            <p style={{ maxWidth: 400, margin: '22px 0 0', font: `400 15px/1.65 ${sans}`, color: '#6E6E73' }}>
              Log each service with a checklist, mileage and cost — DIY or shop. Your full history travels with the car and feeds Claude&rsquo;s answers.
            </p>
          </div>
          <div style={{ background: '#fff', border: '1px solid #E3E3E5', borderRadius: 6, overflow: 'hidden' }}>
            {LOG.map((r) => (
              <div key={r.title} style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '18px 22px', borderBottom: '1px solid #F0F0F1' }}>
                <div style={{ font: `500 11px/1.4 ${mono}`, color: '#9A9AA0', width: 54 }}>{r.date}</div>
                <div style={{ width: 1, alignSelf: 'stretch', background: '#EEEEF0' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span style={{ font: `400 16px/1.2 ${sans}`, color: '#0B0B0C' }}>{r.title}</span>
                    <span style={{ font: `600 9px/1 ${mono}`, letterSpacing: '.1em', color: RED, background: 'rgba(213,0,28,.1)', padding: '4px 7px', borderRadius: 2 }}>{r.tag}</span>
                  </div>
                  <div style={{ marginTop: 6, font: `500 11px/1 ${mono}`, color: '#9A9AA0' }}>{r.meta}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 28px 90px' }}>
        <div style={{ position: 'relative', background: '#0B0B0C', borderRadius: 8, overflow: 'hidden', padding: '64px 28px', textAlign: 'center' }}>
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', font: `700 320px/.8 ${mono}`, color: '#121214', userSelect: 'none', pointerEvents: 'none' }}>981</div>
          <div style={{ position: 'relative' }}>
            <h2 style={{ margin: 0, font: `300 40px/1.1 ${sans}`, letterSpacing: '-.02em', color: '#fff' }}>Know your 981 inside out.</h2>
            <p style={{ margin: '18px auto 0', maxWidth: 440, font: `400 15px/1.6 ${sans}`, color: '#9A9AA0' }}>Add your VIN, pick your spec, and open the garage.</p>
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
          <div style={{ font: `400 12px/1 ${sans}`, color: '#9A9AA0' }}>DIY maintenance for the Porsche 981 Boxster &amp; Cayman</div>
          <Link href="/legal" style={{ font: `400 12px/1 ${sans}`, color: '#6E6E73', transition: 'color .15s' }}>Privacy &amp; Terms</Link>
          <div style={{ marginLeft: 'auto', font: `500 10px/1 ${mono}`, letterSpacing: '.1em', color: '#B4B4B8' }}>NOT AFFILIATED WITH PORSCHE AG</div>
        </div>
      </footer>
    </div>
  );
}
