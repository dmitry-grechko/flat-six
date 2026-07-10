'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import { useVehicle } from '@/lib/vehicle-context';
import { generationForBody } from '@/lib/models';
import { presetsForGeneration, PCD, CENTER_BORE_MM, WHEEL_BOLT_TORQUE } from '@/lib/fitment/oem';
import { mono, sans } from '@/components/tools/ui';
import WillItFit from '@/components/tools/WillItFit';
import TireSizeCalc from '@/components/tools/TireSizeCalc';
import OffsetCalc from '@/components/tools/OffsetCalc';
import StaggerCalc from '@/components/tools/StaggerCalc';
import AlignmentReference from '@/components/tools/AlignmentReference';

const TABS = [
  { id: 'fit', label: 'Will It Fit' },
  { id: 'tyre', label: 'Tyre Size' },
  { id: 'offset', label: 'Offset' },
  { id: 'stagger', label: 'Stagger' },
  { id: 'align', label: 'Alignment' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function ToolsLibrary() {
  const { vehicle } = useVehicle();
  const vehicleGen = generationForBody(vehicle.body);
  const gen = vehicleGen === '987' || vehicleGen === '981' ? vehicleGen : '981';

  const presets = useMemo(() => presetsForGeneration(gen), [gen]);
  const [presetId, setPresetId] = useState<string>('');
  const preset = presets.find((p) => p.id === presetId) ?? presets[0];

  const [tab, setTab] = useState<TabId>('fit');

  const panel = () => {
    switch (tab) {
      case 'fit':
        // no key: keep disk edits while on the tab; OEM baseline updates live via prop.
        return <WillItFit preset={preset} />;
      case 'tyre':
        return <TireSizeCalc key={preset?.id ?? 'none'} preset={preset} />;
      case 'offset':
        return <OffsetCalc key={preset?.id ?? 'none'} preset={preset} />;
      case 'stagger':
        return <StaggerCalc key={preset?.id ?? 'none'} preset={preset} />;
      case 'align':
        return <AlignmentReference gen={gen} />;
      default:
        return null;
    }
  };

  const showPreset = presets.length > 0 && tab !== 'align';

  return (
    <div className="padView" style={{ padding: 28, maxWidth: 960 }}>
      <p style={{ margin: '0 0 16px', font: `400 14px/1.55 ${sans}`, color: '#6E6E73', maxWidth: 620 }}>
        Native wheel &amp; tyre tools for your{' '}
        <span style={{ font: `500 12px/1 ${mono}`, color: '#0B0B0C' }}>{vehicle.model || gen}</span> ({gen}). Our
        own calculators — no third-party service. Change the car in Settings to switch presets.
      </p>

      {/* Quick reference chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 14 }}>
        <span style={chip('red')}>{gen}</span>
        <span style={chip()}>PCD {PCD}</span>
        <span style={chip()}>Bore {CENTER_BORE_MM} mm</span>
        <span style={chip()}>Wheel bolt {WHEEL_BOLT_TORQUE[gen]}</span>
      </div>

      {/* Tabs (horizontally scrollable on mobile) */}
      <div style={{ borderBottom: '1px solid #E3E3E5', marginBottom: 18, overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 4, minWidth: 'min-content' }}>
          {TABS.map((t) => {
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                style={{
                  font: `500 13px/1 ${sans}`,
                  whiteSpace: 'nowrap',
                  padding: '11px 14px',
                  background: 'none',
                  border: 'none',
                  borderBottom: `2px solid ${on ? 'var(--red)' : 'transparent'}`,
                  color: on ? '#0B0B0C' : '#9A9AA0',
                  cursor: 'pointer',
                  marginBottom: -1,
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content — on a white card, like the Settings page */}
      <div style={{ background: '#fff', border: '1px solid #E3E3E5', borderRadius: 6, padding: '20px 20px 22px' }}>
        {/* OEM preset selector (seeds the calculators; hidden on the alignment tab) */}
        {showPreset && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
            <span style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.08em', color: '#9A9AA0', textTransform: 'uppercase' }}>
              OEM preset
            </span>
            <select
              value={preset?.id ?? ''}
              onChange={(e) => setPresetId(e.target.value)}
              style={{ height: 34, padding: '0 10px', borderRadius: 3, border: '1px solid #D2D2D6', background: '#F6F6F7', font: `400 13px ${sans}`, color: '#0B0B0C', maxWidth: '100%' }}
            >
              {presets.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </label>
        )}

        {panel()}
      </div>
    </div>
  );
}

function chip(tone?: 'red'): CSSProperties {
  if (tone === 'red') {
    return {
      font: `600 10px/1 ${mono}`,
      letterSpacing: '.1em',
      color: 'var(--red, #D5001C)',
      background: 'rgba(213,0,28,.08)',
      padding: '6px 9px',
      borderRadius: 2,
    };
  }
  return {
    font: `500 10px/1 ${mono}`,
    letterSpacing: '.06em',
    color: '#6E6E73',
    background: '#F0F0F1',
    padding: '6px 9px',
    borderRadius: 2,
  };
}
