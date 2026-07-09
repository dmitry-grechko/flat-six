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
