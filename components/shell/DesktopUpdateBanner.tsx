'use client';

import type { CSSProperties } from 'react';
import { useDesktopUpdate } from '@/lib/electron/updateClient';

const mono = "'JetBrains Mono',monospace";
const sans = "'Helvetica Neue',Arial,sans-serif";

const btn: CSSProperties = {
  height: 30,
  padding: '0 12px',
  borderRadius: 2,
  font: `600 10px/1 ${sans}`,
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  border: '1px solid #E3E3E5',
  background: '#fff',
  color: '#0B0B0C',
};

/** Shown in Electron when a GitHub Release update is available or ready to install. */
export function DesktopUpdateBanner() {
  const { status, visible, version, skipVersion, install } = useDesktopUpdate();
  if (!visible || !version) return null;

  const downloading = status.phase === 'downloading';
  const ready = status.phase === 'ready';

  return (
    <div
      style={{
        background: '#fff',
        borderBottom: '1px solid rgba(213,0,28,.35)',
        padding: '10px 28px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ font: `600 9px/1 ${mono}`, letterSpacing: '.12em', color: '#D5001C' }}>
        UPDATE
      </div>
      <p style={{ margin: 0, flex: 1, minWidth: 200, font: `400 13px/1.4 ${sans}`, color: '#3A3A3E' }}>
        {ready
          ? `FLAT·SIX ${version} is ready — restart to apply.`
          : downloading
            ? `Downloading FLAT·SIX ${version}… ${status.percent}%`
            : `FLAT·SIX ${version} is available — downloading in the background.`}
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {ready && (
          <button type="button" style={{ ...btn, background: '#D5001C', border: 'none', color: '#fff' }} onClick={install}>
            Restart now
          </button>
        )}
        <button type="button" style={btn} onClick={() => skipVersion(version)}>
          Skip this version
        </button>
      </div>
    </div>
  );
}
