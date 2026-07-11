'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { FaultCode } from '@/lib/knowledge';
import { faultCodeSlug } from '@/lib/marketing/content';
import { mono, RED, sans } from '@/components/marketing/tokens';

const SYSTEMS = [
  { key: 'All', prefix: 'All', name: 'All systems', desc: 'Every indexed code' },
  { key: 'P', prefix: 'P', name: 'Powertrain', desc: 'Engine, fuel & emissions' },
  { key: 'C', prefix: 'C', name: 'Chassis', desc: 'Brakes, suspension, PASM' },
  { key: 'U', prefix: 'U', name: 'Network', desc: 'CAN bus & modules' },
] as const;

function systemKey(code: string): string {
  return code.charAt(0).toUpperCase();
}

function systemLabel(sys: string): string {
  const map: Record<string, string> = { P: 'Powertrain', C: 'Chassis', U: 'Network', B: 'Body' };
  return map[sys] ?? sys;
}

export interface IndexedCode {
  generation: string;
  fault: FaultCode;
}

export default function CodesIndex({ codes }: { codes: IndexedCode[] }) {
  const [q, setQ] = useState('');
  const [sys, setSys] = useState<string>('All');

  const filtered = useMemo(() => {
    let list = codes;
    if (sys !== 'All') list = list.filter((c) => systemKey(c.fault.code) === sys);
    const query = q.trim().toLowerCase();
    if (query) {
      list = list.filter((c) => {
        const hay = `${c.fault.code} ${c.fault.title} ${c.fault.description ?? ''} ${c.generation}`.toLowerCase();
        return hay.includes(query);
      });
    }
    return list.slice(0, 50);
  }, [codes, q, sys]);

  const countFor = (key: string) => (key === 'All' ? codes.length : codes.filter((c) => systemKey(c.fault.code) === key).length);

  const filterLabel = sys === 'All' ? 'Common Boxster & Cayman codes' : `${systemLabel(sys)} codes`;

  return (
    <>
      <section style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid #141416' }}>
        <div style={{ position: 'absolute', left: '50%', top: -150, transform: 'translateX(-50%)', width: 900, height: 520, background: 'radial-gradient(circle,rgba(213,0,28,.15),transparent 62%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', padding: '80px 28px 52px', animation: 'fadeUp .5s ease both' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 20 }}>
            <span style={{ width: 24, height: 2, background: RED }} />
            <span style={{ font: `500 13px/1 ${sans}`, letterSpacing: '.14em', color: RED }}>Fault codes</span>
          </div>
          <h1 style={{ margin: 0, font: `300 50px/1.08 ${sans}`, letterSpacing: '-.022em', color: '#fff', maxWidth: 820 }}>
            Every code, decoded for your car.
          </h1>
          <p style={{ maxWidth: 640, margin: '24px 0 30px', font: `400 17px/1.7 ${sans}`, color: '#9E9EA3' }}>
            Look up any diagnostic trouble code and see what it means on a Boxster or Cayman — the likely cause, the system it touches, and which generations it applies to.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, maxWidth: 560, background: '#121214', border: '1px solid #2A2A2E', borderRadius: 10, padding: '0 16px', height: 56 }}>
            <span style={{ font: `500 15px/1 ${mono}`, color: '#5C5C61' }}>⌕</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search a code or symptom — e.g. P0300, misfire"
              style={{ flex: 1, background: 'transparent', border: 0, outline: 'none', color: '#fff', font: `400 16px/1 ${sans}` }}
            />
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '44px 28px 8px' }}>
        <div className="codesSystems" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
          {SYSTEMS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSys(s.key)}
              style={{
                textAlign: 'left',
                cursor: 'pointer',
                background: sys === s.key ? '#17171A' : '#121214',
                border: `1px solid ${sys === s.key ? '#3A2A2E' : '#232327'}`,
                borderRadius: 12,
                padding: '20px 22px',
                transition: 'all .16s',
                color: 'inherit',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ font: `700 22px/1 ${mono}`, color: RED }}>{s.prefix}</span>
                <span style={{ font: `500 12px/1 ${mono}`, color: '#76767B' }}>{countFor(s.key)} codes</span>
              </div>
              <div style={{ marginTop: 12, font: `500 15px/1.2 ${sans}`, color: '#fff' }}>{s.name}</div>
              <div style={{ marginTop: 5, font: `400 13px/1.4 ${sans}`, color: '#8A8A8F' }}>{s.desc}</div>
            </button>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '36px 28px 90px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
          <div style={{ font: `500 13px/1 ${sans}`, color: '#8A8A8F' }}>{filterLabel}</div>
          <div style={{ font: `500 13px/1 ${mono}`, color: '#6E6E73' }}>{filtered.length} shown</div>
        </div>
        <div style={{ background: '#0E0E10', border: '1px solid #232327', borderRadius: 12, overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '44px 22px', textAlign: 'center', font: `400 15px/1.5 ${sans}`, color: '#8A8A8F' }}>
              No codes match that search. Try a code like <span style={{ fontFamily: mono, color: '#C9C9CD' }}>P0300</span> or a word like <span style={{ color: '#C9C9CD' }}>misfire</span>.
            </div>
          ) : (
            filtered.map((c, idx) => {
              const sk = systemKey(c.fault.code);
              const href = `/codes/${c.generation}/${faultCodeSlug(c.fault.code)}`;
              return (
                <Link
                  key={`${c.generation}-${c.fault.code}`}
                  href={href}
                  className="codeRow"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '16px 20px',
                    borderTop: idx > 0 ? '1px solid #1A1A1E' : undefined,
                    textDecoration: 'none',
                    transition: 'background .14s',
                  }}
                >
                  <span style={{ font: `600 15px/1 ${mono}`, letterSpacing: '.03em', color: RED, width: 76, flex: 'none' }}>{c.fault.code}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: `400 15px/1.3 ${sans}`, color: '#EDEDEF' }}>{c.fault.title}</div>
                    <div style={{ marginTop: 4, font: `400 13px/1.5 ${sans}`, color: '#8A8A8F' }}>{(c.fault.description ?? '').slice(0, 100)}{(c.fault.description?.length ?? 0) > 100 ? '…' : ''}</div>
                  </div>
                  <span style={{ font: `500 12px/1 ${mono}`, color: '#9A9AA0', background: '#1E1E22', padding: '6px 9px', borderRadius: 3, flex: 'none' }}>{systemLabel(sk)}</span>
                  <span style={{ font: `500 12px/1 ${mono}`, color: '#6E6E73', width: 96, flex: 'none', textAlign: 'right' }}>{c.generation}</span>
                  <span style={{ font: `500 14px/1 ${mono}`, color: '#5C5C61', flex: 'none' }}>→</span>
                </Link>
              );
            })
          )}
        </div>
        <p style={{ margin: '22px 0 0', font: `400 14px/1.6 ${sans}`, color: '#6E6E73' }}>
          Showing indexed codes for the Boxster &amp; Cayman — 100 per generation, scoped to your exact variant inside the garage.
        </p>
      </section>
    </>
  );
}
