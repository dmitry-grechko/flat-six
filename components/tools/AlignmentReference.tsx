'use client';

import { useState } from 'react';
import { alignmentForGeneration, checkValue, type Range } from '@/lib/fitment/alignment';
import { toeDegToMm, toeMmToDeg } from '@/lib/fitment/calc';
import { NumberField, InfoBox, ToolSection, mono, sans, num, round } from './ui';
import { CamberToeFigure } from './diagrams';

const GREEN = '#1B8A4B';
const RED = '#D5001C';

function fmtRange(r: Range): string {
  return `${r.spec.toFixed(2)}° (${r.min.toFixed(2)} … ${r.max.toFixed(2)})`;
}

export default function AlignmentReference({ gen }: { gen: string }) {
  const data = alignmentForGeneration(gen);

  const rows = data
    ? ([
        { key: 'fc', label: 'Front camber', range: data.front.camber },
        { key: 'ft', label: `Front toe (${data.front.toeNote})`, range: data.front.toe },
        { key: 'cas', label: 'Caster', range: data.front.caster! },
        { key: 'rc', label: 'Rear camber', range: data.rear.camber },
        { key: 'rt', label: `Rear toe (${data.rear.toeNote})`, range: data.rear.toe },
      ] as const)
    : [];

  const [m, setM] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((r) => [r.key, String(r.range.spec)])),
  );

  const [dia, setDia] = useState('19');
  const [toeDeg, setToeDeg] = useState('0.1');
  const [toeMm, setToeMm] = useState('2');

  if (!data) return <div style={{ font: `400 13px ${sans}`, color: '#9A9AA0' }}>No alignment data for this generation.</div>;

  const set = (k: string, v: string) => setM((s) => ({ ...s, [k]: v }));

  return (
    <div>
      {/* status banner */}
      <InfoBox tone={data.verified ? 'ok' : 'bad'} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span style={{ font: `600 12px/1.2 ${mono}`, color: data.verified ? GREEN : RED }}>{data.verified ? '✓' : '⚠'}</span>
        <span style={{ font: `400 12px/1.5 ${sans}`, color: '#6E6E73' }}>
          {data.verified ? (
            <>
              <strong style={{ color: '#0B0B0C' }}>Factory workshop-manual values</strong> — {data.setup.toLowerCase()}.{' '}
              {data.notes} Always confirm against your own four-wheel alignment sheet.
            </>
          ) : (
            <>
              <strong style={{ color: '#0B0B0C' }}>Unconfirmed values.</strong> {data.notes}
            </>
          )}
        </span>
      </InfoBox>

      <div style={{ font: `400 11px/1.4 ${sans}`, color: '#9A9AA0', margin: '8px 2px 0' }}>
        Setup: {data.setup}
        {data.rideHeight && <> · Ride height F {data.rideHeight.front} / R {data.rideHeight.rear}</>}
      </div>

      {/* spec + check */}
      <ToolSection>CHECK YOUR ALIGNMENT</ToolSection>
      <InfoBox style={{ padding: '6px 16px' }}>
        {rows.map((r) => {
          const measured = num(m[r.key]);
          const st = checkValue(measured, r.range);
          const off = st === 'low' ? r.range.min - measured : st === 'high' ? measured - r.range.max : 0;
          return (
            <div
              key={r.key}
              style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #F0F0F1' }}
            >
              <div style={{ flex: '1 1 130px', minWidth: 0 }}>
                <div style={{ font: `500 12px/1.2 ${sans}`, color: '#0B0B0C' }}>{r.label}</div>
                <div style={{ font: `400 10px/1.3 ${mono}`, color: '#9A9AA0', marginTop: 2 }}>spec {fmtRange(r.range)}</div>
              </div>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                value={m[r.key]}
                onChange={(e) => set(r.key, e.target.value)}
                style={{ width: 78, height: 34, padding: '0 8px', borderRadius: 3, border: '1px solid #D2D2D6', background: '#F6F6F7', font: `400 13px ${sans}` }}
              />
              <span
                style={{
                  font: `600 10px/1 ${mono}`,
                  letterSpacing: '.04em',
                  color: st === 'in' ? GREEN : RED,
                  width: 96,
                  textAlign: 'right',
                }}
              >
                {st === 'in' ? 'IN SPEC ✓' : `${round(off, 2)}° ${st.toUpperCase()}`}
              </span>
            </div>
          );
        })}
      </InfoBox>

      {/* visualization */}
      <ToolSection>VISUAL (FROM YOUR READINGS)</ToolSection>
      <InfoBox style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 8 }}>
        <CamberToeFigure camberDeg={num(m.fc)} toeDeg={num(m.ft)} label="Front" />
        <CamberToeFigure camberDeg={num(m.rc)} toeDeg={num(m.rt)} label="Rear" />
      </InfoBox>

      {/* toe converter */}
      <ToolSection>TOE CONVERTER (DEGREES ⇄ MM)</ToolSection>
      <InfoBox>
        <p style={{ margin: '0 0 12px', font: `400 12px/1.5 ${sans}`, color: '#9A9AA0' }}>
          For string/DIY alignments — toe measured across the wheel rim diameter.
        </p>
        <div style={{ maxWidth: 160, marginBottom: 14 }}>
          <NumberField label="RIM Ø" suffix="in" value={dia} onChange={setDia} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, alignItems: 'start' }}>
          <div>
            <NumberField label="TOE (DEGREES)" suffix="°" value={toeDeg} onChange={setToeDeg} />
            <div style={{ font: `500 13px/1.3 ${sans}`, color: '#0B0B0C', marginTop: 8 }}>= {round(toeDegToMm(num(toeDeg), num(dia)), 2)} mm</div>
          </div>
          <div>
            <NumberField label="TOE (MM)" suffix="mm" value={toeMm} onChange={setToeMm} />
            <div style={{ font: `500 13px/1.3 ${sans}`, color: '#0B0B0C', marginTop: 8 }}>= {round(toeMmToDeg(num(toeMm), num(dia)), 3)}°</div>
          </div>
        </div>
      </InfoBox>
    </div>
  );
}
