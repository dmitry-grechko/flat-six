'use client';

import { colorsFor, enginesFor, transmissionsFor, defaultEngine, defaultTransmission } from '@/lib/data';
import { visibleModelOptions } from '@/lib/vehicle-context';
import { useIsAdmin } from '@/lib/useIsAdmin';
import { generationForBody, getVariant } from '@/lib/models';
import type { BodyType } from '@/lib/types';

const mono = "'JetBrains Mono',monospace";

/** Editable shape backing the onboarding form + the in-app "add vehicle" modal. */
export interface VehicleFormState {
  body: BodyType;
  year: string;
  mileage: string;
  distanceUnit: 'mi' | 'km';
  vin: string;
  plate: string;
  engine: string;
  trans: string;
  colorName: string;
  colorHex: string;
}

/** Sensible starting point shared by both entry points. */
export function defaultVehicleForm(body: BodyType = 'boxster'): VehicleFormState {
  const variant = getVariant(body);
  const gen = variant.generation;
  return {
    body,
    year: '',
    mileage: '',
    distanceUnit: 'mi',
    vin: '',
    plate: '',
    engine: variant.defaultEngine ?? defaultEngine(gen),
    trans: variant.defaultTransmission ?? defaultTransmission(gen),
    colorName: 'GT SILVER',
    colorHex: '#C6C8CA',
  };
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 44,
  padding: '0 12px',
  background: '#F6F6F7',
  border: '1px solid #D2D2D6',
  borderRadius: 2,
  font: "400 14px 'Helvetica Neue',Arial,sans-serif",
  color: '#0B0B0C',
};

const fieldLabel: React.CSSProperties = {
  display: 'block',
  font: `500 11px/1 ${mono}`,
  letterSpacing: '.1em',
  textTransform: 'uppercase',
  color: '#6E6E73',
  margin: '0 0 8px',
};

const chip = (active: boolean): React.CSSProperties => ({
  padding: '9px 13px',
  borderRadius: 2,
  cursor: 'pointer',
  font: "500 12px/1 'Helvetica Neue',Arial,sans-serif",
  background: active ? 'var(--red, #D5001C)' : '#F6F6F7',
  color: active ? '#fff' : '#46464A',
  border: `1px solid ${active ? 'var(--red, #D5001C)' : '#DDDDE0'}`,
});

/**
 * The full vehicle detail form (model, year, odometer, VIN, plate, engine,
 * transmission, paint) — controlled via `value`/`onChange`. Shared by the
 * first-run onboarding page and the "add another vehicle" modal so they never
 * drift apart. Submit UI lives in the parent.
 */
export default function VehicleFields({
  value,
  onChange,
}: {
  value: VehicleFormState;
  onChange: (patch: Partial<VehicleFormState>) => void;
}) {
  const isAdmin = useIsAdmin();
  const gen = generationForBody(value.body);
  const engines = enginesFor(gen);
  const transmissions = transmissionsFor(gen);

  return (
    <>
      <label style={fieldLabel}>Model</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {visibleModelOptions(isAdmin).map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              // Switching model may change the valid engine/transmission sets.
              // A variant with a signature powertrain (e.g. GT4 = 3.8 / manual)
              // snaps to it; otherwise keep the current selection when it's still
              // valid for the new generation, else fall back to its default.
              const target = getVariant(m.id);
              const g = target.generation;
              const patch: Partial<VehicleFormState> = { body: m.id };
              if (target.defaultEngine) patch.engine = target.defaultEngine;
              else if (!enginesFor(g).includes(value.engine)) patch.engine = defaultEngine(g);
              if (target.defaultTransmission) patch.trans = target.defaultTransmission;
              else if (!transmissionsFor(g).includes(value.trans)) patch.trans = defaultTransmission(g);
              onChange(patch);
            }}
            style={chip(value.body === m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div>
          <label style={fieldLabel}>Model year</label>
          <input
            required
            value={value.year}
            onChange={(e) => onChange({ year: e.target.value })}
            placeholder="e.g. 2014"
            style={inputStyle}
          />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
            <label style={fieldLabel}>Odometer ({value.distanceUnit})</label>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['mi', 'km'] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => onChange({ distanceUnit: u })}
                  style={{
                    font: "500 10px/1 'JetBrains Mono',monospace",
                    letterSpacing: '.06em',
                    textTransform: 'uppercase',
                    padding: '4px 7px',
                    borderRadius: 2,
                    cursor: 'pointer',
                    background: value.distanceUnit === u ? 'var(--red, #D5001C)' : '#F6F6F7',
                    color: value.distanceUnit === u ? '#fff' : '#6E6E73',
                    border: `1px solid ${value.distanceUnit === u ? 'var(--red, #D5001C)' : '#DDDDE0'}`,
                  }}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
          <input
            required
            value={value.mileage}
            onChange={(e) => onChange({ mileage: e.target.value.replace(/[^0-9]/g, '') })}
            placeholder={value.distanceUnit === 'km' ? 'e.g. 68000' : 'e.g. 42000'}
            style={{ ...inputStyle, fontFamily: mono }}
          />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={fieldLabel}>VIN (optional)</label>
          <input
            value={value.vin}
            onChange={(e) => onChange({ vin: e.target.value.toUpperCase() })}
            placeholder="WP0…"
            style={{ ...inputStyle, fontFamily: mono, letterSpacing: '.04em' }}
          />
        </div>
        <div>
          <label style={fieldLabel}>Licence plate (optional)</label>
          <input value={value.plate} onChange={(e) => onChange({ plate: e.target.value })} style={inputStyle} />
        </div>
      </div>

      <label style={fieldLabel}>Engine</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {engines.map((e) => (
          <button key={e} type="button" onClick={() => onChange({ engine: e })} style={chip(value.engine === e)}>
            {e}
          </button>
        ))}
      </div>

      <label style={fieldLabel}>Transmission</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {transmissions.map((t) => (
          <button key={t} type="button" onClick={() => onChange({ trans: t })} style={chip(value.trans === t)}>
            {t}
          </button>
        ))}
      </div>

      <label style={fieldLabel}>Paint — {value.colorName}</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {colorsFor(gen).map((c) => (
          <span key={c.hex} className="colorSwatch">
            <button
              type="button"
              aria-label={c.name}
              onClick={() => onChange({ colorName: c.name, colorHex: c.hex })}
              style={{
                width: 30,
                height: 30,
                borderRadius: 4,
                cursor: 'pointer',
                padding: 0,
                background: c.hex,
                border: value.colorHex === c.hex ? '2px solid var(--red, #D5001C)' : '1px solid #D2D2D6',
                boxShadow: value.colorHex === c.hex ? '0 0 0 3px rgba(213,0,28,.15)' : 'none',
              }}
            />
            <span className="colorSwatchTip">{c.name}</span>
          </span>
        ))}
      </div>
    </>
  );
}
