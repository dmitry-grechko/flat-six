// Pull candidate Porsche part numbers out of the free-text `part` strings the
// garage components carry (e.g. "Pads 981.351.939.04 · discs 981.351.401.01").
// These are only CANDIDATES — the garage then verifies each against the Supabase
// OEM catalog and shows it only if it resolves, so over-extraction is harmless
// (a non-part will simply fail to verify) and under-extraction just hides a part.
//
// A Porsche number is three groups — prefix · 3 digits · 3 digits — with an
// optional 1–2 char suffix, e.g. 981.351.939.04, 9A1.107.224.00, PAB.955.651,
// 7PP.906.283.F, 000.043.210.82. In prose the groups are always DOT-separated
// (never space): requiring the dots stops a preceding all-caps word from being
// mis-read as the prefix ("DME 991.618.602.03" → 991.618.602.03, not DME.991…)
// and stops non-Porsche tokens ("Bosch 0280750474", "6PK1768") from matching.

const PART_RE = /\b([0-9A-Z]{3})\.(\d{3})\.(\d{3})(?:\.([0-9A-Z]{1,2}))?\b/gi;

/** Normalise a part number to alphanumerics for de-duplication / comparison. */
export function normalizePartNumber(s: string): string {
  return s.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

/**
 * Extract unique candidate Porsche part numbers from free text, dotted and
 * upper-cased for display (e.g. "981.351.939.04"). Order-preserving.
 */
export function extractPartNumbers(text: string | null | undefined): string[] {
  if (!text) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of text.matchAll(PART_RE)) {
    const [, p1, p2, p3, p4] = m;
    const dotted = `${p1}.${p2}.${p3}${p4 ? '.' + p4 : ''}`.toUpperCase();
    const key = normalizePartNumber(dotted);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(dotted);
  }
  return out;
}
