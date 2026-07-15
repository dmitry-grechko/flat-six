'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import type { BodyType } from '@/lib/types';
import {
  visibleVariants,
  variantMake,
  variantNameplate,
  variantShortName,
  variantTrimLabel,
  generationYears,
  generationCode,
  type CarVariant,
} from '@/lib/models';

const mono = "'JetBrains Mono',monospace";
const sans = "'Helvetica Neue',Arial,sans-serif";

function chip(active: boolean): CSSProperties {
  return {
    padding: '9px 13px',
    borderRadius: 2,
    cursor: 'pointer',
    font: `500 12px/1 ${sans}`,
    background: active ? 'var(--red, #D5001C)' : '#F6F6F7',
    color: active ? '#fff' : '#46464A',
    border: `1px solid ${active ? 'var(--red, #D5001C)' : '#DDDDE0'}`,
  };
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ font: `500 10px/1 ${mono}`, letterSpacing: '.12em', textTransform: 'uppercase', color: '#9A9AA0', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{children}</div>
    </div>
  );
}

const uniq = (arr: string[]) => Array.from(new Set(arr));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// The cascade is data-driven: one dimension per level, each derived from the
// variant registry. A level is shown only when it discriminates (>1 option);
// single-option levels auto-advance, so Boxster/Cayman/A4 collapse to Brand →
// Model → Generation, while the 911 expands to Brand → 911 → Series (991.1/991.2)
// → Body (Coupe/Cabriolet/Targa) → Trim. `series` maps to CarVariant.phase and is
// N/A (skipped) for variants without a phase.
type DimKey = 'brand' | 'nameplate' | 'gen' | 'series' | 'body';
const DIM_ORDER: DimKey[] = ['brand', 'nameplate', 'gen', 'series', 'body'];
type Sel = Record<DimKey, string | null>;
const EMPTY_SEL: Sel = { brand: null, nameplate: null, gen: null, series: null, body: null };

const dimValue = (v: CarVariant, dim: DimKey): string | null => {
  switch (dim) {
    case 'brand': return variantMake(v);
    case 'nameplate': return variantNameplate(v);
    case 'gen': return v.generation;
    case 'series': return v.phase ?? null; // null = no phase → dimension is N/A
    case 'body': return v.bodyStyle;
  }
};

const ROW_LABEL: Record<DimKey, string> = {
  brand: 'Brand', nameplate: 'Model', gen: 'Generation', series: 'Series', body: 'Body',
};

/**
 * Cascading vehicle picker: Brand → Model → Generation → (Series) → (Body) → variant.
 * Collapses to a one-line summary once chosen; "Change" re-opens the cascade. The
 * model identity drives the 3D model + all per-generation data, so there is no
 * free-text model field to drift. Single-option levels auto-advance; the final leaf
 * commits via onSelect. Dev-mode cars are admin-only (visibleVariants).
 */
export default function ModelPicker({
  value,
  isAdmin,
  onSelect,
  startExpanded = false,
}: {
  value: BodyType;
  isAdmin: boolean;
  onSelect: (id: BodyType) => void;
  /**
   * Open in the expanded cascade instead of the collapsed summary. Used by the
   * add-vehicle / onboarding flow, where the form's default body is just a seed —
   * the user should pick a car directly, not have to press "Change" first.
   */
  startExpanded?: boolean;
}) {
  const variants = visibleVariants(isAdmin);
  const current = variants.find((v) => v.id === value);

  const selFor = (v: CarVariant | undefined): Sel =>
    v ? { brand: variantMake(v), nameplate: variantNameplate(v), gen: v.generation, series: v.phase ?? null, body: v.bodyStyle } : { ...EMPTY_SEL };

  const [editing, setEditing] = useState(!current || startExpanded);
  const [sel, setSel] = useState<Sel>(selFor(current));

  // Variants matching every non-null dimension in `s`.
  const filtered = (s: Sel): CarVariant[] =>
    variants.filter((v) => DIM_ORDER.every((d) => s[d] == null || dimValue(v, d) === s[d]));

  // Distinct options for a dimension, given the choices before it. `series` returns
  // [] when no candidate has a phase (dimension is N/A and gets skipped).
  const optionsFor = (dim: DimKey, s: Sel): string[] => {
    const idx = DIM_ORDER.indexOf(dim);
    const upstream: Sel = { ...s };
    DIM_ORDER.slice(idx).forEach((d) => (upstream[d] = null));
    const vals = filtered(upstream).map((v) => dimValue(v, dim)).filter((x): x is string => x != null);
    return uniq(vals);
  };

  const commit = (id: BodyType) => {
    onSelect(id);
    // In the add/onboarding flow keep the cascade open (the selected trim just
    // highlights); elsewhere collapse back to the summary as a confirmation.
    if (!startExpanded) setEditing(false);
  };

  const openEdit = () => {
    setSel(selFor(current));
    setEditing(true);
  };

  // Pick a value at `dim`: clear deeper dims, auto-advance any single-option deeper
  // dims, and commit when the choice resolves to exactly one variant.
  const pick = (dim: DimKey, val: string) => {
    const idx = DIM_ORDER.indexOf(dim);
    const next: Sel = { ...sel, [dim]: val };
    DIM_ORDER.slice(idx + 1).forEach((d) => (next[d] = null));
    for (const d of DIM_ORDER.slice(idx + 1)) {
      const opts = optionsFor(d, next);
      if (opts.length === 0) { next[d] = null; continue; } // N/A (e.g. series)
      if (opts.length === 1) { next[d] = opts[0]; continue; } // auto-advance
      break; // needs a choice
    }
    const leaves = filtered(next);
    const resolved = DIM_ORDER.every((d) => optionsFor(d, next).length <= 1 || next[d] != null);
    if (resolved && leaves.length === 1) { commit(leaves[0].id); return; }
    setSel(next);
  };

  // Collapsed summary of the selected car.
  if (!editing && current) {
    const code = current.phase ?? generationCode(current.generation);
    const meta = [code, generationYears(current.generation), 'rendered in 3D'].filter(Boolean).join(' · ');
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: '#FAFAFB', border: '1px solid #E3E3E5', borderRadius: 4 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ font: `500 16px/1.2 ${sans}`, color: '#0B0B0C' }}>
            {variantMake(current)} {variantShortName(current)}
          </div>
          <div style={{ font: `500 11px/1.3 ${mono}`, letterSpacing: '.04em', color: '#9A9AA0', marginTop: 3 }}>{meta}</div>
        </div>
        <button
          type="button"
          onClick={openEdit}
          style={{ flex: 'none', padding: '8px 13px', borderRadius: 2, border: '1px solid #DDDDE0', background: '#fff', font: `500 11px/1 ${mono}`, letterSpacing: '.06em', color: '#6E6E73', cursor: 'pointer' }}
        >
          CHANGE
        </button>
      </div>
    );
  }

  // Build the visible cascade rows: walk the dimensions, hiding single-option (auto-
  // advanced) levels, and stop at the first unchosen discriminating level. When all
  // shown dimensions are chosen and >1 variant remains, show the final Trim row.
  const rows: { dim: DimKey; opts: string[] }[] = [];
  const work: Sel = { ...EMPTY_SEL };
  let stopped = false;
  for (const dim of DIM_ORDER) {
    const opts = optionsFor(dim, work);
    if (opts.length === 0) continue;          // N/A dimension (skip)
    if (opts.length === 1) { work[dim] = opts[0]; continue; } // auto-advanced (hidden)
    rows.push({ dim, opts });
    if (sel[dim] == null) { stopped = true; break; } // wait for this choice
    work[dim] = sel[dim];
  }
  const trimLeaves = !stopped ? filtered(work) : [];
  const showTrim = !stopped && trimLeaves.length > 1;

  const chipLabel = (dim: DimKey, val: string): string => {
    if (dim === 'gen') return generationYears(val) ? `${generationCode(val)} · ${generationYears(val)}` : generationCode(val);
    if (dim === 'body') return cap(val);
    return val;
  };

  return (
    <div>
      {current && !startExpanded && (
        <div style={{ display: 'flex', marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => setEditing(false)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', font: `500 10px/1 ${mono}`, letterSpacing: '.08em', color: '#9A9AA0' }}
          >
            CANCEL
          </button>
        </div>
      )}

      {rows.map(({ dim, opts }) => (
        <Row key={dim} label={ROW_LABEL[dim]}>
          {opts.map((o) => (
            <button key={o} type="button" onClick={() => pick(dim, o)} style={chip(sel[dim] === o)}>
              {chipLabel(dim, o)}
            </button>
          ))}
        </Row>
      ))}

      {showTrim && (
        <Row label="Trim">
          {trimLeaves.map((v) => (
            <button key={v.id} type="button" onClick={() => commit(v.id)} style={chip(value === v.id)}>
              {variantTrimLabel(v)}
            </button>
          ))}
        </Row>
      )}
    </div>
  );
}
