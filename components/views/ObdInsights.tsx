'use client';

/**
 * Live-OBD insight panels: plain-English interpretation of data already flowing
 * through Live OBD. Pure logic lives in `lib/obd/insights.ts`; these components
 * only render it. Design system: inline styles, white cards with tone-coloured
 * borders (never filled tints), mono labels, responsive grids/chips.
 */
import type { CSSProperties, ReactNode } from 'react';
import { mono, sans } from '@/components/tools/ui';
import type { LiveData, Mode06Data } from '@/lib/obd/types';
import {
  analyzeFuelTrims,
  assessReadiness,
  formatTrimPct,
  misfireCounts,
  type BankTrim,
  type TrimSeverity,
} from '@/lib/obd/insights';

/* --------------------------------------------------------------- shared bits */

type Tone = 'ok' | 'warn' | 'bad' | 'neutral';

const TONE: Record<Tone, { fg: string; border: string; soft: string }> = {
  ok: { fg: '#1A7A42', border: 'rgba(27,138,75,.35)', soft: '#E8F8EE' },
  warn: { fg: '#8A5A00', border: 'rgba(178,106,0,.35)', soft: '#FCEFD8' },
  bad: { fg: '#8A0011', border: 'rgba(213,0,28,.3)', soft: '#FBE3E6' },
  neutral: { fg: '#6E6E73', border: '#E3E3E5', soft: '#F0F0F1' },
};

function sevTone(sev: TrimSeverity | null | undefined): Tone {
  return sev === 'alert' ? 'bad' : sev === 'watch' ? 'warn' : sev === 'ok' ? 'ok' : 'neutral';
}

const card: CSSProperties = {
  background: '#fff',
  border: '1px solid #E3E3E5',
  borderRadius: 6,
  overflow: 'hidden',
};

const cardHead: CSSProperties = {
  margin: 0,
  padding: '16px 20px',
  font: `600 12px/1 ${mono}`,
  letterSpacing: '.14em',
  color: '#D5001C',
  borderBottom: '1px solid #F0F0F1',
  textTransform: 'uppercase',
};

const body: CSSProperties = { padding: '20px 22px 24px' };

const microLabel: CSSProperties = {
  font: `600 10px/1 ${mono}`,
  letterSpacing: '.12em',
  color: '#9A9AA0',
  textTransform: 'uppercase',
};

const bodyText: CSSProperties = { font: `400 14px/1.55 ${sans}`, color: '#3A3A3E' };
const mutedText: CSSProperties = { margin: 0, font: `400 14px/1.5 ${sans}`, color: '#6E6E73' };

/** Small status pill (matches the SeverityTag look already used in Live OBD). */
function Tag({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  const t = TONE[tone];
  return (
    <span
      style={{
        font: `600 9px/1 ${mono}`,
        letterSpacing: '.1em',
        textTransform: 'uppercase',
        padding: '5px 9px',
        borderRadius: 2,
        background: t.soft,
        color: t.fg,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

/** White result box with a tone-coloured border (never a filled tint). */
function ToneBox({ tone = 'neutral', label, children }: { tone?: Tone; label: string; children: ReactNode }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${TONE[tone].border}`, borderRadius: 6, padding: '14px 16px' }}>
      <div style={{ ...microLabel, marginBottom: 8 }}>{label}</div>
      <div style={bodyText}>{children}</div>
    </div>
  );
}

/* -------------------------------------------------------- 1) fuel-trim insight */

function BankTile({ bank, n }: { bank: BankTrim | null; n: number }) {
  if (!bank) {
    return (
      <div style={{ background: '#fff', border: '1px solid #E3E3E5', borderRadius: 6, padding: '14px 16px', opacity: 0.75 }}>
        <div style={microLabel}>Bank {n}</div>
        <div style={{ font: `300 26px/1.1 ${sans}`, color: '#B4B4B8', margin: '10px 0 8px' }}>N/A</div>
        <div style={{ font: `500 11px/1.4 ${mono}`, color: '#9A9AA0' }}>no data</div>
      </div>
    );
  }
  const tone = sevTone(bank.severity);
  const t = TONE[tone];
  const partial = bank.total == null;
  return (
    <div style={{ background: '#fff', border: `1px solid ${t.border}`, borderRadius: 6, padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span style={microLabel}>Bank {n}</span>
        {bank.severity && bank.direction && (
          <Tag tone={tone}>
            {bank.direction} · {bank.severity}
          </Tag>
        )}
      </div>
      <div style={{ font: `300 30px/1.1 ${sans}`, color: partial ? '#B4B4B8' : t.fg, margin: '10px 0 8px' }}>
        {bank.total != null ? formatTrimPct(bank.total) : '—'}
      </div>
      <div style={{ font: `500 11px/1.5 ${mono}`, color: '#6E6E73' }}>
        STFT {bank.stft != null ? formatTrimPct(bank.stft) : '—'} · LTFT {bank.ltft != null ? formatTrimPct(bank.ltft) : '—'}
      </div>
    </div>
  );
}

export function FuelTrimInsight({ live }: { live: LiveData | null }) {
  const result = analyzeFuelTrims(live?.values);
  const { bank1, bank2, overall, summary, hint } = result;
  const hasBanks = !!bank1 || !!bank2;
  const statusTone: Tone = overall ? sevTone(overall.severity) : 'neutral';
  const statusLabel = overall ? overall.severity : 'no data';

  return (
    <section style={card}>
      <h2 style={cardHead}>Fuel-trim diagnosis</h2>
      <div style={body}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
          <Tag tone={statusTone}>{statusLabel}</Tag>
          {overall && overall.scope !== 'normal' && <Tag tone="neutral">{overall.scope}</Tag>}
          <span style={{ ...bodyText, flex: '1 1 240px' }}>{summary}</span>
        </div>

        {hasBanks && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 14,
              marginBottom: 16,
            }}
          >
            <BankTile bank={bank1} n={1} />
            <BankTile bank={bank2} n={2} />
          </div>
        )}

        <ToneBox tone={statusTone} label="What it means">
          {hint}
        </ToneBox>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- 2) readiness insight */

export function ReadinessInsight({ live }: { live: LiveData | null }) {
  const hasData = !!live?.readiness;
  const r = assessReadiness(live?.readiness ?? null);
  const verdict = !hasData
    ? { label: 'No data', tone: 'neutral' as Tone }
    : r.ready
      ? { label: 'Ready', tone: 'ok' as Tone }
      : { label: 'Not ready', tone: 'bad' as Tone };

  return (
    <section style={card}>
      <h2 style={cardHead}>Emissions readiness</h2>
      <div style={body}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
          <span
            style={{
              font: `600 13px/1 ${mono}`,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              color: TONE[verdict.tone].fg,
            }}
          >
            {verdict.label}
          </span>
          {hasData && <Tag tone={r.mil ? 'bad' : 'ok'}>MIL {r.mil ? 'on' : 'off'}</Tag>}
        </div>

        <ToneBox tone={verdict.tone} label="Verdict">
          {r.note}
        </ToneBox>

        {r.incompleteLabels.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ ...microLabel, marginBottom: 10 }}>Incomplete monitors</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {r.incompleteLabels.map((label) => (
                <Tag key={label} tone="warn">
                  {label}
                </Tag>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ 3) misfire insight */

export function MisfireInsight({ mode06 }: { mode06: Mode06Data | null }) {
  const rows = misfireCounts(mode06);
  const outliers = rows.filter((r) => r.outlier);
  const maxCount = Math.max(1, ...rows.map((r) => r.count));

  const summary = outliers.length
    ? `${outliers.map((o) => o.label.replace(/^Misfire\s*·\s*/i, '')).join(', ')} standing out above the others.`
    : 'Misfire counts are even across cylinders — nothing standing out.';

  return (
    <section style={card}>
      <h2 style={cardHead}>Per-cylinder misfire</h2>
      <div style={body}>
        {!mode06 ? (
          <p style={mutedText}>
            Read monitors to see per-cylinder misfire. Open the <strong>Monitors</strong> tab and tap{' '}
            <strong>Read monitors</strong> — Mode 06 misfire counts will appear here.
          </p>
        ) : !rows.length ? (
          <p style={mutedText}>This ECU reported no per-cylinder misfire monitors (Mode 06 MIDs $A0–$AB).</p>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
              <Tag tone={outliers.length ? 'warn' : 'ok'}>{outliers.length ? 'uneven' : 'even'}</Tag>
              <span style={{ ...bodyText, flex: '1 1 240px' }}>{summary}</span>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {rows.map((r) => {
                const frac = Math.min(1, Math.max(0, r.count / maxCount));
                return (
                  <div
                    key={r.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      flexWrap: 'wrap',
                      border: `1px solid ${r.outlier ? TONE.bad.border : '#E3E3E5'}`,
                      borderRadius: 4,
                      padding: '10px 14px',
                    }}
                  >
                    <span style={{ font: `500 12px/1.3 ${mono}`, color: '#0B0B0C', width: 150, flexShrink: 0 }}>
                      {r.label}
                    </span>
                    <div style={{ flex: '1 1 140px', minWidth: 120 }}>
                      <div style={{ position: 'relative', height: 6, background: '#EEEEF0', borderRadius: 3 }}>
                        <span
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: `${frac * 100}%`,
                            height: 6,
                            borderRadius: 3,
                            background: r.outlier ? '#D5001C' : '#B4B4B8',
                          }}
                        />
                      </div>
                    </div>
                    <span style={{ font: `500 15px/1 ${sans}`, color: r.outlier ? '#D5001C' : '#0B0B0C', width: 52, textAlign: 'right' }}>
                      {r.count}
                    </span>
                    {r.outlier ? <Tag tone="bad">elevated</Tag> : <span style={{ width: 0 }} />}
                  </div>
                );
              })}
            </div>
            <p style={{ margin: '14px 0 0', font: `400 12px/1.5 ${sans}`, color: '#9A9AA0' }}>
              Counts are the ECU&apos;s Mode 06 misfire tallies. A cylinder well above the median of the others is worth a
              closer look (coil, plug, injector, or compression on that cylinder).
            </p>
          </>
        )}
      </div>
    </section>
  );
}
