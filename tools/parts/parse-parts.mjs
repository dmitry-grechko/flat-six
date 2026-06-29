// Parse the Porsche PET parts catalog (pdftotext -layout output) into a deduped
// list of unique parts. Usage:
//   pdftotext -layout "Boxster(981)_2012-2016.pdf" catalog.txt
//   node tools/parts/parse-parts.mjs catalog.txt data/parts-981.json
//
// The catalog is organised under "Illustration: NNN-XXX" assembly groups. Rows
// have columns separated by 2+ spaces: [Pos] PartNumber  Description  [Remark]  Qty  Model.
// "also use:" sub-rows list bare part numbers (seals/bolts in kits) with no
// description. We dedupe by part number, keeping the longest description seen
// anywhere, and aggregate the groups/models each part appears in.

import fs from 'node:fs';

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error('usage: node parse-parts.mjs <catalog.txt> <out.json>');
  process.exit(1);
}

const text = fs.readFileSync(inPath, 'utf8');
const lines = text.split(/\r?\n/);

const PN = /([0-9A-Z]{3}) (\d{3}) (\d{3}) (\d{2})/; // Porsche 11-char part number
const ILL = /Illustration:\s*([0-9A-Z][0-9A-Z-]*)/;
const NOISE = /^\s*(Pos\s+Part Number|Model:|Model life|V-Pages|\d{2}\.\d{2}\.\d{4}|Kat P39|Model Overview|Sales term|EC\s|TC\s)/;

// Porsche main group (first digit of the illustration) -> system label.
const SYSTEM = {
  '1': 'Engine',
  '2': 'Fuel & Exhaust',
  '3': 'Transmission',
  '4': 'Front Axle & Steering',
  '5': 'Rear Axle',
  '6': 'Wheels & Brakes',
  '7': 'Body',
  '8': 'Body Equipment & Interior',
  '9': 'Electrical',
};

const MODEL_RE = /^(A12\d\+?|PR:.+|\d{2,4}\+?)$/;

/** @type {Map<string, {partNumber:string, description:string, system:string, groups:Set<string>, models:Set<string>}>} */
const parts = new Map();
let group = '';

for (const raw of lines) {
  const ill = raw.match(ILL);
  if (ill) {
    group = ill[1];
    continue;
  }
  if (NOISE.test(raw)) continue;

  const m = raw.match(PN);
  if (!m) continue;

  const partNumber = `${m[1]}.${m[2]}.${m[3]}.${m[4]}`; // dotted, canonical
  const after = raw.slice(m.index + m[0].length);
  // Columns are separated by runs of 2+ spaces.
  const cells = after.split(/\s{2,}/).map((s) => s.trim()).filter(Boolean);

  // First cell after the part number is the description (unless it's a column
  // value like a qty/model — those only appear when description is blank).
  let description = '';
  const models = [];
  if (cells.length) {
    const first = cells[0];
    if (!MODEL_RE.test(first) && !/^[\dX]+$/.test(first)) description = first;
  }
  for (const c of cells) {
    if (MODEL_RE.test(c)) models.push(c);
  }

  const system = SYSTEM[group?.[0]] ?? 'Other';

  const existing = parts.get(partNumber);
  if (existing) {
    if (description.length > existing.description.length) existing.description = description;
    if (group) existing.groups.add(group);
    models.forEach((x) => existing.models.add(x));
  } else {
    parts.set(partNumber, {
      partNumber,
      description,
      system,
      groups: new Set(group ? [group] : []),
      models: new Set(models),
    });
  }
}

const out = [...parts.values()]
  .map((p) => ({
    partNumber: p.partNumber,
    description: p.description,
    system: p.system,
    groups: [...p.groups].sort(),
    models: [...p.models].sort(),
  }))
  .sort((a, b) => a.partNumber.localeCompare(b.partNumber));

fs.writeFileSync(outPath, JSON.stringify(out, null, 2));

const withDesc = out.filter((p) => p.description).length;
console.log(`parts: ${out.length}`);
console.log(`with description: ${withDesc} (${Math.round((withDesc / out.length) * 100)}%)`);
console.log(`systems:`, [...new Set(out.map((p) => p.system))].join(', '));
console.log('--- 12 samples ---');
for (let i = 0; i < out.length; i += Math.floor(out.length / 12)) {
  const p = out[i];
  console.log(`${p.partNumber}  [${p.system}]  ${p.description || '(no desc)'}`);
}
