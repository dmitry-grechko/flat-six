'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MCP_TOOLS, ENGINES, TRANS, COLORS } from '@/lib/data';
import { KNOWLEDGE_SOURCES } from '@/lib/knowledge';
import { useVehicle, MODEL_OPTIONS } from '@/lib/vehicle-context';
import { useServiceRecords } from '@/lib/records-context';
import { createClient } from '@/lib/supabase/client';
import { DEMO_MODE, DEMO_EMAIL, DEMO_TOKEN } from '@/lib/demo';
import type { BodyType } from '@/lib/types';

const DEFAULT_MODEL_NAME: Record<BodyType, string> = {
  boxster: 'Boxster S (981)',
  cayman: 'Cayman S (981)',
};

export default function SettingsMcp() {
  const router = useRouter();
  const { vehicle, update, reset } = useVehicle();
  const { records } = useServiceRecords();
  const [email, setEmail] = useState<string>('');
  const [endpoint, setEndpoint] = useState<string>('/api/mcp');
  const [token, setToken] = useState<string>('');
  const [tokenShown, setTokenShown] = useState<boolean>(false);
  const [copied, setCopied] = useState<string>('');
  const [partsCount, setPartsCount] = useState<number | null>(null);

  // Delete-account flow state.
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setEndpoint(`${window.location.origin}/api/mcp`);
    }
    // Live count of the shared OEM parts catalog (public read; works in demo too).
    createClient()
      .from('parts')
      .select('*', { count: 'exact', head: true })
      .then(
        ({ count }) => setPartsCount(count ?? 0),
        () => setPartsCount(null),
      );

    if (DEMO_MODE) { setEmail(DEMO_EMAIL); setToken(DEMO_TOKEN); return; }
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''));
    supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? ''));
  }, []);

  async function deleteAccount() {
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || body.error || `Request failed (${res.status})`);
      }
      router.push('/');
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Could not delete account.');
      setDeleting(false);
    }
  }

  // Real RAG sources Claude searches: the bundled 981 knowledge base, the OEM
  // parts catalog (live DB count) and the signed-in user's own service history.
  const ragSources: { name: string; detail: string; live: boolean }[] = [
    ...KNOWLEDGE_SOURCES.map((s) => ({
      name: s.name,
      detail: `${s.count} ${s.count === 1 ? 'entry' : 'entries'}`,
      live: false,
    })),
    {
      name: 'OEM Parts Catalog',
      detail: partsCount === null ? 'counting…' : `${partsCount.toLocaleString()} parts`,
      live: false,
    },
    {
      name: 'Your service history',
      detail: `${records.length} ${records.length === 1 ? 'record' : 'records'}`,
      live: true,
    },
  ];

  const copy = (value: string, key: string) => {
    if (!value) return;
    navigator.clipboard?.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(''), 1400);
  };

  const maskedToken = token
    ? `${token.slice(0, 8)}…${token.slice(-6)}`
    : 'Sign in to reveal your token';

  const mcpEndpoint = endpoint;

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 44, padding: '0 12px', background: '#F6F6F7', border: '1px solid #D2D2D6',
    borderRadius: 2, font: "400 14px 'Helvetica Neue',Arial,sans-serif", color: '#0B0B0C',
  };
  const fieldLabel: React.CSSProperties = {
    display: 'block', font: "500 11px/1 'JetBrains Mono',monospace", letterSpacing: '.1em',
    textTransform: 'uppercase', color: '#6E6E73', margin: '0 0 8px',
  };
  const chip = (active: boolean): React.CSSProperties => ({
    padding: '9px 13px', borderRadius: 2, cursor: 'pointer', font: "500 12px/1 'Helvetica Neue',Arial,sans-serif",
    background: active ? 'var(--red, #D5001C)' : '#F6F6F7', color: active ? '#fff' : '#46464A',
    border: `1px solid ${active ? 'var(--red, #D5001C)' : '#DDDDE0'}`,
  });

  const monoLabel: React.CSSProperties = {
    font: "500 10px/1 'JetBrains Mono',monospace",
    letterSpacing: '.08em',
    textTransform: 'uppercase',
    color: '#9A9AA0',
  };

  return (
    <div className="padView" style={{ padding: 28, maxWidth: 880 }}>
      {/* account */}
      <div style={{ background: '#fff', border: '1px solid #E3E3E5', borderRadius: 4, padding: 24, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ font: "500 10px/1 'JetBrains Mono',monospace", letterSpacing: '.16em', color: '#9A9AA0' }}>ACCOUNT</div>
          <form action="/auth/signout" method="post" style={{ marginLeft: 'auto' }}>
            <button
              type="submit"
              style={{ font: "500 10px/1 'JetBrains Mono',monospace", letterSpacing: '.08em', color: 'var(--red, #D5001C)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              SIGN OUT
            </button>
          </form>
        </div>
        <div>
          <div style={monoLabel}>Email</div>
          <div style={{ marginTop: 7, font: "400 15px 'Helvetica Neue',Arial,sans-serif", color: '#0B0B0C' }}>{email || '—'}</div>
        </div>
      </div>

      {/* vehicle — editable */}
      <div style={{ background: '#fff', border: '1px solid #E3E3E5', borderRadius: 4, padding: 24, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ font: "500 10px/1 'JetBrains Mono',monospace", letterSpacing: '.16em', color: '#9A9AA0' }}>VEHICLE</div>
          <button
            onClick={reset}
            style={{ marginLeft: 'auto', font: "500 10px/1 'JetBrains Mono',monospace", letterSpacing: '.08em', color: '#9A9AA0', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            RELOAD FROM SERVER
          </button>
        </div>

        {/* chassis / model — drives which 3D model renders */}
        <label style={fieldLabel}>Model (rendered in 3D)</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {MODEL_OPTIONS.map((m) => (
            <button
              key={m.id}
              onClick={() => update({ body: m.id, model: DEFAULT_MODEL_NAME[m.id] })}
              style={chip(vehicle.body === m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="stackSm" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div>
            <label style={fieldLabel}>Model name</label>
            <input value={vehicle.model} onChange={(e) => update({ model: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={fieldLabel}>Model year</label>
            <input value={vehicle.year} onChange={(e) => update({ year: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={fieldLabel}>Licence plate</label>
            <input value={vehicle.plate} onChange={(e) => update({ plate: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ gridColumn: '1 / 3' }}>
            <label style={fieldLabel}>Chassis VIN</label>
            <input value={vehicle.vin} onChange={(e) => update({ vin: e.target.value })} style={{ ...inputStyle, font: "500 14px 'JetBrains Mono',monospace", letterSpacing: '.04em' }} />
          </div>
          <div>
            <label style={fieldLabel}>Odometer (mi)</label>
            <input value={vehicle.mileage} onChange={(e) => update({ mileage: e.target.value.replace(/[^0-9]/g, '') })} style={{ ...inputStyle, fontFamily: "'JetBrains Mono',monospace" }} />
          </div>
        </div>

        <label style={fieldLabel}>Engine</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {ENGINES.map((e) => (
            <button key={e} onClick={() => update({ engine: e })} style={chip(vehicle.engine === e)}>{e}</button>
          ))}
        </div>

        <label style={fieldLabel}>Transmission</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {TRANS.map((t) => (
            <button key={t} onClick={() => update({ trans: t })} style={chip(vehicle.trans === t)}>{t}</button>
          ))}
        </div>

        <label style={fieldLabel}>Paint — {vehicle.colorName}</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 4 }}>
          {COLORS.map((c) => (
            <button
              key={c.hex}
              title={c.name}
              onClick={() => update({ colorName: c.name, colorHex: c.hex })}
              style={{
                width: 30, height: 30, borderRadius: 4, cursor: 'pointer', padding: 0, background: c.hex,
                border: vehicle.colorHex === c.hex ? '2px solid var(--red, #D5001C)' : '1px solid #D2D2D6',
                boxShadow: vehicle.colorHex === c.hex ? '0 0 0 3px rgba(213,0,28,.15)' : 'none',
              }}
            />
          ))}
        </div>
      </div>

      {/* MCP */}
      <div style={{ background: '#0B0B0C', borderRadius: 4, padding: 24, marginBottom: 18, color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <span style={{ color: 'var(--red, #D5001C)', fontFamily: "'JetBrains Mono',monospace", fontSize: 18 }}>&lowast;</span>
          <div style={{ font: "500 10px/1 'JetBrains Mono',monospace", letterSpacing: '.16em', color: '#9A9AA0' }}>CLAUDE / MCP INTEGRATION</div>
          <span
            style={{
              marginLeft: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              font: "600 9px/1 'JetBrains Mono',monospace",
              letterSpacing: '.12em',
              padding: '5px 9px',
              borderRadius: 2,
              color: '#3CD37A',
              background: 'rgba(60,211,122,.14)',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3CD37A' }} />
            LIVE
          </span>
        </div>
        <p style={{ margin: '6px 0 20px', font: "400 14px/1.6 'Helvetica Neue',Arial,sans-serif", color: '#A8A8AD', maxWidth: 560 }}>
          Expose your garage to Claude as an MCP server. Ask Claude in any chat to log a service from a photo, look up a torque spec,
          or diagnose a fault &mdash; it reads and writes here with your approval.
        </p>

        <div
          style={{
            background: '#141416',
            border: '1px solid #232327',
            borderRadius: 3,
            padding: '14px 16px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span style={{ font: "500 10px/1 'JetBrains Mono',monospace", color: '#76767B' }}>ENDPOINT</span>
          <span style={{ font: "500 13px/1 'JetBrains Mono',monospace", color: '#fff', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {mcpEndpoint}
          </span>
          <span
            onClick={() => copy(mcpEndpoint, 'endpoint')}
            style={{ font: "500 10px/1 'JetBrains Mono',monospace", color: 'var(--red, #D5001C)', cursor: 'pointer' }}
          >
            {copied === 'endpoint' ? 'COPIED' : 'COPY'}
          </span>
        </div>

        {/* access token — for testing with a Bearer header */}
        <div
          style={{
            background: '#141416',
            border: '1px solid #232327',
            borderRadius: 3,
            padding: '14px 16px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span style={{ font: "500 10px/1 'JetBrains Mono',monospace", color: '#76767B' }}>TOKEN</span>
          <span style={{ font: "500 13px/1 'JetBrains Mono',monospace", color: '#fff', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {tokenShown && token ? token : maskedToken}
          </span>
          {token && (
            <span
              onClick={() => setTokenShown((v) => !v)}
              style={{ font: "500 10px/1 'JetBrains Mono',monospace", color: '#76767B', cursor: 'pointer' }}
            >
              {tokenShown ? 'HIDE' : 'SHOW'}
            </span>
          )}
          <span
            onClick={() => copy(token, 'token')}
            style={{ font: "500 10px/1 'JetBrains Mono',monospace", color: 'var(--red, #D5001C)', cursor: token ? 'pointer' : 'default', opacity: token ? 1 : 0.4 }}
          >
            {copied === 'token' ? 'COPIED' : 'COPY'}
          </span>
        </div>
        <p style={{ margin: '-6px 0 16px', font: "400 11px/1.5 'Helvetica Neue',Arial,sans-serif", color: '#76767B', maxWidth: 560 }}>
          Manual fallback only. Claude Desktop / claude.ai and Claude Code sign in via the one-click OAuth
          connector below — no token needed. This raw Supabase token (≈1 hr) is just for the MCP Inspector or a
          hand-set Bearer header.
        </p>

        <div className="stackSm" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {MCP_TOOLS.map((t) => (
            <div key={t.name} style={{ background: '#141416', border: '1px solid #232327', borderRadius: 3, padding: '13px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3CD37A' }} />
                <span style={{ font: "500 12px/1 'JetBrains Mono',monospace", color: '#fff' }}>{t.name}</span>
                <span
                  style={{
                    marginLeft: 'auto',
                    font: "600 8px/1 'JetBrains Mono',monospace",
                    letterSpacing: '.1em',
                    padding: '3px 6px',
                    borderRadius: 2,
                    color: t.auth ? 'var(--red, #D5001C)' : '#3CD37A',
                    background: t.auth ? 'rgba(213,0,28,.12)' : 'rgba(60,211,122,.12)',
                  }}
                >
                  {t.auth ? 'GARAGE' : 'REFERENCE'}
                </span>
              </div>
              <div style={{ marginTop: 7, font: "400 12px/1.45 'Helvetica Neue',Arial,sans-serif", color: '#8A8A8F' }}>{t.desc}</div>
            </div>
          ))}
        </div>

        {/* connect instructions */}
        <div
          style={{
            marginTop: 16,
            background: '#141416',
            border: '1px solid #232327',
            borderRadius: 3,
            padding: '14px 16px',
          }}
        >
          <div style={{ font: "500 10px/1 'JetBrains Mono',monospace", letterSpacing: '.12em', color: '#76767B', marginBottom: 10 }}>
            CONNECT FROM CLAUDE DESKTOP / CLAUDE.AI
          </div>
          <ol style={{ margin: '0 0 4px', paddingLeft: 18, font: "400 12px/1.7 'Helvetica Neue',Arial,sans-serif", color: '#C9C9CD' }}>
            <li>Settings → Connectors → <strong>Add custom connector</strong></li>
            <li>
              Paste this URL:{' '}
              <span style={{ fontFamily: "'JetBrains Mono',monospace", color: '#fff' }}>{mcpEndpoint}</span>
            </li>
            <li>Click <strong>Connect</strong> → a FLAT·SIX sign-in window opens → approve. That&rsquo;s it.</li>
          </ol>
          <p style={{ margin: '8px 0 14px', font: "400 11px/1.5 'Helvetica Neue',Arial,sans-serif", color: '#76767B' }}>
            OAuth handles the token for you and refreshes it automatically — no copy-paste, nothing to renew.
          </p>

          <div style={{ font: "500 10px/1 'JetBrains Mono',monospace", letterSpacing: '.12em', color: '#76767B', margin: '4px 0 10px' }}>
            CONNECT FROM CLAUDE CODE
          </div>
          <pre
            style={{
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              font: "500 11px/1.6 'JetBrains Mono',monospace",
              color: '#D8D8DC',
            }}
          >
            {`claude mcp add --transport http flatsix ${mcpEndpoint}`}
          </pre>
          <p style={{ margin: '10px 0 0', font: "400 11px/1.5 'Helvetica Neue',Arial,sans-serif", color: '#76767B' }}>
            Then run <span style={{ fontFamily: "'JetBrains Mono',monospace", color: '#A8A8AD' }}>/mcp</span> in Claude Code and
            sign in (it also prompts on first tool use). The server requires a logged-in session, so this is needed before any
            tool works. To use a manual token instead, append{' '}
            <span style={{ fontFamily: "'JetBrains Mono',monospace", color: '#A8A8AD' }}>--header &quot;Authorization: Bearer &lt;token&gt;&quot;</span>. See MCP_SETUP.md.
          </p>
        </div>

        <p style={{ marginTop: 16, marginBottom: 0, font: "400 12px/1.5 'Helvetica Neue',Arial,sans-serif", color: '#76767B' }}>
          The server runs wherever this app is deployed — there&rsquo;s nothing to start or stop here. Connect from your
          Claude client using the steps above; each read and write still asks for your approval in the client.
        </p>
      </div>

      {/* RAG */}
      <div style={{ background: '#fff', border: '1px solid #E3E3E5', borderRadius: 4, padding: 24 }}>
        <div style={{ font: "500 10px/1 'JetBrains Mono',monospace", letterSpacing: '.16em', color: '#9A9AA0', marginBottom: 6 }}>
          KNOWLEDGE BASE (RAG)
        </div>
        <p style={{ margin: '0 0 18px', font: "400 13px/1.55 'Helvetica Neue',Arial,sans-serif", color: '#6E6E73', maxWidth: 560 }}>
          The sources Claude searches when answering questions about your car, via the MCP tools above.
        </p>
        {ragSources.map((r) => (
          <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 0', borderTop: '1px solid #F0F0F1' }}>
            <span style={{ font: "500 11px/1 'JetBrains Mono',monospace", color: '#6E6E73', flex: 1 }}>{r.name}</span>
            <span style={{ font: "500 10px/1 'JetBrains Mono',monospace", color: '#9A9AA0' }}>{r.detail}</span>
            <span
              style={{
                font: "600 9px/1 'JetBrains Mono',monospace",
                letterSpacing: '.1em',
                padding: '4px 7px',
                borderRadius: 2,
                color: r.live ? 'var(--red, #D5001C)' : '#1E8E4E',
                background: r.live ? 'rgba(213,0,28,.1)' : 'rgba(30,142,78,.1)',
              }}
            >
              {r.live ? 'LIVE' : 'INDEXED'}
            </span>
          </div>
        ))}
      </div>

      {/* DANGER ZONE — delete account */}
      <div style={{ background: '#fff', border: '1px solid #F0CDD2', borderRadius: 4, padding: 24, marginTop: 18 }}>
        <div style={{ font: "500 10px/1 'JetBrains Mono',monospace", letterSpacing: '.16em', color: 'var(--red, #D5001C)', marginBottom: 6 }}>
          DANGER ZONE
        </div>
        <p style={{ margin: '0 0 16px', font: "400 13px/1.55 'Helvetica Neue',Arial,sans-serif", color: '#6E6E73', maxWidth: 560 }}>
          Permanently delete your account and everything tied to it — every vehicle, service record and plan. This cannot be undone.
        </p>

        {DEMO_MODE ? (
          <div style={{ font: "400 12px/1.5 'Helvetica Neue',Arial,sans-serif", color: '#9A9AA0' }}>
            Account deletion is disabled in demo mode.
          </div>
        ) : !confirmDelete ? (
          <button
            onClick={() => { setConfirmDelete(true); setDeleteError(''); }}
            style={{
              height: 40, padding: '0 18px', borderRadius: 2, cursor: 'pointer',
              background: 'transparent', color: 'var(--red, #D5001C)', border: '1px solid var(--red, #D5001C)',
              font: "600 11px/1 'Helvetica Neue',Arial,sans-serif", letterSpacing: '.08em', textTransform: 'uppercase',
            }}
          >
            Delete account
          </button>
        ) : (
          <div>
            <div style={{ font: "400 13px/1.5 'Helvetica Neue',Arial,sans-serif", color: '#0B0B0C', marginBottom: 12 }}>
              Delete <strong>{email || 'your account'}</strong> and all its data? This is permanent.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={deleteAccount}
                disabled={deleting}
                style={{
                  height: 40, padding: '0 18px', border: 'none', borderRadius: 2, cursor: deleting ? 'default' : 'pointer',
                  background: 'var(--red, #D5001C)', color: '#fff', opacity: deleting ? 0.6 : 1,
                  font: "600 11px/1 'Helvetica Neue',Arial,sans-serif", letterSpacing: '.08em', textTransform: 'uppercase',
                }}
              >
                {deleting ? 'Deleting…' : 'Yes, delete everything'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                style={{
                  height: 40, padding: '0 18px', borderRadius: 2, cursor: deleting ? 'default' : 'pointer',
                  background: 'transparent', color: '#6E6E73', border: '1px solid #D2D2D6',
                  font: "600 11px/1 'Helvetica Neue',Arial,sans-serif", letterSpacing: '.08em', textTransform: 'uppercase',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {deleteError && (
          <div style={{ marginTop: 12, font: "400 12px/1.5 'Helvetica Neue',Arial,sans-serif", color: 'var(--red, #D5001C)' }}>
            {deleteError}
          </div>
        )}
      </div>
    </div>
  );
}
