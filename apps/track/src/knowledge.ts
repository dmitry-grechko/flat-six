/**
 * Offline knowledge — reuses lib/knowledge TF search (bundled into the Track build).
 */

import {
  DEFAULT_GENERATION,
  KNOWLEDGE_GENERATIONS,
  searchKnowledge,
  type KnowledgeChunk,
} from '../../../lib/knowledge/index';
import { getMeta, setMeta } from './storage';

const PACK_KEY = 'knowledgePackInstalled';

export async function ensureKnowledgePack(): Promise<{ generation: string; installedAt: string }> {
  const existing = await getMeta<{ generation: string; installedAt: string }>(PACK_KEY);
  if (existing) return existing;
  const pack = {
    generation: DEFAULT_GENERATION,
    installedAt: new Date().toISOString(),
    generations: KNOWLEDGE_GENERATIONS,
  };
  await setMeta(PACK_KEY, pack);
  return pack;
}

export function offlineSearch(
  query: string,
  opts?: { generation?: string; limit?: number },
): KnowledgeChunk[] {
  return searchKnowledge(query, {
    generation: opts?.generation ?? DEFAULT_GENERATION,
    limit: opts?.limit ?? 12,
  });
}

export { KNOWLEDGE_GENERATIONS, DEFAULT_GENERATION };
