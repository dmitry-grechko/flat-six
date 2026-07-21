'use client';

import type { CSSProperties, ReactNode } from 'react';
import { fmtMiles } from '@/lib/data';
import { generationForBody } from '@/lib/models';
import type { ServicePlan, ServicePlanStatus, ServiceRecord, Vehicle } from '@/lib/types';

const SANS = "'Helvetica Neue',Arial,sans-serif";
const MONO = "'JetBrains Mono',monospace";
const RED = '#D5001C';
const INK = '#0B0B0C';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmtDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`;
}

function nowStamp(): string {
  const d = new Date();
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

const sectionLabel: CSSProperties = {
  font: `600 10px/1 ${MONO}`,
  letterSpacing: '.18em',
  textTransform: 'uppercase',
  color: '#8A8A8F',
  paddingBottom: 6,
  borderBottom: '1px solid #E3E3E5',
  marginBottom: 12,
};

// ---------------------------------------------------------------------------
// Shared report shell — brand header, vehicle strip, footer.
// ---------------------------------------------------------------------------
function ReportShell({
  docType,
  heading,
  badge,
  vehicle,
  units,
  children,
}: {
  docType: string;
  heading: string;
  badge?: { label: string; color: string; bg: string };
  vehicle: Vehicle;
  units: 'mi' | 'km';
  children: ReactNode;
}) {
  const gen = generationForBody(vehicle.body);
  const facts: [string, string][] = [
    ['Vehicle', [vehicle.year, vehicle.model].filter(Boolean).join(' ') || '—'],
    ['Generation', gen || '—'],
    ['VIN', vehicle.vin || '—'],
    ['Plate', vehicle.plate || '—'],
    ['Odometer', vehicle.mileage ? fmtMiles(vehicle.mileage, units) : '—'],
    ['Engine', vehicle.engine || '—'],
    ['Transmission', vehicle.trans || '—'],
    ['Paint', vehicle.colorName || '—'],
  ];

  return (
    <div
      style={{
        font: `400 13px/1.5 ${SANS}`,
        color: INK,
        background: '#fff',
        maxWidth: 820,
        margin: '0 auto',
        padding: '4px 2px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 20,
          paddingBottom: 14,
          borderBottom: `2px solid ${INK}`,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ width: 15, height: 15, background: RED, display: 'inline-block', borderRadius: 1 }} />
            <span style={{ font: `700 18px/1 ${SANS}`, letterSpacing: '.14em' }}>FLAT·SIX</span>
          </div>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ font: `600 22px/1.1 ${SANS}`, letterSpacing: '-.01em' }}>{heading}</span>
            {badge && (
              <span
                style={{
                  font: `600 9px/1 ${MONO}`,
                  letterSpacing: '.1em',
                  padding: '4px 7px',
                  borderRadius: 2,
                  background: badge.bg,
                  color: badge.color,
                }}
              >
                {badge.label}
              </span>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ font: `600 10px/1.4 ${MONO}`, letterSpacing: '.14em', color: '#8A8A8F', textTransform: 'uppercase' }}>
            {docType}
          </div>
          <div style={{ marginTop: 6, font: `500 10px/1.4 ${MONO}`, color: '#9A9AA0' }}>Generated {nowStamp()}</div>
        </div>
      </div>

      {/* Vehicle strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '10px 22px',
          padding: '16px 0 18px',
          borderBottom: '1px solid #E3E3E5',
          marginBottom: 22,
          breakInside: 'avoid',
        }}
      >
        {facts.map(([k, v]) => (
          <div key={k}>
            <div style={{ font: `600 8.5px/1 ${MONO}`, letterSpacing: '.14em', textTransform: 'uppercase', color: '#9A9AA0' }}>
              {k}
            </div>
            <div style={{ marginTop: 5, font: `500 12px/1.35 ${SANS}`, color: INK, wordBreak: 'break-word' }}>{v}</div>
          </div>
        ))}
      </div>

      {children}

      {/* Footer */}
      <div
        style={{
          marginTop: 28,
          paddingTop: 10,
          borderTop: '1px solid #E3E3E5',
          display: 'flex',
          justifyContent: 'space-between',
          font: `500 9.5px/1.4 ${MONO}`,
          letterSpacing: '.04em',
          color: '#B4B4B8',
        }}
      >
        <span>FLAT·SIX — DIY garage for the Porsche 718 / 981 / 987 / 911</span>
        <span>flat-six.org</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Service history — full maintenance log for the vehicle.
// ---------------------------------------------------------------------------
export function ServiceHistoryReport({
  vehicle,
  records,
  units,
}: {
  vehicle: Vehicle;
  records: ServiceRecord[];
  units: 'mi' | 'km';
}) {
  const sorted = [...records].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const diy = sorted.filter((r) => r.diy).length;
  const dates = sorted.map((r) => r.date).filter(Boolean).sort();
  const range = dates.length ? `${fmtDate(dates[0])} – ${fmtDate(dates[dates.length - 1])}` : '—';

  const summary: [string, string][] = [
    ['Records', String(sorted.length)],
    ['DIY jobs', String(diy)],
    ['Shop visits', String(sorted.length - diy)],
    ['Date range', range],
  ];

  return (
    <ReportShell docType="Service History" heading="Service History" vehicle={vehicle} units={units}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          marginBottom: 24,
        }}
      >
        {summary.map(([k, v]) => (
          <div key={k} style={{ border: '1px solid #E3E3E5', borderRadius: 3, padding: '12px 14px' }}>
            <div style={{ font: `600 8.5px/1 ${MONO}`, letterSpacing: '.14em', textTransform: 'uppercase', color: '#9A9AA0' }}>
              {k}
            </div>
            <div style={{ marginTop: 7, font: `400 17px/1 ${SANS}`, color: INK }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={sectionLabel}>Service log</div>

      {sorted.length === 0 ? (
        <div style={{ font: `400 13px/1.5 ${SANS}`, color: '#9A9AA0' }}>No service records logged yet.</div>
      ) : (
        <div>
          {sorted.map((rec) => (
            <div
              key={rec.id}
              style={{
                display: 'flex',
                gap: 16,
                padding: '13px 0',
                borderBottom: '1px solid #F0F0F1',
                breakInside: 'avoid',
              }}
            >
              <div style={{ flexShrink: 0, width: 92 }}>
                <div style={{ font: `500 11px/1.3 ${MONO}`, color: INK }}>{fmtDate(rec.date)}</div>
                <div style={{ marginTop: 4, font: `500 10px/1 ${MONO}`, color: '#9A9AA0' }}>
                  {rec.mileage ? fmtMiles(rec.mileage, units) : ''}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ font: `600 14px/1.3 ${SANS}`, color: INK }}>{rec.title}</span>
                  <span
                    style={{
                      font: `600 8px/1 ${MONO}`,
                      letterSpacing: '.1em',
                      padding: '3px 6px',
                      borderRadius: 2,
                      background: rec.diy ? 'rgba(213,0,28,.1)' : '#EEEEF0',
                      color: rec.diy ? RED : '#6E6E73',
                    }}
                  >
                    {rec.diy ? 'DIY' : 'SHOP'}
                  </span>
                </div>
                {rec.items.length > 0 && (
                  <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {rec.items.map((it, i) => (
                      <div key={i} style={{ font: `400 12px/1.45 ${SANS}`, color: '#3A3A3E' }}>
                        <span style={{ color: '#B4B4B8', marginRight: 6 }}>•</span>
                        <span style={{ fontWeight: 500 }}>{it.name}</span>
                        {it.partNumber && (
                          <span style={{ font: `500 10.5px ${MONO}`, color: '#6E6E73' }}> · {it.partNumber}</span>
                        )}
                        {it.cost && <span style={{ font: `500 10.5px ${MONO}`, color: '#9A9AA0' }}> · {it.cost}</span>}
                        {it.description && <span style={{ color: '#8A8A8F' }}> — {it.description}</span>}
                      </div>
                    ))}
                  </div>
                )}
                {rec.notes && (
                  <div
                    style={{
                      marginTop: 7,
                      padding: '7px 9px',
                      background: '#FAFAFA',
                      borderLeft: '2px solid #E3E3E5',
                      whiteSpace: 'pre-wrap',
                      font: `400 11.5px/1.5 ${SANS}`,
                      color: '#6E6E73',
                    }}
                  >
                    {rec.notes}
                  </div>
                )}
              </div>
              <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 60 }}>
                <div style={{ font: `600 13px/1 ${MONO}`, color: INK }}>{rec.cost || ''}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ReportShell>
  );
}

// ---------------------------------------------------------------------------
// Single service record — one job as a standalone receipt / record sheet.
// ---------------------------------------------------------------------------
export function ServiceRecordReport({
  vehicle,
  record,
  units,
}: {
  vehicle: Vehicle;
  record: ServiceRecord;
  units: 'mi' | 'km';
}) {
  const meta: [string, string][] = [
    ['Date', fmtDate(record.date)],
    ['Odometer', record.mileage ? fmtMiles(record.mileage, units) : '—'],
    ['Performed by', record.diy ? 'DIY / owner' : 'Workshop'],
    ['Cost', record.cost || '—'],
  ];

  return (
    <ReportShell
      docType="Service Record"
      heading={record.title}
      badge={
        record.diy
          ? { label: 'DIY', color: RED, bg: 'rgba(213,0,28,.1)' }
          : { label: 'SHOP', color: '#6E6E73', bg: '#EEEEF0' }
      }
      vehicle={vehicle}
      units={units}
    >
      <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap', marginBottom: 22 }}>
        {meta.map(([k, v]) => (
          <div key={k}>
            <div style={{ font: `600 8.5px/1 ${MONO}`, letterSpacing: '.14em', textTransform: 'uppercase', color: '#9A9AA0' }}>
              {k}
            </div>
            <div style={{ marginTop: 5, font: `500 13px/1.3 ${SANS}`, color: INK }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={sectionLabel}>Work performed</div>

      {record.items.length === 0 ? (
        <div style={{ font: `400 13px/1.5 ${SANS}`, color: '#9A9AA0' }}>No line items recorded.</div>
      ) : (
        <div>
          {record.items.map((it, i) => (
            <div
              key={i}
              style={{ padding: '11px 0', borderBottom: '1px solid #F0F0F1', breakInside: 'avoid' }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ font: `500 14px/1.35 ${SANS}`, color: INK }}>{it.name}</span>
                {it.partNumber && (
                  <span
                    style={{
                      font: `500 10px/1 ${MONO}`,
                      color: '#6E6E73',
                      background: '#F4F4F5',
                      border: '1px solid #EAEAEC',
                      borderRadius: 2,
                      padding: '3px 6px',
                    }}
                  >
                    {it.partNumber}
                  </span>
                )}
                {it.cost && <span style={{ font: `500 11px/1 ${MONO}`, color: '#9A9AA0' }}>{it.cost}</span>}
              </div>
              {it.description && (
                <div style={{ marginTop: 4, whiteSpace: 'pre-wrap', font: `400 12px/1.5 ${SANS}`, color: '#8A8A8F' }}>
                  {it.description}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {record.notes && (
        <>
          <div style={{ ...sectionLabel, marginTop: 22 }}>Notes</div>
          <div style={{ whiteSpace: 'pre-wrap', font: `400 12.5px/1.6 ${SANS}`, color: '#4A4A4E' }}>{record.notes}</div>
        </>
      )}
    </ReportShell>
  );
}

// ---------------------------------------------------------------------------
// Service plan — a single plan as a garage checklist.
// ---------------------------------------------------------------------------
const STATUS_BADGE: Record<ServicePlanStatus, { label: string; color: string; bg: string }> = {
  planning: { label: 'PLANNING', color: '#6E6E73', bg: '#EEEEF0' },
  ordered: { label: 'PARTS ORDERED', color: '#C77700', bg: 'rgba(199,119,0,.12)' },
  scheduled: { label: 'SCHEDULED', color: '#1E6FD6', bg: 'rgba(30,111,214,.12)' },
  done: { label: 'DONE', color: '#1E8E4E', bg: 'rgba(30,142,78,.12)' },
};

export function ServicePlanReport({
  vehicle,
  plan,
  units,
}: {
  vehicle: Vehicle;
  plan: ServicePlan;
  units: 'mi' | 'km';
}) {
  const doneN = plan.items.filter((i) => i.done).length;
  const meta: [string, string][] = [];
  if (plan.targetDate) meta.push(['Target date', fmtDate(plan.targetDate)]);
  if (plan.targetMileage) meta.push(['Target odometer', fmtMiles(plan.targetMileage, units)]);
  meta.push(['Items', `${plan.items.length}${plan.items.length ? ` · ${doneN} done` : ''}`]);

  return (
    <ReportShell
      docType="Service Plan"
      heading={plan.title}
      badge={STATUS_BADGE[plan.status]}
      vehicle={vehicle}
      units={units}
    >
      {meta.length > 0 && (
        <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap', marginBottom: 20 }}>
          {meta.map(([k, v]) => (
            <div key={k}>
              <div style={{ font: `600 8.5px/1 ${MONO}`, letterSpacing: '.14em', textTransform: 'uppercase', color: '#9A9AA0' }}>
                {k}
              </div>
              <div style={{ marginTop: 5, font: `500 13px/1.3 ${SANS}`, color: INK }}>{v}</div>
            </div>
          ))}
        </div>
      )}

      {plan.notes && (
        <div
          style={{
            marginBottom: 22,
            padding: '10px 12px',
            background: '#FAFAFA',
            borderLeft: `2px solid ${RED}`,
            whiteSpace: 'pre-wrap',
            font: `400 12.5px/1.55 ${SANS}`,
            color: '#4A4A4E',
          }}
        >
          {plan.notes}
        </div>
      )}

      <div style={sectionLabel}>Planned items</div>

      {plan.items.length === 0 ? (
        <div style={{ font: `400 13px/1.5 ${SANS}`, color: '#9A9AA0' }}>No items on this plan yet.</div>
      ) : (
        <div>
          {plan.items.map((it, idx) => (
            <div
              key={it.id}
              style={{
                display: 'flex',
                gap: 12,
                padding: '12px 0',
                borderBottom: '1px solid #F0F0F1',
                breakInside: 'avoid',
              }}
            >
              {/* checkbox */}
              <div
                style={{
                  flexShrink: 0,
                  marginTop: 1,
                  width: 16,
                  height: 16,
                  borderRadius: 3,
                  border: it.done ? `1px solid ${RED}` : '1px solid #C4C4C8',
                  background: it.done ? RED : '#fff',
                  color: '#fff',
                  font: `700 10px/14px ${MONO}`,
                  textAlign: 'center',
                }}
              >
                {it.done ? '✓' : ''}
              </div>
              <div style={{ flexShrink: 0, font: `500 11px/1.4 ${MONO}`, color: '#B4B4B8', width: 20 }}>
                {String(idx + 1).padStart(2, '0')}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      font: `500 14px/1.35 ${SANS}`,
                      color: it.done ? '#9A9AA0' : INK,
                      textDecoration: it.done ? 'line-through' : 'none',
                    }}
                  >
                    {it.name}
                  </span>
                  {it.partNumber && (
                    <span
                      style={{
                        font: `500 10px/1 ${MONO}`,
                        color: '#6E6E73',
                        background: '#F4F4F5',
                        border: '1px solid #EAEAEC',
                        borderRadius: 2,
                        padding: '3px 6px',
                      }}
                    >
                      {it.partNumber}
                    </span>
                  )}
                </div>
                {it.description && (
                  <div style={{ marginTop: 4, whiteSpace: 'pre-wrap', font: `400 12px/1.5 ${SANS}`, color: '#8A8A8F' }}>
                    {it.description}
                  </div>
                )}
                {it.links && it.links.length > 0 && (
                  <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {it.links.map((l, i) => (
                      <div key={i} style={{ font: `500 10.5px/1.4 ${MONO}`, color: '#6E6E73' }}>
                        <span style={{ color: RED }}>↗ </span>
                        {l.label}
                        <span style={{ color: '#B4B4B8' }}> — {l.url}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </ReportShell>
  );
}
