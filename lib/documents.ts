/**
 * Catalog of in-app reference PDFs (workshop manual + Mobile Tech Library).
 * Friendly titles for the Documents tab; storage paths for signed URLs.
 *
 * PDFs themselves are gitignored / live in Supabase Storage — this registry
 * is the only thing the app ships.
 */

import audiDocsManifest from './documents-audi-b9.json';

export type DocCategory =
  | 'workshop'
  | 'diagnostic'
  | 'service-info'
  | 'training'
  | 'maintenance'
  | 'parts';

export type DocGeneration = '981' | '987' | 'shared' | 'audi-b9';

export interface DocumentMeta {
  /** Stable id used in URLs (?doc=…) and Storage object keys. */
  id: string;
  title: string;
  subtitle?: string;
  category: DocCategory;
  /** Generations this doc applies to. 'shared' = both / general. */
  generations: DocGeneration[];
  /**
   * Path relative to public/ for local fallback, OR Storage object path
   * under the workshop-manual bucket (same key).
   */
  storagePath: string;
  /** Local public URL fallback (dev). */
  localUrl?: string;
  /** Approx size label for the UI. */
  sizeLabel?: string;
}

const MTL = 'mobile_tech_library';

/**
 * Model-first Storage object key, e.g. `981/diagnostic/foo.pdf`,
 * `987/maintenance/bar.pdf`, `shared/training/baz.pdf`. This is how the
 * `workshop-manual` bucket is organised — clear per-model / per-category
 * folders. `localUrl` still points at the on-disk file under public/ (which
 * keeps its original mobile_tech_library layout); only the Storage key is
 * model-first. tools/manual/upload-docs.mjs mirrors this mapping.
 */
function storeKey(model: '981' | '987' | 'shared', category: string, sub: string): string {
  return `${model}/${category}/${sub}`;
}

/**
 * Workshop manual volumes (compressed + split for Supabase Free ≤50 MB).
 * Absolute PDF page N maps via `workshopVolumeForPage`. Local full PDF still
 * works in dev when present; prod serves these volumes from Storage.
 */
export const WORKSHOP_VOLUMES: DocumentMeta[] = [
  {
    id: '981-workshop-manual-v1',
    title: '981 Workshop Manual — Vol 1',
    subtitle: 'Pages 1–2029 · Cayman · Boxster · GT4 (2013–2016)',
    category: 'workshop',
    generations: ['981'],
    storagePath: '981/workshop/981-workshop-manual-v1.pdf',
    localUrl: '/manual/981-workshop-manual-v1.pdf',
    sizeLabel: '~32 MB',
  },
  {
    id: '981-workshop-manual-v2',
    title: '981 Workshop Manual — Vol 2',
    subtitle: 'Pages 2030–4058 · Cayman · Boxster · GT4 (2013–2016)',
    category: 'workshop',
    generations: ['981'],
    storagePath: '981/workshop/981-workshop-manual-v2.pdf',
    localUrl: '/manual/981-workshop-manual-v2.pdf',
    sizeLabel: '~33 MB',
  },
  {
    id: '981-workshop-manual-v3',
    title: '981 Workshop Manual — Vol 3',
    subtitle: 'Pages 4059–6087 · Cayman · Boxster · GT4 (2013–2016)',
    category: 'workshop',
    generations: ['981'],
    storagePath: '981/workshop/981-workshop-manual-v3.pdf',
    localUrl: '/manual/981-workshop-manual-v3.pdf',
    sizeLabel: '~33 MB',
  },
];

/**
 * 987.1 (2005–2008 Cayman) factory service manual — compressed volumes.
 * Page ranges match `public/manual/volumes-9871.json`.
 */
export const WORKSHOP_VOLUMES_9871: DocumentMeta[] = [
  {
    id: '987-workshop-9871-v1',
    title: '987.1 Service Manual — Vol 1',
    subtitle: 'Pages 1–1760 · Cayman (2005–2008)',
    category: 'workshop',
    generations: ['987'],
    storagePath: '987/workshop/987-workshop-9871-v1.pdf',
    localUrl: '/manual/987-workshop-9871-v1.pdf',
    sizeLabel: '~31 MB',
  },
  {
    id: '987-workshop-9871-v2',
    title: '987.1 Service Manual — Vol 2',
    subtitle: 'Pages 1761–3520 · Cayman (2005–2008)',
    category: 'workshop',
    generations: ['987'],
    storagePath: '987/workshop/987-workshop-9871-v2.pdf',
    localUrl: '/manual/987-workshop-9871-v2.pdf',
    sizeLabel: '~28 MB',
  },
  {
    id: '987-workshop-9871-v3',
    title: '987.1 Service Manual — Vol 3',
    subtitle: 'Pages 3521–5278 · Cayman (2005–2008)',
    category: 'workshop',
    generations: ['987'],
    storagePath: '987/workshop/987-workshop-9871-v3.pdf',
    localUrl: '/manual/987-workshop-9871-v3.pdf',
    sizeLabel: '~27 MB',
  },
];

/**
 * 987.2 (2009–2011 Boxster/Cayman) factory service manual — compressed volumes.
 * Page ranges match `public/manual/volumes-9872.json`.
 */
export const WORKSHOP_VOLUMES_9872: DocumentMeta[] = [
  {
    id: '987-workshop-9872-v1',
    title: '987.2 Service Manual — Vol 1',
    subtitle: 'Pages 1–789 · Boxster / Cayman (2009–2011)',
    category: 'workshop',
    generations: ['987'],
    storagePath: '987/workshop/987-workshop-9872-v1.pdf',
    localUrl: '/manual/987-workshop-9872-v1.pdf',
    sizeLabel: '~17 MB',
  },
  {
    id: '987-workshop-9872-v2',
    title: '987.2 Service Manual — Vol 2',
    subtitle: 'Pages 790–1578 · Boxster / Cayman (2009–2011)',
    category: 'workshop',
    generations: ['987'],
    storagePath: '987/workshop/987-workshop-9872-v2.pdf',
    localUrl: '/manual/987-workshop-9872-v2.pdf',
    sizeLabel: '~16 MB',
  },
  {
    id: '987-workshop-9872-v3',
    title: '987.2 Service Manual — Vol 3',
    subtitle: 'Pages 1579–2367 · Boxster / Cayman (2009–2011)',
    category: 'workshop',
    generations: ['987'],
    storagePath: '987/workshop/987-workshop-9872-v3.pdf',
    localUrl: '/manual/987-workshop-9872-v3.pdf',
    sizeLabel: '~20 MB',
  },
  {
    id: '987-workshop-9872-v4',
    title: '987.2 Service Manual — Vol 4',
    subtitle: 'Pages 2368–3156 · Boxster / Cayman (2009–2011)',
    category: 'workshop',
    generations: ['987'],
    storagePath: '987/workshop/987-workshop-9872-v4.pdf',
    localUrl: '/manual/987-workshop-9872-v4.pdf',
    sizeLabel: '~19 MB',
  },
  {
    id: '987-workshop-9872-v5',
    title: '987.2 Service Manual — Vol 5',
    subtitle: 'Pages 3157–3945 · Boxster / Cayman (2009–2011)',
    category: 'workshop',
    generations: ['987'],
    storagePath: '987/workshop/987-workshop-9872-v5.pdf',
    localUrl: '/manual/987-workshop-9872-v5.pdf',
    sizeLabel: '~17 MB',
  },
  {
    id: '987-workshop-9872-v6',
    title: '987.2 Service Manual — Vol 6',
    subtitle: 'Pages 3946–4734 · Boxster / Cayman (2009–2011)',
    category: 'workshop',
    generations: ['987'],
    storagePath: '987/workshop/987-workshop-9872-v6.pdf',
    localUrl: '/manual/987-workshop-9872-v6.pdf',
    sizeLabel: '~17 MB',
  },
  {
    id: '987-workshop-9872-v7',
    title: '987.2 Service Manual — Vol 7',
    subtitle: 'Pages 4735–5523 · Boxster / Cayman (2009–2011)',
    category: 'workshop',
    generations: ['987'],
    storagePath: '987/workshop/987-workshop-9872-v7.pdf',
    localUrl: '/manual/987-workshop-9872-v7.pdf',
    sizeLabel: '~18 MB',
  },
  {
    id: '987-workshop-9872-v8',
    title: '987.2 Service Manual — Vol 8',
    subtitle: 'Pages 5524–6309 · Boxster / Cayman (2009–2011)',
    category: 'workshop',
    generations: ['987'],
    storagePath: '987/workshop/987-workshop-9872-v8.pdf',
    localUrl: '/manual/987-workshop-9872-v8.pdf',
    sizeLabel: '~18 MB',
  },
];

/** Absolute page ranges matching `npm run manual:compress` (6087 pages / 3). */
export const WORKSHOP_VOLUME_RANGES: ReadonlyArray<{
  id: string;
  startPage: number;
  endPage: number;
  series?: '981' | '9871' | '9872';
}> = [
  { id: '981-workshop-manual-v1', startPage: 1, endPage: 2029, series: '981' },
  { id: '981-workshop-manual-v2', startPage: 2030, endPage: 4058, series: '981' },
  { id: '981-workshop-manual-v3', startPage: 4059, endPage: 6087, series: '981' },
  { id: '987-workshop-9871-v1', startPage: 1, endPage: 1760, series: '9871' },
  { id: '987-workshop-9871-v2', startPage: 1761, endPage: 3520, series: '9871' },
  { id: '987-workshop-9871-v3', startPage: 3521, endPage: 5278, series: '9871' },
  { id: '987-workshop-9872-v1', startPage: 1, endPage: 789, series: '9872' },
  { id: '987-workshop-9872-v2', startPage: 790, endPage: 1578, series: '9872' },
  { id: '987-workshop-9872-v3', startPage: 1579, endPage: 2367, series: '9872' },
  { id: '987-workshop-9872-v4', startPage: 2368, endPage: 3156, series: '9872' },
  { id: '987-workshop-9872-v5', startPage: 3157, endPage: 3945, series: '9872' },
  { id: '987-workshop-9872-v6', startPage: 3946, endPage: 4734, series: '9872' },
  { id: '987-workshop-9872-v7', startPage: 4735, endPage: 5523, series: '9872' },
  { id: '987-workshop-9872-v8', startPage: 5524, endPage: 6309, series: '9872' },
];

/** Every workshop volume across generations (981 + 987.1 + 987.2). */
export function allWorkshopVolumes(): DocumentMeta[] {
  return [...WORKSHOP_VOLUMES, ...WORKSHOP_VOLUMES_9871, ...WORKSHOP_VOLUMES_9872];
}

/**
 * Map an absolute workshop PDF page → volume doc + page-within-volume.
 * Pass `series` when the page belongs to a specific manual (required once
 * multiple manuals share overlapping absolute page numbers).
 */
export function workshopVolumeForPage(
  absolutePage: number,
  series: '981' | '9871' | '9872' = '981',
): {
  doc: DocumentMeta;
  pageInVolume: number;
} {
  const page = Math.max(1, Math.floor(absolutePage) || 1);
  const ranges = WORKSHOP_VOLUME_RANGES.filter((r) => (r.series ?? '981') === series);
  const range =
    ranges.find((r) => page >= r.startPage && page <= r.endPage) ?? ranges[0] ?? WORKSHOP_VOLUME_RANGES[0];
  const docs = allWorkshopVolumes();
  const doc = docs.find((v) => v.id === range.id) ?? docs[0] ?? WORKSHOP_VOLUMES[0];
  return { doc, pageInVolume: page - range.startPage + 1 };
}

/** Infer workshop series from a volume doc id. */
export function workshopSeriesForDocId(docId: string | null | undefined): '981' | '9871' | '9872' | null {
  if (!docId) return null;
  if (docId.startsWith('987-workshop-9872')) return '9872';
  if (docId.startsWith('987-workshop-9871')) return '9871';
  if (docId.startsWith('981-workshop')) return '981';
  return null;
}

/** Encode each path segment for a public URL (spaces, commas, etc.). */
function publicUrl(relPath: string): string {
  return '/' + relPath.split('/').map(encodeURIComponent).join('/');
}

function diag981(file: string, title: string, subtitle?: string): DocumentMeta {
  const base = file.replace(/\.pdf$/i, '');
  const id = `mtl-981-${slug(base)}`;
  const rel = `${MTL}/Diagnostic Information/981 Boxster-Cayman/${file}`;
  return {
    id,
    title,
    subtitle: subtitle ?? '981 Diagnostic Information',
    category: 'diagnostic',
    generations: ['981'],
    storagePath: storeKey('981', 'diagnostic', file),
    localUrl: publicUrl(rel),
  };
}

function diag981Nested(subdir: string, file: string, title: string): DocumentMeta {
  const id = `mtl-981-${slug(subdir + '-' + file.replace(/\.pdf$/i, ''))}`;
  const rel = `${MTL}/Diagnostic Information/981 Boxster-Cayman/${subdir}/${file}`;
  return {
    id,
    title,
    subtitle: '981 Diagnostic Information',
    category: 'diagnostic',
    generations: ['981'],
    storagePath: storeKey('981', 'diagnostic', `${subdir}/${file}`),
    localUrl: publicUrl(rel),
  };
}

function diag987(file: string, title: string, subtitle?: string): DocumentMeta {
  const id = `mtl-987-${slug(file.replace(/\.pdf$/i, ''))}`;
  const rel = `${MTL}/Diagnostic Information/987 Boxster-Cayman/${file}`;
  return {
    id,
    title,
    subtitle: subtitle ?? '987 Diagnostic Information',
    category: 'diagnostic',
    generations: ['987'],
    storagePath: storeKey('987', 'diagnostic', file),
    localUrl: publicUrl(rel),
  };
}

function diag987Nested(subdir: string, file: string, title: string): DocumentMeta {
  const id = `mtl-987-${slug(subdir + '-' + file.replace(/\.pdf$/i, ''))}`;
  const rel = `${MTL}/Diagnostic Information/987 Boxster-Cayman/${subdir}/${file}`;
  return {
    id,
    title,
    subtitle: '987 Diagnostic Information',
    category: 'diagnostic',
    generations: ['987'],
    storagePath: storeKey('987', 'diagnostic', `${subdir}/${file}`),
    localUrl: publicUrl(rel),
  };
}

function sit(file: string, title: string, gens: DocGeneration[]): DocumentMeta {
  const id = `mtl-sit-${slug(file.replace(/\.pdf$/i, ''))}`;
  const rel = `${MTL}/Service Information Technik/Boxster-Cayman/${file}`;
  return {
    id,
    title,
    subtitle: 'Service Information Technik',
    category: 'service-info',
    generations: gens,
    storagePath: storeKey(gens.includes('987') ? '987' : '981', 'service-info', file),
    localUrl: publicUrl(rel),
  };
}

function training(file: string, title: string, gens: DocGeneration[]): DocumentMeta {
  const id = `mtl-train-${slug(file.replace(/\.pdf$/i, ''))}`;
  const rel = `${MTL}/Training Books/${file}`;
  return {
    id,
    title,
    subtitle: 'Porsche Training Book',
    category: 'training',
    generations: gens,
    storagePath: storeKey('shared', 'training', file),
    localUrl: publicUrl(rel),
  };
}

/** 987 owner + maintenance material (checklists, schedules, owner guides). */
function maint987(file: string, title: string, subtitle: string, sizeLabel?: string): DocumentMeta {
  const id = `mtl-987-maint-${slug(file.replace(/\.pdf$/i, ''))}`;
  const rel = `${MTL}/987 Maintenance/${file}`;
  return {
    id,
    title,
    subtitle,
    category: 'maintenance',
    generations: ['987'],
    storagePath: storeKey('987', 'maintenance', file),
    localUrl: publicUrl(rel),
    sizeLabel,
  };
}

/** 981 parts material (the full PET parts catalog PDF). */
function parts981(file: string, title: string, subtitle: string, sizeLabel?: string): DocumentMeta {
  const id = `parts-981-${slug(file.replace(/\.pdf$/i, ''))}`;
  const rel = `${MTL}/981 Parts/${file}`;
  return {
    id,
    title,
    subtitle,
    category: 'parts',
    generations: ['981'],
    storagePath: storeKey('981', 'parts', file),
    localUrl: publicUrl(rel),
    sizeLabel,
  };
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

/**
 * Audi A4 (B9) — dev car. Generated from the staged, curated, de-duplicated doc
 * set (tools/manual/stage-audi-docs.mjs → lib/documents-audi-b9.json). Storage
 * keys mirror tools/manual/upload-docs.mjs (`audi-b9/<category>/<file>`).
 */
const AUDI_B9_DOCS: DocumentMeta[] = (
  audiDocsManifest as { file: string; title: string; category: DocCategory; sizeMb: number }[]
).map((d) => ({
  id: `audi-b9-${slug(d.file.replace(/\.pdf$/i, ''))}`,
  title: d.title,
  subtitle: 'Audi A4 (B9)',
  category: d.category,
  generations: ['audi-b9'],
  storagePath: `audi-b9/${d.file}`,
  localUrl: publicUrl(`${MTL}/Audi A4 B9/${d.file}`),
  sizeLabel: `~${d.sizeMb} MB`,
}));

/** Full catalog shown in the Documents tab (981 / 987 / audi-b9 scoped). */
export const DOCUMENTS: DocumentMeta[] = [
  ...WORKSHOP_VOLUMES,
  ...WORKSHOP_VOLUMES_9871,
  ...WORKSHOP_VOLUMES_9872,
  ...AUDI_B9_DOCS,

  // ---- 981 Parts ----
  parts981('981 Parts Catalog 2012-2016.pdf', '981 Parts Catalog', 'Official PET parts catalog · Boxster/Cayman (981) 2012–2016 · 794 pp', '~31 MB'),

  // ---- 987 Owner & Maintenance (official Porsche PNA / owner material) ----
  maint987('987 Maintenance Schedule.pdf', 'Maintenance Schedule', 'Required maintenance & lubrication service · PNA 000 162 EH', '~80 KB'),
  maint987('987 Minor Maintenance Checklist 1.pdf', 'Minor Maintenance Checklist 1', 'Minor service (LO 03 24 00) · 12k mi / 1 yr', '~80 KB'),
  maint987('987 Minor Maintenance Checklist 2.pdf', 'Minor Maintenance Checklist 2', 'Minor service checklist · 987 / 997', '~80 KB'),
  maint987('987 Major Maintenance Checklist.pdf', 'Major Maintenance Checklist', 'Major service (LO 03 26 00) · 36k mi / 3 yr', '~80 KB'),
  maint987('987 Boxster Service Guide.pdf', 'Boxster Service Guide', 'Minor & major service scope + intervals (Porsche GB)', '~0.9 MB'),
  maint987('987 Owners User Guide.pdf', "Owner's User Guide", 'Owner user guide · controls & care', '~3.3 MB'),
  maint987('987 Service Introduction 2009.pdf', 'Service Introduction (2009)', 'Model-year technical service introduction', '~18 MB'),
  maint987('987 Boxster Brochure 2009.pdf', 'Boxster Specifications (2009)', 'Model-year overview & specifications', '~60 KB'),

  // ---- 981 Diagnostic ----
  diag981('3730 PDK.pdf', 'PDK Diagnosis'),
  diag981('3701 Summary Tables PDK 2012-2013.pdf', 'PDK Summary Tables (2012–2013)'),
  diag981('3708 Selector lever.pdf', 'Selector Lever'),
  diag981('2470 Mode 6.pdf', 'Mode 6'),
  diag981('2470 Summary Table DME 2.7 2015.pdf', 'DME Summary Table 2.7 (2015)'),
  diag981Nested('981 DME Diagnostic Trouble Codes', '2470 DME (DFI) Diagnostic Trouble Codes.pdf', 'DME (DFI) Trouble Codes'),
  diag981Nested('OBD Application and Description', '0335 OBD Application Notes 12-13.pdf', 'OBD Application Notes (2012–2013)'),
  diag981Nested('OBD Application and Description', '0335 OBD System Description 2014.pdf', 'OBD System Description (2014)'),
  diag981Nested('OBD Application and Description', '0335 OBD System Description 2015.pdf', 'OBD System Description (2015)'),
  diag981('4562 PSM.pdf', 'PSM'),
  diag981('4316 PASM.pdf', 'PASM'),
  diag981('4308 PDCC.pdf', 'PDCC'),
  diag981('4434 Tire Pressure Monitoring (TPM).pdf', 'Tire Pressure Monitoring'),
  diag981('4662 Parking Brake.pdf', 'Parking Brake'),
  diag981('4890 Power Steering.pdf', 'Power Steering'),
  diag981('2785 Adaptive Cruise Control (ACC).pdf', 'Adaptive Cruise Control'),
  diag981('8720 Air Conditioning System.pdf', 'Air Conditioning'),
  diag981('6196 Convertible Top (Boxster).pdf', 'Convertible Top (Boxster)'),
  diag981('6953 Airbag.pdf', 'Airbag'),
  diag981("5773 Driver's Door.pdf", "Driver's Door"),
  diag981("5773 Passenger's Door.pdf", "Passenger's Door"),
  diag981('5789 Rear-end Electronics.pdf', 'Rear-end Electronics'),
  diag981('9449 Front-end Electronics.pdf', 'Front-end Electronics'),
  diag981('9025 Instrument Cluster.pdf', 'Instrument Cluster'),
  diag981('9030 Stopwatch.pdf', 'Stopwatch'),
  diag981('9035 Gateway.pdf', 'Gateway'),
  diag981('9700 CAN Communication.pdf', 'CAN Communication'),
  diag981('9110 PCM-CDR.pdf', 'PCM / CDR'),
  diag981('9117 TV Tuner.pdf', 'TV Tuner'),
  diag981('9144 External Amplifier.pdf', 'External Amplifier'),
  diag981('9162 Steering Wheel Electronics.pdf', 'Steering Wheel Electronics'),
  diag981('9173 Reversing Camera.pdf', 'Reversing Camera'),
  diag981('9174 Park Assist.pdf', 'Park Assist'),
  diag981('9416 Headlights Central.pdf', 'Headlights (Central)'),
  diag981('9457 Headlights Left Side.pdf', 'Headlights (Left)'),
  diag981('9457 Headlights Right Side.pdf', 'Headlights (Right)'),
  diag981('9638 Front Camera.pdf', 'Front Camera'),
  diag981('7293 Memory Seat Adjustment Driver.pdf', 'Memory Seat (Driver)'),
  diag981('7293 Memory Seat Adjustment Passeneger.pdf', 'Memory Seat (Passenger)'),

  // ---- 987 Diagnostic ----
  diag987Nested('987 DME Diagnostic Trouble Codes', '2470 DME Diagnostic Trouble Codes 2005-2008.pdf', 'DME Trouble Codes (2005–2008)'),
  diag987Nested('987 DME Diagnostic Trouble Codes', '2470 DME Diagnostic Trouble Codes 2009-2011.pdf', 'DME Trouble Codes (2009–2011)'),
  diag987Nested('Summary Table DME', '2470 Summary Table DME MT 2005-2007.pdf', 'DME Summary — Manual (2005–2007)'),
  diag987Nested('Summary Table DME', '2470 Summary Table DME AT 2005-2007.pdf', 'DME Summary — Tiptronic (2005–2007)'),
  diag987Nested('Summary Table DME', '2470 Summary Table DME 2008.pdf', 'DME Summary (2008)'),
  diag987Nested('Summary Table DME', '2470 Summary Table DME 2009-2010.pdf', 'DME Summary (2009–2010)'),
  diag987Nested('Summary Table DME', '2470 Summary Table DME 2011.pdf', 'DME Summary (2011)'),
  diag987Nested('OBD Application Notes', '0335 OBD Application Notes 2005.pdf', 'OBD Notes (2005)'),
  diag987Nested('OBD Application Notes', '0335 OBD Application Notes 2006.pdf', 'OBD Notes (2006)'),
  diag987Nested('OBD Application Notes', '0335 OBD Application Notes 2007.pdf', 'OBD Notes (2007)'),
  diag987Nested('OBD Application Notes', '0335 OBD Application Notes 2008.pdf', 'OBD Notes (2008)'),
  diag987Nested('OBD Application Notes', '0335 OBD Application Notes 2009-2010.pdf', 'OBD Notes (2009–2010)'),
  diag987Nested('OBD Application Notes', '0335 OBD Application Notes 2011.pdf', 'OBD Notes (2011)'),
  diag987Nested('Mode 6', '0335 Mode 6 2005.pdf', 'Mode 6 (2005)'),
  diag987Nested('Mode 6', '0335 Mode 6 2006-2008.pdf', 'Mode 6 (2006–2008)'),
  diag987Nested('Mode 6', '0335 Mode 6 2009.pdf', 'Mode 6 (2009)'),
  diag987Nested('Mode 6', '0335 Mode 6 2010-2011.pdf', 'Mode 6 (2010–2011)'),
  diag987Nested('Transmission', '3701 Diagnosis Information Tiptronic.pdf', 'Tiptronic Diagnosis'),
  diag987Nested('Transmission', '3701 Diagnosis Information PDK 2011.pdf', 'PDK Diagnosis (2011)'),
  diag987Nested('Transmission', '3701 Summary Table PDK 2011.pdf', 'PDK Summary (2011)'),
  diag987('3705 Selector Lever.pdf', 'Selector Lever'),
  diag987('4503 PSM.pdf', 'PSM'),
  diag987('4316 PASM.pdf', 'PASM'),
  diag987('4434 TPM.pdf', 'Tire Pressure Monitoring'),
  diag987('8701 Air Conditioning.pdf', 'Air Conditioning'),
  diag987('6101 Convertible Top.pdf', 'Convertible Top'),
  diag987('6901 POSIP.pdf', 'POSIP / Airbag'),
  diag987('6968 AWS.pdf', 'AWS'),
  diag987('5773 Door Left.pdf', 'Door (Left)'),
  diag987('5773 Door Right.pdf', 'Door (Right)'),
  diag987('5789 Rear-End Electronics.pdf', 'Rear-End Electronics'),
  diag987('9449 Front-End Electronics.pdf', 'Front-End Electronics'),
  diag987('9022 Seat Memory.pdf', 'Seat Memory'),
  diag987('9025 Instrument Cluster.pdf', 'Instrument Cluster'),
  diag987('9030 Stopwatch.pdf', 'Stopwatch'),
  diag987('9035 Gateway Control Unit.pdf', 'Gateway'),
  diag987('9710 Vehicle Electrical.pdf', 'Vehicle Electrical'),
  diag987('9110 PCM 3,0.pdf', 'PCM 3.0'),
  diag987('9124 CDR24.pdf', 'CDR24'),
  diag987('9144 Amplifier Bose.pdf', 'Bose Amplifier'),
  diag987('9160 CD Changer.pdf', 'CD Changer'),
  diag987('9162 Steering Wheel Electronics.pdf', 'Steering Wheel Electronics'),
  diag987('9174 Park Assist.pdf', 'Park Assist'),
  diag987('9426 Cornering Light.pdf', 'Cornering Light'),
  diag987('9666 PAS.pdf', 'PAS'),

  // ---- Service Information Technik (yearbooks) ----
  sit('2005 Boxster.pdf', 'SIT 2005 Boxster', ['987']),
  sit('2006 Cayman.pdf', 'SIT 2006 Cayman', ['987']),
  sit('2007 987 Boxster-Cayman.pdf', 'SIT 2007 Boxster / Cayman', ['987']),
  sit('2009 Boxster, Cayman.pdf', 'SIT 2009 Boxster / Cayman', ['987']),
  sit('2011 Boxster Spyder.pdf', 'SIT 2011 Boxster Spyder', ['987']),
  sit('2013 Boxster.pdf', 'SIT 2013 Boxster', ['981']),
  sit('2014 Cayman.pdf', 'SIT 2014 Cayman', ['981']),
  sit('2016 Cayman GT4.pdf', 'SIT 2016 Cayman GT4', ['981']),

  // ---- Technical Information bulletins (TSB / workshop campaigns) ----
  {
    id: 'tsb-wd06-water-drain-valves',
    title: 'WD06 — Water Drain Valves (Workshop Campaign)',
    subtitle: 'Technical Information · SB-10052000-1049 · Boxster (981) MY2013',
    category: 'service-info',
    generations: ['981'],
    storagePath: '981/service-info/SB-10052000-1049.pdf',
    localUrl: publicUrl(`${MTL}/Service Information Technik/Boxster-Cayman/SB-10052000-1049.pdf`),
    sizeLabel: '~106 KB',
  },

  // ---- Training books relevant to 981/987 ----
  training('P10W 911 Carrera-Boxster-Cayman Engine Repair.pdf', 'Engine Repair — Carrera / Boxster / Cayman', ['987', 'shared']),
  training('P10W 997-987 Gen II Engine Repair.pdf', 'Engine Repair — 997 / 987 Gen II', ['987']),
  training('P52 991-981 Body and Structural Repair.pdf', 'Body & Structural Repair — 991 / 981', ['981']),
  training('P001 General Repair and Servicing-Sports Cars.pdf', 'General Repair — Sports Cars', ['shared']),
  training('P30 Drivetrain Repair-Sports Cars.pdf', 'Drivetrain Repair — Sports Cars', ['shared']),
  training('P40 Chassis, Steering, Brakes, and Alignment.pdf', 'Chassis, Steering, Brakes & Alignment', ['shared']),
  training('P60 Soft Roof and Body Systems.pdf', 'Soft Roof & Body Systems', ['shared']),
  training('P80 Climate Control Systems, Diagnosis and Repair.pdf', 'Climate Control Diagnosis & Repair', ['shared']),
  training('P90 Electrical Systems.pdf', 'Electrical Systems', ['shared']),
  training('P95 Advanced Electrical Systems.pdf', 'Advanced Electrical Systems', ['shared']),
  training('P21 Fuel and Ignition Diagnosis.pdf', 'Fuel & Ignition Diagnosis', ['shared']),
  training('PIWIS Tester III.pdf', 'PIWIS Tester III', ['shared']),
];

export const CATEGORY_LABELS: Record<DocCategory, string> = {
  workshop: 'Workshop Manual',
  diagnostic: 'Diagnostic Information',
  'service-info': 'Service Information Technik',
  training: 'Training Books',
  maintenance: 'Owner & Maintenance',
  parts: 'Parts Catalog',
};

export function getDocument(id: string): DocumentMeta | undefined {
  // Legacy single-PDF id → Vol 1 (prod no longer ships the 213 MB file).
  if (id === '981-workshop-manual') return WORKSHOP_VOLUMES[0];
  return DOCUMENTS.find((d) => d.id === id);
}

/**
 * Resolve Documents deep-links for workshop volumes.
 * - Legacy `?doc=981-workshop-manual&page=<absolute>` → correct volume + local page
 * - `?doc=…-v2&page=<absolute>` (page past volume length) → remapped
 * - Otherwise page is already within the volume
 */
export function resolveWorkshopViewerLink(
  docId: string,
  pageParam: number,
): { doc: DocumentMeta; pageInVolume: number } | null {
  const abs = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  if (docId === '981-workshop-manual') {
    return workshopVolumeForPage(abs, '981');
  }

  const series = workshopSeriesForDocId(docId);
  const range = WORKSHOP_VOLUME_RANGES.find((r) => r.id === docId);
  if (!range) return null;

  const len = range.endPage - range.startPage + 1;
  if (abs > len) {
    return workshopVolumeForPage(abs, series ?? (range.series as '981' | '9871' | '9872') ?? '981');
  }

  const doc = allWorkshopVolumes().find((v) => v.id === docId) ?? WORKSHOP_VOLUMES[0];
  return { doc, pageInVolume: abs };
}

export function documentsForGeneration(gen: string | null | undefined): DocumentMeta[] {
  if (!gen) return DOCUMENTS;
  // Only generations we actually stock docs for get a library; anything else
  // returns [] (honest absence) rather than leaking another marque's docs.
  const KNOWN_DOC_GENS: DocGeneration[] = ['981', '987', 'audi-b9'];
  if (!KNOWN_DOC_GENS.includes(gen as DocGeneration)) return [];
  return DOCUMENTS.filter((d) => {
    if (d.generations.includes(gen as DocGeneration)) return true;
    // 'shared' docs are Porsche-marque general references — keep them off a
    // non-Porsche car.
    return gen !== 'audi-b9' && d.generations.includes('shared');
  });
}

/** Basename of a storage path without `.pdf`. */
function pdfStem(storagePath: string): string {
  const base = storagePath.split('/').pop() ?? storagePath;
  return base.replace(/\.pdf$/i, '');
}

/**
 * Map a `manual_sections` search hit to a Documents-catalog PDF so Fault Finding
 * (and MCP) can deep-link into the viewer at the right page.
 *
 * Workshop chunks → 981 workshop manual. MTL chunks are matched by PDF filename
 * stem (chunk `title` is the source basename, optionally with a year stripped
 * for SIT yearbooks).
 */
export function resolveDocumentForManualHit(hit: {
  source?: string | null;
  generation?: string | null;
  title: string;
  docId?: string | null;
}): DocumentMeta | undefined {
  if (hit.docId) {
    const byId = getDocument(hit.docId);
    if (byId) return byId;
  }

  const src = hit.source ?? 'workshop';
  if (src === 'workshop') {
    // Prefer an explicit volume doc_id (set on 987 chunks; 981 often omits it).
    if (hit.docId) {
      const byId = getDocument(hit.docId);
      if (byId) return byId;
    }
    if (hit.generation === '987') {
      return WORKSHOP_VOLUMES_9871[0] ?? WORKSHOP_VOLUMES[0];
    }
    return WORKSHOP_VOLUMES[0];
  }

  // Strip " (2/5)" suffixes from oversized chunk titles.
  const stem = hit.title.replace(/\s+\(\d+\/\d+\)\s*$/, '').trim();
  if (!stem) return undefined;

  const candidates = DOCUMENTS.filter((d) => {
    if (d.category === 'workshop') return false;
    const file = pdfStem(d.storagePath);
    if (file === stem) return true;
    // SIT parse strips a leading year ("2013 Boxster" → "Boxster").
    if (file.endsWith(` ${stem}`) && /^\d{4} /.test(file)) return true;
    return false;
  });

  if (!candidates.length) return undefined;
  if (candidates.length === 1) return candidates[0];

  const gen = hit.generation;
  if (gen) {
    const scoped = candidates.filter(
      (d) => d.generations.includes(gen as DocGeneration) || d.generations.includes('shared'),
    );
    if (scoped.length) return scoped[0];
  }
  return candidates[0];
}

/**
 * Build `/manual?doc=…&page=…` for a factory-doc hit (with an optional `&q=`
 * highlight term the viewer pre-searches on the target page), or null if
 * unresolved.
 */
export function manualHitHref(
  hit: {
    source?: string | null;
    generation?: string | null;
    title: string;
    docId?: string | null;
    page: number;
  },
  highlight?: string | null,
): string | null {
  const base = manualHitHrefBase(hit);
  if (!base) return null;
  const term = highlight?.trim();
  return term ? `${base}&q=${encodeURIComponent(term)}` : base;
}

function manualHitHrefBase(hit: {
  source?: string | null;
  generation?: string | null;
  title: string;
  docId?: string | null;
  page: number;
}): string | null {
  const src = hit.source ?? 'workshop';
  const absolutePage = hit.page > 0 ? hit.page : 1;

  if (src === 'workshop') {
    const series =
      workshopSeriesForDocId(hit.docId) ??
      (hit.generation === '987' ? '9871' : '981');
    // Explicit volume id with a page already inside the volume.
    if (hit.docId && WORKSHOP_VOLUME_RANGES.some((r) => r.id === hit.docId)) {
      const range = WORKSHOP_VOLUME_RANGES.find((r) => r.id === hit.docId)!;
      const len = range.endPage - range.startPage + 1;
      if (absolutePage <= len) {
        return `/manual?doc=${encodeURIComponent(hit.docId)}&page=${absolutePage}`;
      }
      const { doc, pageInVolume } = workshopVolumeForPage(absolutePage, series);
      return `/manual?doc=${encodeURIComponent(doc.id)}&page=${pageInVolume}`;
    }
    const { doc, pageInVolume } = workshopVolumeForPage(absolutePage, series);
    return `/manual?doc=${encodeURIComponent(doc.id)}&page=${pageInVolume}`;
  }

  const doc = resolveDocumentForManualHit(hit);
  if (!doc) return null;

  // Already a volume id — treat page as absolute and remap.
  if (doc.category === 'workshop' && WORKSHOP_VOLUME_RANGES.some((r) => r.id === doc.id)) {
    const series = workshopSeriesForDocId(doc.id) ?? '981';
    const { doc: vol, pageInVolume } = workshopVolumeForPage(absolutePage, series);
    return `/manual?doc=${encodeURIComponent(vol.id)}&page=${pageInVolume}`;
  }

  return `/manual?doc=${encodeURIComponent(doc.id)}&page=${absolutePage}`;
}

/** Back-compat aliases used by the signed-URL route / upload script. */
export const MANUAL_BUCKET = 'workshop-manual';
export const MANUAL_OBJECT = WORKSHOP_VOLUMES[0].storagePath;
export const MANUAL_LOCAL_URL = WORKSHOP_VOLUMES[0].localUrl!;
export const MANUAL_SIGNED_URL_TTL = 60 * 60 * 24;
