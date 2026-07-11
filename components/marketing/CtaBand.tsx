import Link from 'next/link';
import { ctaStyle, GARAGE, mono, sans } from './tokens';

export default function CtaBand({
  title = 'Know your car inside out.',
  body = "It's free. Add one car or several, track faults and services, and connect the AI you already use.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <section style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 28px 72px' }}>
      <div style={{ position: 'relative', background: '#0B0B0C', borderRadius: 8, overflow: 'hidden', padding: '64px 28px', textAlign: 'center' }}>
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', font: `700 220px/.8 ${mono}`, color: '#121214', userSelect: 'none', pointerEvents: 'none' }}>FLAT</div>
        <div style={{ position: 'relative' }}>
          <h2 style={{ margin: 0, font: `300 40px/1.1 ${sans}`, letterSpacing: '-.02em', color: '#fff' }}>{title}</h2>
          <p style={{ margin: '18px auto 0', maxWidth: 480, font: `400 15px/1.6 ${sans}`, color: '#9A9AA0' }}>{body}</p>
          <Link href={GARAGE} className="cta" style={{ ...ctaStyle, marginTop: 30, height: 52, display: 'inline-flex', alignItems: 'center', gap: 10, padding: '0 30px' }}>
            Start your garage <span style={{ fontFamily: mono }}>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
