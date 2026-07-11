'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import * as pdfjs from 'pdfjs-dist';
import { getDocument } from '@/lib/documents';

const mono = "'JetBrains Mono',monospace";
const MOBILE_BP = 760;
/** How many pages above/below the current one to keep mounted. */
const WINDOW = 2;

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

type SearchHit = { page: number; snippet: string };

type ManualUrlResponse = {
  url: string;
  source: 'storage' | 'local';
  fallback?: boolean;
  expiresIn?: number;
  doc?: { id: string; title: string };
};

async function fetchManualUrl(docId: string): Promise<ManualUrlResponse> {
  const res = await fetch(`/api/manual/url?doc=${encodeURIComponent(docId)}`);
  if (res.status === 401) throw new Error('auth');
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error || `Could not resolve manual URL (${res.status})`);
  }
  return res.json() as Promise<ManualUrlResponse>;
}

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BP}px)`);
    const apply = () => setMobile(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return mobile;
}

/** Renders one PDF page onto a canvas when active. */
function PdfPageSlot({
  pdf,
  pageNum,
  width,
  onHeight,
}: {
  pdf: PDFDocumentProxy;
  pageNum: number;
  width: number;
  onHeight: (pageNum: number, height: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const taskRef = useRef<{ cancel: () => void } | null>(null);

  useEffect(() => {
    if (!width || !canvasRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        taskRef.current?.cancel();
        const page: PDFPageProxy = await pdf.getPage(pageNum);
        if (cancelled) return;
        const base = page.getViewport({ scale: 1 });
        const scale = Math.max(0.35, width / base.width);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        onHeight(pageNum, viewport.height);
        const task = page.render({ canvasContext: ctx, viewport });
        taskRef.current = task;
        await task.promise;
      } catch (e) {
        if ((e as { name?: string })?.name !== 'RenderingCancelledException') {
          console.error(e);
        }
      }
    })();

    return () => {
      cancelled = true;
      taskRef.current?.cancel();
    };
  }, [pdf, pageNum, width, onHeight]);

  return (
    <canvas
      ref={canvasRef}
      className="manualCanvas"
      style={{ display: 'block', width: '100%', height: 'auto', boxShadow: '0 4px 24px rgba(0,0,0,.18)', background: '#fff' }}
    />
  );
}

export default function WorkshopManual({
  documentId = '981-workshop-manual-v1',
  initialPage,
  highlight,
  onBack,
}: {
  documentId?: string;
  initialPage?: number;
  highlight?: string;
  onBack?: () => void;
} = {}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const heightsRef = useRef<Map<number, number>>(new Map());
  const scrollingToRef = useRef<number | null>(null);

  const isMobile = useIsMobile();
  const meta = getDocument(documentId);

  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [urlSource, setUrlSource] = useState<'storage' | 'local' | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [stageWidth, setStageWidth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [heightTick, setHeightTick] = useState(0);

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [showHits, setShowHits] = useState(false);

  const pageWidth = stageWidth > 0
    ? Math.max(200, Math.min(stageWidth - (isMobile ? 16 : 32), 900) * zoomLevel)
    : 0;

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setStageWidth(el.clientWidth));
    ro.observe(el);
    setStageWidth(el.clientWidth);
    return () => ro.disconnect();
  }, [loading, loadError]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    setPdf(null);
    setPage(1);
    setHits([]);
    setShowHits(false);
    setQuery('');
    setSearchProgress('');
    setZoomLevel(1);
    heightsRef.current.clear();

    fetchManualUrl(documentId)
      .then((res) => {
        if (cancelled) return;
        setUrlSource(res.source);
        return pdfjs.getDocument({ url: res.url, disableAutoFetch: false }).promise;
      })
      .then((doc) => {
        if (cancelled || !doc) return;
        setPdf(doc);
        setTotalPages(doc.numPages);
        const target = initialPage && initialPage >= 1
          ? Math.min(initialPage, doc.numPages)
          : 1;
        setPage(target);
        scrollingToRef.current = target;
      })
      .catch((e) => {
        if (cancelled) return;
        if (e?.message === 'auth') {
          setLoadError('Sign in to view documents.');
          return;
        }
        const detail = typeof e?.message === 'string' && e.message && e.message !== 'auth'
          ? e.message
          : '';
        setLoadError(
          detail && !detail.startsWith('Could not')
            ? detail
            : 'Could not load this PDF. For local dev, ensure the file exists under public/. For production, upload with npm run docs:upload (workshop PDF is separate from db:import-mtl).',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [documentId, initialPage]);

  const onHeight = useCallback((pageNum: number, height: number) => {
    const prev = heightsRef.current.get(pageNum);
    if (prev !== height) {
      heightsRef.current.set(pageNum, height);
      setHeightTick((t) => t + 1);
    }
  }, []);

  // Estimate average page height for placeholders.
  const avgHeight = (() => {
    void heightTick;
    const vals = [...heightsRef.current.values()];
    if (!vals.length) return Math.round(pageWidth * 1.414) || 800;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  })();

  const scrollToPage = useCallback((n: number) => {
    const el = stageRef.current;
    if (!el || !totalPages) return;
    const target = Math.min(totalPages, Math.max(1, n));
    scrollingToRef.current = target;
    setPage(target);
    // Prefer the live DOM node; fall back to estimated offset.
    const node = el.querySelector(`[data-page="${target}"]`) as HTMLElement | null;
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    let top = 0;
    for (let p = 1; p < target; p++) {
      top += (heightsRef.current.get(p) ?? avgHeight) + 12;
    }
    el.scrollTo({ top, behavior: 'smooth' });
  }, [totalPages, avgHeight]);

  // After load / deep-link, scroll once pages exist.
  useEffect(() => {
    if (!pdf || !totalPages || !scrollingToRef.current) return;
    const t = scrollingToRef.current;
    const id = requestAnimationFrame(() => scrollToPage(t));
    return () => cancelAnimationFrame(id);
  }, [pdf, totalPages, scrollToPage, heightTick]);

  // Track which page is in view while scrolling.
  useEffect(() => {
    const el = stageRef.current;
    if (!el || !totalPages) return;

    const onScroll = () => {
      if (scrollingToRef.current) {
        // Clear programmatic scroll lock after user settles near target.
        const node = el.querySelector(`[data-page="${scrollingToRef.current}"]`) as HTMLElement | null;
        if (node) {
          const r = node.getBoundingClientRect();
          const sr = el.getBoundingClientRect();
          if (r.top <= sr.top + 80 && r.bottom > sr.top + 40) {
            scrollingToRef.current = null;
          }
        }
        return;
      }
      const mid = el.getBoundingClientRect().top + 80;
      let best = page;
      let bestDist = Infinity;
      el.querySelectorAll<HTMLElement>('[data-page]').forEach((node) => {
        const r = node.getBoundingClientRect();
        const dist = Math.abs(r.top - mid);
        const n = Number(node.dataset.page);
        if (dist < bestDist && n) {
          bestDist = dist;
          best = n;
        }
      });
      if (best !== page) setPage(best);
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [totalPages, page]);

  const adjustZoom = (delta: number) => {
    setZoomLevel((z) => Math.min(2.5, Math.max(0.6, +(z + delta).toFixed(2))));
  };

  const runSearch = async (autoScroll = true, term?: string) => {
    const q = (term ?? query).trim().toLowerCase();
    if (!pdf || !q) { setHits([]); setShowHits(false); return; }

    setSearching(true);
    setShowHits(true);
    setHits([]);
    const found: SearchHit[] = [];

    for (let p = 1; p <= pdf.numPages; p++) {
      setSearchProgress(`Searching page ${p} of ${pdf.numPages}…`);
      const pdfPage = await pdf.getPage(p);
      const content = await pdfPage.getTextContent();
      const text = content.items
        .map((it) => ('str' in it ? it.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      const lower = text.toLowerCase();
      let idx = lower.indexOf(q);
      while (idx !== -1 && found.length < 80) {
        const start = Math.max(0, idx - 40);
        const end = Math.min(text.length, idx + q.length + 60);
        const snippet = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
        found.push({ page: p, snippet });
        idx = lower.indexOf(q, idx + q.length);
      }
      if (found.length >= 80) break;
    }

    setHits(found);
    setSearchProgress(found.length ? `${found.length} match${found.length === 1 ? '' : 'es'}` : 'No matches');
    setSearching(false);
    if (autoScroll && found.length) scrollToPage(found[0].page);
  };

  const pickHit = (p: number) => {
    scrollToPage(p);
    if (isMobile) setShowHits(false);
  };

  // Deep-link highlight (?q=): pre-fill the search and surface the matches, but
  // keep the reader on the linked page — don't let the search steal the scroll.
  useEffect(() => {
    if (!pdf || !totalPages || !highlight) return;
    const term = highlight.trim();
    if (!term) return;
    setQuery(term);
    const id = requestAnimationFrame(() => {
      void runSearch(false, term);
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdf, totalPages, highlight]);

  const sourceBadge = urlSource === 'storage'
    ? <span style={{ color: '#1E8E4E' }}> · CLOUD</span>
    : urlSource === 'local'
      ? <span style={{ color: '#9A9AA0' }}> · LOCAL</span>
      : null;

  const titleLong = meta?.subtitle
    ? `${meta.title.toUpperCase()} — ${meta.subtitle.toUpperCase()}`
    : (meta?.title ?? 'DOCUMENT').toUpperCase();
  const titleShort = (meta?.title ?? 'DOCUMENT').toUpperCase();

  const from = Math.max(1, page - WINDOW);
  const to = Math.min(totalPages, page + WINDOW);
  void from; void to;

  return (
    <div className="manualRoot">
      <div className="manualToolbar">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="manualBackBtn"
              style={{
                flexShrink: 0,
                height: 28,
                padding: '0 10px',
                borderRadius: 2,
                border: '1px solid #DDDDE0',
                background: '#F6F6F7',
                cursor: 'pointer',
                font: `500 10px/1 ${mono}`,
                letterSpacing: '.06em',
                color: '#6E6E73',
              }}
            >
              ← DOCS
            </button>
          )}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="manualTitle manualTitleLong" style={{ font: `500 10px/1.3 ${mono}`, letterSpacing: '.1em', color: '#9A9AA0' }}>
              {titleLong}{sourceBadge}
            </div>
            <div className="manualTitle manualTitleShort" style={{ font: `500 10px/1.3 ${mono}`, letterSpacing: '.1em', color: '#9A9AA0' }}>
              {titleShort}{sourceBadge}
            </div>
          </div>
        </div>

        <div className="manualToolbarRow">
          <div className="manualSearch">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
              placeholder="Search document…"
              enterKeyHint="search"
              className="manualSearchInput"
            />
            <button type="button" className="manualBtn manualSearchBtn" onClick={() => runSearch()} disabled={searching || !pdf}>
              {searching ? '…' : 'Search'}
            </button>
          </div>

          <div className="manualDesktopControls manualPageNav">
            <span className="manualPageTotal" style={{ marginRight: 4 }}>Page</span>
            <input
              type="number"
              min={1}
              max={totalPages || 1}
              value={page}
              onChange={(e) => scrollToPage(Number(e.target.value) || 1)}
              className="manualPageInput"
              aria-label="Page number"
            />
            <span className="manualPageTotal">/ {totalPages || '—'}</span>
          </div>

          <div className="manualDesktopControls manualZoom">
            <button type="button" className="manualBtn" onClick={() => adjustZoom(-0.15)} aria-label="Zoom out">−</button>
            <span className="manualZoomPct">{Math.round(zoomLevel * 100)}%</span>
            <button type="button" className="manualBtn" onClick={() => adjustZoom(0.15)} aria-label="Zoom in">+</button>
          </div>

          {searchProgress && (
            <span className="manualSearchStatus">{searchProgress}</span>
          )}
        </div>
      </div>

      <div className="manualBody">
        <div ref={stageRef} className="manualStage manualStageScroll">
          {loading && (
            <div className="manualStageMsg">Loading document…</div>
          )}
          {loadError && (
            <div className="manualStageMsg manualStageError">{loadError}</div>
          )}
          {!loading && !loadError && pdf && pageWidth > 0 && (
            <div style={{ width: '100%', maxWidth: pageWidth, margin: '0 auto' }}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => {
                const near = n >= page - WINDOW && n <= page + WINDOW;
                const h = heightsRef.current.get(n) ?? avgHeight;
                return (
                  <div key={n} data-page={n} className="manualPageSlot" style={{ width: '100%', marginBottom: 12 }}>
                    {near ? (
                      <PdfPageSlot
                        pdf={pdf}
                        pageNum={n}
                        width={pageWidth}
                        onHeight={onHeight}
                      />
                    ) : (
                      <div
                        className="manualPagePlaceholder"
                        style={{
                          width: '100%',
                          height: h,
                          background: '#E8E8EA',
                          boxShadow: '0 2px 12px rgba(0,0,0,.06)',
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {showHits && (
          <>
            <button
              type="button"
              className="manualHitsBackdrop"
              aria-label="Close search results"
              onClick={() => setShowHits(false)}
            />
            <aside className="manualHits">
              <div className="manualHitsHead">
                <span>RESULTS{hits.length ? ` · ${hits.length}` : ''}</span>
                <button type="button" className="manualHitsClose" onClick={() => setShowHits(false)}>CLOSE</button>
              </div>
              {hits.length === 0 && !searching && (
                <div className="manualHitsEmpty">No matches for &ldquo;{query}&rdquo;.</div>
              )}
              {hits.map((h, i) => (
                <button
                  key={`${h.page}-${i}`}
                  type="button"
                  className={'manualHit' + (h.page === page ? ' active' : '')}
                  onClick={() => pickHit(h.page)}
                >
                  <div className="manualHitPage">PAGE {h.page}</div>
                  <div className="manualHitSnippet">{h.snippet}</div>
                </button>
              ))}
            </aside>
          </>
        )}
      </div>

      <div className="manualMobileBar" aria-label="Page position">
        <div className="manualMobilePage" style={{ gridColumn: '1 / 3' }}>
          <span style={{ font: `500 10px/1 ${mono}`, color: '#9A9AA0', marginRight: 6 }}>PAGE</span>
          <input
            type="number"
            min={1}
            max={totalPages || 1}
            value={page}
            onChange={(e) => scrollToPage(Number(e.target.value) || 1)}
            className="manualPageInput manualMobilePageInput"
            aria-label="Page number"
          />
          <span>/ {totalPages || '—'}</span>
        </div>
        <div className="manualMobileZoom">
          <button type="button" className="manualMobileBtn manualMobileBtnSm" onClick={() => adjustZoom(-0.15)} aria-label="Zoom out">−</button>
          <button type="button" className="manualMobileZoomPct" onClick={() => setZoomLevel(1)} aria-label="Reset zoom">{Math.round(zoomLevel * 100)}%</button>
          <button type="button" className="manualMobileBtn manualMobileBtnSm" onClick={() => adjustZoom(0.15)} aria-label="Zoom in">+</button>
        </div>
      </div>
    </div>
  );
}
