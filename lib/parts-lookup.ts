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
export async function searchParts(query: string, limit = 20): Promise<CatalogPartRow[]> {
  const q = query.trim();
  if (!q) return [];
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('search_parts', { q, lim: limit });
    if (error || !Array.isArray(data)) return [];
    return (data as PartsRowDB[]).map(mapRow);
  } catch {
    return [];
  }
}

/** Resolve one part number to its canonical catalog row, or null if not found. */
export async function lookupPart(partNumber: string): Promise<CatalogPartRow | null> {
  const target = norm(partNumber);
  if (target.length < 4) return null;
  const rows = await searchParts(partNumber, 5);
  return rows.find((r) => norm(r.partNumber) === target) ?? rows[0] ?? null;
}
