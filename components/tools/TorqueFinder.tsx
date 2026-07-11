'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSpecs, type Spec } from '@/lib/knowledge';
import { searchTorqueManual, type ManualHit } from '@/lib/manual-lookup';
import { manualHitHref } from '@/lib/documents';
import { DEMO_MODE } from '@/lib/demo';
import { InfoBox, ToolSection, mono, sans } from './ui';

const GREEN = '#1B8A4B';
const RED = 'var(--red, #D5001C)';

// System grouping inferred from the spec name. Two orderings are in play:
// MATCH order is priority (most-specific first) — Brakes/Transmission/Suspension
// are tested before the broad Wheels ("wheel carrier" lives on control arms) and
// the catch-all Engine (which owns generic "oil"/"plug"/"mount" terms). DISPLAY
// order is just how the groups read on the page.
const SYSTEMS: { id: string; label: string; test: RegExp }[] = [
  { id: 'brakes', label: 'Brakes', test: /brake|caliper|calliper|disc|rotor|bleed|banjo|pad/i },
  { id: 'trans', label: 'Transmission & Driveline', test: /pdk|clutch|gear|transmission|transaxle|tiptronic|atf|final[- ]?drive|diff|drive[- ]?shaft/i },
  { id: 'cooling', label: 'Cooling', test: /coolant|radiator|water pump|thermostat/i },
  { id: 'suspension', label: 'Suspension & Steering', test: /strut|control arm|trailing|wishbone|drop[- ]?link|sway|anti[- ]?roll|track rod|tie rod|subframe|spring|damper|shock/i },
  { id: 'wheels', label: 'Wheels & Hubs', test: /wheel|lug|axle|hub|bearing/i },
  { id: 'engine', label: 'Engine', test: /oil|spark|plug|belt|mount|intake|air|cleaner|throttle|coil|manifold|cam|crank|filter/i },
];
const OTHER = { id: 'other', label: 'Other' };
const DISPLAY_ORDER = ['engine', 'brakes', 'wheels', 'suspension', 'trans', 'cooling', OTHER.id];

function systemFor(name: string) {
  return SYSTEMS.find((s) => s.test.test(name)) ?? OTHER;
}

/** A workshop-manual citation is a non-URL source string (e.g. "Porsche WM 981 · 170117 p.3896"). */
function isFactorySource(source?: string) {
  return !!source && !/^https?:\/\//i.test(source);
}

/** Pull Nm or lb-ft torque values out of a manual snippet. */
function extractTorques(text: string): string[] {
  const matches =
    text.match(/\d[\d.,]*\s*Nm(?:\s*\([^)]*\))?|\d[\d.,]*\s*(?:lb-?ft|ft-?lb)(?:\s*\([^)]*\))?/gi) ?? [];
  return [...new Set(matches.map((m) => m.replace(/\s+/g, ' ').trim()))].slice(0, 4);
}

export default function TorqueFinder({ gen }: { gen: string }) {
  const [q, setQ] = useState('');

  // "Search the full manual" tier: plain FTS (no embeddings) over the manual.
  // The app is auth-gated except in demo mode, so we simply skip this tier in
  // demo (no backend) and otherwise search as the signed-in user. Debounced on
  // the same search box.
  const [manualHits, setManualHits] = useState<ManualHit[] | null>(null);
  const [manualLoading, setManualLoading] = useState(false);

  useEffect(() => {
    const query = q.trim();
    if (DEMO_MODE || query.length < 3) {
      setManualHits(null);
      setManualLoading(false);
      return;
    }
    let cancelled = false;
    setManualLoading(true);
    const t = setTimeout(async () => {
      const { hits } = await searchTorqueManual(query, 12, { generation: gen });
      if (cancelled) return;
      setManualHits(hits);
      setManualLoading(false);
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, gen]);

  const torque = useMemo(() => getSpecs(gen).filter((s) => s.category === 'torque'), [gen]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return torque;
    return torque.filter((s) =>
      [s.name, s.value, s.notes, ...(s.appliesTo ?? [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [torque, q]);

  // Group filtered specs by inferred system, ordered for display.
  const groups = useMemo(() => {
    const byId = new Map<string, { label: string; items: Spec[] }>();
    for (const s of filtered) {
      const sys = systemFor(s.name);
      if (!byId.has(sys.id)) byId.set(sys.id, { label: sys.label, items: [] });
      byId.get(sys.id)!.items.push(s);
    }
    return DISPLAY_ORDER.filter((id) => byId.has(id)).map((id) => ({ id, ...byId.get(id)! }));
  }, [filtered]);

  const searching = q.trim().length >= 3;

  if (torque.length === 0) {
    return (
      <div style={{ font: `400 13px ${sans}`, color: '#9A9AA0' }}>
        No torque specifications on file for this generation yet.
      </div>
    );
  }

  return (
    <div>
      {/* Provenance banner. */}
      <InfoBox tone="ok" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span style={{ font: `600 12px/1.2 ${mono}`, color: GREEN }}>✓</span>
        <span style={{ font: `400 12px/1.5 ${sans}`, color: '#6E6E73' }}>
          <strong style={{ color: '#0B0B0C' }}>{torque.length} curated DIY torques</strong>, verified against the{' '}
          <strong style={{ color: '#0B0B0C' }}>Porsche factory workshop manual</strong> (
          <span style={{ font: `500 11px/1 ${mono}` }}>WM ✓</span>). Search any fastener to pull the rest straight from the
          full manual. Single-use / stretch fasteners must be replaced on removal — check the note.
        </span>
      </InfoBox>

      {/* Search */}
      <div style={{ position: 'relative', margin: '16px 0 4px' }}>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search any fastener — “drain plug”, “subframe”, “motor mount”…"
          aria-label="Search torque specifications"
          style={{
            width: '100%',
            height: 40,
            padding: '0 12px',
            borderRadius: 4,
            border: '1px solid #D2D2D6',
            background: '#F6F6F7',
            font: `400 14px ${sans}`,
            color: '#0B0B0C',
          }}
        />
      </div>
      <div style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.05em', color: '#B4B4B8', margin: '0 2px' }}>
        {filtered.length} curated {filtered.length === 1 ? 'match' : 'matches'}
        {q.trim() ? ` for “${q.trim()}”` : ' · type to search the full manual too'}
      </div>

      {/* Curated results, grouped by system. */}
      {groups.map((g) => (
        <div key={g.id}>
          <ToolSection>{g.label}</ToolSection>
          <InfoBox style={{ padding: '4px 16px' }}>
            {g.items.map((s) => (
              <TorqueRow key={s.id} spec={s} />
            ))}
          </InfoBox>
        </div>
      ))}

      {/* Full-manual tier — plain FTS over every torque-bearing section. */}
      {searching && (
        <div>
          <ToolSection>FROM THE FULL WORKSHOP MANUAL</ToolSection>
          <InfoBox>
            {DEMO_MODE ? (
              <div style={{ font: `400 12px/1.5 ${sans}`, color: '#9A9AA0' }}>
                Full workshop-manual search runs in the live app — the demo has no backend.
              </div>
            ) : (
              <>
                {manualLoading && (
                  <div style={{ font: `400 12px/1.5 ${sans}`, color: '#9A9AA0' }}>Searching the workshop manual…</div>
                )}

                {!manualLoading && manualHits?.length === 0 && (
                  <div style={{ font: `400 12px/1.5 ${sans}`, color: '#9A9AA0' }}>
                    No torque figures found in the manual for “{q.trim()}”. Try a broader fastener name.
                  </div>
                )}

                {!manualLoading && manualHits && manualHits.length > 0 && (
                  <div>
                    {manualHits.map((h) => (
                      <ManualTorqueRow key={h.id} hit={h} />
                    ))}
                  </div>
                )}
              </>
            )}
          </InfoBox>
        </div>
      )}
    </div>
  );
}

function ManualTorqueRow({ hit }: { hit: ManualHit }) {
  const href = manualHitHref(hit);
  const snippet = (hit.snippet ?? '').replace(/<\/?b>/g, '');
  const values = extractTorques(snippet);
  return (
    <div style={{ padding: '13px 0', borderBottom: '1px solid #F0F0F1' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ font: `500 13px/1.3 ${sans}`, color: '#0B0B0C', flex: '1 1 200px', minWidth: 0 }}>{hit.title}</span>
        {values.length > 0 && (
          <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' }}>
            {values.map((v) => (
              <span key={v} style={{ font: `600 13px/1.1 ${mono}`, color: RED, whiteSpace: 'nowrap' }}>
                {v}
              </span>
            ))}
          </span>
        )}
      </div>
      <div style={{ font: `400 11px/1.5 ${sans}`, color: '#6E6E73', marginTop: 5 }}>{snippet}</div>
      <div style={{ marginTop: 6, display: 'flex', gap: 12, alignItems: 'center' }}>
        <span style={{ font: `500 9px/1 ${mono}`, letterSpacing: '.05em', color: GREEN }}>
          WM ✓ {hit.wmCode ? `${hit.wmCode} · ` : ''}p.{hit.page}
          {hit.generation ? ` · ${hit.generation}` : ''}
        </span>
        {href && (
          <a
            href={href}
            style={{ font: `500 9px/1 ${mono}`, letterSpacing: '.05em', color: RED, textDecoration: 'none' }}
          >
            open in manual ↗
          </a>
        )}
      </div>
    </div>
  );
}

function TorqueRow({ spec }: { spec: Spec }) {
  const factory = isFactorySource(spec.source);
  return (
    <div style={{ padding: '13px 0', borderBottom: '1px solid #F0F0F1' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
          <span style={{ font: `500 13px/1.3 ${sans}`, color: '#0B0B0C' }}>{spec.name}</span>
          {spec.appliesTo && spec.appliesTo.length > 0 && (
            <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 5, marginLeft: 8, verticalAlign: 'middle' }}>
              {spec.appliesTo.map((a) => (
                <span
                  key={a}
                  style={{
                    font: `500 9px/1 ${mono}`,
                    letterSpacing: '.04em',
                    color: '#6E6E73',
                    background: '#F0F0F1',
                    padding: '4px 6px',
                    borderRadius: 2,
                  }}
                >
                  {a}
                </span>
              ))}
            </span>
          )}
        </div>
        <span style={{ font: `600 16px/1.1 ${mono}`, color: RED, whiteSpace: 'nowrap' }}>{spec.value}</span>
      </div>

      {spec.notes && (
        <div style={{ font: `400 11px/1.45 ${sans}`, color: '#9A9AA0', marginTop: 5 }}>{spec.notes}</div>
      )}

      {spec.source && (
        <div style={{ marginTop: 6 }}>
          {factory ? (
            <span style={{ font: `500 9px/1 ${mono}`, letterSpacing: '.05em', color: GREEN }}>WM ✓ {spec.source}</span>
          ) : (
            <a
              href={spec.source}
              target="_blank"
              rel="noreferrer"
              style={{ font: `500 9px/1 ${mono}`, letterSpacing: '.05em', color: '#9A9AA0', textDecoration: 'none' }}
            >
              source ↗
            </a>
          )}
        </div>
      )}
    </div>
  );
}
