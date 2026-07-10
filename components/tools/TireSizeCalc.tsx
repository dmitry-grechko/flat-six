'use client';

import { useState } from 'react';
import type { FitmentPreset } from '@/lib/fitment/oem';
import {
  overallDiameterMm,
  sidewallMm,
  revsPerMile,
  speedoErrorPct,
  actualSpeed,
} from '@/lib/fitment/calc';
import { NumberField, FieldGrid, Stat, InfoBox, mono, sans, num, round } from './ui';
import { DiameterCompare } from './diagrams';

interface TyreState {
  w: string;
  a: string;
  r: string;
}

function seed(preset: FitmentPreset | undefined): TyreState {
  const t = preset?.front;
  return t
    ? { w: String(t.tire.width), a: String(t.tire.aspect), r: String(t.rimDiameter) }
    : { w: '235', a: '40', r: '19' };
}

function TyreInputs({ label, t, set }: { label: string; t: TyreState; set: (t: TyreState) => void }) {
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

export default function TireSizeCalc({ preset }: { preset?: FitmentPreset }) {
  const [a, setA] = useState<TyreState>(() => seed(preset));
  const [b, setB] = useState<TyreState>(() => seed(preset));

  const diaA = overallDiameterMm(num(a.w), num(a.a), num(a.r));
  const diaB = overallDiameterMm(num(b.w), num(b.a), num(b.r));
  const deltaMm = diaB - diaA;
  const deltaPct = diaA ? (deltaMm / diaA) * 100 : 0;
  const err = speedoErrorPct(diaA, diaB);
  const actualAt60 = actualSpeed(60, diaA, diaB);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18, marginTop: 8 }}>
        <TyreInputs label="STOCK (A)" t={a} set={setA} />
        <TyreInputs label="NEW (B)" t={b} set={setB} />
      </div>

      <InfoBox tone={Math.abs(deltaPct) > 3 ? 'warn' : 'default'} style={{ marginTop: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 16 }}>
          <Stat label="Ø Stock" value={`${round(diaA)} mm`} sub={`sidewall ${round(sidewallMm(num(a.w), num(a.a)))} mm`} />
          <Stat label="Ø New" value={`${round(diaB)} mm`} sub={`sidewall ${round(sidewallMm(num(b.w), num(b.a)))} mm`} />
          <Stat
            label="Diameter Δ"
            value={`${deltaMm >= 0 ? '+' : ''}${round(deltaMm)} mm`}
            sub={`${deltaPct >= 0 ? '+' : ''}${round(deltaPct, 2)}%`}
            tone={Math.abs(deltaPct) > 3 ? 'warn' : 'default'}
          />
          <Stat
            label="Speedo error"
            value={`${err >= 0 ? '+' : ''}${round(err, 1)}%`}
            sub={err === 0 ? 'no change' : err > 0 ? 'reads high' : 'reads low'}
            tone={Math.abs(err) > 3 ? 'warn' : 'default'}
          />
          <Stat label="Actual @ 60 shown" value={`${round(actualAt60)} `} sub="mph on the road" />
          <Stat label="Revs / mile" value={round(revsPerMile(diaB), 0)} sub={`stock ${round(revsPerMile(diaA), 0)}`} />
        </div>
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #F0F0F1' }}>
          <DiameterCompare oemDia={diaA} newDia={diaB} oemLabel="Stock" newLabel="New" />
        </div>
      </InfoBox>

      <p style={{ margin: '16px 0 0', font: `400 11px/1.5 ${sans}`, color: '#9A9AA0' }}>
        Keep the diameter change within ±3% to avoid speedometer error, ABS/PSM
        confusion and clearance issues.
      </p>
    </div>
  );
}
