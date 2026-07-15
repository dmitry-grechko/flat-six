'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import type { BodyType } from '@/lib/types';
import {
  visibleVariants,
  variantMake,
  variantNameplate,
  variantShortName,
  generationYears,
  generationCode,
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

/**
 * Cascading vehicle picker: Brand → Model → Generation → variant. Collapses to a
 * one-line summary of the selected car once chosen; "Change" re-opens the cascade.
 * This keeps the panel compact and makes the model identity (which drives the 3D
 * model + all per-generation data) the single source of truth — no free-text model
 * field to drift out of sync. Single-option levels auto-advance; the final leaf
 * commits via onSelect. Dev-mode cars are admin-only (visibleVariants).
 */
export default function ModelPicker({
  value,
  isAdmin,
  onSelect,
}: {
  value: BodyType;
  isAdmin: boolean;
  onSelect: (id: BodyType) => void;
}) {
  const variants = visibleVariants(isAdmin);
  const current = variants.find((v) => v.id === value);

  // Collapsed to the summary when we already have a valid car; expanded otherwise.
  const [editing, setEditing] = useState(!current);
  const [brand, setBrand] = useState<string | null>(current ? variantMake(current) : null);
  const [nameplate, setNameplate] = useState<string | null>(current ? variantNameplate(current) : null);
  const [gen, setGen] = useState<string | null>(current ? current.generation : null);

  const brands = uniq(variants.map(variantMake));
  const models = brand ? uniq(variants.filter((v) => variantMake(v) === brand).map(variantNameplate)) : [];
  const gens =
    brand && nameplate
      ? uniq(
          variants
            .filter((v) => variantMake(v) === brand && variantNameplate(v) === nameplate)
            .map((v) => v.generation),
        )
      : [];
  const leaves =
    brand && nameplate && gen
      ? variants.filter(
          (v) => variantMake(v) === brand && variantNameplate(v) === nameplate && v.generation === gen,
        )
      : [];

  const openEdit = () => {
    if (current) {
      setBrand(variantMake(current));
      setNameplate(variantNameplate(current));
      setGen(current.generation);
    }
    setEditing(true);
  };
  const commit = (id: BodyType) => {
    onSelect(id);
    setEditing(false);
  };

  const pickBrand = (b: string) => {
    setBrand(b);
    const ms = uniq(variants.filter((v) => variantMake(v) === b).map(variantNameplate));
    setNameplate(ms.length === 1 ? ms[0] : null);
    setGen(null);
  };
  const pickModel = (m: string) => {
    setNameplate(m);
    const gs = uniq(
      variants.filter((v) => variantMake(v) === brand && variantNameplate(v) === m).map((v) => v.generation),
    );
    setGen(gs.length === 1 ? gs[0] : null);
  };
  const pickGen = (g: string) => {
    setGen(g);
    const vs = variants.filter(
      (v) => variantMake(v) === brand && variantNameplate(v) === nameplate && v.generation === g,
    );
    if (vs.length === 1) commit(vs[0].id); // single variant → commit + collapse
  };

  // Collapsed summary of the selected car.
  if (!editing && current) {
    const meta = [generationCode(current.generation), generationYears(current.generation), 'rendered in 3D']
      .filter(Boolean)
      .join(' · ');
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

  // Expanded cascade.
  return (
    <div>
      {current && (
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

      <Row label="Brand">
        {brands.map((b) => (
          <button key={b} type="button" onClick={() => pickBrand(b)} style={chip(brand === b)}>
            {b}
          </button>
        ))}
      </Row>

      {brand && (
        <Row label="Model">
          {models.map((m) => (
            <button key={m} type="button" onClick={() => pickModel(m)} style={chip(nameplate === m)}>
              {m}
            </button>
          ))}
        </Row>
      )}

      {brand && nameplate && (
        <Row label="Generation">
          {gens.map((g) => (
            <button key={g} type="button" onClick={() => pickGen(g)} style={chip(gen === g)}>
              {generationYears(g) ? `${generationCode(g)} · ${generationYears(g)}` : generationCode(g)}
            </button>
          ))}
        </Row>
      )}

      {brand && nameplate && gen && leaves.length > 1 && (
        <Row label="Variant">
          {leaves.map((v) => (
            <button key={v.id} type="button" onClick={() => commit(v.id)} style={chip(value === v.id)}>
              {variantShortName(v)}
            </button>
          ))}
        </Row>
      )}
    </div>
  );
}
