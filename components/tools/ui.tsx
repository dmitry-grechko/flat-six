'use client';

import React from 'react';

export const mono = "'JetBrains Mono',monospace";
export const sans = "'Helvetica Neue',Arial,sans-serif";

/** Parse a numeric input string; non-numbers → 0. */
export function num(s: string): number {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

/** Round to `d` decimals and stringify (trims trailing zeros). */
export function round(n: number, d = 1): string {
  const f = Math.pow(10, d);
  return String(Math.round(n * f) / f);
}

export function NumberField({
  label,
  value,
  onChange,
  suffix,
  step = 'any',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  step?: string;
  placeholder?: string;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
      <span style={{ font: `500 10px/1.2 ${mono}`, letterSpacing: '.05em', color: '#9A9AA0' }}>{label}</span>
      <span style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type="number"
          inputMode="decimal"
          step={step}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            height: 36,
            padding: suffix ? '0 36px 0 10px' : '0 10px',
            borderRadius: 3,
            border: '1px solid #D2D2D6',
            background: '#F6F6F7',
            font: `400 13px ${sans}`,
            color: '#0B0B0C',
          }}
        />
        {suffix && (
          <span style={{ position: 'absolute', right: 10, font: `500 10px/1 ${mono}`, color: '#B4B4B8' }}>{suffix}</span>
        )}
      </span>
    </label>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'default' | 'warn' | 'ok';
}) {
  const color = tone === 'warn' ? '#D5001C' : tone === 'ok' ? '#1B8A4B' : '#0B0B0C';
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ font: `500 9px/1.2 ${mono}`, letterSpacing: '.08em', color: '#9A9AA0', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ font: `500 20px/1.15 ${sans}`, color, marginTop: 4, wordBreak: 'break-word' }}>{value}</div>
      {sub && <div style={{ font: `400 11px/1.3 ${sans}`, color: '#9A9AA0', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

/** Grid wrapper for input fields (responsive auto-fit). */
export function FieldGrid({ children, min = 92 }: { children: React.ReactNode; min?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`, gap: 10 }}>
      {children}
    </div>
  );
}

/** White info card with a tone-coloured border. Use for results/verdicts. */
export function InfoBox({
  children,
  tone = 'default',
  style,
}: {
  children: React.ReactNode;
  tone?: 'default' | 'ok' | 'warn' | 'bad';
  style?: React.CSSProperties;
}) {
  const border =
    tone === 'ok' ? 'rgba(27,138,75,.35)' : tone === 'warn' ? 'rgba(178,106,0,.35)' : tone === 'bad' ? 'rgba(213,0,28,.3)' : '#E3E3E5';
  return (
    <div style={{ background: '#fff', border: `1px solid ${border}`, borderRadius: 6, padding: '14px 16px', ...style }}>
      {children}
    </div>
  );
}

/** Section heading (mono, uppercase, spaced). */
export function ToolSection({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ font: `500 11px/1 ${mono}`, letterSpacing: '.12em', color: '#6E6E73', margin: '22px 0 10px' }}>
      {children}
    </div>
  );
}
