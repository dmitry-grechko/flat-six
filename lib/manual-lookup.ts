'use client';

import { createClient } from '@/lib/supabase/client';

/**
 * Accessor for Supabase `manual_sections` — 981 workshop manual + Mobile Tech
 * Library chunks (see migrations 0006/0008 and tools/manual/parse-*.mjs).
 * Authenticated only; degrades to [] when signed out / demo / not imported.
 */

export interface ManualHit {
  id: string;
  wmCode: string | null;
  groupLabel: string | null;
  title: string;
  subsection: string | null;
  models: string | null;
  page: number;
  snippet: string;
  source?: string | null;
  generation?: string | null;
  docId?: string | null;
}

interface ManualRowDB {
  id: string;
  wm_code: string | null;
  group_label: string | null;
  title: string;
  subsection: string | null;
  models: string | null;
  page: number;
  snippet: string | null;
  source?: string | null;
  generation?: string | null;
  doc_id?: string | null;
}

export async function searchManual(
  query: string,
  limit = 8,
  opts?: { generation?: string; source?: string },
): Promise<ManualHit[]> {
  const q = query.trim();
  if (!q) return [];
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('search_manual', {
      q,
      lim: limit,
      gen: opts?.generation ?? null,
      src: opts?.source ?? null,
    });
    if (error || !Array.isArray(data)) {
      // Fallback: older 2-arg RPC if migration 0008 not applied yet.
      const fallback = await supabase.rpc('search_manual', { q, lim: limit });
      if (fallback.error || !Array.isArray(fallback.data)) return [];
      return (fallback.data as ManualRowDB[]).map(mapRow);
    }
    return (data as ManualRowDB[]).map(mapRow);
  } catch {
    return [];
  }
}

function mapRow(r: ManualRowDB): ManualHit {
  return {
    id: r.id,
    wmCode: r.wm_code,
    groupLabel: r.group_label,
    title: r.title,
    subsection: r.subsection,
    models: r.models,
    page: r.page,
    snippet: r.snippet ?? '',
    source: r.source ?? null,
    generation: r.generation ?? null,
    docId: r.doc_id ?? null,
  };
}

/**
 * Hybrid (vector + full-text) manual search via the server route, which holds
 * the Voyage key and fuses semantic + keyword ranking. Falls back server-side
 * to plain FTS when embeddings aren't configured/backfilled, and returns [] when
 * signed out (licensed content) or on any error — callers degrade gracefully.
 */
export async function searchManualHybrid(
  query: string,
  limit = 8,
  opts?: { generation?: string; source?: string },
): Promise<ManualHit[]> {
  const q = query.trim();
  if (!q) return [];
  try {
    const res = await fetch('/api/manual/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q, limit, generation: opts?.generation, source: opts?.source }),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.hits) ? (json.hits as ManualRowDB[]).map(mapRow) : [];
  } catch {
    return [];
  }
}

/**
 * Plain full-text search (NO embeddings) over the manual's torque-bearing
 * sections, for signed-in users. Powers the torque finder's "search the full
 * manual" tier. Returns authRequired=true on 401 so the UI can prompt sign-in
 * rather than showing a misleading "no results".
 */
export async function searchTorqueManual(
  query: string,
  limit = 10,
  opts?: { generation?: string },
): Promise<{ hits: ManualHit[]; authRequired: boolean }> {
  const q = query.trim();
  if (!q) return { hits: [], authRequired: false };
  try {
    const res = await fetch('/api/manual/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q, limit, generation: opts?.generation, ftsOnly: true, torque: true }),
    });
    if (res.status === 401) return { hits: [], authRequired: true };
    if (!res.ok) return { hits: [], authRequired: false };
    const json = await res.json();
    const hits = Array.isArray(json?.hits) ? (json.hits as ManualRowDB[]).map(mapRow) : [];
    return { hits, authRequired: false };
  } catch {
    return { hits: [], authRequired: false };
  }
}

export async function getManualSection(id: string): Promise<(ManualHit & { content: string }) | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('manual_sections')
      .select('id, wm_code, group_label, title, subsection, models, page, content, source, generation, doc_id')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return null;
    const row = data as unknown as ManualRowDB & { content: string };
    return {
      ...mapRow({ ...row, snippet: null }),
      content: row.content ?? '',
    };
  } catch {
    return null;
  }
}
