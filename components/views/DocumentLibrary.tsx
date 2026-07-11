'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CATEGORY_LABELS,
  documentsForGeneration,
  getDocument,
  resolveWorkshopViewerLink,
  type DocCategory,
  type DocumentMeta,
} from '@/lib/documents';
import { generationForBody } from '@/lib/models';
import { useVehicle } from '@/lib/vehicle-context';
import WorkshopManual from '@/components/views/WorkshopManual';

const mono = "'JetBrains Mono',monospace";

const CATEGORY_ORDER: DocCategory[] = ['workshop', 'maintenance', 'parts', 'diagnostic', 'service-info', 'training'];

export default function DocumentLibrary() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const docId = searchParams.get('doc');
  const pageParam = Number(searchParams.get('page') || '0');
  const { vehicle } = useVehicle();
  const vehicleGen = generationForBody(vehicle.body);
  const gen = vehicleGen === '987' || vehicleGen === '981' ? vehicleGen : '981';

  const [q, setQ] = useState('');

  const openDoc = useCallback(
    (id: string) => {
      router.push(`/manual?doc=${encodeURIComponent(id)}`);
    },
    [router],
  );

  const closeDoc = useCallback(() => {
    router.push('/manual');
  }, [router]);

  const filtered = useMemo(() => {
    let list = documentsForGeneration(gen);
    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(needle) ||
          (d.subtitle ?? '').toLowerCase().includes(needle) ||
          d.id.toLowerCase().includes(needle),
      );
    }
    return list;
  }, [gen, q]);

  const byCategory = useMemo(() => {
    const map = new Map<DocCategory, DocumentMeta[]>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const d of filtered) {
      const arr = map.get(d.category) ?? [];
      arr.push(d);
      map.set(d.category, arr);
    }
    return map;
  }, [filtered]);

  // Deep-link: if ?doc= is set and valid, show the viewer (optional ?page=).
  // Must run AFTER all hooks — early return before useMemo caused a hooks mismatch.
  const workshopLink = docId ? resolveWorkshopViewerLink(docId, pageParam) : null;
  const active = workshopLink?.doc ?? (docId ? getDocument(docId) : undefined);
  const initialPage = workshopLink
    ? workshopLink.pageInVolume
    : (Number.isFinite(pageParam) && pageParam > 0 ? pageParam : undefined);

  if (docId && active) {
    return (
      <WorkshopManual
        documentId={active.id}
        initialPage={initialPage}
        highlight={searchParams.get('q') ?? undefined}
        onBack={closeDoc}
      />
    );
  }

  return (
    <div className="padView docsRoot" style={{ padding: 28, maxWidth: 960 }}>
      <p style={{ margin: '0 0 18px', font: "400 14px/1.55 'Helvetica Neue',Arial,sans-serif", color: '#6E6E73', maxWidth: 560 }}>
        Factory docs for your garage vehicle
        {' '}
        <span style={{ font: `500 12px/1 ${mono}`, color: '#0B0B0C' }}>{vehicle.model || gen}</span>
        {' '}
        ({gen}) — workshop manual, diagnostics, Service Information Technik, and training books.
        Change the car in Settings to switch the library.
      </p>

      <div className="docsFilters" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14, alignItems: 'center' }}>
        <span style={{ font: `600 10px/1 ${mono}`, letterSpacing: '.1em', color: 'var(--red, #D5001C)', background: 'rgba(213,0,28,.08)', padding: '6px 9px', borderRadius: 2 }}>
          {gen}
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter documents…"
          className="docsSearch"
          style={{
            marginLeft: 'auto',
            flex: '1 1 180px',
            minWidth: 140,
            maxWidth: 280,
            height: 36,
            padding: '0 12px',
            borderRadius: 2,
            border: '1px solid #D2D2D6',
            background: '#F6F6F7',
            font: "400 13px 'Helvetica Neue',Arial,sans-serif",
          }}
        />
      </div>

      <div style={{ font: `500 11px/1 ${mono}`, color: '#9A9AA0', marginBottom: 18 }}>
        {filtered.length} document{filtered.length === 1 ? '' : 's'}
      </div>

      {CATEGORY_ORDER.map((cat) => {
        const items = byCategory.get(cat) ?? [];
        if (!items.length) return null;
        return (
          <section key={cat} style={{ marginBottom: 28 }}>
            <div style={{ font: `500 11px/1 ${mono}`, letterSpacing: '.14em', color: '#6E6E73', marginBottom: 12 }}>
              {CATEGORY_LABELS[cat].toUpperCase()}
            </div>
            <div className="docsGrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
              {items.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className="docsCard"
                  onClick={() => openDoc(d.id)}
                  style={{
                    textAlign: 'left',
                    padding: '16px 16px 14px',
                    background: '#fff',
                    border: '1px solid #E3E3E5',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ font: "500 15px/1.25 'Helvetica Neue',Arial,sans-serif", color: '#0B0B0C' }}>{d.title}</div>
                  {d.subtitle && (
                    <div style={{ marginTop: 6, font: "400 12px/1.4 'Helvetica Neue',Arial,sans-serif", color: '#9A9AA0' }}>
                      {d.subtitle}
                    </div>
                  )}
                  {d.sizeLabel && (
                    <div style={{ marginTop: 10, font: `500 10px/1 ${mono}`, color: '#B4B4B8' }}>{d.sizeLabel}</div>
                  )}
                </button>
              ))}
            </div>
          </section>
        );
      })}

      {filtered.length === 0 && (
        <div style={{ padding: 32, textAlign: 'center', color: '#9A9AA0', font: "400 14px 'Helvetica Neue',Arial,sans-serif" }}>
          No documents match this filter.
        </div>
      )}
    </div>
  );
}
