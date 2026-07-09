import catalogJson from './catalog.json';
import type { CatalogPart, SystemName } from './types';

interface CatalogFile {
  vehicle: { model: string; generation: string; year: number; engine: string };
  sources: string[];
  systems: { id: string; label: string; components: CatalogPart[] }[];
}

// OEM catalog is keyed by car generation. Only the 981 is populated today; add a
// generation by dropping a catalog JSON and registering it here. Unknown
// generations resolve to an empty catalog. No-arg callers default to the 981.
export const DEFAULT_GENERATION = '981';

const CATALOGS: Record<string, CatalogFile> = {
  '981': catalogJson as CatalogFile,
};

/** Generations we have an OEM catalog for. */
export const CATALOG_GENERATIONS = Object.keys(CATALOGS);

function catalogFor(generation: string = DEFAULT_GENERATION): CatalogFile | null {
  return CATALOGS[generation] ?? null;
}

// Back-compat alias for the default (981) catalog.
const CATALOG = CATALOGS[DEFAULT_GENERATION];

/** Format a packed Porsche part number into dotted form when it looks like one. */
export function formatPartNumber(pn: string | null | undefined): string {
  if (!pn) return '—';
  // 11-digit packed (e.g. 98111013000 -> 981.110.130.00)
  if (/^\d{11}$/.test(pn)) {
    return `${pn.slice(0, 3)}.${pn.slice(3, 6)}.${pn.slice(6, 9)}.${pn.slice(9)}`;
  }
  return pn;
}

/** Real OEM parts for a given system, sourced from porscheontario.com. */
export function catalogForSystem(system: SystemName, generation: string = DEFAULT_GENERATION): CatalogPart[] {
  const id = system.toLowerCase();
  return catalogFor(generation)?.systems.find((s) => s.id === id)?.components ?? [];
}

/** Every part in the catalog, flattened across all systems. */
export function allCatalogParts(generation: string = DEFAULT_GENERATION): CatalogPart[] {
  return catalogFor(generation)?.systems.flatMap((s) => s.components) ?? [];
}

/**
 * Free-text search over the OEM catalog. Matches name, system, notes, function
 * and part numbers (raw + dotted form), ranked by where the hit landed.
 */
export function searchCatalog(query: string, limit = 10, generation: string = DEFAULT_GENERATION): CatalogPart[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored: { part: CatalogPart; score: number }[] = [];
  for (const part of allCatalogParts(generation)) {
    const numbers = [part.partNumber, ...(part.alternateNumbers ?? [])]
      .filter(Boolean)
      .flatMap((n) => [String(n).toLowerCase(), formatPartNumber(n).toLowerCase()]);
    let score = 0;
    if (part.name?.toLowerCase().includes(q)) score += 4;
    if (numbers.some((n) => n.includes(q))) score += 4;
    if (part.system?.toLowerCase().includes(q)) score += 2;
    if (part.function?.toLowerCase().includes(q)) score += 1;
    if (part.notes?.toLowerCase().includes(q)) score += 1;
    if (score > 0) scored.push({ part, score });
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.part);
}

export const CATALOG_SOURCES = CATALOG.sources;
