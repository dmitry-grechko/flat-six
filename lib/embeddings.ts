// Voyage embeddings — SERVER ONLY. Reads VOYAGE_API_KEY (never NEXT_PUBLIC), so
// this module must only be imported from server code (API routes, the MCP
// server). The browser reaches it indirectly via /api/manual/search.
//
// Model: voyage-4-lite (1024-dim, 32K context, $0.02/MTok, 200M free tokens).
// Backfill uses input_type 'document'; live queries use 'query' (asymmetric
// embeddings — Voyage recommends distinguishing the two for retrieval).

const VOYAGE_URL = 'https://api.voyageai.com/v1/embeddings';
export const EMBED_MODEL = process.env.VOYAGE_MODEL || 'voyage-4-lite';
export const EMBED_DIM = 1024;

/** True when a Voyage key is configured; callers fall back to FTS otherwise. */
export function voyageConfigured(): boolean {
  return !!process.env.VOYAGE_API_KEY;
}

interface VoyageResponse {
  data: { embedding: number[]; index: number }[];
  usage?: { total_tokens: number };
}

/** Embed a batch of texts. Returns embeddings in input order. Throws on error. */
export async function embedTexts(
  texts: string[],
  inputType: 'query' | 'document',
): Promise<{ embeddings: number[][]; totalTokens: number }> {
  const key = process.env.VOYAGE_API_KEY;
  if (!key) throw new Error('VOYAGE_API_KEY is not set');
  if (texts.length === 0) return { embeddings: [], totalTokens: 0 };

  const res = await fetch(VOYAGE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: EMBED_MODEL,
      input: texts,
      input_type: inputType,
      output_dimension: EMBED_DIM,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Voyage ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = (await res.json()) as VoyageResponse;
  const sorted = [...json.data].sort((a, b) => a.index - b.index);
  return { embeddings: sorted.map((d) => d.embedding), totalTokens: json.usage?.total_tokens ?? 0 };
}

/** Embed a single query string. */
export async function embedQuery(text: string): Promise<number[]> {
  const { embeddings } = await embedTexts([text], 'query');
  return embeddings[0];
}

/** Format an embedding as a pgvector literal (e.g. "[0.1,0.2,...]") for RPC/DB. */
export function toVectorLiteral(v: number[]): string {
  return `[${v.join(',')}]`;
}
