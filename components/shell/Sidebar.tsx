'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { fmtMiles } from '@/lib/data';
import { useVehicle } from '@/lib/vehicle-context';
import { useUnits } from '@/lib/units';
import { createClient } from '@/lib/supabase/client';
import { isAdminEmail } from '@/lib/admin';
import { DEMO_MODE } from '@/lib/demo';
import { useDocumentsAccess } from '@/lib/hooks/useDocumentsAccess';
import VehicleSwitcher from './VehicleSwitcher';
import AddVehicleModal from './AddVehicleModal';
import { BetaBadge } from './BetaBadge';

const NAV: { no: string; label: string; href: string; beta?: boolean }[] = [
  { no: '01', label: 'Garage', href: '/garage' },
  { no: '02', label: 'Service History', href: '/history' },
  { no: '03', label: 'Service Plans', href: '/plans' },
  { no: '04', label: 'Fault Finding', href: '/faults' },
  { no: '05', label: 'Live OBD', href: '/obd', beta: true },
  { no: '06', label: 'Downloads', href: '/downloads', beta: true },
  { no: '07', label: 'Documents', href: '/manual' },
  { no: '08', label: 'Tools', href: '/tools' },
  { no: '09', label: 'AI', href: '/ai' },
  { no: '10', label: 'Settings', href: '/settings' },
];

const mono = "'JetBrains Mono',monospace";

export default function Sidebar({
  open = false,
  onClose,
  collapsed = false,
  onToggleCollapse,
}: {
  open?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
} = {}) {
  const pathname = usePathname();
  const { vehicle: VEHICLE, vehicles, needsSetup } = useVehicle();
  const { units } = useUnits();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  // Collapse is a desktop affordance only — below the drawer breakpoint the
  // sidebar is an off-canvas drawer that always shows full labels. Track the
  // breakpoint so a persisted "collapsed" state never shrinks the mobile drawer.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 860px)');
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    window.addEventListener('resize', sync);
    return () => {
      mq.removeEventListener('change', sync);
      window.removeEventListener('resize', sync);
    };
  }, []);
  const showCollapsed = collapsed && !isMobile;

  // When collapsed to the icon rail, labels are hidden — so surface each item's
  // name in a prompt custom tooltip on hover. A fixed-position element (not a CSS
  // ::after) is used so it escapes the nav's overflow clip. `railTip` returns the
  // hover handlers to spread onto each rail control.
  const [tip, setTip] = useState<{ label: string; top: number } | null>(null);
  const railTip = (label: string) => ({
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      setTip({ label, top: r.top + r.height / 2 });
    },
    onMouseLeave: () => setTip(null),
  });

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
  const items = isAdmin ? [...baseNav, { no: '11', label: 'Admin', href: '/admin' }] : baseNav;

  return (
    <aside
      className={'appSidebar' + (open ? ' open' : '') + (showCollapsed ? ' collapsed' : '')}
      style={{
        width: showCollapsed ? 72 : 248, flexShrink: 0, background: '#0B0B0C', color: '#fff',
        display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100dvh',
      }}
    >
      <div
        style={{
          padding: showCollapsed ? '20px 0 16px' : '22px 22px 18px',
          display: 'flex', flexDirection: showCollapsed ? 'column' : 'row',
          alignItems: 'center', gap: showCollapsed ? 12 : 11, borderBottom: '1px solid #1B1B1E',
        }}
      >
        <div style={{ width: 11, height: 11, background: 'var(--red)', flexShrink: 0 }} />
        {!showCollapsed && <div style={{ font: `700 13px/1 ${mono}`, letterSpacing: '.28em' }}>FLAT·SIX</div>}
        <button
          type="button"
          className="hideOnMobile sidebarCollapseBtn"
          onClick={onToggleCollapse}
          aria-label={showCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={showCollapsed ? 'Expand' : 'Collapse'}
          style={{
            marginLeft: showCollapsed ? 0 : 'auto', width: 26, height: 26, flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: 'none', border: '1px solid #26262A', borderRadius: 5, cursor: 'pointer',
            color: '#9A9AA0', font: `500 13px/1 ${mono}`, padding: 0,
          }}
        >
          {showCollapsed ? '»' : '«'}
        </button>
      </div>

      <div className="sidebarScroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
      {showCollapsed ? (
        <div style={{ padding: '16px 0 6px', display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Expand sidebar to switch vehicle"
            {...railTip(VEHICLE.model || 'Your car')}
            style={{
              width: 34, height: 34, borderRadius: 4, padding: 0, cursor: 'pointer',
              background: VEHICLE.colorHex || '#2A2A2E', border: '1px solid rgba(255,255,255,.18)',
            }}
          />
        </div>
      ) : (
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
                  <span>ODO</span><span style={{ color: '#fff' }}>{VEHICLE.mileage ? fmtMiles(VEHICLE.mileage, units) : '—'}</span>
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
      )}

      <nav style={{ padding: showCollapsed ? '14px 8px' : '14px 12px' }}>
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
              aria-label={showCollapsed ? it.label : undefined}
              {...(showCollapsed ? railTip(it.label) : {})}
              style={{
                display: 'flex', alignItems: 'center',
                justifyContent: showCollapsed ? 'center' : 'flex-start',
                gap: 13, padding: showCollapsed ? '12px 0' : '11px 12px', borderRadius: 4,
                cursor: 'pointer', marginBottom: 2, transition: 'background .15s',
                background: on ? '#fff' : 'transparent', color: on ? '#0B0B0C' : '#9A9AA0',
                position: 'relative',
              }}
            >
              <span style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.06em', opacity: on && showCollapsed ? 1 : .6, width: showCollapsed ? 'auto' : 18 }}>{it.no}</span>
              {!showCollapsed && (
                <span style={{ font: "500 13px/1 'Helvetica Neue',Arial,sans-serif", letterSpacing: '.02em', display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.label}</span>
                  {it.beta && <BetaBadge tone={on ? 'light' : 'dark'} />}
                </span>
              )}
              {showCollapsed
                ? on && <span style={{ position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)', width: 4, height: 16, borderRadius: 2, background: 'var(--red)' }} />
                : <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: on ? 'var(--red)' : 'transparent', flexShrink: 0 }} />}
            </Link>
          );
        })}
      </nav>
      </div>

      <AddVehicleModal open={showAdd} onClose={() => setShowAdd(false)} />

      <div style={{ padding: showCollapsed ? '14px 0' : '14px 18px', borderTop: '1px solid #1B1B1E' }}>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            aria-label="Sign out"
            {...(showCollapsed ? railTip('Sign out') : {})}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: showCollapsed ? 'center' : 'flex-start',
              gap: 9, cursor: 'pointer',
              font: "500 12px/1 'Helvetica Neue',Arial,sans-serif", color: '#76767B',
              background: 'none', border: 'none', padding: 0, width: '100%',
            }}
          >
            <span style={{ fontFamily: mono }}>←</span>{!showCollapsed && ' Sign out'}
          </button>
        </form>
      </div>

      {/* Portal to <body> so the tooltip escapes the sidebar's stacking context
          and can sit above the garage 3D overlays (drei <Html> uses z-index up
          to ~16.7M) — a z-index alone can't, since the whole aside context is
          painted below them. */}
      {showCollapsed && tip && typeof document !== 'undefined' &&
        createPortal(
          <div
            aria-hidden
            style={{
              position: 'fixed', left: 80, top: tip.top, transform: 'translateY(-50%)',
              zIndex: 2147483647, pointerEvents: 'none',
              background: '#1B1B1E', color: '#fff', border: '1px solid #2E2E33', borderRadius: 5,
              padding: '7px 11px', font: "500 12px/1 'Helvetica Neue',Arial,sans-serif",
              whiteSpace: 'nowrap', boxShadow: '0 8px 22px rgba(0,0,0,.45)',
            }}
          >
            {tip.label}
          </div>,
          document.body,
        )}
    </aside>
  );
}
