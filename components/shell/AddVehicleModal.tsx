'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { MODEL_OPTIONS, useVehicle } from '@/lib/vehicle-context';
import { displayToMiles } from '@/lib/units';
import { track } from '@/lib/analytics';
import VehicleFields, { defaultVehicleForm, type VehicleFormState } from '@/components/onboarding/VehicleFields';

const mono = "'JetBrains Mono',monospace";

/**
 * Compact "add another vehicle" modal — the in-app path to a multi-car garage.
 * Reuses the shared VehicleFields (same form the first-run onboarding uses) in a
 * centered light card over a dark scrim, matching the app's content surfaces.
 */
export default function AddVehicleModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { addVehicle } = useVehicle();
  const [form, setForm] = useState<VehicleFormState>(() => defaultVehicleForm('cayman-987'));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!open || typeof document === 'undefined') return null;

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
      track('vehicle_added', { body: form.body });
      // Reset for next time and close (addVehicle already makes the new car active).
      setForm(defaultVehicleForm('cayman-987'));
      setSaving(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the vehicle. Try again.');
      setSaving(false);
    }
  }

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(6,6,8,.62)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '32px 20px',
        overflow: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 560,
          margin: 'auto',
          background: '#fff',
          border: '1px solid #E3E3E5',
          borderRadius: 6,
          padding: 32,
          boxShadow: '0 24px 60px rgba(0,0,0,.4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.16em', color: 'var(--red, #D5001C)', marginBottom: 8 }}>
              ADD TO GARAGE
            </div>
            <h2 style={{ margin: 0, font: "400 22px/1.2 'Helvetica Neue',Arial,sans-serif", color: '#0B0B0C' }}>
              Add another Porsche
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              font: `400 22px/1 ${mono}`,
              color: '#9A9AA0',
              padding: 4,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <VehicleFields value={form} onChange={patch} />

          <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: '0 0 auto',
                height: 46,
                padding: '0 20px',
                background: 'transparent',
                color: '#46464A',
                border: '1px solid #DDDDE0',
                borderRadius: 2,
                font: "600 12px/1 'Helvetica Neue',Arial,sans-serif",
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1,
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
              {saving ? 'Adding…' : 'Add vehicle'}
            </button>
          </div>

          {error && (
            <p style={{ font: `500 11px/1.4 ${mono}`, color: 'var(--red, #D5001C)', margin: '14px 0 0' }}>{error}</p>
          )}
        </form>
      </div>
    </div>,
    document.body,
  );
}
