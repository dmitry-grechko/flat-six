'use client';

import { useMemo, useState } from 'react';
import { useVehicle } from '@/lib/vehicle-context';
import type { WheelSetup } from '@/lib/types';
import type { FitmentPreset, WheelSpec } from '@/lib/fitment/oem';
import { willItFit, type Verdict } from '@/lib/fitment/tirefit';
import { overallDiameterMm } from '@/lib/fitment/calc';
import { NumberField, FieldGrid, InfoBox, mono, sans, num, round } from './ui';
import { RimRangeGauge, DiameterCompare, PokeDiagram } from './diagrams';

interface Disk {
  width: string;
  dia: string;
  et: string;
  tw: string;
  ta: string;
}

function fromSpec(s: WheelSpec | undefined, fallback: Disk): Disk {
  return s
    ? { width: String(s.rimWidth), dia: String(s.rimDiameter), et: String(s.offsetEt), tw: String(s.tire.width), ta: String(s.tire.aspect) }
    : fallback;
}
function toSpec(d: Disk): WheelSpec {
  return { rimWidth: num(d.width), rimDiameter: num(d.dia), offsetEt: num(d.et), tire: { width: num(d.tw), aspect: num(d.ta) } };
}

const DEF_FRONT: Disk = { width: '8', dia: '19', et: '57', tw: '235', ta: '40' };
const DEF_REAR: Disk = { width: '9.5', dia: '19', et: '45', tw: '265', ta: '40' };

const V_COLOR: Record<Verdict, string> = { fits: '#1B8A4B', caution: '#B26A00', no: '#D5001C' };
const V_LABEL: Record<Verdict, string> = { fits: 'FITS', caution: 'CAUTION', no: "WON'T FIT" };
const TONE: Record<Verdict, 'ok' | 'warn' | 'bad'> = { fits: 'ok', caution: 'warn', no: 'bad' };

function DiskFields({ label, d, set }: { label: string; d: Disk; set: (d: Disk) => void }) {
  return (
    <div>
      <div style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.1em', color: '#6E6E73', marginBottom: 8 }}>{label}</div>
      <FieldGrid min={76}>
        <NumberField label="RIM W" suffix="J" value={d.width} onChange={(width) => set({ ...d, width })} />
        <NumberField label="RIM Ø" suffix="in" value={d.dia} onChange={(dia) => set({ ...d, dia })} />
        <NumberField label="OFFSET" suffix="ET" value={d.et} onChange={(et) => set({ ...d, et })} />
        <NumberField label="TYRE W" suffix="mm" value={d.tw} onChange={(tw) => set({ ...d, tw })} />
        <NumberField label="ASPECT" suffix="%" value={d.ta} onChange={(ta) => set({ ...d, ta })} />
      </FieldGrid>
    </div>
  );
}

/** One axle row in the OEM stock reference card. */
function StockRow({ label, s, divider }: { label: string; s: WheelSpec; divider: boolean }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
        padding: '10px 14px', borderBottom: divider ? '1px solid #F0F0F1' : 'none',
      }}
    >
      <span style={{ font: `600 10px/1 ${mono}`, letterSpacing: '.08em', color: '#9A9AA0', width: 42, flexShrink: 0 }}>{label}</span>
      <span style={{ font: `500 13px/1 ${sans}`, color: '#0B0B0C' }}>{s.rimWidth}J × {s.rimDiameter}&quot;</span>
      <span style={{ font: `500 12px/1 ${mono}`, color: '#6E6E73' }}>ET{s.offsetEt}</span>
      <span style={{ font: `500 13px/1 ${sans}`, color: '#0B0B0C' }}>{s.tire.width}/{s.tire.aspect} R{s.rimDiameter}</span>
      <span style={{ marginLeft: 'auto', font: `500 11px/1 ${mono}`, color: '#9A9AA0' }}>
        Ø {round(overallDiameterMm(s.tire.width, s.tire.aspect, s.rimDiameter))} mm
      </span>
    </div>
  );
}

function Row({ status, label, text }: { status: Verdict | 'unknown'; label: string; text: string }) {
  const color = status === 'unknown' ? '#9A9AA0' : V_COLOR[status];
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', padding: '7px 0', borderBottom: '1px solid #F0F0F1' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, transform: 'translateY(1px)' }} />
      <span style={{ font: `500 10px/1.3 ${mono}`, letterSpacing: '.06em', color: '#9A9AA0', width: 82, flexShrink: 0, textTransform: 'uppercase' }}>{label}</span>
      <span style={{ font: `400 12px/1.45 ${sans}`, color: '#3A3A3E' }}>{text}</span>
    </div>
  );
}

export default function WillItFit({ preset }: { preset?: FitmentPreset }) {
  const { vehicle, update, activeId } = useVehicle();

  const [front, setFront] = useState<Disk>(() => fromSpec(vehicle.wheelSetup?.front, fromSpec(preset?.front, DEF_FRONT)));
  const [rear, setRear] = useState<Disk>(() => fromSpec(vehicle.wheelSetup?.rear, fromSpec(preset?.rear, DEF_REAR)));
  const [saved, setSaved] = useState(false);

  const [axle, setAxle] = useState<'front' | 'rear'>('rear');
  const [tw, setTw] = useState('');
  const [ta, setTa] = useState('');
  const [rd, setRd] = useState('');

  const disk = axle === 'front' ? front : rear;
  const oemSpec = axle === 'front' ? preset?.front : preset?.rear;

  // Candidate tyre + rim Ø default to the selected disk until the user overrides.
  const candTw = tw === '' ? disk.tw : tw;
  const candTa = ta === '' ? disk.ta : ta;
  const candRd = rd === '' ? disk.dia : rd;

  const report = useMemo(
    () =>
      willItFit(
        { rimWidth: num(disk.width), rimDiameter: num(candRd), offsetEt: num(disk.et), tire: { width: num(candTw), aspect: num(candTa) } },
        oemSpec ?? null,
      ),
    [disk.width, disk.et, candRd, candTw, candTa, oemSpec],
  );

  const save = () => {
    const setup: WheelSetup = { front: toSpec(front), rear: toSpec(rear) };
    update({ wheelSetup: setup });
    setSaved(true);
  };

  const resetToOem = () => {
    if (!preset) return;
    setFront(fromSpec(preset.front, DEF_FRONT));
    setRear(fromSpec(preset.rear, DEF_REAR));
    setSaved(false);
  };

  return (
    <div>
      {/* ── OEM stock (staggered front/rear) ──────────────────────── */}
      {preset && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ font: `500 11px/1 ${mono}`, letterSpacing: '.12em', color: '#6E6E73', margin: '4px 0 4px' }}>
            OEM STOCK — {preset.label}
          </div>
          <p style={{ margin: '0 0 10px', font: `400 12px/1.5 ${sans}`, color: '#9A9AA0' }}>
            Factory staggered fitment — the front and rear differ. Switch wheel size with the{' '}
            <span style={{ font: `500 11px/1 ${mono}`, color: '#6E6E73' }}>OEM preset</span> selector above.
          </p>
          <div style={{ border: '1px solid #E3E3E5', borderRadius: 4, overflow: 'hidden' }}>
            <StockRow label="FRONT" s={preset.front} divider />
            <StockRow label="REAR" s={preset.rear} divider={false} />
          </div>
        </div>
      )}

      {/* ── Your disks ────────────────────────────────────────────── */}
      <div style={{ font: `500 11px/1 ${mono}`, letterSpacing: '.12em', color: '#6E6E73', margin: '4px 0 4px' }}>YOUR DISKS</div>
      <p style={{ margin: '0 0 12px', font: `400 12px/1.5 ${sans}`, color: '#9A9AA0' }}>
        {preset ? 'Pre-filled from OEM stock — edit the front and rear independently, then save the wheels you actually run.' : 'Save the wheels you own — then check any tyre against them below.'}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
        <DiskFields label="FRONT" d={front} set={dirty2(setFront, () => setSaved(false))} />
        <DiskFields label="REAR" d={rear} set={dirty2(setRear, () => setSaved(false))} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
        <button
          type="button"
          onClick={save}
          disabled={!activeId}
          style={{ font: `500 12px/1 ${sans}`, padding: '10px 16px', borderRadius: 3, border: 'none', cursor: activeId ? 'pointer' : 'not-allowed', background: activeId ? '#0B0B0C' : '#C9C9CC', color: '#fff' }}
        >
          Save my disks
        </button>
        {preset && (
          <button
            type="button"
            onClick={resetToOem}
            style={{ font: `500 12px/1 ${sans}`, padding: '10px 16px', borderRadius: 3, border: '1px solid #D2D2D6', cursor: 'pointer', background: '#F6F6F7', color: '#46464A' }}
          >
            Reset to OEM
          </button>
        )}
        {saved && <span style={{ font: `500 12px/1 ${sans}`, color: '#1B8A4B' }}>Saved ✓</span>}
        {!activeId && <span style={{ font: `400 12px/1 ${sans}`, color: '#9A9AA0' }}>Add a car first to save.</span>}
      </div>

      {/* ── Will it fit ───────────────────────────────────────────── */}
      <div style={{ font: `500 11px/1 ${mono}`, letterSpacing: '.12em', color: '#6E6E73', margin: '26px 0 10px' }}>WILL A TYRE FIT?</div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {(['front', 'rear'] as const).map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => { setAxle(a); setTw(''); setTa(''); setRd(''); }}
            style={{
              font: `500 10px/1 ${mono}`, letterSpacing: '.08em', textTransform: 'uppercase', padding: '7px 12px', borderRadius: 3, cursor: 'pointer',
              border: '1px solid ' + (axle === a ? 'rgba(213,0,28,.4)' : '#D2D2D6'),
              background: axle === a ? 'rgba(213,0,28,.07)' : '#F6F6F7',
              color: axle === a ? '#D5001C' : '#6E6E73',
            }}
          >
            {a} disk
          </button>
        ))}
        <span style={{ font: `400 11px/1 ${sans}`, color: '#B4B4B8', alignSelf: 'center' }}>
          on your {axle} {disk.width}J ET{disk.et}
        </span>
      </div>

      <div style={{ maxWidth: 420, marginBottom: 16 }}>
        <FieldGrid min={88}>
          <NumberField label="TYRE WIDTH" suffix="mm" value={candTw} onChange={setTw} />
          <NumberField label="ASPECT" suffix="%" value={candTa} onChange={setTa} />
          <NumberField label="RIM Ø" suffix="in" value={candRd} onChange={setRd} />
        </FieldGrid>
      </div>

      {/* verdict */}
      <InfoBox tone={TONE[report.overall]}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ font: `700 12px/1 ${mono}`, letterSpacing: '.08em', color: V_COLOR[report.overall] }}>{V_LABEL[report.overall]}</span>
          <span style={{ font: `400 12px/1 ${sans}`, color: '#6E6E73' }}>
            {candTw}/{candTa}R{candRd} on {disk.width}J
          </span>
        </div>
        <Row status={report.rim.status === 'ideal' || report.rim.status === 'ok' ? 'fits' : report.rim.status === 'out' ? 'no' : report.rim.status === 'unknown' ? 'unknown' : 'caution'} label="Tyre ↔ rim" text={report.rim.message} />
        {report.diameter && <Row status={report.diameter.status} label="Diameter" text={`${report.diameter.deltaMm >= 0 ? '+' : ''}${round(report.diameter.deltaMm)} mm (${report.diameter.deltaPct >= 0 ? '+' : ''}${round(report.diameter.deltaPct, 1)}%) — ${report.diameter.message}`} />}
        {report.speedo && <Row status={report.diameter?.status ?? 'fits'} label="Speedo" text={report.speedo.message} />}
        {report.clearance && <Row status={report.clearance.status} label="Clearance" text={report.clearance.message} />}

        {/* visualizations */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginTop: 14, paddingTop: 12, borderTop: '1px solid #F0F0F1' }}>
          {report.rim.min != null && report.rim.ideal != null && report.rim.max != null && (
            <div>
              <div style={{ font: `500 9px/1 ${mono}`, letterSpacing: '.08em', color: '#9A9AA0', marginBottom: 6 }}>TYRE ON {disk.width}J RIM</div>
              <RimRangeGauge min={report.rim.min} ideal={report.rim.ideal} max={report.rim.max} value={num(disk.width)} />
            </div>
          )}
          {oemSpec && (
            <div>
              <div style={{ font: `500 9px/1 ${mono}`, letterSpacing: '.08em', color: '#9A9AA0', marginBottom: 6 }}>DIAMETER VS OEM</div>
              <DiameterCompare
                oemDia={overallDiameterMm(oemSpec.tire.width, oemSpec.tire.aspect, oemSpec.rimDiameter)}
                newDia={overallDiameterMm(num(candTw), num(candTa), num(candRd))}
              />
            </div>
          )}
          {report.clearance && (
            <div>
              <div style={{ font: `500 9px/1 ${mono}`, letterSpacing: '.08em', color: '#9A9AA0', marginBottom: 6 }}>POSITION VS OEM</div>
              <PokeDiagram outerPokeMm={report.clearance.outerPokeMm} innerMoveMm={report.clearance.innerMoveMm} />
            </div>
          )}
        </div>

        {!oemSpec && (
          <div style={{ marginTop: 8, font: `400 11px/1.4 ${sans}`, color: '#9A9AA0' }}>
            No OEM baseline for this generation — showing tyre↔rim only.
          </div>
        )}
      </InfoBox>
      <p style={{ margin: '12px 0 0', font: `400 11px/1.5 ${sans}`, color: '#9A9AA0' }}>
        Clearance is vs the OEM {axle} fitment{preset ? ` (${preset.label})` : ''}. Poke/rub also depends on
        springs, camber and fender rolling — treat this as guidance, not a guarantee.
      </p>
    </div>
  );
}

// helper to wrap a setter so any edit clears the "saved" flag
function dirty2(setter: (d: Disk) => void, onEdit: () => void) {
  return (d: Disk) => { setter(d); onEdit(); };
}
