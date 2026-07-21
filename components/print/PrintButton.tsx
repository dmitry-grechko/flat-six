'use client';

import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders a button that prints a report to PDF (or paper). The report is mounted
 * into a body-level portal tagged `.print-surface`; global print CSS (globals.css)
 * hides the app and shows only that surface, so the browser's print dialog — where
 * the user picks "Save as PDF" — captures a clean, branded document.
 *
 * Zero-dependency and offline-safe: works in the web app, the installed PWA, and
 * the Electron desktop (window.print() opens the native dialog in all three).
 *
 * `renderDocument` is called only when printing starts, so building a large report
 * (e.g. a full service history) costs nothing until the user asks for it.
 */
export function PrintButton({
  renderDocument,
  children,
  title,
  style,
  className,
}: {
  renderDocument: () => ReactNode;
  children: ReactNode;
  /** Optional accessible title / tooltip. */
  title?: string;
  style?: CSSProperties;
  className?: string;
}) {
  const [doc, setDoc] = useState<ReactNode | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const start = useCallback(() => {
    // Build the document, then let it lay out for a frame before printing so
    // fonts and the full tree are ready.
    setDoc(renderDocument());
  }, [renderDocument]);

  useEffect(() => {
    if (doc == null) return;
    const cleanup = () => setDoc(null);
    window.addEventListener('afterprint', cleanup);
    // rAF twice → styles applied + laid out; then print.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        try {
          window.print();
        } finally {
          // Fallback: some engines don't fire `afterprint` reliably.
          setTimeout(cleanup, 500);
        }
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.removeEventListener('afterprint', cleanup);
    };
  }, [doc]);

  return (
    <>
      <button type="button" onClick={start} title={title} style={style} className={className}>
        {children}
      </button>
      {mounted && doc != null
        ? createPortal(<div className="print-surface">{doc}</div>, document.body)
        : null}
    </>
  );
}
