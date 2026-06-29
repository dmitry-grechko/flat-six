'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  searchKnowledge,
  getFaultCodes,
  getKnownIssues,
} from '@/lib/knowledge';
import type { FaultCode, KnownIssue, Severity } from '@/lib/knowledge';
import { searchParts, type CatalogPartRow } from '@/lib/parts-lookup';

const mono = "'JetBrains Mono',monospace";

// [color, background] per severity.
const SEV_MAP: Record<Severity, [string, string]> = {
  LOW: ['#7A7A80', '#EEEEF0'],
  MED: ['#C77700', 'rgba(199,119,0,.12)'],
  HIGH: ['var(--red, #D5001C)', 'rgba(213,0,28,.1)'],
};

// Build lookup maps once — searchKnowledge returns lossy chunks, so we map its
// ranked hits back to the full structured records to render rich cards.
const FAULT_BY_CODE = new Map(getFaultCodes().map((f) => [f.code.toUpperCase(), f]));
const ISSUE_BY_ID = new Map(getKnownIssues().map((k) => [k.id, k]));

type Result =
  | { key: string; kind: 'fault'; data: FaultCode }
  | { key: string; kind: 'issue'; data: KnownIssue };

/** Map ranked knowledge chunks (faults + known issues) back to full records. */
function runSearch(query: string): Result[] {
  const hits = searchKnowledge(query, { kinds: ['fault', 'issue'], limit: 30 });
  const out: Result[] = [];
  for (const h of hits) {
    if (h.kind === 'fault') {
      const f = FAULT_BY_CODE.get(h.source.toUpperCase());
      if (f) out.push({ key: `fault:${f.code}`, kind: 'fault', data: f });
    } else if (h.kind === 'issue') {
      const k = ISSUE_BY_ID.get(h.source);
      if (k) out.push({ key: `issue:${k.id}`, kind: 'issue', data: k });
    }
  }
  return out;
}

// A part-number-looking query (e.g. "981.351", "9A1 105", "99710764340") should
// hit the parts catalog only — not flood the fault/issue list with every entry
// that mentions the bare "981" model token. OBD-II codes (P0301) are NOT parts.
function looksLikePartNumber(q: string): boolean {
  const n = q.replace(/[^a-z0-9]/gi, '').toLowerCase();
  if (n.length < 5) return false;
  // OBD-II fault code: letter + system digit (0-3) + 3 hex chars (e.g. P0301, P000C).
  if (/^[pbcu][0-3][0-9a-f]{3}$/.test(n)) return false;
  const digits = (n.match(/\d/g) || []).length;
  return digits / n.length >= 0.6;
}

const EXAMPLES = ['P0301', 'P000C', 'rough idle', 'coolant leak', 'water pump', '99710764340'];

export default function FaultFinding() {
  const [query, setQuery] = useState('');
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [parts, setParts] = useState<CatalogPartRow[]>([]);
  const [partsLoading, setPartsLoading] = useState(false);

  const trimmed = query.trim();
  const results = useMemo(() => {
    if (!trimmed) return []; // no default list — prompt to search instead
    if (looksLikePartNumber(trimmed)) return []; // part-number query → parts only
    return runSearch(trimmed);
  }, [trimmed]);

  // Parts come from the central Supabase catalog (debounced). Empty query → no parts.
  useEffect(() => {
    if (!trimmed) {
      setParts([]);
      setPartsLoading(false);
      return;
    }
    let active = true;
    setPartsLoading(true);
    const t = setTimeout(() => {
      searchParts(trimmed, 25).then((rows) => {
        if (active) {
          setParts(rows);
          setPartsLoading(false);
        }
      });
    }, 220);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [trimmed]);

  function toggle(key: string) {
    setOpenKey((cur) => (cur === key ? null : key));
  }

  return (
    <div className="padView" style={{ padding: 28, maxWidth: 920 }}>
      {/* search */}
      <div style={{ background: '#fff', border: '1px solid #E3E3E5', borderRadius: 4, padding: '18px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: mono, color: 'var(--red, #D5001C)', fontSize: 16 }}>&#9906;</span>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a fault code (P0301), symptom (rough idle), or part number (981.351…)"
            style={{
              flex: 1,
              height: 40,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              font: "400 15px 'Helvetica Neue',Arial,sans-serif",
              color: '#0B0B0C',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9A9AA0', font: `500 11px/1 ${mono}`, letterSpacing: '.08em' }}
            >
              CLEAR
            </button>
          )}
        </div>
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.1em', color: '#B4B4B8' }}>TRY</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setQuery(ex)}
              style={{
                padding: '5px 9px',
                background: '#F6F6F7',
                border: '1px solid #E3E3E5',
                borderRadius: 2,
                cursor: 'pointer',
                font: `500 11px/1 ${mono}`,
                color: '#6E6E73',
              }}
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* result count / context line — only while searching */}
      {trimmed && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
          <div style={{ font: `500 11px/1 ${mono}`, letterSpacing: '.16em', color: '#6E6E73' }}>SEARCH RESULTS</div>
          <div style={{ font: "400 13px/1 'Helvetica Neue',Arial,sans-serif", color: '#9A9AA0' }}>
            {`${results.length} code${results.length === 1 ? '' : 's'} & issue${results.length === 1 ? '' : 's'}` +
              (parts.length || partsLoading ? ` · ${partsLoading && !parts.length ? '…' : parts.length} part${parts.length === 1 ? '' : 's'}` : '')}
          </div>
        </div>
      )}

      {!trimmed ? (
        <div style={{ background: '#fff', border: '1px solid #E3E3E5', borderRadius: 4, padding: '52px 24px', textAlign: 'center' }}>
          <div style={{ font: `500 11px/1 ${mono}`, letterSpacing: '.16em', color: '#6E6E73', marginBottom: 12 }}>981 DIAGNOSTIC SEARCH</div>
          <div style={{ font: "400 14px/1.7 'Helvetica Neue',Arial,sans-serif", color: '#9A9AA0', maxWidth: 400, margin: '0 auto' }}>
            Search the knowledge base by OBD-II fault code, symptom, or OEM part number to see causes, diagnostic steps, known issues and parts.
          </div>
        </div>
      ) : results.length === 0 && parts.length === 0 && !partsLoading ? (
        <div style={{ background: '#fff', border: '1px solid #E3E3E5', borderRadius: 4, padding: '40px 20px', textAlign: 'center', font: "400 13px/1.6 'Helvetica Neue',Arial,sans-serif", color: '#9A9AA0' }}>
          Nothing matches &ldquo;{trimmed}&rdquo;.<br />
          Try a symptom, a system name (e.g. cooling, brakes), an OBD-II code, or an OEM part number.
        </div>
      ) : (
        <>
          {results.map((r) =>
            r.kind === 'fault' ? (
              <FaultCard key={r.key} f={r.data} open={openKey === r.key} onToggle={() => toggle(r.key)} />
            ) : (
              <IssueCard key={r.key} k={r.data} open={openKey === r.key} onToggle={() => toggle(r.key)} />
            ),
          )}
          {trimmed && (parts.length > 0 || partsLoading) && <PartsResults parts={parts} loading={partsLoading} />}
        </>
      )}
    </div>
  );
}

/** OEM parts matched from the central Supabase catalog (~4,100 parts). */
function PartsResults({ parts, loading }: { parts: CatalogPartRow[]; loading: boolean }) {
  const [copied, setCopied] = useState<string | null>(null);
  function copy(pn: string) {
    navigator.clipboard?.writeText(pn);
    setCopied(pn);
    setTimeout(() => setCopied((c) => (c === pn ? null : c)), 1300);
  }
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
        <SectionLabel>OEM PARTS</SectionLabel>
        <span style={{ font: "400 12px/1 'Helvetica Neue',Arial,sans-serif", color: '#B4B4B8' }}>
          {loading && !parts.length ? 'searching…' : 'from the parts catalog'}
        </span>
      </div>
      {parts.length === 0 ? null : (
        <div style={{ background: '#fff', border: '1px solid #E3E3E5', borderRadius: 4, overflow: 'hidden' }}>
          {parts.map((p) => (
            <button
              key={p.partNumber}
              onClick={() => copy(p.partNumber)}
              title="Copy part number"
              style={{
                width: '100%', display: 'flex', alignItems: 'baseline', gap: 12, padding: '11px 16px',
                borderBottom: '1px solid #F2F2F3', background: 'transparent', border: 'none', borderTop: 'none',
                borderLeft: 'none', borderRight: 'none', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ flexShrink: 0, width: 132, font: `600 12px/1.3 ${mono}`, color: '#0B0B0C' }}>{p.partNumber}</span>
              <span style={{ flex: 1, font: "400 13px/1.4 'Helvetica Neue',Arial,sans-serif", color: '#2A2A2E' }}>
                {p.description || '—'}
              </span>
              {p.system && <span className="hideOnMobile" style={{ flexShrink: 0, font: `500 10px/1 ${mono}`, letterSpacing: '.04em', color: '#9A9AA0' }}>{p.system}</span>}
              <span style={{ flexShrink: 0, width: 52, textAlign: 'right', font: `500 9px/1 ${mono}`, letterSpacing: '.08em', color: copied === p.partNumber ? 'var(--red, #D5001C)' : '#C4C4C8' }}>
                {copied === p.partNumber ? 'COPIED' : 'COPY'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- shared bits ----------------------------------------------------------

function SevBadge({ sev }: { sev: Severity }) {
  const [color, bg] = SEV_MAP[sev];
  return (
    <span style={{ flexShrink: 0, font: `700 9px/1 ${mono}`, letterSpacing: '.1em', padding: '6px 8px', borderRadius: 2, color, background: bg }}>
      {sev}
    </span>
  );
}

function CardShell({
  badge, title, sub, kindTag, open, onToggle, children,
}: {
  badge: React.ReactNode; title: string; sub: string; kindTag: string;
  open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E3E3E5', borderRadius: 4, marginBottom: 12, overflow: 'hidden' }}>
      <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px', cursor: 'pointer' }}>
        {badge}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: "400 16px/1.25 'Helvetica Neue',Arial,sans-serif", color: '#0B0B0C' }}>{title}</div>
          <div style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.1em', color: '#9A9AA0', marginTop: 5 }}>{sub}</div>
        </div>
        <span style={{ flexShrink: 0, font: `600 8px/1 ${mono}`, letterSpacing: '.12em', color: '#B4B4B8' }}>{kindTag}</span>
        <span style={{ flexShrink: 0, font: `500 18px/1 ${mono}`, color: '#B4B4B8', width: 16, textAlign: 'center' }}>{open ? '–' : '+'}</span>
      </div>
      <div style={{ maxHeight: open ? 900 : 0, overflow: 'hidden', borderTop: open ? '1px solid #F0F0F1' : 'none', transition: 'max-height .3s' }}>
        <div style={{ padding: '16px 20px 20px' }}>{children}</div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.12em', color: '#9A9AA0', margin: '0 0 10px' }}>{children}</div>;
}

function BulletList({ items, marker = '•', markerColor = 'var(--red, #D5001C)' }: { items: string[]; marker?: string; markerColor?: string }) {
  return (
    <>
      {items.map((c, i) => (
        <div key={i} style={{ display: 'flex', gap: 9, marginBottom: 8, font: "400 13px/1.45 'Helvetica Neue',Arial,sans-serif", color: '#2A2A2E' }}>
          <span style={{ color: markerColor, fontFamily: mono, flexShrink: 0 }}>{marker}</span>
          {c}
        </div>
      ))}
    </>
  );
}

function SourceLink({ url }: { url?: string }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.06em', color: '#6E6E73' }}>
      SOURCE ↗
    </a>
  );
}

// ---- cards ----------------------------------------------------------------

function FaultCard({ f, open, onToggle }: { f: FaultCode; open: boolean; onToggle: () => void }) {
  return (
    <CardShell
      badge={<SevBadge sev={f.severity} />}
      title={`${f.code} — ${f.title}`}
      sub={`${f.system}${f.appliesTo?.length ? ' · ' + f.appliesTo.join(', ') : ''}`}
      kindTag="FAULT CODE"
      open={open}
      onToggle={onToggle}
    >
      {f.description && (
        <p style={{ margin: '0 0 16px', font: "400 13.5px/1.6 'Helvetica Neue',Arial,sans-serif", color: '#2A2A2E' }}>{f.description}</p>
      )}
      <div className="stackSm" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
        <div>
          <SectionLabel>LIKELY CAUSES</SectionLabel>
          <BulletList items={f.causes} />
        </div>
        <div>
          <SectionLabel>DIAGNOSTIC CHECKS</SectionLabel>
          <BulletList items={f.diagnosis} marker="→" markerColor="#9A9AA0" />
        </div>
      </div>
      {f.symptoms?.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <SectionLabel>SYMPTOMS</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {f.symptoms.map((s, i) => (
              <span key={i} style={{ font: `500 11px/1.3 ${mono}`, color: '#6E6E73', background: '#F4F4F5', border: '1px solid #EAEAEC', borderRadius: 2, padding: '5px 8px' }}>{s}</span>
            ))}
          </div>
        </div>
      )}
      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        {f.relatedParts?.length ? (
          <>
            <span style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.1em', color: '#9A9AA0' }}>PARTS:</span>
            <span style={{ font: `500 11px/1.4 ${mono}`, color: '#6E6E73' }}>{f.relatedParts.join(' · ')}</span>
          </>
        ) : null}
        <span style={{ marginLeft: 'auto' }}><SourceLink url={f.source} /></span>
      </div>
    </CardShell>
  );
}

function IssueCard({ k, open, onToggle }: { k: KnownIssue; open: boolean; onToggle: () => void }) {
  return (
    <CardShell
      badge={<SevBadge sev={k.severity} />}
      title={k.title}
      sub={`${k.system} · ${k.affected}`}
      kindTag="KNOWN ISSUE"
      open={open}
      onToggle={onToggle}
    >
      {k.description && (
        <p style={{ margin: '0 0 16px', font: "400 13.5px/1.6 'Helvetica Neue',Arial,sans-serif", color: '#2A2A2E' }}>{k.description}</p>
      )}
      {k.symptoms?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <SectionLabel>SYMPTOMS</SectionLabel>
          <BulletList items={k.symptoms} />
        </div>
      )}
      <div>
        <SectionLabel>FIX</SectionLabel>
        <p style={{ margin: 0, font: "400 13.5px/1.6 'Helvetica Neue',Arial,sans-serif", color: '#2A2A2E' }}>{k.fix}</p>
      </div>
      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        {k.estCost && (
          <>
            <span style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.1em', color: '#9A9AA0' }}>EST. COST:</span>
            <span style={{ font: `500 11px/1.4 ${mono}`, color: '#6E6E73' }}>{k.estCost}</span>
          </>
        )}
        <span style={{ marginLeft: 'auto' }}><SourceLink url={k.source} /></span>
      </div>
    </CardShell>
  );
}
