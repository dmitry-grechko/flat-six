'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { COLORS, ENGINES, TRANS } from '@/lib/data';
import { useVehicle, MODEL_OPTIONS } from '@/lib/vehicle-context';
import type { BodyType } from '@/lib/types';

const mono = "'JetBrains Mono',monospace";

export default function OnboardingForm() {
  const router = useRouter();
  const { addVehicle } = useVehicle();

  const [body, setBody] = useState<BodyType>('boxster');
  const [year, setYear] = useState('');
  const [mileage, setMileage] = useState('');
  const [vin, setVin] = useState('');
  const [plate, setPlate] = useState('');
  const [engine, setEngine] = useState('3.4 L Flat-Six (S)');
  const [trans, setTrans] = useState('7-Speed PDK');
  const [colorName, setColorName] = useState('GT SILVER');
  const [colorHex, setColorHex] = useState('#C6C8CA');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedModel = MODEL_OPTIONS.find((m) => m.id === body) ?? MODEL_OPTIONS[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!year.trim() || !mileage.trim()) {
      setError('Model year and odometer are required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await addVehicle({
        body,
        model: selectedModel.modelName,
        year: year.trim(),
        mileage: mileage.replace(/[^0-9]/g, ''),
        vin: vin.trim(),
        plate: plate.trim(),
        engine,
        trans,
        colorName,
        colorHex,
      });
      router.replace('/garage');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your car. Try again.');
      setSaving(false);
    }
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

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#ECECEE',
        padding: '32px 24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 560,
          background: '#fff',
          border: '1px solid #E3E3E5',
          borderRadius: 4,
          padding: 32,
        }}
      >
        <div style={{ font: `700 18px/1 ${mono}`, letterSpacing: '.18em', color: '#0B0B0C', marginBottom: 4 }}>
          FLAT·SIX
        </div>
        <div style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.16em', color: 'var(--red, #D5001C)', marginBottom: 20 }}>
          SET UP YOUR GARAGE
        </div>

        <h1 style={{ margin: '0 0 8px', font: "400 22px/1.2 'Helvetica Neue',Arial,sans-serif", color: '#0B0B0C' }}>
          Add your Porsche
        </h1>
        <p style={{ margin: '0 0 24px', font: "400 14px/1.55 'Helvetica Neue',Arial,sans-serif", color: '#6E6E73' }}>
          This is your private garage — tell us which car you drive so service history, specs, and the 3D explorer
          match your build. You can change everything later in Settings.
        </p>

        <form onSubmit={handleSubmit}>
          <label style={fieldLabel}>Model</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {MODEL_OPTIONS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setBody(m.id);
                  setEngine(m.id === 'cayman-987' ? '2.7 L Flat-Six' : '3.4 L Flat-Six (S)');
                }}
                style={chip(body === m.id)}
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
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="e.g. 2014"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={fieldLabel}>Odometer (mi)</label>
              <input
                required
                value={mileage}
                onChange={(e) => setMileage(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="e.g. 42000"
                style={{ ...inputStyle, fontFamily: mono }}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={fieldLabel}>VIN (optional)</label>
              <input
                value={vin}
                onChange={(e) => setVin(e.target.value.toUpperCase())}
                placeholder="WP0…"
                style={{ ...inputStyle, fontFamily: mono, letterSpacing: '.04em' }}
              />
            </div>
            <div>
              <label style={fieldLabel}>Licence plate (optional)</label>
              <input value={plate} onChange={(e) => setPlate(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <label style={fieldLabel}>Engine</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {ENGINES.map((e) => (
              <button key={e} type="button" onClick={() => setEngine(e)} style={chip(engine === e)}>
                {e}
              </button>
            ))}
          </div>

          <label style={fieldLabel}>Transmission</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {TRANS.map((t) => (
              <button key={t} type="button" onClick={() => setTrans(t)} style={chip(trans === t)}>
                {t}
              </button>
            ))}
          </div>

          <label style={fieldLabel}>Paint — {colorName}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
            {COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                title={c.name}
                onClick={() => {
                  setColorName(c.name);
                  setColorHex(c.hex);
                }}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 4,
                  cursor: 'pointer',
                  padding: 0,
                  background: c.hex,
                  border: colorHex === c.hex ? '2px solid var(--red, #D5001C)' : '1px solid #D2D2D6',
                  boxShadow: colorHex === c.hex ? '0 0 0 3px rgba(213,0,28,.15)' : 'none',
                }}
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              width: '100%',
              height: 46,
              background: 'var(--red, #D5001C)',
              color: '#fff',
              border: 'none',
              borderRadius: 2,
              font: "600 12px/1 'Helvetica Neue',Arial,sans-serif",
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Open my garage'}
          </button>

          {error && (
            <p style={{ font: `500 11px/1.4 ${mono}`, color: 'var(--red, #D5001C)', margin: '14px 0 0' }}>
              {error}
            </p>
          )}
        </form>

        <form action="/auth/signout" method="post" style={{ marginTop: 20, textAlign: 'center' }}>
          <button
            type="submit"
            style={{
              background: 'none',
              border: 'none',
              color: '#9A9AA0',
              font: `500 11px/1 ${mono}`,
              letterSpacing: '.08em',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
