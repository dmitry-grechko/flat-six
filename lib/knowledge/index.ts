// FLAT·SIX knowledge base — public API (generation-keyed: 981, 987, …).
// Loads the JSON data + markdown articles and exposes typed getters plus a
// dependency-free full-text search used by the RAG assistant and MCP tools.

import faultCodesJson from './fault-codes.json';
import specsJson from './specs.json';
import maintenanceJson from './maintenance.json';
import knownIssuesJson from './known-issues.json';
import { ARTICLES } from './articles';
import faultCodes987Json from './fault-codes-987.json';
import specs987Json from './specs-987.json';
import specsAudiB9Json from './specs-audi-b9.json';
import specs991Json from './specs-991.json';
import maintenance987Json from './maintenance-987.json';
import maintenance991Json from './maintenance-991.json';
import knownIssues987Json from './known-issues-987.json';
import knownIssues991Json from './known-issues-991.json';
import { ARTICLES_987 } from './articles-987';
import type {
  FaultCode,
  Spec,
  MaintenanceItem,
  KnownIssue,
  KnowledgeArticle,
  KnowledgeChunk,
  KnowledgeKind,
} from './types';

export * from './types';

// ---- Generation registry -------------------------------------------------
// Knowledge is keyed by car generation (981 and 987 populated today). Add a
// generation by registering its bundle here (specs/maintenance/etc.). Unknown
// generations resolve to an EMPTY bundle (honest "no data" rather than showing
// the wrong generation's figures). No-arg callers default to the 981.

export const DEFAULT_GENERATION = '981';

export interface KnowledgeBundle {
  faultCodes: FaultCode[];
  specs: Spec[];
  maintenance: MaintenanceItem[];
  knownIssues: KnownIssue[];
  articles: KnowledgeArticle[];
}

const EMPTY_BUNDLE: KnowledgeBundle = {
  faultCodes: [], specs: [], maintenance: [], knownIssues: [], articles: [],
};

const GENERATION_KB: Record<string, KnowledgeBundle> = {
  '981': {
    faultCodes: faultCodesJson as FaultCode[],
    specs: specsJson as Spec[],
    maintenance: maintenanceJson as MaintenanceItem[],
    knownIssues: knownIssuesJson as KnownIssue[],
    articles: ARTICLES,
  },
  '987': {
    faultCodes: faultCodes987Json as FaultCode[],
    specs: specs987Json as Spec[],
    maintenance: maintenance987Json as MaintenanceItem[],
    knownIssues: knownIssues987Json as KnownIssue[],
    articles: ARTICLES_987,
  },
  // 911 (991) — specs / known-issues / maintenance populated (specs verified from
  // the factory manual + cited). Fault codes are empty (honest absence): Fault
  // Finding leans on the embedded 991 workshop manual + generic OBD, as with Audi.
  '991': {
    faultCodes: [],
    specs: specs991Json as Spec[],
    maintenance: maintenance991Json as MaintenanceItem[],
    knownIssues: knownIssues991Json as KnownIssue[],
    articles: [],
  },
  // Audi A4 (B9) — dev car. Verified fluids/capacities/tyre-pressures extracted
  // from the factory fluid + tyre-pressure tables. Faults/known-issues/articles
  // are still empty (honest absence) until more Audi data is collected.
  'audi-b9': {
    faultCodes: [],
    specs: specsAudiB9Json as Spec[],
    maintenance: [],
    knownIssues: [],
    articles: [],
  },
};

/** Generations we have a knowledge bundle for. */
export const KNOWLEDGE_GENERATIONS = Object.keys(GENERATION_KB);

function bundle(generation: string = DEFAULT_GENERATION): KnowledgeBundle {
  return GENERATION_KB[generation] ?? EMPTY_BUNDLE;
}

// ---- Typed getters (generation-aware; default 981) -----------------------

export function getFaultCodes(generation: string = DEFAULT_GENERATION): FaultCode[] {
  return bundle(generation).faultCodes;
}

export function getSpecs(generation: string = DEFAULT_GENERATION): Spec[] {
  return bundle(generation).specs;
}

export function getMaintenance(generation: string = DEFAULT_GENERATION): MaintenanceItem[] {
  return bundle(generation).maintenance;
}

export function getKnownIssues(generation: string = DEFAULT_GENERATION): KnownIssue[] {
  return bundle(generation).knownIssues;
}

export function getArticles(generation: string = DEFAULT_GENERATION): KnowledgeArticle[] {
  return bundle(generation).articles;
}

// ---- Chunk index ---------------------------------------------------------

const WORD_RE = /[a-z0-9]+/gi;
const CODE_RE = /^[pbcu][0-3][0-9a-f]{3}$/i; // OBD-II DTC, e.g. P0301, P000A, U0100

function joinList(label: string, items?: string[]): string {
  if (!items || items.length === 0) return '';
  return `${label}: ${items.join('; ')}.`;
}

/** Split a long article body into ~200-word chunks for retrieval. */
function chunkArticleBody(body: string, wordsPerChunk = 200): string[] {
  const words = body.split(/\s+/).filter(Boolean);
  if (words.length <= wordsPerChunk) return [body];
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk).join(' '));
  }
  return chunks;
}

const CHUNK_CACHE = new Map<string, KnowledgeChunk[]>();

/** Build (and memoize per generation) one searchable chunk per knowledge item. */
function buildChunks(generation: string = DEFAULT_GENERATION): KnowledgeChunk[] {
  const cached = CHUNK_CACHE.get(generation);
  if (cached) return cached;
  const chunks: KnowledgeChunk[] = [];

  for (const f of getFaultCodes(generation)) {
    const text = [
      `${f.code} ${f.title}`,
      `System: ${f.system}. Severity: ${f.severity}.`,
      f.description,
      joinList('Symptoms', f.symptoms),
      joinList('Causes', f.causes),
      joinList('Diagnosis', f.diagnosis),
      joinList('Related parts', f.relatedParts),
      f.appliesTo ? `Applies to: ${f.appliesTo.join(', ')}.` : '',
    ].filter(Boolean).join(' ');
    chunks.push({ id: `fault:${f.code}`, source: f.code, kind: 'fault', title: `${f.code} — ${f.title}`, text });
  }

  for (const s of getSpecs(generation)) {
    const text = [
      `${s.name}: ${s.value}.`,
      `Category: ${s.category}.`,
      s.notes ?? '',
      s.appliesTo ? `Applies to: ${s.appliesTo.join(', ')}.` : '',
    ].filter(Boolean).join(' ');
    chunks.push({ id: `spec:${s.id}`, source: s.id, kind: 'spec', title: s.name, text });
  }

  for (const m of getMaintenance(generation)) {
    const interval = [
      m.intervalMiles ? `${m.intervalMiles.toLocaleString()} mi` : '',
      m.intervalMonths ? `${m.intervalMonths} months` : '',
    ].filter(Boolean).join(' / ');
    const text = [
      `${m.task}.`,
      interval ? `Interval: ${interval}.` : '',
      `System: ${m.system}.`,
      m.notes ?? '',
    ].filter(Boolean).join(' ');
    chunks.push({ id: `maint:${m.id}`, source: m.id, kind: 'maintenance', title: m.task, text });
  }

  for (const k of getKnownIssues(generation)) {
    const text = [
      `${k.title}.`,
      `System: ${k.system}. Severity: ${k.severity}. Affected: ${k.affected}.`,
      k.description,
      joinList('Symptoms', k.symptoms),
      `Fix: ${k.fix}.`,
      k.estCost ? `Estimated cost: ${k.estCost}.` : '',
    ].filter(Boolean).join(' ');
    chunks.push({ id: `issue:${k.id}`, source: k.id, kind: 'issue', title: k.title, text });
  }

  for (const a of getArticles(generation)) {
    const parts = chunkArticleBody(a.body);
    parts.forEach((part, i) => {
      chunks.push({
        id: parts.length > 1 ? `article:${a.id}#${i}` : `article:${a.id}`,
        source: a.id,
        kind: 'article',
        title: parts.length > 1 ? `${a.title} (part ${i + 1})` : a.title,
        text: `${a.title}. Tags: ${a.tags.join(', ')}. ${part}`,
      });
    });
  }

  CHUNK_CACHE.set(generation, chunks);
  return chunks;
}

// ---- Search --------------------------------------------------------------

function tokenize(s: string): string[] {
  return (s.toLowerCase().match(WORD_RE) ?? []);
}

/**
 * Dependency-free retrieval over all knowledge sources.
 * Scoring: term frequency across title+text, with a boost for title matches
 * and a strong boost for exact OBD-II code matches (which rank first).
 */
export function searchKnowledge(
  query: string,
  opts?: { limit?: number; kinds?: KnowledgeKind[]; generation?: string }
): KnowledgeChunk[] {
  const limit = opts?.limit ?? 8;
  const kinds = opts?.kinds;
  const terms = tokenize(query);
  if (terms.length === 0) return [];

  // Detect a fault-code-looking query (e.g. "P0301", "p0420").
  const codeTerms = query
    .toUpperCase()
    .match(/[PBCU][0-3][0-9A-F]{3}/g)
    ?.map((c) => c.toUpperCase()) ?? [];

  let chunks = buildChunks(opts?.generation ?? DEFAULT_GENERATION);
  if (kinds && kinds.length > 0) {
    chunks = chunks.filter((c) => kinds.includes(c.kind));
  }

  const scored = chunks.map((c) => {
    const titleTokens = tokenize(c.title);
    const textTokens = tokenize(c.text);
    let score = 0;

    for (const term of terms) {
      const inTitle = titleTokens.filter((t) => t === term).length;
      const inText = textTokens.filter((t) => t === term).length;
      score += inText + inTitle * 3; // title matches weigh more
    }

    // Exact OBD-II code match dominates the ranking.
    if (codeTerms.length > 0 && c.kind === 'fault') {
      const codeUpper = c.source.toUpperCase();
      if (codeTerms.includes(codeUpper)) score += 1000;
    }

    return { ...c, score };
  });

  return scored
    .filter((c) => (c.score ?? 0) > 0)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, limit);
}

// ---- Source manifest (for UI / status display) --------------------------

export interface KnowledgeSource { name: string; kind: KnowledgeKind; count: number; statusLabel: string }

/** Source manifest with live counts for a given generation (defaults to 981). */
export function knowledgeSources(generation: string = DEFAULT_GENERATION): KnowledgeSource[] {
  return [
    { name: 'Fault Codes', kind: 'fault', count: getFaultCodes(generation).length, statusLabel: 'INDEXED' },
    { name: 'Specifications', kind: 'spec', count: getSpecs(generation).length, statusLabel: 'INDEXED' },
    { name: 'Maintenance Schedule', kind: 'maintenance', count: getMaintenance(generation).length, statusLabel: 'INDEXED' },
    { name: 'Known Issues', kind: 'issue', count: getKnownIssues(generation).length, statusLabel: 'INDEXED' },
    { name: 'Reference Articles', kind: 'article', count: getArticles(generation).length, statusLabel: 'INDEXED' },
  ];
}

/** Back-compat: the default (981) source manifest. */
export const KNOWLEDGE_SOURCES: KnowledgeSource[] = knowledgeSources();
