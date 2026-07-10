'use client';

import { mono, sans } from './ui';

const RED = '#D5001C';
const INK = '#0B0B0C';
const GREY = '#9A9AA0';
const LINE = '#D2D2D6';

/** Horizontal gauge: where a rim width sits in the approved min–ideal–max range. */
export function RimRangeGauge({ min, ideal, max, value }: { min: number; ideal: number; max: number; value: number }) {
  const lo = Math.min(min, value) - 0.5;
  const hi = Math.max(max, value) + 0.5;
  const x = (v: number) => 8 + ((v - lo) / (hi - lo)) * 284;
  const inRange = value >= min && value <= max;
  return (
    <svg viewBox="0 0 300 54" width="100%" style={{ maxWidth: 320, display: 'block' }} role="img" aria-label="Rim width vs approved range">
      {/* approved band */}
      <rect x={x(min)} y={20} width={x(max) - x(min)} height={10} rx={2} fill="rgba(27,138,75,.15)" stroke="#1B8A4B" strokeOpacity={0.4} />
      {/* ideal tick */}
      <line x1={x(ideal)} y1={16} x2={x(ideal)} y2={34} stroke="#1B8A4B" strokeWidth={1.5} strokeDasharray="2 2" />
      {/* value marker */}
      <polygon points={`${x(value)},12 ${x(value) - 5},4 ${x(value) + 5},4`} fill={inRange ? INK : RED} />
      <line x1={x(value)} y1={12} x2={x(value)} y2={38} stroke={inRange ? INK : RED} strokeWidth={2} />
      {/* labels */}
      <text x={x(min)} y={48} fill={GREY} style={{ font: `500 8px ${mono}` }} textAnchor="middle">{min}J</text>
      <text x={x(max)} y={48} fill={GREY} style={{ font: `500 8px ${mono}` }} textAnchor="middle">{max}J</text>
      <text x={x(ideal)} y={48} fill="#1B8A4B" style={{ font: `500 8px ${mono}` }} textAnchor="middle">ideal {ideal}J</text>
    </svg>
  );
}

/** Two concentric tyre circles: OEM (dashed) vs new (solid), scaled to fit. */
export function DiameterCompare({ oemDia, newDia, oemLabel = 'OEM', newLabel = 'New' }: { oemDia: number; newDia: number; oemLabel?: string; newLabel?: string }) {
  const maxD = Math.max(oemDia, newDia) || 1;
  const R = 68;
  const rOem = (oemDia / maxD) * R;
  const rNew = (newDia / maxD) * R;
  const cx = 80;
  const cy = 80;
  const bigger = newDia >= oemDia;
  return (
    <svg viewBox="0 0 300 160" width="100%" style={{ maxWidth: 340, display: 'block' }} role="img" aria-label="Tyre diameter comparison">
      <circle cx={cx} cy={cy} r={rOem} fill="none" stroke={GREY} strokeWidth={1.5} strokeDasharray="4 3" />
      <circle cx={cx} cy={cy} r={rNew} fill="none" stroke={RED} strokeWidth={2} />
      <circle cx={cx} cy={cy} r={2} fill={INK} />
      {/* legend */}
      <g transform="translate(172,54)">
        <line x1={0} y1={0} x2={22} y2={0} stroke={GREY} strokeWidth={1.5} strokeDasharray="4 3" />
        <text x={28} y={3} fill={INK} style={{ font: `400 11px ${sans}` }}>{oemLabel} {Math.round(oemDia)} mm</text>
        <line x1={0} y1={20} x2={22} y2={20} stroke={RED} strokeWidth={2} />
        <text x={28} y={23} fill={INK} style={{ font: `400 11px ${sans}` }}>{newLabel} {Math.round(newDia)} mm</text>
        <text x={0} y={46} fill={bigger ? RED : GREY} style={{ font: `500 11px ${mono}` }}>
          {newDia === oemDia ? 'same Ø' : `${bigger ? '+' : ''}${Math.round(newDia - oemDia)} mm ${bigger ? 'taller' : 'shorter'}`}
        </text>
      </g>
    </svg>
  );
}

/** Top-down schematic of how a new wheel sits vs OEM: poke (outboard) & strut clearance (inboard). */
export function PokeDiagram({ outerPokeMm, innerMoveMm }: { outerPokeMm: number; innerMoveMm: number }) {
  const cx = 150;
  const scale = 1.6; // px per mm (exaggerated for legibility)
  const clamp = (v: number) => Math.max(-28, Math.min(28, v * scale));
  const outer = clamp(outerPokeMm);
  const inner = clamp(innerMoveMm);
  return (
    <svg viewBox="0 0 300 120" width="100%" style={{ maxWidth: 340, display: 'block' }} role="img" aria-label="Wheel position vs OEM">
      {/* fender line (outer) & strut line (inner) */}
      <line x1={cx + 78} y1={12} x2={cx + 78} y2={108} stroke={LINE} strokeWidth={1.5} />
      <text x={cx + 82} y={64} fill={GREY} style={{ font: `500 8px ${mono}` }}>fender</text>
      <line x1={cx - 78} y1={12} x2={cx - 78} y2={108} stroke={LINE} strokeWidth={1.5} />
      <text x={cx - 96} y={64} fill={GREY} style={{ font: `500 8px ${mono}` }}>strut</text>
      {/* OEM wheel (dashed) */}
      <rect x={cx - 40} y={38} width={80} height={44} rx={4} fill="none" stroke={GREY} strokeWidth={1.5} strokeDasharray="4 3" />
      {/* new wheel: outer edge shifts by outer, inner by -inner */}
      <rect x={cx - 40 - inner} y={34} width={80 + inner + outer} height={52} rx={4} fill="rgba(213,0,28,.06)" stroke={RED} strokeWidth={2} />
      <text x={cx} y={104} fill={INK} textAnchor="middle" style={{ font: `500 9px ${mono}` }}>
        {outerPokeMm >= 0 ? `+${outerPokeMm.toFixed(0)}` : outerPokeMm.toFixed(0)} mm poke · {innerMoveMm >= 0 ? `+${innerMoveMm.toFixed(0)}` : innerMoveMm.toFixed(0)} mm inboard
      </text>
    </svg>
  );
}

// Exaggerate small alignment angles so they read visually. Toe values (~0.0–0.3°)
// are far smaller than camber (~0.2–1.5°), so toe gets a much larger factor.
const CAMBER_EXAG = 9;
const TOE_EXAG = 45;

/** Front-view camber (wheel tilt) + top-view toe (wheel splay) for one axle. */
export function CamberToeFigure({ camberDeg, toeDeg, label }: { camberDeg: number; toeDeg: number; label: string }) {
  const camV = Math.max(-32, Math.min(32, camberDeg * CAMBER_EXAG));
  const toeV = Math.max(-32, Math.min(32, toeDeg * TOE_EXAG));
  return (
    <svg viewBox="0 0 300 150" width="100%" style={{ maxWidth: 340, display: 'block' }} role="img" aria-label={`${label} camber and toe`}>
      <text x={150} y={12} textAnchor="middle" fill={GREY} style={{ font: `500 9px ${mono}`, letterSpacing: '.1em' }}>{label.toUpperCase()} · exaggerated</text>

      {/* CAMBER — front view */}
      <g transform="translate(72,86)">
        <line x1={-40} y1={34} x2={40} y2={34} stroke={LINE} strokeWidth={1.5} />
        <line x1={0} y1={-34} x2={0} y2={34} stroke={LINE} strokeWidth={1} strokeDasharray="3 3" />
        <g transform={`rotate(${camV})`}>
          <rect x={-11} y={-32} width={22} height={64} rx={5} fill="rgba(213,0,28,.06)" stroke={RED} strokeWidth={2} />
        </g>
        <text x={0} y={52} textAnchor="middle" fill={INK} style={{ font: `500 10px ${mono}` }}>camber {camberDeg.toFixed(2)}°</text>
      </g>

      {/* TOE — top view */}
      <g transform="translate(214,86)">
        <line x1={0} y1={-36} x2={0} y2={36} stroke={LINE} strokeWidth={1} strokeDasharray="3 3" />
        <text x={0} y={-42} textAnchor="middle" fill={GREY} style={{ font: `400 8px ${mono}` }}>front</text>
        <g transform={`rotate(${-toeV})`}>
          <rect x={-7} y={-30} width={14} height={60} rx={4} fill="rgba(213,0,28,.06)" stroke={RED} strokeWidth={2} />
        </g>
        <text x={0} y={52} textAnchor="middle" fill={INK} style={{ font: `500 10px ${mono}` }}>toe {toeDeg.toFixed(2)}°</text>
      </g>
    </svg>
  );
}
