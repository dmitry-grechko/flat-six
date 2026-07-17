// ---- Core domain types (the contract all UI + agents build against) ----

import type { WheelSpec } from './fitment/oem';
import type { FaultsData, LiveData, Mode06Data, ModuleScanData } from './obd/types';

export type SystemName =
  | 'Engine' | 'Brakes' | 'Cooling' | 'Transmission' | 'HVAC'
  | 'Electrical' | 'Fuel' | 'Steering' | 'Exhaust' | 'Wheels' | 'Body' | 'Suspension';

export type CutawayView = 'front' | 'rear';

/** A maintainable component shown in the Component Explorer. */
export interface Component {
  id: string;
  label: string;
  sub: string;
  system: SystemName;
  /** Difficulty 1..5 (Beginner..Specialist). */
  diff: 1 | 2 | 3 | 4 | 5;
  /** Human time estimate, e.g. "~45 min" or "shop". */
  time: string;
  /** Headline part number string (may list multiple). */
  part: string;
  /**
   * Structured candidate OEM part numbers, optionally scoped to a
   * sub-generation (e.g. `appliesTo: '987.2'` for a 9A1 DFI-only part). The
   * garage shows each only if it resolves in the Supabase catalog, so these are
   * DB-verified-or-hidden. Preferred over parsing numbers out of `part` when the
   * scope matters (e.g. 987.1 M96/M97 vs 987.2 9A1).
   */
  parts?: ComponentPart[];
  spec: string;
  interval: string;
  torque: string;
  notes: string;
  steps: string[];
  /** Which 2D cutaway image this hotspot belongs to. */
  view: CutawayView;
  /** Hotspot position on the 2D cutaway image, in %. */
  ix: number;
  iy: number;
  /**
   * Optional link to a node/mesh in the 3D internals GLB, so the 3D X-ray
   * view can highlight/isolate this component. Populated by the 3D pipeline.
   */
  meshId?: string;
  /** Optional 3D hotspot anchor "x y z" for model-viewer in X-ray mode. */
  hotspot3d?: string;
  /** Optional richer catalog data (real OEM numbers) from the parts miner. */
  catalog?: CatalogPart;
}

/** A candidate OEM part number for a component, optionally sub-generation-scoped. */
export interface ComponentPart {
  /** Dotted Porsche part number, e.g. "9A1.107.224.00". */
  number: string;
  /** Sub-generation this applies to (e.g. "987.2"); omit for all sub-generations. */
  appliesTo?: string;
  /** Optional human label if the DB description isn't self-explanatory. */
  label?: string;
}

/** Real OEM catalog data sourced from a dealer parts site. */
export interface CatalogPart {
  name: string;
  system: string;
  partNumber: string | null;
  alternateNumbers?: string[];
  torque?: string | null;
  notes?: string | null;
  diyDifficulty?: 'easy' | 'moderate' | 'hard' | null;
  function?: string | null;
  sourceUrl?: string | null;
}

export interface Fault {
  id: string;
  title: string;
  system: string;
  sev: 'LOW' | 'MED' | 'HIGH';
  causes: string[];
  checks: string[];
  parts: string;
}

/**
 * A single line item on a service record — the actual job that was done.
 * Inspired by a shop work-order line, kept DIY-simple: only `name` is required.
 */
export interface ServiceItem {
  name: string;
  /** What was actually done — torque used, fluid grade, observations, etc. */
  description?: string;
  /** Optional OEM / aftermarket part number fitted. */
  partNumber?: string;
  /** Optional per-item cost, free-form (e.g. "$48" or "€40"). */
  cost?: string;
}

export interface ServiceRecord {
  id: string;
  date: string;       // YYYY-MM-DD
  mileage: number;
  title: string;
  system: string;
  diy: boolean;
  cost?: string;
  /** Free-text note covering the whole visit. */
  notes?: string;
  items: ServiceItem[];
}

/** A reference link attached to a plan item (how-to guide, parts listing, video). */
export interface ServicePlanLink {
  label: string;
  url: string;
}

/** A single thing the owner is planning to do, with parts + reference links. */
export interface ServicePlanItem {
  /** Stable client-generated id so the UI can edit/reorder rows. */
  id: string;
  name: string;
  /** What the job involves / why it's planned. */
  description?: string;
  /** OEM / aftermarket part number being sourced. */
  partNumber?: string;
  /** How-to guides, part listings, videos to review when it's time. */
  links?: ServicePlanLink[];
  /** Ticked off while wrenching through the plan. */
  done?: boolean;
}

export type ServicePlanStatus = 'planning' | 'ordered' | 'scheduled' | 'done';

/** A planned service — work an owner is gathering parts + guides for ahead of time. */
export interface ServicePlan {
  id: string;
  title: string;
  notes?: string;
  status: ServicePlanStatus;
  /** When the owner intends to do the work (YYYY-MM-DD), if set. */
  targetDate?: string;
  /** Or the odometer reading they're targeting. */
  targetMileage?: number;
  items: ServicePlanItem[];
  createdAt: string;
}

/**
 * A saved OBD scan snapshot (Live OBD → Supabase → MCP → AI). Mirrors a
 * public.obd_scans row (migration 0012). The four read-model blobs are the
 * exact shapes Live OBD produces (lib/obd/types.ts) — stored as jsonb, decoded
 * by nothing in SQL. The get_obd_scan MCP tool reads the latest of these and
 * cross-references each DTC against the knowledge base for the scan generation.
 */
export interface ObdScan {
  id: string;
  /** Garage vehicle this scan belongs to, or null if it wasn't pinned to a car. */
  vehicleId: string | null;
  /** Car generation the scan was read for (981/987/…) — keeps DTC lookups generation-safe. */
  generation: string;
  /** ISO timestamp the snapshot was saved. */
  createdAt: string;
  /** DME + module confirmed/pending/permanent DTCs. */
  faults: FaultsData | null;
  /** Live PID values + readiness monitors. */
  live: LiveData | null;
  /** On-board monitor (Mode 06) test results. */
  mode06: Mode06Data | null;
  /** Per-module UDS/KWP probe results. */
  moduleScan: ModuleScanData | null;
}

// Selectable car-variant ids (also stored as vehicle.body). Legacy 981 values
// stay 'boxster'/'cayman'; newer generations are suffixed. See lib/models.ts.
export type BodyType =
  | 'boxster' | 'boxster-base-981' | 'cayman' | 'cayman-base-981' | 'cayman-gt4-981'
  | 'cayman-987' | 'cayman-base-987' | 'boxster-base-987' | 'boxster-987' | 'spyder-987'
  | 'audi-a4-b9'
  // 718 (982) — mid-engine Boxster/Cayman, 2016–2024. Turbo flat-four (base/T/S/GTS)
  // + NA 4.0 flat-six (GTS 4.0 / GT4 / Spyder / GT4 RS / Spyder RS). See CAR_VARIANTS.
  | 'cayman-982' | 'cayman-t-982' | 'cayman-s-982' | 'cayman-gts-982' | 'cayman-gts-4-982'
  | 'cayman-gt4-982' | 'cayman-gt4-rs-982'
  | 'boxster-982' | 'boxster-t-982' | 'boxster-s-982' | 'boxster-gts-982' | 'boxster-gts-4-982'
  | 'spyder-982' | 'spyder-rs-982'
  // 911 (991) — full trim matrix, id pattern <trim>-<body?>-991-<phase>. See CAR_VARIANTS.
  // 991.1 (2012–2016)
  | 'carrera-991-1' | 'carrera-cab-991-1' | 'carrera-s-991-1' | 'carrera-s-cab-991-1'
  | 'carrera-4-991-1' | 'carrera-4-cab-991-1' | 'carrera-4s-991-1' | 'carrera-4s-cab-991-1'
  | 'carrera-gts-991-1' | 'carrera-gts-cab-991-1' | 'carrera-4-gts-991-1' | 'carrera-4-gts-cab-991-1'
  | 'targa-4-991-1' | 'targa-4s-991-1'
  | 'turbo-991-1' | 'turbo-cab-991-1' | 'turbo-s-991-1' | 'turbo-s-cab-991-1'
  | 'gt3-991-1' | 'gt3-rs-991-1' | '911-r-991-1'
  // 991.2 (2016–2019)
  | 'carrera-991-2' | 'carrera-cab-991-2' | 'carrera-s-991-2' | 'carrera-s-cab-991-2'
  | 'carrera-4-991-2' | 'carrera-4-cab-991-2' | 'carrera-4s-991-2' | 'carrera-4s-cab-991-2'
  | 'carrera-gts-991-2' | 'carrera-gts-cab-991-2' | 'carrera-4-gts-991-2' | 'carrera-4-gts-cab-991-2'
  | 'targa-4-991-2' | 'targa-4s-991-2' | 'targa-4-gts-991-2'
  | 'turbo-991-2' | 'turbo-cab-991-2' | 'turbo-s-991-2' | 'turbo-s-cab-991-2' | 'turbo-s-exclusive-991-2'
  | 'gt3-991-2' | 'gt3-touring-991-2' | 'gt3-rs-991-2' | 'gt2-rs-991-2' | 'speedster-991-2'
  // Customs (own GLB)
  | 'gt3-rs-weissach-991-2' | 'gt2-rs-clubsport-991-2';

export interface Vehicle {
  /** which 3D model to render */
  body: BodyType;
  vin: string;
  model: string;
  year: string;
  engine: string;
  trans: string;
  mileage: string;
  colorName: string;
  colorHex: string;
  interiorHex: string;
  plate: string;
  /** The owner's current wheel/tyre setup, saved from Tools → fitment. */
  wheelSetup?: WheelSetup;
  /** Preferred distance unit for this car. Mileage is still stored in miles. */
  distanceUnit?: 'mi' | 'km';
}

/** Per-user row in public.profiles (prefs + feature flags). */
export interface Profile {
  id: string;
  displayName: string;
  units: 'imperial' | 'metric';
  /** When true, user may open /manual PDF library and document deep links. */
  documentsAccess: boolean;
  createdAt: string;
}

/** A saved wheel/tyre setup for a vehicle (front + rear + optional notes). */
export interface WheelSetup {
  front: WheelSpec;
  rear: WheelSpec;
  notes?: string;
}

export interface PaintColor { name: string; hex: string; }

export interface McpTool { name: string; desc: string; auth?: boolean; }
export interface RagSource { name: string; chunks: string; statusLabel: string; live?: boolean; }

/** Manifest entry emitted by the procedural 3D component pipeline. */
export interface ModelManifestEntry {
  /** matches Component.meshId / id where possible */
  id: string;
  label: string;
  system: SystemName;
  /** path under /public, e.g. /models/components/engine.glb */
  glb: string;
  /** node name inside the GLB to target for isolate/highlight */
  node: string;
  hotspot3d?: string;
}

/**
 * A single selectable part inside an assembled GLB (engine, transaxle, exhaust).
 * The viewer finds `node` by name in the loaded scene, computes its centroid at
 * runtime for the hotspot pin, and highlights it on select. Centroids are NOT
 * stored here so we stay robust to coordinate changes.
 */
export interface EnginePart {
  /** stable id, e.g. "intake-manifold" */
  id: string;
  /** exact node/group name in the GLB to target (highlight + centroid) */
  node: string;
  /** display name, e.g. "Intake Manifold" */
  label: string;
  /** grouping for filtering, e.g. "Induction", "Valvetrain", "Accessory Drive" */
  assembly: string;
  system: SystemName;
  /** real OEM number where one maps, else null */
  partNumber?: string | null;
  /** one-line description of what the part does */
  function?: string | null;
  /** hotspot tier: top-level part ('primary', default) or a drill-down child ('sub'). */
  tier?: 'primary' | 'sub';
  /** for tier:'sub', the id of the parent primary part it drills into. */
  parent?: string;
  /** optional link to a COMPONENTS entry (enables Log service / Ask Claude deep-link). */
  componentId?: string;
  /**
   * Optional pin position as fractions of the model AABB half-extents from its
   * center: "nx ny nz" in roughly −1…1. Used when the GLB has no stable named
   * node (exterior models) or when a fixed pin is preferred over the mesh centroid.
   */
  hotspotNorm?: string;
  /** Optional pin fill colour (e.g. OBD fault state). Defaults to the dark pin. */
  pinColor?: string;
  /** Optional short text inside the pin instead of its sequence number ('' = blank). */
  pinBadge?: string;
}

/** Parts manifest for one assembled model (e.g. the engine). */
export interface PartsManifest {
  /** public path of the GLB these parts live in */
  glb: string;
  parts: EnginePart[];
}
