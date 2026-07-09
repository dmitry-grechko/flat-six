'use client';

import { useEffect, useState } from 'react';
import type { AdminOverview } from '@/lib/admin';

const mono = "'JetBrains Mono',monospace";
const RED = 'var(--red, #D5001C)';

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function badgeStyle(yes: boolean): React.CSSProperties {
  return {
    font: `600 9px/1 ${mono}`, letterSpacing: '.1em', padding: '4px 7px', borderRadius: 2,
    background: yes ? 'rgba(30,142,78,.1)' : '#EEEEF0',
    color: yes ? '#1E8E4E' : '#9A9AA0',
  };
}

export default function AdminPanel() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/overview')
      .then(async (r) => {
        if (r.status === 403) throw new Error('You are not authorised to view this page.');
        if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error || `Request failed (${r.status})`);
        return r.json() as Promise<AdminOverview>;
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const monoLabel: React.CSSProperties = {
    font: `500 10px/1 ${mono}`, letterSpacing: '.12em', color: '#9A9AA0',
  };

  const stats = data
    ? [
        { k: 'TOTAL USERS', v: data.totalUsers, color: '#0B0B0C' },
        { k: 'WITH A CAR', v: data.usersWithCar, color: RED },
        { k: 'SERVICE RECORDS', v: data.totalRecords, color: '#0B0B0C' },
        { k: 'SERVICE PLANS', v: data.totalPlans, color: '#0B0B0C' },
        { k: 'MCP CONNECTED', v: data.mcpConnectedUsers, color: '#1E8E4E' },
        { k: 'VEHICLES', v: data.totalVehicles, color: '#0B0B0C' },
      ]
    : [];

  return (
    <div className="padView" style={{ padding: 28, maxWidth: 1100 }}>
      {data?.demo && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(213,0,28,.08)', border: '1px solid rgba(213,0,28,.25)', borderRadius: 4, font: `500 11px/1.4 ${mono}`, letterSpacing: '.04em', color: '#9A2230' }}>
          DEMO DATA — placeholder users. Connect Supabase + set SUPABASE_SERVICE_ROLE_KEY to see real sign-ups.
        </div>
      )}

      {loading && <div style={{ color: '#9A9AA0', font: "400 14px 'Helvetica Neue',Arial,sans-serif" }}>Loading usage…</div>}

      {error && (
        <div style={{ background: '#fff', border: '1px solid #E3E3E5', borderRadius: 4, padding: 24, color: '#9A2230', font: "400 14px/1.5 'Helvetica Neue',Arial,sans-serif" }}>
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="statCardsSm adminStatCards" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
            {stats.map((s) => (
              <div key={s.k} style={{ background: '#fff', border: '1px solid #E3E3E5', borderRadius: 4, padding: 18 }}>
                <div style={monoLabel}>{s.k}</div>
                <div style={{ marginTop: 10, font: "400 30px/1 'Helvetica Neue',Arial,sans-serif", color: s.color }}>{s.v}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
            <div style={{ font: `500 11px/1 ${mono}`, letterSpacing: '.16em', color: '#6E6E73' }}>USERS</div>
            <div style={{ font: "400 13px/1 'Helvetica Neue',Arial,sans-serif", color: '#9A9AA0' }}>{data.users.length} accounts</div>
          </div>

          {/* Desktop table */}
          <div className="adminTableDesktop" style={{ background: '#fff', border: '1px solid #E3E3E5', borderRadius: 4, overflow: 'hidden' }}>
            <div className="adminTableHead" style={{ display: 'grid', gridTemplateColumns: '1.2fr 110px 72px 72px 72px 72px 1fr', gap: 12, padding: '12px 20px', borderBottom: '1px solid #EEEEF0', ...monoLabel }}>
              <div>EMAIL</div><div>JOINED</div><div>CAR</div><div>RECORDS</div><div>PLANS</div><div>MCP</div><div>VEHICLES</div>
            </div>
            {data.users.length === 0 && (
              <div style={{ padding: '24px 20px', color: '#9A9AA0', font: "400 14px 'Helvetica Neue',Arial,sans-serif" }}>No users yet.</div>
            )}
            {data.users.map((u) => (
              <div key={u.email} className="adminTableRow recrow" style={{ display: 'grid', gridTemplateColumns: '1.2fr 110px 72px 72px 72px 72px 1fr', gap: 12, padding: '14px 20px', borderBottom: '1px solid #F0F0F1', alignItems: 'center' }}>
                <div style={{ font: "400 14px 'Helvetica Neue',Arial,sans-serif", color: '#0B0B0C', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                <div style={{ font: `500 12px/1 ${mono}`, color: '#6E6E73' }}>{fmtDate(u.joined)}</div>
                <div>
                  <span style={badgeStyle(u.vehicleCount > 0)}>
                    {u.vehicleCount > 0 ? `YES · ${u.vehicleCount}` : 'NO'}
                  </span>
                </div>
                <div style={{ font: `600 12px/1 ${mono}`, color: u.recordCount ? '#0B0B0C' : '#B4B4B8' }}>{u.recordCount}</div>
                <div style={{ font: `600 12px/1 ${mono}`, color: u.planCount ? '#0B0B0C' : '#B4B4B8' }}>{u.planCount}</div>
                <div>
                  <span style={badgeStyle(u.mcpConnected)}>{u.mcpConnected ? 'YES' : 'NO'}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {u.vehicles.length === 0
                    ? <span style={{ font: "400 13px 'Helvetica Neue',Arial,sans-serif", color: '#B4B4B8' }}>—</span>
                    : u.vehicles.map((v, i) => (
                      <span key={i} style={{ font: `500 11px/1 ${mono}`, color: '#6E6E73', background: '#F4F4F5', border: '1px solid #EAEAEC', borderRadius: 2, padding: '5px 8px' }}>{v}</span>
                    ))}
                </div>
              </div>
            ))}
          </div>

          {/* Mobile cards */}
          <div className="adminCardsMobile">
            {data.users.map((u) => (
              <div key={u.email} className="adminUserCard" style={{ background: '#fff', border: '1px solid #E3E3E5', borderRadius: 4, padding: 16, marginBottom: 10 }}>
                <div style={{ font: "400 15px/1.3 'Helvetica Neue',Arial,sans-serif", color: '#0B0B0C', marginBottom: 4, wordBreak: 'break-all' }}>{u.email}</div>
                <div style={{ font: `500 11px/1 ${mono}`, color: '#9A9AA0', marginBottom: 12 }}>Joined {fmtDate(u.joined)}</div>
                <div className="adminCardGrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
                  <div>
                    <div style={monoLabel}>CAR</div>
                    <div style={{ marginTop: 6, font: `600 12px/1 ${mono}`, color: u.vehicleCount ? '#1E8E4E' : '#9A9AA0' }}>
                      {u.vehicleCount > 0 ? `Yes · ${u.vehicleCount}` : 'No'}
                    </div>
                  </div>
                  <div>
                    <div style={monoLabel}>MCP</div>
                    <div style={{ marginTop: 6, font: `600 12px/1 ${mono}`, color: u.mcpConnected ? '#1E8E4E' : '#9A9AA0' }}>
                      {u.mcpConnected ? 'Connected' : 'Not yet'}
                    </div>
                  </div>
                  <div>
                    <div style={monoLabel}>RECORDS</div>
                    <div style={{ marginTop: 6, font: `600 14px/1 ${mono}`, color: '#0B0B0C' }}>{u.recordCount}</div>
                  </div>
                  <div>
                    <div style={monoLabel}>PLANS</div>
                    <div style={{ marginTop: 6, font: `600 14px/1 ${mono}`, color: '#0B0B0C' }}>{u.planCount}</div>
                  </div>
                </div>
                {u.vehicles.length > 0 && (
                  <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {u.vehicles.map((v, i) => (
                      <span key={i} style={{ font: `500 11px/1 ${mono}`, color: '#6E6E73', background: '#F4F4F5', border: '1px solid #EAEAEC', borderRadius: 2, padding: '5px 8px' }}>{v}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
