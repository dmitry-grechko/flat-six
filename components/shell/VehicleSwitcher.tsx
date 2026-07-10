'use client';

import { useState } from 'react';
import { useVehicle } from '@/lib/vehicle-context';

const mono = "'JetBrains Mono',monospace";

/**
 * The garage's vehicle list, rendered inside the dark sidebar card when it's
 * expanded. Pick a car to switch (`select`), delete a car (with inline
 * confirm), or open the add-vehicle modal. Dark-palette to match the sidebar.
 */
export default function VehicleSwitcher({
  onAdd,
  onPicked,
}: {
  onAdd: () => void;
  onPicked: () => void;
}) {
  const { vehicles, activeId, select, remove } = useVehicle();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <div style={{ marginTop: 10, borderTop: '1px solid #1F1F22', paddingTop: 10 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {vehicles.map((v) => {
          const on = v.id === activeId;
          const confirming = confirmId === v.id;
          return (
            <div
              key={v.id}
              className="vehrow"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 9px',
                borderRadius: 4,
                background: on ? 'rgba(255,255,255,.06)' : 'transparent',
                border: `1px solid ${on ? 'rgba(255,255,255,.14)' : 'transparent'}`,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  if (!on) select(v.id);
                  onPicked();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  flex: 1,
                  minWidth: 0,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 3,
                    background: v.colorHex || '#2A2A2E',
                    border: '1px solid rgba(255,255,255,.18)',
                    flexShrink: 0,
                  }}
                />
                <span style={{ minWidth: 0 }}>
                  <span
                    style={{
                      display: 'block',
                      font: "500 12px/1.2 'Helvetica Neue',Arial,sans-serif",
                      color: on ? '#fff' : '#C9C9CE',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {v.model || 'Untitled car'}
                  </span>
                  <span style={{ display: 'block', font: `500 9px/1.3 ${mono}`, letterSpacing: '.08em', color: '#76767B', marginTop: 2 }}>
                    {[v.year, v.plate].filter(Boolean).join(' · ') || '—'}
                  </span>
                </span>
                <span
                  style={{
                    marginLeft: 'auto',
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: on ? 'var(--red, #D5001C)' : 'transparent',
                    flexShrink: 0,
                  }}
                />
              </button>

              {vehicles.length > 1 &&
                (confirming ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => {
                        remove(v.id);
                        setConfirmId(null);
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', font: `600 9px/1 ${mono}`, letterSpacing: '.08em', color: 'var(--red, #D5001C)', padding: 2 }}
                    >
                      YES
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', font: `600 9px/1 ${mono}`, letterSpacing: '.08em', color: '#76767B', padding: 2 }}
                    >
                      NO
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    aria-label={`Remove ${v.model || 'vehicle'}`}
                    onClick={() => setConfirmId(v.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', font: `400 15px/1 ${mono}`, color: '#5C5C61', padding: '0 2px', flexShrink: 0 }}
                  >
                    ×
                  </button>
                ))}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onAdd}
        className="vehrow"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          marginTop: 6,
          padding: '9px 9px',
          borderRadius: 4,
          background: 'transparent',
          border: '1px dashed #33333A',
          cursor: 'pointer',
          font: `600 10px/1 ${mono}`,
          letterSpacing: '.12em',
          color: '#9A9AA0',
        }}
      >
        <span style={{ font: `400 14px/1 ${mono}`, color: 'var(--red, #D5001C)' }}>+</span> ADD VEHICLE
      </button>
    </div>
  );
}
