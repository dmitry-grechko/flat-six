import type { EnginePart, Vehicle } from '@/lib/types';
import { generationForBody } from '@/lib/models';
import { xrayAssembliesFor, type XrayAssembly } from './xray-assemblies';

/**
 * Trim resolution layer between the stored vehicle profile and X-RAY assembly
 * loading. The X-ray view used to render `xrayAssembliesFor(generation)` only,
 * ignoring `vehicle.trans` — so a Manual owner saw the PDK transaxle. This maps
 * a Vehicle → the assembly set + any fallback badges + a per-part trim filter.
 *
 * REALITY: there is exactly ONE transaxle GLB per generation and it is
 * PDK-modelled (`trans.glb` / `trans-parts.json`, ids like `pdk-*`, PDK part
 * numbers, Pentosin PDK fluid). There are no manual/Tiptronic transaxle GLBs.
 * So for a non-PDK trim we still render the PDK GLB but (a) show a clear
 * fallback badge and (b) hide the PDK-only parts so a manual owner isn't shown a
 * mechatronic unit / dual-clutch pack / PDK oil pan with wrong part numbers.
 */

export type TransmissionKind = 'manual' | 'pdk' | 'tiptronic';

/**
 * Classify a stored `vehicle.trans` string (exact values live in lib/data.ts:
 * TRANS_981 / TRANS_987). "PDK" → pdk, "Tiptronic" → tiptronic, "Manual" →
 * manual. Empty / unrecognised → `pdk`, i.e. the transaxle GLB we actually ship,
 * so a blank or unknown trim never raises a spurious fallback badge.
 */
export function transmissionKind(trans: string | null | undefined): TransmissionKind {
  const t = (trans ?? '').toLowerCase();
  if (!t.trim()) return 'pdk';
  if (t.includes('pdk')) return 'pdk';
  if (t.includes('tiptronic')) return 'tiptronic';
  if (t.includes('manual')) return 'manual';
  return 'pdk';
}

export interface TrimKey {
  generation: string;
  transmissionKind: TransmissionKind;
  /** The raw stored trans label, e.g. "6-Speed Manual" (used in the badge copy). */
  transLabel: string;
  engine?: string;
}

export function resolveTrimKey(v: Vehicle): TrimKey {
  return {
    generation: generationForBody(v.body),
    transmissionKind: transmissionKind(v.trans),
    transLabel: v.trans ?? '',
    engine: v.engine || undefined,
  };
}

/**
 * Per-assembly override for a resolved trim. `glb`/`manifest` swap the rendered
 * asset; `fallbackBadge` is shown when we are knowingly rendering the wrong-trim
 * asset. Designed so that dropping a real manual/Tiptronic GLB in later is just a
 * matter of adding `glb`/`manifest` here — the badge then disappears on its own
 * (see `trimBadges`, which only emits while the asset is still the base PDK one).
 */
export interface TrimAssemblyOverride {
  glb?: string;
  manifest?: string;
  fallbackBadge?: string;
}

/**
 * Overrides keyed by assembly id for the given vehicle. Only the transaxle is
 * trim-sensitive today, and — since no non-PDK transaxle GLB exists — a non-PDK
 * trim gets ONLY a `fallbackBadge` (glb/manifest stay at the base PDK values).
 */
export function trimAssemblyOverrides(
  v: Vehicle,
): Partial<Record<XrayAssembly['id'], TrimAssemblyOverride>> {
  const kind = transmissionKind(v.trans);
  if (kind === 'pdk') return {};
  const label = (v.trans ?? '').trim() || (kind === 'tiptronic' ? 'Tiptronic S' : 'Manual');
  return {
    // No manual/Tiptronic transaxle GLB yet — keep the PDK asset, badge the fallback.
    trans: { fallbackBadge: `Showing PDK layout — ${label} transaxle model not loaded yet.` },
  };
}

/**
 * The assembly set to render for a vehicle — starts from the generation set and
 * applies any trim asset overrides. Returns the base array reference unchanged
 * when no override actually swaps a glb/manifest (the case today), so consumers
 * that depend on a stable reference (memo/effect deps) don't churn.
 */
export function xrayAssembliesForVehicle(v: Vehicle): XrayAssembly[] {
  const base = xrayAssembliesFor(generationForBody(v.body));
  const overrides = trimAssemblyOverrides(v);
  const hasAssetOverride = Object.values(overrides).some((o) => o?.glb || o?.manifest);
  if (!hasAssetOverride) return base;
  return base.map((a) => {
    const o = overrides[a.id];
    if (!o || (!o.glb && !o.manifest)) return a;
    return { ...a, ...(o.glb ? { glb: o.glb } : {}), ...(o.manifest ? { manifest: o.manifest } : {}) };
  });
}

/**
 * Fallback badges the UI should surface, keyed by assembly id — e.g.
 * `{ trans: "Showing PDK layout — 6-Speed Manual transaxle model not loaded yet." }`
 * for a Manual/Tiptronic vehicle, `{}` for PDK. A badge is emitted ONLY while the
 * resolved asset is still the base PDK one (no real trim GLB supplied), so it
 * self-clears once a proper GLB is wired into the override above.
 */
export function trimBadges(v: Vehicle): Partial<Record<XrayAssembly['id'], string>> {
  const overrides = trimAssemblyOverrides(v);
  const badges: Partial<Record<XrayAssembly['id'], string>> = {};
  (Object.keys(overrides) as XrayAssembly['id'][]).forEach((id) => {
    const o = overrides[id];
    if (o?.fallbackBadge && !o.glb && !o.manifest) badges[id] = o.fallbackBadge;
  });
  return badges;
}

// PDK-only signal tokens. Names cover both generations' wording — 981 says
// "Dual … Clutch"/"Mechatronic", the 987.2 Service-Introduction set says "wet
// double clutch"/"Valve Body Assembly". The `function` text is matched only on
// dual/double-clutch + mechatronic concepts, NOT the bare word "pdk", because
// shared driveline parts (final drive, mounts, drain/fill plugs) mention the
// "PDK ratio"/"PDK fluid" in passing and must stay visible for a manual owner.
const PDK_NAME_TOKENS = ['pdk', 'dual clutch', 'double clutch', 'mechatronic', 'clutch pack', 'valve body'];
const PDK_FUNCTION_TOKENS = ['dual clutch', 'double clutch', 'mechatronic', 'clutch pack'];

const normalize = (s: string | null | undefined): string =>
  (s ?? '').toLowerCase().replace(/[-_]/g, ' ');

/**
 * Is this transaxle part PDK-specific — i.e. it must be hidden when we render the
 * PDK GLB as a fallback for a manual / Tiptronic trim? True when:
 *   • the id is prefixed `pdk-` (the modeller's own PDK tag), OR
 *   • the label/assembly names a PDK-only concept (PDK / dual clutch /
 *     mechatronic / clutch pack), OR
 *   • the function describes a dual-clutch/mechatronic concept.
 * Generic driveline hardware (final drive, differential, output flanges,
 * driveshafts, mounts, drain/fill plugs) stays visible.
 */
function isPdkOnlyPart(part: EnginePart): boolean {
  if (part.id.startsWith('pdk-')) return true;
  const nameHay = normalize(`${part.label} ${part.assembly}`);
  if (PDK_NAME_TOKENS.some((t) => nameHay.includes(t))) return true;
  const fnHay = normalize(part.function);
  return PDK_FUNCTION_TOKENS.some((t) => fnHay.includes(t));
}

/**
 * Whether a part should be shown for the given transmission kind. PDK shows
 * everything (unchanged behaviour). For manual/Tiptronic, PDK-only parts are
 * hidden. Intended to be applied ONLY to the `trans` assembly's parts.
 */
export function partVisibleForTrim(part: EnginePart, kind: TransmissionKind): boolean {
  if (kind === 'pdk') return true;
  return !isPdkOnlyPart(part);
}
