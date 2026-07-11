import {
  getArticles,
  getFaultCodes,
  getKnownIssues,
  KNOWLEDGE_GENERATIONS,
  type FaultCode,
  type KnowledgeArticle,
} from '@/lib/knowledge';

export const MARKETING_GENERATIONS = KNOWLEDGE_GENERATIONS;

export function isMarketingGeneration(gen: string): gen is string {
  return MARKETING_GENERATIONS.includes(gen);
}

export function faultCodeSlug(code: string): string {
  return code.toLowerCase();
}

export function findFaultCode(generation: string, codeSlug: string): FaultCode | undefined {
  const normalized = codeSlug.toLowerCase();
  return getFaultCodes(generation).find((f) => f.code.toLowerCase() === normalized);
}

export function findArticle(generation: string, slug: string): KnowledgeArticle | undefined {
  return getArticles(generation).find((a) => a.id === slug);
}

export function articleSlug(article: KnowledgeArticle): string {
  return article.id;
}

export function generationLabel(gen: string): string {
  if (gen === '987') return '987 (2005–2012)';
  if (gen === '981') return '981 (2012–2016)';
  return gen;
}

export function generationYears(gen: string): string {
  if (gen === '987') return '2005–2012';
  if (gen === '981') return '2012–2016';
  return '';
}

/** Short one-line engine/chassis tagline for generation cards. */
export function generationTagline(gen: string): string {
  if (gen === '987') return 'M96/M97 flat-six · IMS on .1 · DFI on .2';
  if (gen === '981') return 'MA1 (9A1) flat-six · no IMS · DFI';
  return '';
}

export function generationIntro(gen: string): string {
  if (gen === '987') {
    return 'The 987 Boxster and Cayman span M96/M97 flat-six engines (987.1) and the revised 987.2 with DFI. IMS bearing risk, bore scoring on 3.4 S engines, and RMS leaks are the headline reliability topics — FLAT·SIX scopes every tool and document to your exact variant.';
  }
  if (gen === '981') {
    return 'The 981 generation brought the MA1 (9A1) flat-six with direct injection — no IMS bearing — plus wider tracks and electric power steering. Centre coolant pipes, AOS failures, and PDK clutch-fluid confusion are common forum topics; FLAT·SIX keeps specs, faults, and docs generation-scoped.';
  }
  return '';
}

export function topKnownIssues(generation: string, limit = 5) {
  const severityOrder = { HIGH: 0, MED: 1, LOW: 2 };
  return [...getKnownIssues(generation)]
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
    .slice(0, limit);
}

export function featuredArticles(generation: string, limit = 4) {
  return getArticles(generation).slice(0, limit);
}

export function allGuideParams() {
  return MARKETING_GENERATIONS.flatMap((generation) =>
    getArticles(generation).map((article) => ({ generation, slug: article.id })),
  );
}

export function allCodeParams() {
  return MARKETING_GENERATIONS.flatMap((generation) =>
    getFaultCodes(generation).map((fault) => ({
      generation,
      code: faultCodeSlug(fault.code),
    })),
  );
}
