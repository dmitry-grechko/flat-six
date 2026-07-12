'use client';

import { createClient } from '@/lib/supabase/client';

/**
 * Centralized accessor for the Supabase `parts` table (the single source of truth
 * for the ~4,100 OEM part numbers — see migration 0003_parts.sql). Used by the
 * Fault Finding search and the garage pin detail cards so part-number/description
 * data lives in exactly one place instead of being duplicated across components,
 * catalog.json and the 3D manifests.
 *
 * Every call degrades gracefully to an empty/null result when Supabase env vars
 * are absent or the table hasn't been imported yet — callers keep working.
 */

export interface CatalogPartRow {
  partNumber: string;
  description: string;
  system: string | null;
  models: string[];
}

interface PartsRowDB {
  part_number: string;
  description: string | null;
  system: string | null;
  models: string[] | null;
}

const norm = (s: string) => s.replace(/[^a-z0-9]/gi, '').toLowerCase();

function mapRow(r: PartsRowDB): CatalogPartRow {
  return {
    partNumber: r.part_number,
    description: r.description ?? '',
    system: r.system ?? null,
    models: r.models ?? [],
  };
}

/** Full-text + part-number search over the central parts catalog. Returns [] on any failure. */
export async function searchParts(
  query: string,
  limit = 20,
  generation?: string,
): Promise<CatalogPartRow[]> {
  const q = query.trim();
  if (!q) return [];
  try {
    const supabase = createClient();
    // Only pass `gen` when scoping to a generation, so generation-less callers
    // still resolve to the base search_parts(q, lim) overload.
    const params: Record<string, unknown> = { q, lim: limit };
    if (generation) params.gen = generation;
    const { data, error } = await supabase.rpc('search_parts', params);
    if (error || !Array.isArray(data)) return [];
    return (data as PartsRowDB[]).map(mapRow);
  } catch {
    return [];
  }
}

/** Resolve one part number to its canonical catalog row, or null if not found. */
export async function lookupPart(partNumber: string, generation?: string): Promise<CatalogPartRow | null> {
  const target = norm(partNumber);
  if (target.length < 4) return null;
  const rows = await searchParts(partNumber, 5, generation);
  return rows.find((r) => norm(r.partNumber) === target) ?? rows[0] ?? null;
}

/**
 * Strict variant of lookupPart: returns a row ONLY when the catalog contains an
 * EXACT match for the requested number (no fuzzy "best guess" fallback). This is
 * the gate behind the garage's verified-or-hidden part display — a number that
 * isn't genuinely in the OEM catalog resolves to null and is hidden, so a
 * stale / wrong hand-typed number can never be shown as if it were verified.
 */
export async function lookupPartExact(partNumber: string, generation?: string): Promise<CatalogPartRow | null> {
  const target = norm(partNumber);
  if (target.length < 6) return null; // full Porsche numbers normalise to ~10-11 chars
  const rows = await searchParts(partNumber, 5, generation);
  return rows.find((r) => norm(r.partNumber) === target) ?? null;
}
