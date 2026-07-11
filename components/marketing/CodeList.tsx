'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { FaultCode } from '@/lib/knowledge/types';
import { cardStyle, mono, sans, severityColor } from '@/components/marketing/tokens';

export default function CodeList({ generation, codes }: { generation: string; codes: FaultCode[] }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return codes;
    return codes.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.system.toLowerCase().includes(q),
    );
  }, [codes, query]);

  return (
    <div>
      <input
        type="search"
        placeholder="Search code, title, or system…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          width: '100%',
          maxWidth: 420,
          height: 46,
          padding: '0 16px',
          border: '1px solid #E3E3E5',
          borderRadius: 4,
          background: '#fff',
          font: `400 14px/1 ${sans}`,
          outline: 'none',
        }}
      />
      <div style={{ margin: '16px 0 16px', font: `500 10px/1 ${mono}`, letterSpacing: '.06em', color: '#9A9AA0' }}>
        {filtered.length} of {codes.length} codes
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {filtered.map((c) => {
          const color = severityColor(c.severity);
          return (
            <Link
              key={c.code}
              href={`/codes/${generation}/${c.code.toLowerCase()}`}
              className="fcard"
              style={{
                ...cardStyle,
                borderRadius: 4,
                display: 'grid',
                gridTemplateColumns: '10px 84px 1fr auto',
                gap: 14,
                alignItems: 'center',
                padding: '15px 16px',
                textDecoration: 'none',
                transition: 'border-color .15s, transform .15s',
              }}
            >
              <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
              <span style={{ font: `600 13px/1 ${mono}`, color: '#D5001C' }}>{c.code}</span>
              <span style={{ font: `400 14px/1.35 ${sans}`, color: '#0B0B0C' }}>{c.title}</span>
              <span style={{ font: `500 9px/1 ${mono}`, letterSpacing: '.06em', color: '#9A9AA0' }}>{c.system}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
