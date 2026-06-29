'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { fmtMiles } from '@/lib/data';
import { useVehicle } from '@/lib/vehicle-context';

const NAV: { no: string; label: string; href: string }[] = [
  { no: '01', label: 'Garage', href: '/garage' },
  { no: '02', label: 'Service History', href: '/history' },
  { no: '03', label: 'Service Plans', href: '/plans' },
  { no: '04', label: 'Fault Finding', href: '/faults' },
  { no: '05', label: 'Settings & MCP', href: '/settings' },
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
  const router = useRouter();
  const { vehicle: VEHICLE } = useVehicle();

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 3, background: VEHICLE.colorHex, border: '1px solid rgba(255,255,255,.18)', flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ font: "500 13px/1.2 'Helvetica Neue',Arial,sans-serif", color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{VEHICLE.model}</div>
              <div style={{ font: `500 10px/1.3 ${mono}`, letterSpacing: '.08em', color: '#76767B', marginTop: 2 }}>{VEHICLE.year} · {VEHICLE.plate}</div>
            </div>
          </div>
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', font: `500 10px/1 ${mono}`, letterSpacing: '.08em', color: '#76767B' }}>
            <span>ODO</span><span style={{ color: '#fff' }}>{fmtMiles(VEHICLE.mileage)}</span>
          </div>
        </div>
      </div>

      <nav style={{ padding: '14px 12px', flex: 1 }}>
        {NAV.map((it) => {
          const on =
            pathname === it.href ||
            (it.href === '/history' && pathname.startsWith('/history')) ||
            (it.href === '/plans' && pathname.startsWith('/plans'));
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
        <div
          onClick={() => router.push('/')}
          style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', font: "500 12px/1 'Helvetica Neue',Arial,sans-serif", color: '#76767B' }}
        >
          <span style={{ fontFamily: mono }}>←</span> Sign out
        </div>
      </div>
    </aside>
  );
}
