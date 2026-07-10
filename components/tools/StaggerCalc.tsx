'use client';

import { useState } from 'react';
import type { FitmentPreset } from '@/lib/fitment/oem';
import { overallDiameterMm, staggerMatch } from '@/lib/fitment/calc';
import { NumberField, FieldGrid, Stat, InfoBox, mono, sans, num, round } from './ui';
import { DiameterCompare } from './diagrams';

interface TyreState {
  w: string;
  a: string;
  r: string;
}

function seed(preset: FitmentPreset | undefined, axle: 'front' | 'rear'): TyreState {
  const t = preset?.[axle];
  const fallback = axle === 'front' ? { w: '235', a: '40', r: '19' } : { w: '265', a: '40', r: '19' };
  return t ? { w: String(t.tire.width), a: String(t.tire.aspect), r: String(t.rimDiameter) } : fallback;
}

function Axle({ label, t, set }: { label: string; t: TyreState; set: (t: TyreState) => void }) {
  return (
    <div>
      <div style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.1em', color: '#6E6E73', marginBottom: 8 }}>{label}</div>
      <FieldGrid>
        <NumberField label="WIDTH" suffix="mm" value={t.w} onChange={(w) => set({ ...t, w })} />
        <NumberField label="ASPECT" suffix="%" value={t.a} onChange={(a) => set({ ...t, a })} />
        <NumberField label="RIM" suffix="in" value={t.r} onChange={(r) => set({ ...t, r })} />
      </FieldGrid>
    </div>
  );
}

export default function StaggerCalc({ preset }: { preset?: FitmentPreset }) {
  const [front, setFront] = useState<TyreState>(() => seed(preset, 'front'));
  const [rear, setRear] = useState<TyreState>(() => seed(preset, 'rear'));

  const frontDia = overallDiameterMm(num(front.w), num(front.a), num(front.r));
  const rearDia = overallDiameterMm(num(rear.w), num(rear.a), num(rear.r));
  const res = staggerMatch(frontDia, rearDia);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18, marginTop: 8 }}>
        <Axle label="FRONT" t={front} set={setFront} />
        <Axle label="REAR" t={rear} set={setRear} />
      </div>

      <InfoBox tone={res.ok ? 'default' : 'warn'} style={{ marginTop: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 16 }}>
          <Stat label="Ø Front" value={`${round(frontDia)} mm`} />
          <Stat label="Ø Rear" value={`${round(rearDia)} mm`} />
          <Stat
            label="Rear − Front"
            value={`${res.deltaMm >= 0 ? '+' : ''}${round(res.deltaMm)} mm`}
            sub={`${res.deltaPct >= 0 ? '+' : ''}${round(res.deltaPct, 2)}%`}
          />
          <Stat
            label="Match"
            value={res.ok ? 'OK' : 'Check'}
            sub={res.ok ? 'within ±3%' : 'outside ±3% window'}
            tone={res.ok ? 'ok' : 'warn'}
          />
        </div>
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #F0F0F1' }}>
          <DiameterCompare oemDia={frontDia} newDia={rearDia} oemLabel="Front" newLabel="Rear" />
        </div>
      </InfoBox>

      <p style={{ margin: '16px 0 0', font: `400 11px/1.5 ${sans}`, color: '#9A9AA0' }}>
        These cars are RWD, so a staggered setup (wider rear) is normal. This checks
        the rolling-<em>diameter</em> gap between axles, which PSM/ABS calibration
        assumes stays within a window — large deviations can trigger faults.
      </p>
    </div>
  );
}
