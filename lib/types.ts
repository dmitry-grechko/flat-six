// ---- Core domain types (the contract all UI + agents build against) ----

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

// Selectable car-variant ids (also stored as vehicle.body). Legacy 981 values
// stay 'boxster'/'cayman'; newer generations are suffixed. See lib/models.ts.
export type BodyType = 'boxster' | 'cayman' | 'cayman-987';

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
}

/** Parts manifest for one assembled model (e.g. the engine). */
export interface PartsManifest {
  /** public path of the GLB these parts live in */
  glb: string;
  parts: EnginePart[];
}
