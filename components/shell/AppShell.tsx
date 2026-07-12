'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import { BetaBadge } from './BetaBadge';
import { useVehicle } from '@/lib/vehicle-context';
import { useOffline } from '@/lib/offline/OfflineProvider';
import { useObdFocus } from '@/lib/obd/ObdFocusContext';
import { DesktopUpdateBanner } from './DesktopUpdateBanner';

const mono = "'JetBrains Mono',monospace";

const PAGE_META: Record<string, [string, string]> = {
  '/garage': ['INTERACTIVE CUTAWAY', 'Component Explorer'],
  '/history': ['MAINTENANCE', 'Service History'],
  '/history/new': ['MAINTENANCE', 'New Service Record'],
  '/plans': ['MAINTENANCE', 'Service Plans'],
  '/faults': ['DIAGNOSTICS', 'Fault Finding'],
  '/obd': ['DIAGNOSTICS', 'Live OBD'],
  '/downloads': ['COMPANIONS', 'Downloads'],
  '/manual': ['REFERENCE', 'Documents'],
  '/tools': ['REFERENCE', 'DIY Tools'],
  '/ai': ['INTEGRATION', 'AI Assistant'],
  '/settings': ['CONFIGURATION', 'Settings'],
  '/admin': ['ADMIN', 'Usage Overview'],
};

/** In-progress surfaces — show a BETA chip next to the page title. */
const BETA_PATHS = new Set(['/obd', '/downloads']);

export default function AppShell({
  children,
  headerActions,
}: {
  children: React.ReactNode;
  headerActions?: React.ReactNode;
}) {
  const pathname = usePathname();
  const { vehicle: VEHICLE } = useVehicle();
  const { online, pendingCount, syncing } = useOffline();
  const [kicker, title] = PAGE_META[pathname] ?? PAGE_META['/garage'];
  const showBeta = BETA_PATHS.has(pathname);
  const [navOpen, setNavOpen] = useState(false);
  // Desktop-only collapse of the sidebar into a compact icon rail, remembered
  // across sessions. The Sidebar itself ignores this below the drawer breakpoint.
  const [navCollapsed, setNavCollapsed] = useState(false);
  useEffect(() => {
    try {
      setNavCollapsed(localStorage.getItem('flatsix.navCollapsed') === '1');
    } catch {}
  }, []);
  const toggleNavCollapsed = () =>
    setNavCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem('flatsix.navCollapsed', next ? '1' : '0');
      } catch {}
      return next;
    });
  const { focus: obdFocus } = useObdFocus();
  const immersiveObd = pathname === '/obd' && obdFocus;

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: '#ECECEE' }}>
      {!immersiveObd && (
        <Sidebar
          open={navOpen}
          onClose={() => setNavOpen(false)}
          collapsed={navCollapsed}
          onToggleCollapse={toggleNavCollapsed}
        />
      )}
      {!immersiveObd && (
        <div
          className={'sidebarBackdrop' + (navOpen ? ' open' : '')}
          onClick={() => setNavOpen(false)}
          aria-hidden
        />
      )}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {!immersiveObd && <header
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
              style={{ font: "400 19px/1.1 'Helvetica Neue',Arial,sans-serif", letterSpacing: '-.01em', color: '#0B0B0C', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
              {showBeta && <BetaBadge tone="page" />}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            {(!online || pendingCount > 0 || syncing) && (
              <div
                style={{
                  font: `600 9px/1 ${mono}`,
                  letterSpacing: '.1em',
                  textTransform: 'uppercase',
                  color: online ? '#6E6E73' : '#D5001C',
                  border: `1px solid ${online ? '#E3E3E5' : 'rgba(213,0,28,.35)'}`,
                  padding: '6px 8px',
                  borderRadius: 2,
                }}
                title={online ? 'Syncing queued garage changes' : 'Working offline from local cache'}
              >
                {!online ? 'Offline' : syncing ? 'Syncing' : `${pendingCount} pending`}
              </div>
            )}
            {headerActions ?? (
              <div className="hideOnMobile" style={{ font: `500 11px/1 ${mono}`, letterSpacing: '.1em', color: '#9A9AA0' }}>VIN {VEHICLE.vin}</div>
            )}
          </div>
        </header>}

        <DesktopUpdateBanner />

        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>{children}</div>
      </main>
    </div>
  );
}
