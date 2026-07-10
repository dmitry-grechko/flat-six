'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { COLORS, enginesFor, transmissionsFor, defaultEngine, defaultTransmission } from '@/lib/data';
import { useVehicle, MODEL_OPTIONS } from '@/lib/vehicle-context';
import { generationForBody } from '@/lib/models';
import { createClient } from '@/lib/supabase/client';
import { DEMO_MODE, DEMO_EMAIL } from '@/lib/demo';

export default function Settings() {
  const router = useRouter();
  const { vehicle, update, reset } = useVehicle();
  const [email, setEmail] = useState<string>('');

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

  return (
    <div className="padView" style={{ padding: 28, maxWidth: 880 }}>
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
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ font: "500 10px/1 'JetBrains Mono',monospace", letterSpacing: '.16em', color: '#9A9AA0' }}>VEHICLE</div>
          <button
            onClick={reset}
            style={{ marginLeft: 'auto', font: "500 10px/1 'JetBrains Mono',monospace", letterSpacing: '.08em', color: '#9A9AA0', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            RELOAD FROM SERVER
          </button>
        </div>

        <label style={fieldLabel}>Model (rendered in 3D)</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {MODEL_OPTIONS.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                const g = generationForBody(m.id);
                const patch: Partial<typeof vehicle> = { body: m.id, model: m.modelName };
                if (!enginesFor(g).includes(vehicle.engine)) patch.engine = defaultEngine(g);
                if (!transmissionsFor(g).includes(vehicle.trans)) patch.trans = defaultTransmission(g);
                update(patch);
              }}
              style={chip(vehicle.body === m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="stackSm" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div>
            <label style={fieldLabel}>Model name</label>
            <input value={vehicle.model} onChange={(e) => update({ model: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={fieldLabel}>Model year</label>
            <input value={vehicle.year} onChange={(e) => update({ year: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={fieldLabel}>Licence plate</label>
            <input value={vehicle.plate} onChange={(e) => update({ plate: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ gridColumn: '1 / 3' }}>
            <label style={fieldLabel}>Chassis VIN</label>
            <input value={vehicle.vin} onChange={(e) => update({ vin: e.target.value })} style={{ ...inputStyle, font: "500 14px 'JetBrains Mono',monospace", letterSpacing: '.04em' }} />
          </div>
          <div>
            <label style={fieldLabel}>Odometer (mi)</label>
            <input value={vehicle.mileage} onChange={(e) => update({ mileage: e.target.value.replace(/[^0-9]/g, '') })} style={{ ...inputStyle, fontFamily: "'JetBrains Mono',monospace" }} />
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
          {COLORS.map((c) => (
            <button
              key={c.hex}
              title={c.name}
              onClick={() => update({ colorName: c.name, colorHex: c.hex })}
              style={{
                width: 30, height: 30, borderRadius: 4, cursor: 'pointer', padding: 0, background: c.hex,
                border: vehicle.colorHex === c.hex ? '2px solid var(--red, #D5001C)' : '1px solid #D2D2D6',
                boxShadow: vehicle.colorHex === c.hex ? '0 0 0 3px rgba(213,0,28,.15)' : 'none',
              }}
            />
          ))}
        </div>
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
