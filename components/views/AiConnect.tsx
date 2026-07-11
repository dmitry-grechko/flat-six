'use client';

import { useEffect, useState } from 'react';
import { MCP_TOOLS } from '@/lib/data';
import { generationForBody } from '@/lib/models';
import { useVehicle } from '@/lib/vehicle-context';
import { OnlineRequiredBanner } from '@/components/shell/OnlineRequiredBanner';

type RagSource = {
  name: string;
  detail: string;
  status: 'INDEXED' | 'LIVE' | 'EMPTY';
  group: 'curated' | 'factory' | 'garage';
};

type Provider = 'claude' | 'chatgpt' | 'gemini';

const PROVIDERS: { id: Provider; label: string }[] = [
  { id: 'claude', label: 'Claude' },
  { id: 'chatgpt', label: 'ChatGPT' },
  { id: 'gemini', label: 'Gemini' },
];

const EXAMPLE_PROMPTS = [
  'What torque do I need for the wheel bolts on my car?',
  'Log an oil change at 42,000 miles from this receipt photo.',
  'What does fault code P0300 mean on a 981?',
  'When is my next major service due?',
];

function ProviderInstructions({ provider, endpoint }: { provider: Provider; endpoint: string }) {
  const stepStyle: React.CSSProperties = {
    margin: '0 0 4px',
    paddingLeft: 18,
    font: "400 13px/1.75 'Helvetica Neue',Arial,sans-serif",
    color: '#C9C9CD',
  };
  const noteStyle: React.CSSProperties = {
    margin: '12px 0 0',
    padding: '12px 14px',
    borderRadius: 3,
    background: 'rgba(255,255,255,.04)',
    border: '1px solid #2A2A2E',
    font: "400 12px/1.55 'Helvetica Neue',Arial,sans-serif",
    color: '#A8A8AD',
  };
  const urlStyle: React.CSSProperties = {
    fontFamily: "'JetBrains Mono',monospace",
    color: '#fff',
    wordBreak: 'break-all',
  };

  if (provider === 'claude') {
    return (
      <div>
        <p style={{ margin: '0 0 14px', font: "400 13px/1.6 'Helvetica Neue',Arial,sans-serif", color: '#A8A8AD' }}>
          Works in the Claude website and the Claude desktop app. You only set this up once.
        </p>
        <div style={{ font: "500 10px/1 'JetBrains Mono',monospace", letterSpacing: '.12em', color: '#76767B', marginBottom: 10 }}>
          CLAUDE.AI OR CLAUDE DESKTOP
        </div>
        <ol style={stepStyle}>
          <li>Open <strong>Settings</strong> in Claude.</li>
          <li>Go to <strong>Connectors</strong> and choose <strong>Add custom connector</strong>.</li>
          <li>
            Paste this address: <span style={urlStyle}>{endpoint}</span>
          </li>
          <li>Click <strong>Connect</strong>. A FLAT·SIX sign-in window opens — sign in and approve.</li>
        </ol>
        <p style={noteStyle}>
          That&apos;s it. Claude keeps you signed in automatically. When Claude wants to read or update your garage,
          it will ask for your approval first.
        </p>
      </div>
    );
  }

  if (provider === 'chatgpt') {
    return (
      <div>
        <p style={{ margin: '0 0 14px', font: "400 13px/1.6 'Helvetica Neue',Arial,sans-serif", color: '#A8A8AD' }}>
          Works in ChatGPT on the web. You need a Plus, Pro, Business, or Enterprise plan.
        </p>
        <div style={{ font: "500 10px/1 'JetBrains Mono',monospace", letterSpacing: '.12em', color: '#76767B', marginBottom: 10 }}>
          CHATGPT.COM
        </div>
        <ol style={stepStyle}>
          <li>Open <strong>Settings</strong> → <strong>Apps</strong>.</li>
          <li>Under <strong>Advanced settings</strong>, turn on <strong>Developer mode</strong>.</li>
          <li>Click <strong>Create app</strong> (or the <strong>+</strong> button on the Apps page).</li>
          <li>
            Name it <strong>FLAT·SIX</strong>, then paste this address as the MCP server URL:{' '}
            <span style={urlStyle}>{endpoint}</span>
          </li>
          <li>Save the app, then sign in when ChatGPT asks to link your FLAT·SIX account.</li>
          <li>In a new chat, open the <strong>+</strong> menu and turn on your FLAT·SIX app before asking questions.</li>
        </ol>
        <p style={noteStyle}>
          ChatGPT may call this an &ldquo;app&rdquo; rather than a connector. The sign-in step is the same — approve
          access once, and ChatGPT will ask before changing anything in your garage.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p style={{ margin: '0 0 14px', font: "400 13px/1.6 'Helvetica Neue',Arial,sans-serif", color: '#A8A8AD' }}>
        The standard Gemini app at gemini.google.com does not yet let you add custom garage connections.
        Use Claude or ChatGPT above for now — the same connection address works with all supported assistants.
      </p>
      <div
        style={{
          padding: '14px 16px',
          borderRadius: 3,
          background: 'rgba(255,193,7,.08)',
          border: '1px solid rgba(255,193,7,.25)',
          font: "400 13px/1.6 'Helvetica Neue',Arial,sans-serif",
          color: '#E8D9A0',
          marginBottom: 14,
        }}
      >
        Google has announced MCP support for Gemini, but the consumer Gemini website and mobile apps
        don&apos;t offer a &ldquo;add custom connector&rdquo; option yet.
      </div>
      <div style={{ font: "500 10px/1 'JetBrains Mono',monospace", letterSpacing: '.12em', color: '#76767B', marginBottom: 10 }}>
        WHEN GEMINI ADDS THIS
      </div>
      <ol style={stepStyle}>
        <li>Open Gemini settings and look for <strong>Apps</strong>, <strong>Connectors</strong>, or <strong>Extensions</strong>.</li>
        <li>Choose <strong>Add custom connector</strong> (wording may vary).</li>
        <li>
          Paste this address: <span style={urlStyle}>{endpoint}</span>
        </li>
        <li>Sign in with your FLAT·SIX account when prompted.</li>
      </ol>
      <p style={noteStyle}>
        We&apos;ll update these steps when Google ships custom MCP in the main Gemini app. Your connection address
        will stay the same.
      </p>
    </div>
  );
}

export default function AiConnect() {
  const { vehicle, activeId } = useVehicle();
  const [endpoint, setEndpoint] = useState<string>('/api/mcp');
  const [copied, setCopied] = useState<string>('');
  const [provider, setProvider] = useState<Provider>('claude');
  const [ragGen, setRagGen] = useState<string>('');
  const [ragSources, setRagSources] = useState<RagSource[]>([]);
  const [ragMeta, setRagMeta] = useState<{ documentCount: number; factorySections: number } | null>(null);

  const generation = generationForBody(vehicle.body);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setEndpoint(`${window.location.origin}/api/mcp`);
    }
  }, []);

  useEffect(() => {
    let active = true;
    // Optimistic: show the active car's generation immediately while the
    // overview request is in flight (avoids a stale "981" badge flash).
    setRagGen(generation);
    setRagMeta(null);
    const params = new URLSearchParams({ generation });
    if (activeId) params.set('vehicleId', activeId);
    fetch(`/api/knowledge/overview?${params}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active || !data) return;
        setRagGen(data.generation ?? generation);
        setRagSources(data.sources ?? []);
        setRagMeta({
          documentCount: data.documentCount ?? 0,
          factorySections: data.factorySections ?? 0,
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [generation, activeId, vehicle.body]);

  const copy = (value: string, key: string) => {
    if (!value) return;
    navigator.clipboard?.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(''), 1400);
  };

  const tab = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '11px 14px',
    borderRadius: 3,
    cursor: 'pointer',
    border: `1px solid ${active ? 'var(--red, #D5001C)' : '#232327'}`,
    background: active ? 'rgba(213,0,28,.14)' : '#141416',
    color: active ? '#fff' : '#A8A8AD',
    font: "600 12px/1 'Helvetica Neue',Arial,sans-serif",
    textAlign: 'center',
  });

  return (
    <div className="padView" style={{ padding: 28, maxWidth: 880 }}>
      <OnlineRequiredBanner
        feature="AI assistant / MCP"
        detail="embeddings and cloud providers need a connection"
      />
      <div style={{ background: '#0B0B0C', borderRadius: 4, padding: 24, marginBottom: 18, color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <span style={{ color: 'var(--red, #D5001C)', fontFamily: "'JetBrains Mono',monospace", fontSize: 18 }}>&lowast;</span>
          <div style={{ font: "500 10px/1 'JetBrains Mono',monospace", letterSpacing: '.16em', color: '#9A9AA0' }}>CONNECT YOUR AI ASSISTANT</div>
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
            READY
          </span>
        </div>
        <p style={{ margin: '6px 0 20px', font: "400 14px/1.65 'Helvetica Neue',Arial,sans-serif", color: '#A8A8AD', maxWidth: 620 }}>
          Link Claude, ChatGPT, or Gemini to your garage. Once connected, your assistant can look up specs and fault codes,
          read your service history, and log new work — always with your approval before anything changes.
        </p>

        <div
          style={{
            background: '#141416',
            border: '1px solid #232327',
            borderRadius: 3,
            padding: '14px 16px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span style={{ font: "500 10px/1 'JetBrains Mono',monospace", color: '#76767B', flexShrink: 0 }}>CONNECTION ADDRESS</span>
          <span style={{ font: "500 13px/1 'JetBrains Mono',monospace", color: '#fff', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {endpoint}
          </span>
          <span
            onClick={() => copy(endpoint, 'endpoint')}
            style={{ font: "500 10px/1 'JetBrains Mono',monospace", color: 'var(--red, #D5001C)', cursor: 'pointer', flexShrink: 0 }}
          >
            {copied === 'endpoint' ? 'COPIED' : 'COPY'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {PROVIDERS.map((p) => (
            <button key={p.id} type="button" onClick={() => setProvider(p.id)} style={tab(provider === p.id)}>
              {p.label}
            </button>
          ))}
        </div>

        <div
          style={{
            background: '#141416',
            border: '1px solid #232327',
            borderRadius: 3,
            padding: '16px 18px',
            marginBottom: 20,
          }}
        >
          <ProviderInstructions provider={provider} endpoint={endpoint} />
        </div>

        <div style={{ font: "500 10px/1 'JetBrains Mono',monospace", letterSpacing: '.12em', color: '#76767B', marginBottom: 10 }}>
          TRY ASKING
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {EXAMPLE_PROMPTS.map((prompt) => (
            <div
              key={prompt}
              style={{
                background: '#141416',
                border: '1px solid #232327',
                borderRadius: 3,
                padding: '11px 14px',
                font: "400 13px/1.45 'Helvetica Neue',Arial,sans-serif",
                color: '#C9C9CD',
              }}
            >
              &ldquo;{prompt}&rdquo;
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E3E3E5', borderRadius: 4, padding: 24, marginBottom: 18 }}>
        <div style={{ font: "500 10px/1 'JetBrains Mono',monospace", letterSpacing: '.16em', color: '#9A9AA0', marginBottom: 6 }}>
          WHAT YOUR ASSISTANT CAN DO
        </div>
        <p style={{ margin: '0 0 16px', font: "400 13px/1.55 'Helvetica Neue',Arial,sans-serif", color: '#6E6E73', maxWidth: 560 }}>
          These are the actions available once you connect. Reference lookups work right away; garage actions need you to be signed in.
        </p>
        <div className="stackSm" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {MCP_TOOLS.map((t) => (
            <div key={t.name} style={{ background: '#F6F6F7', border: '1px solid #E3E3E5', borderRadius: 3, padding: '13px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1E8E4E' }} />
                <span style={{ font: "500 12px/1 'JetBrains Mono',monospace", color: '#0B0B0C' }}>{t.name}</span>
                <span
                  style={{
                    marginLeft: 'auto',
                    font: "600 8px/1 'JetBrains Mono',monospace",
                    letterSpacing: '.1em',
                    padding: '3px 6px',
                    borderRadius: 2,
                    color: t.auth ? 'var(--red, #D5001C)' : '#1E8E4E',
                    background: t.auth ? 'rgba(213,0,28,.08)' : 'rgba(30,142,78,.1)',
                  }}
                >
                  {t.auth ? 'YOUR GARAGE' : 'REFERENCE'}
                </span>
              </div>
              <div style={{ marginTop: 7, font: "400 12px/1.45 'Helvetica Neue',Arial,sans-serif", color: '#6E6E73' }}>{t.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E3E3E5', borderRadius: 4, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
          <div style={{ font: "500 10px/1 'JetBrains Mono',monospace", letterSpacing: '.16em', color: '#9A9AA0' }}>
            KNOWLEDGE BASE
          </div>
          <span style={{ font: "600 9px/1 'JetBrains Mono',monospace", letterSpacing: '.1em', padding: '4px 7px', borderRadius: 2, color: 'var(--red, #D5001C)', background: 'rgba(213,0,28,.08)' }}>
            {(ragGen || generation).toUpperCase()}
          </span>
        </div>
        <p style={{ margin: '0 0 8px', font: "400 13px/1.55 'Helvetica Neue',Arial,sans-serif", color: '#6E6E73', maxWidth: 560 }}>
          What Fault Finding and your connected assistant search for your car. Matches the model in Settings.
        </p>
        {ragMeta && (
          <p style={{ margin: '0 0 18px', font: "500 11px/1.4 'JetBrains Mono',monospace", color: '#9A9AA0' }}>
            {ragMeta.documentCount} PDFs in Documents · {ragMeta.factorySections.toLocaleString()} searchable factory sections
          </p>
        )}

        {(['curated', 'factory', 'garage'] as const).map((group) => {
          const rows = ragSources.filter((r) => r.group === group);
          if (!rows.length) return null;
          const label =
            group === 'curated' ? 'CURATED REFERENCE' :
            group === 'factory' ? 'FACTORY DOCS (SEARCHABLE)' :
            'YOUR GARAGE';
          return (
            <div key={group} style={{ marginBottom: group === 'garage' ? 0 : 8 }}>
              <div style={{ font: "500 9px/1 'JetBrains Mono',monospace", letterSpacing: '.12em', color: '#B4B4B8', margin: '12px 0 4px' }}>
                {label}
              </div>
              {rows.map((r) => (
                <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderTop: '1px solid #F0F0F1' }}>
                  <span style={{ font: "500 11px/1 'JetBrains Mono',monospace", color: '#6E6E73', flex: 1 }}>{r.name}</span>
                  <span style={{ font: "500 10px/1 'JetBrains Mono',monospace", color: '#9A9AA0' }}>{r.detail}</span>
                  <span
                    style={{
                      font: "600 9px/1 'JetBrains Mono',monospace",
                      letterSpacing: '.1em',
                      padding: '4px 7px',
                      borderRadius: 2,
                      color:
                        r.status === 'LIVE' ? 'var(--red, #D5001C)' :
                        r.status === 'EMPTY' ? '#9A9AA0' : '#1E8E4E',
                      background:
                        r.status === 'LIVE' ? 'rgba(213,0,28,.1)' :
                        r.status === 'EMPTY' ? '#EEEEF0' : 'rgba(30,142,78,.1)',
                    }}
                  >
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          );
        })}

        {!ragSources.length && (
          <div style={{ padding: '16px 0', color: '#9A9AA0', font: "400 13px 'Helvetica Neue',Arial,sans-serif" }}>
            Loading knowledge overview…
          </div>
        )}
      </div>
    </div>
  );
}
