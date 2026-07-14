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
 * Cascading vehicle picker: Brand → Model → Year/Generation → variant. Replaces
 * the flat, mixed-generation chip list so the selector stays intuitive as more
 * marques/models are added. Single-option levels auto-advance; the final leaf
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
    if (vs.length === 1) onSelect(vs[0].id); // single variant → commit immediately
  };

  return (
    <div>
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
        <Row label="Year">
          {gens.map((g) => (
            <button key={g} type="button" onClick={() => pickGen(g)} style={chip(gen === g)}>
              {generationYears(g) ? `${generationYears(g)} · ${generationCode(g)}` : generationCode(g)}
            </button>
          ))}
        </Row>
      )}

      {brand && nameplate && gen && leaves.length > 1 && (
        <Row label="Variant">
          {leaves.map((v) => (
            <button key={v.id} type="button" onClick={() => onSelect(v.id)} style={chip(value === v.id)}>
              {variantShortName(v)}
            </button>
          ))}
        </Row>
      )}
    </div>
  );
}
