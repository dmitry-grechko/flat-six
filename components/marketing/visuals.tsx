import Link from 'next/link';
import { mono, sans, RED, ctaStyle, GARAGE } from './tokens';

const FAULTS = [
  { cause: 'Centre coolant pipe (plastic)', part: '981.106.665', likely: 'High' as const },
  { cause: 'Water-pump weep hole', part: '9A1.106.011', likely: 'Med' as const },
  { cause: 'Expansion tank cap seal', part: '999.673.323', likely: 'Low' as const },
];

const DOC_CATS = [
  { cat: 'WORKSHOP', title: 'Factory service manuals', meta: '987.1 · 987.2 · 981 · ~17,700 pages' },
  { cat: 'DIAGNOSTIC', title: 'DME, PDK, OBD & Mode 6', meta: 'Trouble codes · summary tables' },
  { cat: 'TRAINING', title: 'Training books', meta: 'Engine · chassis · electrical' },
];

const FIT_CHECKS = [
  { label: 'Tyre ↔ rim', text: 'Ideal — 265 on 9.5J', warn: false },
  { label: 'Diameter', text: '−4 mm (−0.6%) vs OEM', warn: false },
  { label: 'Clearance', text: '+6 mm poke — check fender', warn: true },
];

const LOG = [
  { date: 'SEP 12', title: 'Annual Oil Service', meta: '41,980 mi · $182' },
  { date: 'MAR 04', title: 'Brake Fluid Flush', meta: '39,120 mi · $58' },
  { date: 'AUG 20', title: 'Plugs & Air Filter', meta: '35,400 mi · $236' },
];

const PLAN_ITEMS = [
  { label: 'Order ATE Type 200 (1 L)', done: true },
  { label: 'Top reservoir, bleed RR → LF', done: false },
  { label: 'Confirm firm pedal, log it', done: false },
];

export function XrayShowcase() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: 18 }} className="twoCol">
      <div style={{ background: '#0B0B0C', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #232327', display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: RED }} />
          <span style={{ font: `600 10px/1 ${mono}`, letterSpacing: '.12em', color: '#fff' }}>3D EXTERIOR</span>
        </div>
        <div style={{ background: 'radial-gradient(120% 100% at 50% 20%,#1A1A1D,#0B0B0C)', padding: '16px 16px 0' }}>
          <img src="/assets/engine-981.jpg" alt="981 engine bay" style={{ width: '100%', display: 'block', borderRadius: 4, objectFit: 'cover', maxHeight: 280 }} />
        </div>
      </div>
      <div style={{ background: '#fff', border: '1px solid #E3E3E5', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #F0F0F1', font: `600 10px/1 ${mono}`, letterSpacing: '.12em', color: RED }}>X-RAY · ALL SYSTEMS</div>
        <img src="/assets/xray-systems.png" alt="X-ray systems view" style={{ width: '100%', display: 'block' }} />
      </div>
    </div>
  );
}

export function FaultBoard() {
  return (
    <div style={{ background: '#fff', border: `2px solid ${RED}`, borderRadius: 8, padding: '22px 24px', boxShadow: '0 20px 48px rgba(213,0,28,.08)' }}>
      <div style={{ font: `500 9px/1 ${mono}`, letterSpacing: '.14em', color: '#9A9AA0', marginBottom: 8 }}>SYMPTOM · 981 CAYMAN S</div>
      <div style={{ font: `400 20px/1.25 ${sans}`, color: '#0B0B0C', marginBottom: 20 }}>Sweet coolant smell after a drive</div>
      {FAULTS.map((f, i) => (
        <div key={f.cause} style={{ display: 'grid', gridTemplateColumns: '28px 1fr auto', gap: 12, alignItems: 'center', padding: '14px 0', borderTop: i ? '1px solid #F0F0F1' : 'none' }}>
          <span style={{ font: `600 14px/1 ${mono}`, color: RED }}>{String(i + 1).padStart(2, '0')}</span>
          <div>
            <div style={{ font: `400 15px/1.3 ${sans}`, color: '#0B0B0C' }}>{f.cause}</div>
            <div style={{ marginTop: 4, font: `500 10px/1 ${mono}`, color: '#9A9AA0' }}>{f.part}</div>
          </div>
          <span style={{
            font: `600 8px/1 ${mono}`, letterSpacing: '.08em', padding: '5px 8px', borderRadius: 2,
            color: f.likely === 'High' ? RED : f.likely === 'Med' ? '#C77700' : '#1E8E4E',
            border: `1px solid ${f.likely === 'High' ? RED : f.likely === 'Med' ? '#C77700' : '#1E8E4E'}`,
          }}>
            {f.likely.toUpperCase()}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ToolsDiagram() {
  return (
    <div style={{ background: '#0B0B0C', borderRadius: 8, padding: 24, color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
        <div>
          <div style={{ font: `700 28px/1 ${mono}`, color: '#3CD37A' }}>FITS</div>
          <div style={{ marginTop: 6, font: `400 18px/1.2 ${sans}` }}>265/40R19 · 9.5J · ET48</div>
        </div>
        <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden>
          <circle cx="36" cy="36" r="30" fill="none" stroke="#3A3A3E" strokeWidth="8" />
          <circle cx="36" cy="36" r="18" fill="none" stroke="#6E6E73" strokeWidth="4" />
          <line x1="36" y1="6" x2="36" y2="18" stroke={RED} strokeWidth="2" />
        </svg>
      </div>
      {FIT_CHECKS.map((c) => (
        <div key={c.label} style={{ display: 'flex', gap: 12, padding: '10px 0', borderTop: '1px solid #232327' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 6, background: c.warn ? '#EFC03B' : '#3CD37A', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.08em', color: '#76767B' }}>{c.label}</div>
            <div style={{ marginTop: 4, font: `400 14px/1.4 ${sans}`, color: '#E6E6E8' }}>{c.text}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DocumentStack() {
  return (
    <div style={{ position: 'relative', minHeight: 280 }}>
      {DOC_CATS.map((d, i) => (
        <div
          key={d.title}
          style={{
            position: i === 0 ? 'relative' : 'absolute',
            top: i * 18,
            left: i * 12,
            right: 0,
            background: '#fff',
            border: '1px solid #E3E3E5',
            borderRadius: 6,
            padding: '18px 20px',
            boxShadow: `0 ${8 + i * 4}px ${24 + i * 8}px rgba(0,0,0,${0.06 + i * 0.02})`,
            transform: `rotate(${i * -0.6}deg)`,
            zIndex: DOC_CATS.length - i,
          }}
        >
          <div style={{ font: `600 9px/1 ${mono}`, letterSpacing: '.12em', color: RED, marginBottom: 8 }}>{d.cat}</div>
          <div style={{ font: `400 16px/1.25 ${sans}`, color: '#0B0B0C' }}>{d.title}</div>
          <div style={{ marginTop: 6, font: `500 10px/1 ${mono}`, color: '#9A9AA0' }}>{d.meta}</div>
        </div>
      ))}
    </div>
  );
}

export function ServiceSplit() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="twoCol">
      <div style={{ background: '#fff', border: '1px solid #E3E3E5', borderRadius: 8, padding: '20px 18px' }}>
        <div style={{ font: `600 10px/1 ${mono}`, letterSpacing: '.12em', color: '#9A9AA0', marginBottom: 14 }}>HISTORY</div>
        {LOG.map((r, i) => (
          <div key={r.title} style={{ padding: '12px 0', borderTop: i ? '1px solid #F0F0F1' : 'none' }}>
            <div style={{ font: `500 10px/1 ${mono}`, color: RED }}>{r.date}</div>
            <div style={{ marginTop: 6, font: `400 15px/1.2 ${sans}`, color: '#0B0B0C' }}>{r.title}</div>
            <div style={{ marginTop: 4, font: `500 10px/1 ${mono}`, color: '#9A9AA0' }}>{r.meta}</div>
          </div>
        ))}
      </div>
      <div style={{ background: '#0B0B0C', borderRadius: 8, padding: '20px 18px', color: '#fff' }}>
        <div style={{ font: `600 10px/1 ${mono}`, letterSpacing: '.12em', color: '#76767B', marginBottom: 14 }}>PLAN · BRAKE FLUID</div>
        {PLAN_ITEMS.map((it) => (
          <div key={it.label} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 0' }}>
            <span style={{
              width: 16, height: 16, borderRadius: 3, flexShrink: 0,
              border: `1.5px solid ${it.done ? RED : '#4A4A4E'}`, background: it.done ? RED : 'transparent',
              color: '#fff', font: '11px/14px system-ui', textAlign: 'center',
            }}>{it.done ? '✓' : ''}</span>
            <span style={{ font: `400 14px/1.4 ${sans}`, color: it.done ? '#76767B' : '#fff', textDecoration: it.done ? 'line-through' : 'none' }}>{it.label}</span>
          </div>
        ))}
        <div style={{ marginTop: 16, ...ctaStyle, height: 36, display: 'inline-flex', alignItems: 'center', padding: '0 14px', fontSize: 10 }}>
          Start service →
        </div>
      </div>
    </div>
  );
}

export function FeatureLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 20, font: `600 11px/1 ${sans}`, letterSpacing: '.1em', textTransform: 'uppercase', color: RED }}>
      {label} <span style={{ fontFamily: mono }}>→</span>
    </Link>
  );
}

export function ChatThread() {
  const userBubble: React.CSSProperties = {
    alignSelf: 'flex-end', maxWidth: '82%', background: RED, color: '#fff',
    borderRadius: 14, borderBottomRightRadius: 4, padding: '11px 15px', font: `400 14px/1.5 ${sans}`,
  };
  const botBubble: React.CSSProperties = {
    alignSelf: 'flex-start', maxWidth: '88%', background: '#17171A', border: '1px solid #232327',
    color: '#E6E6E8', borderRadius: 14, borderBottomLeftRadius: 4, padding: '12px 15px', font: `400 14px/1.55 ${sans}`,
  };
  return (
    <div style={{ background: '#0F0F11', border: '1px solid #232327', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={userBubble}>What is the drain plug torque on my 981?</div>
      <div style={botBubble}>
        <strong style={{ color: '#fff' }}>50 Nm</strong> with a new aluminium crush washer. Want me to log an oil change while we are at it?
      </div>
    </div>
  );
}
