'use client';

import { useState } from 'react';
import type { FitmentPreset } from '@/lib/fitment/oem';
import { offsetDelta } from '@/lib/fitment/calc';
import { NumberField, FieldGrid, Stat, InfoBox, mono, sans, num, round } from './ui';
import { PokeDiagram } from './diagrams';

interface WheelState {
  width: string;
  et: string;
}

function seedFrom(preset: FitmentPreset | undefined, axle: 'front' | 'rear'): WheelState {
  const w = preset?.[axle];
  return w ? { width: String(w.rimWidth), et: String(w.offsetEt) } : { width: '8', et: '57' };
}

export default function OffsetCalc({ preset }: { preset?: FitmentPreset }) {
  const [axle, setAxle] = useState<'front' | 'rear'>('front');
  const [old, setOld] = useState<WheelState>(() => seedFrom(preset, 'front'));
  const [next, setNext] = useState<WheelState>(() => seedFrom(preset, 'front'));

  const reseed = (a: 'front' | 'rear') => {
    setAxle(a);
    setOld(seedFrom(preset, a));
    setNext(seedFrom(preset, a));
  };

  const res = offsetDelta({
    oldWidthIn: num(old.width),
    oldEt: num(old.et),
    newWidthIn: num(next.width),
    newEt: num(next.et),
  });

  const pokeMsg =
    res.outerPokeMm === 0
      ? 'same outer position'
      : res.outerPokeMm > 0
        ? `${round(res.outerPokeMm)} mm more poke (toward fender)`
        : `${round(-res.outerPokeMm)} mm less poke (tucked in)`;
  const innerMsg =
    res.innerMoveMm === 0
      ? 'same inner clearance'
      : res.innerMoveMm > 0
        ? `${round(res.innerMoveMm)} mm closer to strut`
        : `${round(-res.innerMoveMm)} mm more strut clearance`;

  return (
    <div>
      {preset && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8, marginBottom: 4 }}>
          {(['front', 'rear'] as const).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => reseed(a)}
              style={{
                font: `500 10px/1 ${mono}`,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                padding: '6px 10px',
                borderRadius: 3,
                cursor: 'pointer',
                border: '1px solid ' + (axle === a ? 'rgba(213,0,28,.4)' : '#D2D2D6'),
                background: axle === a ? 'rgba(213,0,28,.07)' : '#F6F6F7',
                color: axle === a ? '#D5001C' : '#6E6E73',
              }}
            >
              {a} preset
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 18, marginTop: 8 }}>
        <div>
          <div style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.1em', color: '#6E6E73', marginBottom: 8 }}>CURRENT</div>
          <FieldGrid>
            <NumberField label="RIM WIDTH" suffix="J" value={old.width} onChange={(width) => setOld({ ...old, width })} />
            <NumberField label="OFFSET" suffix="ET" value={old.et} onChange={(et) => setOld({ ...old, et })} />
          </FieldGrid>
        </div>
        <div>
          <div style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.1em', color: '#6E6E73', marginBottom: 8 }}>NEW</div>
          <FieldGrid>
            <NumberField label="RIM WIDTH" suffix="J" value={next.width} onChange={(width) => setNext({ ...next, width })} />
            <NumberField label="OFFSET" suffix="ET" value={next.et} onChange={(et) => setNext({ ...next, et })} />
          </FieldGrid>
        </div>
      </div>

      <InfoBox tone={res.outerPokeMm > 5 || res.innerMoveMm > 5 ? 'warn' : 'default'} style={{ marginTop: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
          <Stat
            label="Outer edge"
            value={`${res.outerPokeMm >= 0 ? '+' : ''}${round(res.outerPokeMm)} mm`}
            sub={pokeMsg}
            tone={res.outerPokeMm > 5 ? 'warn' : 'default'}
          />
          <Stat
            label="Inner edge"
            value={`${res.innerMoveMm >= 0 ? '+' : ''}${round(res.innerMoveMm)} mm`}
            sub={innerMsg}
            tone={res.innerMoveMm > 5 ? 'warn' : 'default'}
          />
          <Stat
            label="Centreline shift"
            value={`${res.centerlineShiftMm >= 0 ? '+' : ''}${round(res.centerlineShiftMm)} mm`}
            sub={res.centerlineShiftMm >= 0 ? 'outboard' : 'inboard'}
          />
        </div>
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #F0F0F1' }}>
          <PokeDiagram outerPokeMm={res.outerPokeMm} innerMoveMm={res.innerMoveMm} />
        </div>
      </InfoBox>

      <p style={{ margin: '16px 0 0', font: `400 11px/1.5 ${sans}`, color: '#9A9AA0' }}>
        Lower ET (or wider rim) pushes the wheel outboard (more poke); higher ET
        pulls it inboard (toward the strut). Verify clearance before fitting.
      </p>
    </div>
  );
}
