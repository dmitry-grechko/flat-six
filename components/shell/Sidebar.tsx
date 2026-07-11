'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { fmtMiles } from '@/lib/data';
import { useVehicle } from '@/lib/vehicle-context';
import { createClient } from '@/lib/supabase/client';
import { isAdminEmail } from '@/lib/admin';
import { DEMO_MODE } from '@/lib/demo';
import { useDocumentsAccess } from '@/lib/hooks/useDocumentsAccess';
import VehicleSwitcher from './VehicleSwitcher';
import AddVehicleModal from './AddVehicleModal';

const NAV: { no: string; label: string; href: string }[] = [
  { no: '01', label: 'Garage', href: '/garage' },
  { no: '02', label: 'Service History', href: '/history' },
  { no: '03', label: 'Service Plans', href: '/plans' },
  { no: '04', label: 'Fault Finding', href: '/faults' },
  { no: '05', label: 'Documents', href: '/manual' },
  { no: '06', label: 'Tools', href: '/tools' },
  { no: '07', label: 'AI', href: '/ai' },
  { no: '08', label: 'Settings', href: '/settings' },
];

const mono = "'JetBrains Mono',monospace";

export default function Sidebar({
  open = false,
  onClose,
}: {
  open?: boolean;
  onClose?: () => void;
} = {}) {
  const pathname = usePathname();
  const { vehicle: VEHICLE, vehicles, needsSetup } = useVehicle();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  // The admin usage panel is visible only to the admin account (or in demo mode,
  // so it can be tested without a real session). The /api/admin route enforces
  // this server-side regardless — this just controls the nav item.
  const [isAdmin, setIsAdmin] = useState(DEMO_MODE);
  const { allowed: docsAccess } = useDocumentsAccess();
  useEffect(() => {
    if (DEMO_MODE) return;
    createClient().auth.getUser().then(({ data }) => setIsAdmin(isAdminEmail(data.user?.email)));
  }, []);
  const baseNav = docsAccess ? NAV : NAV.filter((item) => item.href !== '/manual');
  const items = isAdmin ? [...baseNav, { no: '09', label: 'Admin', href: '/admin' }] : baseNav;

  return (
    <aside
      className={'appSidebar' + (open ? ' open' : '')}
      style={{
        width: 248, flexShrink: 0, background: '#0B0B0C', color: '#fff',
        display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh',
      }}
    >
      <div style={{ padding: '22px 22px 18px', display: 'flex', alignItems: 'center', gap: 11, borderBottom: '1px solid #1B1B1E' }}>
        <div style={{ width: 11, height: 11, background: 'var(--red)' }} />
        <div style={{ font: `700 13px/1 ${mono}`, letterSpacing: '.28em' }}>FLAT·SIX</div>
      </div>

      <div style={{ padding: '18px 18px 6px' }}>
        <div style={{ background: '#141416', border: '1px solid #1F1F22', borderRadius: 4, padding: 14 }}>
          {needsSetup ? (
            <div style={{ font: "400 12px/1.45 'Helvetica Neue',Arial,sans-serif", color: '#9A9AA0' }}>
              Set up your car in onboarding to see it here.
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setSwitcherOpen((o) => !o)}
                aria-expanded={switcherOpen}
                aria-label="Switch vehicle"
                style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 3, background: VEHICLE.colorHex || '#2A2A2E', border: '1px solid rgba(255,255,255,.18)', flexShrink: 0 }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ font: "500 13px/1.2 'Helvetica Neue',Arial,sans-serif", color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{VEHICLE.model || 'Your car'}</div>
                    <div style={{ font: `500 10px/1.3 ${mono}`, letterSpacing: '.08em', color: '#76767B', marginTop: 2 }}>
                      {[VEHICLE.year, VEHICLE.plate].filter(Boolean).join(' · ') || '—'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                    {vehicles.length > 1 && (
                      <span style={{ font: `600 9px/1 ${mono}`, letterSpacing: '.08em', color: '#76767B' }}>{vehicles.length} CARS</span>
                    )}
                    <span style={{ font: `400 10px/1 ${mono}`, color: '#9A9AA0', transition: 'transform .18s', transform: switcherOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
                  </div>
                </div>
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', font: `500 10px/1 ${mono}`, letterSpacing: '.08em', color: '#76767B' }}>
                  <span>ODO</span><span style={{ color: '#fff' }}>{VEHICLE.mileage ? fmtMiles(VEHICLE.mileage) : '—'}</span>
                </div>
              </button>

              {switcherOpen && (
                <VehicleSwitcher
                  onAdd={() => {
                    setShowAdd(true);
                    setSwitcherOpen(false);
                  }}
                  onPicked={() => setSwitcherOpen(false)}
                />
              )}
            </>
          )}
        </div>
      </div>

      <AddVehicleModal open={showAdd} onClose={() => setShowAdd(false)} />

      <nav style={{ padding: '14px 12px', flex: 1 }}>
        {items.map((it) => {
          const on =
            pathname === it.href ||
            (it.href === '/history' && pathname.startsWith('/history')) ||
            (it.href === '/plans' && pathname.startsWith('/plans')) ||
            (it.href === '/manual' && pathname.startsWith('/manual')) ||
            (it.href === '/ai' && pathname.startsWith('/ai'));
          return (
            <Link
              key={it.href}
              href={it.href}
              className="navitem"
              onClick={onClose}
              style={{
                display: 'flex', alignItems: 'center', gap: 13, padding: '11px 12px', borderRadius: 4,
                cursor: 'pointer', marginBottom: 2, transition: 'background .15s',
                background: on ? '#fff' : 'transparent', color: on ? '#0B0B0C' : '#9A9AA0',
              }}
            >
              <span style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.06em', opacity: .6, width: 18 }}>{it.no}</span>
              <span style={{ font: "500 13px/1 'Helvetica Neue',Arial,sans-serif", letterSpacing: '.02em' }}>{it.label}</span>
              <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: on ? 'var(--red)' : 'transparent' }} />
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: '14px 18px', borderTop: '1px solid #1B1B1E' }}>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            style={{
              display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer',
              font: "500 12px/1 'Helvetica Neue',Arial,sans-serif", color: '#76767B',
              background: 'none', border: 'none', padding: 0, width: '100%',
            }}
          >
            <span style={{ fontFamily: mono }}>←</span> Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
