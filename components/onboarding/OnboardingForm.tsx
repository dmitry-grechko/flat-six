'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MODEL_OPTIONS, useVehicle } from '@/lib/vehicle-context';
import { displayToMiles } from '@/lib/units';
import VehicleFields, { defaultVehicleForm, type VehicleFormState } from './VehicleFields';

const mono = "'JetBrains Mono',monospace";

export default function OnboardingForm() {
  const router = useRouter();
  const { addVehicle } = useVehicle();

  const [form, setForm] = useState<VehicleFormState>(() => defaultVehicleForm('boxster'));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const patch = (p: Partial<VehicleFormState>) => setForm((f) => ({ ...f, ...p }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.year.trim() || !form.mileage.trim()) {
      setError('Model year and odometer are required.');
      return;
    }

    const selectedModel = MODEL_OPTIONS.find((m) => m.id === form.body) ?? MODEL_OPTIONS[0];
    setSaving(true);
    setError('');
    try {
      await addVehicle({
        body: form.body,
        model: selectedModel.modelName,
        year: form.year.trim(),
        mileage: String(displayToMiles(form.mileage, form.distanceUnit)),
        distanceUnit: form.distanceUnit,
        vin: form.vin.trim(),
        plate: form.plate.trim(),
        engine: form.engine,
        trans: form.trans,
        colorName: form.colorName,
        colorHex: form.colorHex,
      });
      router.replace('/garage');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your car. Try again.');
      setSaving(false);
    }
  }

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
          <VehicleFields value={form} onChange={patch} />

          <button
            type="submit"
            disabled={saving}
            style={{
              width: '100%',
              height: 46,
              marginTop: 28,
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
