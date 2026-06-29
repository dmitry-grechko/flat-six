'use client';

import { fmtMiles } from '@/lib/data';
import { useVehicle } from '@/lib/vehicle-context';
import { useServiceRecords } from '@/lib/records-context';
import type { ServiceRecord } from '@/lib/types';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

interface StatCard {
  k: string;
  v: string | number;
  sub: string;
  color: string;
}

export default function ServiceHistory() {
  const { vehicle } = useVehicle();
  const { records, loading } = useServiceRecords();

  const diyCount = records.filter((r) => r.diy).length;
  const lastOil = records.find((r) => r.title.toLowerCase().includes('oil'));

  const stats: StatCard[] = [
    { k: 'TOTAL RECORDS', v: records.length, sub: 'logged services', color: '#0B0B0C' },
    { k: 'DIY JOBS', v: diyCount, sub: 'done yourself', color: 'var(--red, #D5001C)' },
    { k: 'CURRENT ODO', v: fmtMiles(vehicle.mileage), sub: 'as of last entry', color: '#0B0B0C' },
    { k: 'NEXT DUE', v: 'Oil · 10k', sub: lastOil ? 'since ' + lastOil.date : 'overdue check', color: '#C77700' },
  ];

  return (
    <div className="padView" style={{ padding: 28, maxWidth: 1080 }}>
      <div className="statCardsSm" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        {stats.map((st) => (
          <div key={st.k} style={{ background: '#fff', border: '1px solid #E3E3E5', borderRadius: 4, padding: 18 }}>
            <div style={{ font: "500 10px/1 'JetBrains Mono',monospace", letterSpacing: '.12em', color: '#9A9AA0' }}>{st.k}</div>
            <div style={{ marginTop: 10, font: "400 26px/1 'Helvetica Neue',Arial,sans-serif", color: st.color }}>{st.v}</div>
            <div style={{ marginTop: 6, font: "400 12px/1.3 'Helvetica Neue',Arial,sans-serif", color: '#9A9AA0' }}>{st.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
        <div style={{ font: "500 11px/1 'JetBrains Mono',monospace", letterSpacing: '.16em', color: '#6E6E73' }}>SERVICE LOG</div>
        <div style={{ font: "400 13px/1 'Helvetica Neue',Arial,sans-serif", color: '#9A9AA0' }}>{records.length} records</div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E3E3E5', borderRadius: 4, overflow: 'hidden' }}>
        {loading ? (
          <EmptyState text="Loading service log…" />
        ) : records.length === 0 ? (
          <EmptyState text="No records yet — log your first service to start the history." />
        ) : (
          records.map((rec) => <ServiceRow key={rec.id} rec={rec} />)
        )}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: '40px 20px',
        textAlign: 'center',
        font: "400 13px/1.5 'Helvetica Neue',Arial,sans-serif",
        color: '#9A9AA0',
      }}
    >
      {text}
    </div>
  );
}

function ServiceRow({ rec }: { rec: ServiceRecord }) {
  const d = new Date(rec.date + 'T00:00:00');
  const dateTop = MONTHS[d.getMonth()];
  const dateDay = String(d.getDate()).padStart(2, '0');
  const dateYear = d.getFullYear();
  const tag = rec.diy ? 'DIY' : 'SHOP';

  const tagStyle: React.CSSProperties = {
    font: "600 9px/1 'JetBrains Mono',monospace",
    letterSpacing: '.1em',
    padding: '4px 7px',
    borderRadius: 2,
    background: rec.diy ? 'rgba(213,0,28,.1)' : '#EEEEF0',
    color: rec.diy ? 'var(--red, #D5001C)' : '#6E6E73',
  };

  return (
    <div
      className="recrow"
      style={{ display: 'flex', alignItems: 'flex-start', gap: 18, padding: '18px 20px', borderBottom: '1px solid #F0F0F1' }}
    >
      <div style={{ flexShrink: 0, width: 78, textAlign: 'center' }}>
        <div style={{ font: "500 11px/1 'JetBrains Mono',monospace", color: '#9A9AA0' }}>{dateTop}</div>
        <div style={{ font: "400 20px/1.1 'Helvetica Neue',Arial,sans-serif", color: '#0B0B0C', marginTop: 3 }}>{dateDay}</div>
        <div style={{ font: "500 10px/1 'JetBrains Mono',monospace", color: '#9A9AA0', marginTop: 3 }}>{dateYear}</div>
      </div>
      <div style={{ width: 1, alignSelf: 'stretch', background: '#EEEEF0' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ font: "400 16px/1.2 'Helvetica Neue',Arial,sans-serif", color: '#0B0B0C' }}>{rec.title}</span>
          <span style={tagStyle}>{tag}</span>
        </div>
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
          {rec.items.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ font: "500 13px/1.3 'Helvetica Neue',Arial,sans-serif", color: '#1A1A1E' }}>
                {item.name}
              </span>
              {item.partNumber && (
                <span
                  style={{
                    font: "500 10px/1 'JetBrains Mono',monospace",
                    color: '#6E6E73',
                    background: '#F4F4F5',
                    border: '1px solid #EAEAEC',
                    borderRadius: 2,
                    padding: '3px 6px',
                  }}
                >
                  {item.partNumber}
                </span>
              )}
              {item.cost && (
                <span style={{ font: "500 11px/1 'JetBrains Mono',monospace", color: '#9A9AA0' }}>{item.cost}</span>
              )}
              {item.description && (
                <div
                  style={{
                    width: '100%',
                    whiteSpace: 'pre-wrap',
                    font: "400 12.5px/1.5 'Helvetica Neue',Arial,sans-serif",
                    color: '#8A8A8F',
                  }}
                >
                  {item.description}
                </div>
              )}
            </div>
          ))}
        </div>
        {rec.notes && (
          <div
            style={{
              marginTop: 10,
              padding: '8px 10px',
              background: '#FAFAFA',
              borderLeft: '2px solid #E3E3E5',
              whiteSpace: 'pre-wrap',
              font: "400 12.5px/1.5 'Helvetica Neue',Arial,sans-serif",
              color: '#6E6E73',
            }}
          >
            {rec.notes}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0, textAlign: 'right' }}>
        <div style={{ font: "500 13px/1 'JetBrains Mono',monospace", color: '#0B0B0C' }}>{rec.cost}</div>
        <div style={{ font: "500 10px/1 'JetBrains Mono',monospace", color: '#9A9AA0', marginTop: 5 }}>{fmtMiles(rec.mileage)}</div>
      </div>
    </div>
  );
}
