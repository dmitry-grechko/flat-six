import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { embedQuery, toVectorLiteral, voyageConfigured } from '@/lib/embeddings';

// Search over the licensed workshop-manual chunks. Two modes:
//   • default  — hybrid (vector + FTS, RRF-fused). Used for semantic search
//                (the AI/MCP path, Fault Finding). Needs Voyage + backfill.
//   • ftsOnly  — plain full-text only (no embeddings). Used by the torque
//                finder, which wants exact keyword matching, not semantics.
// `torque: true` ANDs a torque term into the query so FTS returns only
// torque-bearing sections. The Voyage key stays on the server; the browser
// posts a query and gets ranked hits. Degrades to FTS when Voyage is
// unconfigured or the hybrid RPC isn't present yet (migration 0009).

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const query = typeof body?.query === 'string' ? body.query.trim() : '';
  if (query.length < 2) return NextResponse.json({ hits: [], mode: 'none' });

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'auth_required', hits: [] }, { status: 401 });

  const lim = Math.min(Math.max(Number(body?.limit) || 8, 1), 20);
  const gen = typeof body?.generation === 'string' ? body.generation : null;
  const src = typeof body?.source === 'string' ? body.source : null;
  const ftsOnly = body?.ftsOnly === true;
  const torque = body?.torque === true;

  // websearch_to_tsquery ANDs unquoted words, so appending "torque" restricts
  // hits to sections that actually state a tightening torque.
  const ftsQuery = torque ? `${query} torque` : query;

  if (!ftsOnly && voyageConfigured()) {
    try {
      const emb = await embedQuery(query);
      const { data, error } = await supabase.rpc('search_manual_hybrid', {
        q: query,
        query_embedding: toVectorLiteral(emb),
        lim,
        gen,
        src,
      });
      if (!error && Array.isArray(data)) {
        return NextResponse.json({ hits: data, mode: 'hybrid' });
      }
      // else fall through to FTS (migration not applied, or transient error)
    } catch {
      // Voyage down / misconfigured — fall through to FTS.
    }
  }

  const { data, error } = await supabase.rpc('search_manual', { q: ftsQuery, lim, gen, src });
  if (error) return NextResponse.json({ error: error.message, hits: [] }, { status: 500 });
  return NextResponse.json({ hits: data ?? [], mode: 'fts' });
}
