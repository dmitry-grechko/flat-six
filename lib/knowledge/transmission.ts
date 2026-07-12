// Variant-aware transmission maintenance, derived from the sourced knowledge
// base (specs.json / specs-987.json) rather than a hand-typed string. A PDK car,
// a manual, and a Tiptronic each need different fluids + part numbers — this
// resolves them from the car's `trans` label so the UI (and the AI) show the
// right parts. Single source of truth: the fluid/capacity/torque specs, which
// each carry an `appliesTo` variant tag and a citation.

import { getSpecs } from './index';
import type { Spec } from './types';

export type TransmissionKind = 'pdk' | 'manual' | 'tiptronic';

/** Map a transmission label ("7-Speed PDK", "6-Speed Manual", …) to a kind. */
export function transmissionKindOf(trans: string | null | undefined): TransmissionKind | null {
  const t = (trans || '').toLowerCase();
  if (t.includes('pdk')) return 'pdk';
  if (t.includes('tiptronic')) return 'tiptronic';
  if (t.includes('manual')) return 'manual';
  return null;
}

/** Pull a Porsche part number out of a spec's notes, formatted 000-043-305-13. */
export function porschePartNumber(notes?: string): string | null {
  if (!notes) return null;
  const m = notes.match(/P\/N\s+([0-9][0-9\-.]{8,})/i);
  if (!m) return null;
  const digits = m[1].replace(/[^0-9]/g, '');
  if (digits.length !== 11) return m[1].replace(/[.\s]+$/, '');
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1-$2-$3-$4');
}

export interface TransmissionFluid {
  name: string;
  value: string;
  partNumber: string | null;
  source?: string;
}

export interface TransmissionMaintenance {
  kind: TransmissionKind;
  fluids: TransmissionFluid[];
  /** Card "Part No." — each fluid with its P/N where the KB has one. */
  part: string;
  /** Card "Spec / Fill" — fluid specs + service capacities. */
  spec: string;
  /** Card "Torque" — the drain/fill torque, if the KB has it. */
  torque: string | null;
  note: string;
}

const KIND_NOTE: Record<TransmissionKind, string> = {
  pdk: 'PDK has TWO separate fluids: 75W-90 gear oil (mechanical/diff side) and Pentosin FFL-3 clutch/control fluid (PIWIS-guided fill). The filter is integral to the oil pan — replace the pan (ZF/OEM), not a standalone filter.',
  manual: 'The manual transaxle shares one 75W-90 gear oil for the gearset and the differential — a simple drain & fill.',
  tiptronic: 'Tiptronic S uses ATF (not gear oil). Most of the fluid stays in the torque converter, so a service exchanges only part of it.',
};

/**
 * Resolve the transmission maintenance card for a car's transmission. Returns
 * null for an unknown/missing transmission so callers fall back to generic copy.
 */
export function transmissionMaintenance(
  trans: string | null | undefined,
  generation: string,
): TransmissionMaintenance | null {
  const kind = transmissionKindOf(trans);
  if (!kind) return null;

  const specs = getSpecs(generation);
  // Match on the spec id (fluid-pdk-*, cap-manual-*, torque-tiptronic-*): the ids
  // are variant-named, so this won't drag in e.g. a coolant capacity whose
  // appliesTo happens to mention "Tiptronic".
  const inKind = (s: Spec) => s.id.toLowerCase().includes(kind);

  const fluidSpecs = specs.filter((s) => s.category === 'fluid' && inKind(s));
  if (!fluidSpecs.length) return null; // no data for this variant on this generation

  const fluids: TransmissionFluid[] = fluidSpecs.map((s) => ({
    name: s.name,
    value: s.value,
    partNumber: porschePartNumber(s.notes),
    source: s.source,
  }));
  const caps = specs.filter((s) => s.category === 'capacity' && inKind(s));
  const drain = specs.find((s) => s.category === 'torque' && inKind(s) && /drain|fill/i.test(s.name));

  const part =
    fluids.map((f) => (f.partNumber ? `${f.name} ${f.partNumber}` : `${f.name} (${f.value})`)).join(' · ') || '—';
  const spec = [
    ...fluids.map((f) => `${f.name}: ${f.value}`),
    ...caps.map((c) => `${c.value.replace(/\s*\(.*/, '')} ${c.name.replace(/\s*capacity.*/i, '').trim()}`),
  ].join(' · ');

  return { kind, fluids, part, spec, torque: drain ? drain.value : null, note: KIND_NOTE[kind] };
}
