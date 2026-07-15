'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { colorsFor, enginesFor, transmissionsFor, defaultEngine, defaultTransmission } from '@/lib/data';
import { useVehicle } from '@/lib/vehicle-context';
import { useIsAdmin } from '@/lib/useIsAdmin';
import ModelPicker from '@/components/shell/ModelPicker';
import {
  generationForBody, getVariant, generationForYear, generationYears, generationCode,
  variantMake, variantNameplate,
} from '@/lib/models';
import { createClient } from '@/lib/supabase/client';
import { DEMO_MODE, DEMO_EMAIL } from '@/lib/demo';
import { useUnits, milesToDisplay, displayToMiles, useAccountUnits } from '@/lib/units';
import { track } from '@/lib/analytics';

export default function Settings() {
  const router = useRouter();
  const { vehicle, update, reset } = useVehicle();
  const { units, setUnits } = useUnits();
  const { torque, pressure, setTorque, setPressure } = useAccountUnits();
  const isAdmin = useIsAdmin();
  const [email, setEmail] = useState<string>('');

  // Flag a model-year that doesn't fit the selected generation (e.g. a 2005 car
  // left on the 981, which never offered the 5-speed manual it actually had).
  const settingsVariant = getVariant(vehicle.body);
  const settingsGen = generationForBody(vehicle.body);
  const suggestedGen =
    String(vehicle.year).trim().length === 4
      ? generationForYear(variantMake(settingsVariant), variantNameplate(settingsVariant), parseInt(String(vehicle.year), 10))
      : null;
  const yearGenMismatch = !!suggestedGen && suggestedGen !== settingsGen;

  // Odometer input buffer: show the stored miles converted to the active unit,
  // but hold the user's raw keystrokes while editing and commit (→ miles) on blur.
  const [odoEdit, setOdoEdit] = useState<string | null>(null);
  const odoDisplay = odoEdit ?? (vehicle.mileage ? String(milesToDisplay(vehicle.mileage, units)) : '');
  const commitOdo = () => {
    if (odoEdit === null) return;
    update({ mileage: odoEdit ? String(displayToMiles(odoEdit, units)) : '' });
    setOdoEdit(null);
  };

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    if (DEMO_MODE) { setEmail(DEMO_EMAIL); return; }
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''));
  }, []);

  async function deleteAccount() {
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || body.error || `Request failed (${res.status})`);
      }
      router.push('/');
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Could not delete account.');
      setDeleting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 44, padding: '0 12px', background: '#F6F6F7', border: '1px solid #D2D2D6',
    borderRadius: 2, font: "400 14px 'Helvetica Neue',Arial,sans-serif", color: '#0B0B0C',
  };
  const fieldLabel: React.CSSProperties = {
    display: 'block', font: "500 11px/1 'JetBrains Mono',monospace", letterSpacing: '.1em',
    textTransform: 'uppercase', color: '#6E6E73', margin: '0 0 8px',
  };
  const chip = (active: boolean): React.CSSProperties => ({
    padding: '9px 13px', borderRadius: 2, cursor: 'pointer', font: "500 12px/1 'Helvetica Neue',Arial,sans-serif",
    background: active ? 'var(--red, #D5001C)' : '#F6F6F7', color: active ? '#fff' : '#46464A',
    border: `1px solid ${active ? 'var(--red, #D5001C)' : '#DDDDE0'}`,
  });
  const monoLabel: React.CSSProperties = {
    font: "500 10px/1 'JetBrains Mono',monospace",
    letterSpacing: '.08em',
    textTransform: 'uppercase',
    color: '#9A9AA0',
  };
  const sectionHeading: React.CSSProperties = {
    font: "600 12px/1 'JetBrains Mono',monospace", letterSpacing: '.16em', textTransform: 'uppercase',
    color: '#0B0B0C', margin: '2px 2px 12px',
  };
  const subLabel: React.CSSProperties = {
    font: "500 10px/1 'JetBrains Mono',monospace", letterSpacing: '.16em', textTransform: 'uppercase',
    color: '#9A9AA0', margin: '0 0 14px',
  };

  return (
    <div className="padView" style={{ padding: 28, maxWidth: 880 }}>
      <div style={sectionHeading}>Account settings</div>
      <div style={{ background: '#fff', border: '1px solid #E3E3E5', borderRadius: 4, padding: 24, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ font: "500 10px/1 'JetBrains Mono',monospace", letterSpacing: '.16em', color: '#9A9AA0' }}>ACCOUNT</div>
          <form action="/auth/signout" method="post" style={{ marginLeft: 'auto' }}>
            <button
              type="submit"
              style={{ font: "500 10px/1 'JetBrains Mono',monospace", letterSpacing: '.08em', color: 'var(--red, #D5001C)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              SIGN OUT
            </button>
          </form>
        </div>
        <div>
          <div style={monoLabel}>Email</div>
          <div style={{ marginTop: 7, font: "400 15px 'Helvetica Neue',Arial,sans-serif", color: '#0B0B0C' }}>{email || '—'}</div>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E3E3E5', borderRadius: 4, padding: 24, marginBottom: 18 }}>
        <div style={{ font: "500 10px/1 'JetBrains Mono',monospace", letterSpacing: '.16em', color: '#9A9AA0', marginBottom: 18 }}>
          UNITS OF MEASUREMENT
        </div>
        <label style={fieldLabel}>Torque</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
          {(['Nm', 'ft-lb'] as const).map((u) => (
            <button key={u} onClick={() => { setTorque(u); track('units_changed', { torque: u }); }} style={chip(torque === u)}>
              {u === 'Nm' ? 'Newton-metres (Nm)' : 'Foot-pounds (ft·lb)'}
            </button>
          ))}
        </div>
        <label style={fieldLabel}>Air / tyre pressure</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {(['bar', 'psi'] as const).map((u) => (
            <button key={u} onClick={() => { setPressure(u); track('units_changed', { pressure: u }); }} style={chip(pressure === u)}>
              {u === 'bar' ? 'Bar' : 'Pounds / in² (psi)'}
            </button>
          ))}
        </div>
        <p style={{ margin: '10px 0 0', font: "400 12px/1.5 'Helvetica Neue',Arial,sans-serif", color: '#9A9AA0' }}>
          Applies to torque specs and tyre-pressure figures across the app. Saved for your account on this device.
        </p>
      </div>

      <div style={sectionHeading}>Vehicle settings</div>

      <div style={{ background: '#fff', border: '1px solid #E3E3E5', borderRadius: 4, padding: 24, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ font: "500 10px/1 'JetBrains Mono',monospace", letterSpacing: '.16em', color: '#9A9AA0' }}>VEHICLE</div>
          <button
            onClick={reset}
            style={{ marginLeft: 'auto', font: "500 10px/1 'JetBrains Mono',monospace", letterSpacing: '.08em', color: '#9A9AA0', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            RELOAD FROM SERVER
          </button>
        </div>

        <div style={subLabel}>Model</div>
        <div style={{ marginBottom: 22 }}>
          <ModelPicker
            value={vehicle.body}
            isAdmin={isAdmin}
            onSelect={(id) => {
              // A variant with a signature powertrain (e.g. GT4 = 3.8 / manual)
              // snaps to it; otherwise keep a still-valid selection, else default.
              // model follows the variant name — the picker owns it, so there's no
              // free-text field to drift out of sync.
              const target = getVariant(id);
              const g = target.generation;
              const patch: Partial<typeof vehicle> = { body: id, model: target.modelName };
              if (target.defaultEngine) patch.engine = target.defaultEngine;
              else if (!enginesFor(g).includes(vehicle.engine)) patch.engine = defaultEngine(g);
              if (target.defaultTransmission) patch.trans = target.defaultTransmission;
              else if (!transmissionsFor(g).includes(vehicle.trans)) patch.trans = defaultTransmission(g);
              update(patch);
            }}
          />
        </div>

        {yearGenMismatch && suggestedGen && (
          <div
            style={{
              display: 'flex', gap: 8, alignItems: 'flex-start', margin: '0 0 20px',
              padding: '10px 12px', background: '#fff', border: '1px solid #E8CE8E', borderRadius: 4,
              font: "500 12px/1.45 'Helvetica Neue',Arial,sans-serif", color: '#8A6D1E',
            }}
          >
            <span aria-hidden style={{ lineHeight: 1.2 }}>⚠</span>
            <span>
              A {vehicle.year} {variantNameplate(settingsVariant)} is the{' '}
              <strong>{generationCode(suggestedGen)} ({generationYears(suggestedGen)})</strong>, but this car is
              set to the {generationCode(settingsGen)} ({generationYears(settingsGen)}). Pick the{' '}
              {generationCode(suggestedGen)} above so the correct engines and gearboxes appear.
            </span>
          </div>
        )}

        <div style={{ height: 1, background: '#EDEDEF', margin: '0 0 20px' }} />
        <div style={subLabel}>This car</div>

        <div className="carFieldsGrid" style={{ marginBottom: 20 }}>
          <div>
            <label style={fieldLabel}>Model year</label>
            <input value={vehicle.year} onChange={(e) => update({ year: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={fieldLabel}>Licence plate</label>
            <input value={vehicle.plate} onChange={(e) => update({ plate: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={fieldLabel}>Odometer ({units})</label>
            <input
              value={odoDisplay}
              onChange={(e) => setOdoEdit(e.target.value.replace(/[^0-9]/g, ''))}
              onBlur={commitOdo}
              style={{ ...inputStyle, fontFamily: "'JetBrains Mono',monospace" }}
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={fieldLabel}>Chassis VIN</label>
            <input value={vehicle.vin} onChange={(e) => update({ vin: e.target.value })} style={{ ...inputStyle, font: "500 14px 'JetBrains Mono',monospace", letterSpacing: '.04em' }} />
          </div>
        </div>

        <label style={fieldLabel}>Engine</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {enginesFor(generationForBody(vehicle.body)).map((e) => (
            <button key={e} onClick={() => update({ engine: e })} style={chip(vehicle.engine === e)}>{e}</button>
          ))}
        </div>

        <label style={fieldLabel}>Transmission</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {transmissionsFor(generationForBody(vehicle.body)).map((t) => (
            <button key={t} onClick={() => update({ trans: t })} style={chip(vehicle.trans === t)}>{t}</button>
          ))}
        </div>

        <label style={fieldLabel}>Paint — {vehicle.colorName}</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 4, marginBottom: 22 }}>
          {colorsFor(generationForBody(vehicle.body)).map((c) => (
            <span key={c.hex} className="colorSwatch">
              <button
                aria-label={c.name}
                onClick={() => update({ colorName: c.name, colorHex: c.hex })}
                style={{
                  width: 30, height: 30, borderRadius: 4, cursor: 'pointer', padding: 0, background: c.hex,
                  border: vehicle.colorHex === c.hex ? '2px solid var(--red, #D5001C)' : '1px solid #D2D2D6',
                  boxShadow: vehicle.colorHex === c.hex ? '0 0 0 3px rgba(213,0,28,.15)' : 'none',
                }}
              />
              <span className="colorSwatchTip">{c.name}</span>
            </span>
          ))}
        </div>

        <label style={fieldLabel}>Distance units (this car)</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {(['mi', 'km'] as const).map((u) => (
            <button key={u} onClick={() => { setUnits(u); track('units_changed', { unit: u }); }} style={chip(units === u)}>
              {u === 'mi' ? 'Miles (mi)' : 'Kilometres (km)'}
            </button>
          ))}
        </div>
        <p style={{ margin: '10px 0 0', font: "400 12px/1.5 'Helvetica Neue',Arial,sans-serif", color: '#9A9AA0' }}>
          Odometer, service history and maintenance plans for this car. Stored per vehicle — switching cars switches units.
        </p>
      </div>

      <div style={{ background: '#fff', border: '1px solid #F0CDD2', borderRadius: 4, padding: 24 }}>
        <div style={{ font: "500 10px/1 'JetBrains Mono',monospace", letterSpacing: '.16em', color: 'var(--red, #D5001C)', marginBottom: 6 }}>
          DANGER ZONE
        </div>
        <p style={{ margin: '0 0 16px', font: "400 13px/1.55 'Helvetica Neue',Arial,sans-serif", color: '#6E6E73', maxWidth: 560 }}>
          Permanently delete your account and everything tied to it — every vehicle, service record and plan. This cannot be undone.
        </p>

        {DEMO_MODE ? (
          <div style={{ font: "400 12px/1.5 'Helvetica Neue',Arial,sans-serif", color: '#9A9AA0' }}>
            Account deletion is disabled in demo mode.
          </div>
        ) : !confirmDelete ? (
          <button
            onClick={() => { setConfirmDelete(true); setDeleteError(''); }}
            style={{
              height: 40, padding: '0 18px', borderRadius: 2, cursor: 'pointer',
              background: 'transparent', color: 'var(--red, #D5001C)', border: '1px solid var(--red, #D5001C)',
              font: "600 11px/1 'Helvetica Neue',Arial,sans-serif", letterSpacing: '.08em', textTransform: 'uppercase',
            }}
          >
            Delete account
          </button>
        ) : (
          <div>
            <div style={{ font: "400 13px/1.5 'Helvetica Neue',Arial,sans-serif", color: '#0B0B0C', marginBottom: 12 }}>
              Delete <strong>{email || 'your account'}</strong> and all its data? This is permanent.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={deleteAccount}
                disabled={deleting}
                style={{
                  height: 40, padding: '0 18px', border: 'none', borderRadius: 2, cursor: deleting ? 'default' : 'pointer',
                  background: 'var(--red, #D5001C)', color: '#fff', opacity: deleting ? 0.6 : 1,
                  font: "600 11px/1 'Helvetica Neue',Arial,sans-serif", letterSpacing: '.08em', textTransform: 'uppercase',
                }}
              >
                {deleting ? 'Deleting…' : 'Yes, delete everything'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                style={{
                  height: 40, padding: '0 18px', borderRadius: 2, cursor: deleting ? 'default' : 'pointer',
                  background: 'transparent', color: '#6E6E73', border: '1px solid #D2D2D6',
                  font: "600 11px/1 'Helvetica Neue',Arial,sans-serif", letterSpacing: '.08em', textTransform: 'uppercase',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {deleteError && (
          <div style={{ marginTop: 12, font: "400 12px/1.5 'Helvetica Neue',Arial,sans-serif", color: 'var(--red, #D5001C)' }}>
            {deleteError}
          </div>
        )}
      </div>
    </div>
  );
}
