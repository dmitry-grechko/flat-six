'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import { useVehicle } from '@/lib/vehicle-context';

const mono = "'JetBrains Mono',monospace";

const PAGE_META: Record<string, [string, string]> = {
  '/garage': ['INTERACTIVE CUTAWAY', 'Component Explorer'],
  '/history': ['MAINTENANCE', 'Service History'],
  '/history/new': ['MAINTENANCE', 'New Service Record'],
  '/plans': ['MAINTENANCE', 'Service Plans'],
  '/faults': ['DIAGNOSTICS', 'Fault Finding'],
  '/settings': ['CONFIGURATION', 'Settings & MCP'],
};

export default function AppShell({
  children,
  headerActions,
}: {
  children: React.ReactNode;
  headerActions?: React.ReactNode;
}) {
  const pathname = usePathname();
  const { vehicle: VEHICLE } = useVehicle();
  const [kicker, title] = PAGE_META[pathname] ?? PAGE_META['/garage'];
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: '#ECECEE' }}>
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div
        className={'sidebarBackdrop' + (navOpen ? ' open' : '')}
        onClick={() => setNavOpen(false)}
        aria-hidden
      />
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <header
          className="appHeader"
          style={{
            height: 68, flexShrink: 0, background: '#fff', borderBottom: '1px solid #E0E0E2',
            display: 'flex', alignItems: 'center', padding: '0 28px', gap: 18, position: 'sticky', top: 0, zIndex: 20,
          }}
        >
          <button
            type="button"
            className="appHamburger"
            onClick={() => setNavOpen(true)}
            aria-label="Open navigation menu"
          >
            <span /><span /><span />
          </button>
          <div style={{ minWidth: 0 }}>
            <div style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.16em', color: '#9A9AA0' }}>{kicker}</div>
            <div
              className="appHeaderTitle"
              style={{ font: "400 19px/1.1 'Helvetica Neue',Arial,sans-serif", letterSpacing: '-.01em', color: '#0B0B0C', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {title}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            {headerActions ?? (
              <div className="hideOnMobile" style={{ font: `500 11px/1 ${mono}`, letterSpacing: '.1em', color: '#9A9AA0' }}>VIN {VEHICLE.vin}</div>
            )}
          </div>
        </header>

        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>{children}</div>
      </main>
    </div>
  );
}
