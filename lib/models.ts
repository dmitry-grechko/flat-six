import type { BodyType, Vehicle } from './types';

/**
 * Registry of selectable car variants — the single source of truth for which
 * 3D models the app can render. Add a generation/body by appending an entry
 * here (and its `id` to BodyType, its credit to lib/credits, and dropping the
 * GLB in public/models). Everything else (selector chips, exterior viewer,
 * default model name) is derived from this list.
 */
export interface CarVariant {
  /** stable id, also stored as vehicle.body */
  id: BodyType;
  generation: '981' | '987' | '991' | (string & {});
  bodyStyle: 'boxster' | 'cayman' | 'sedan' | 'coupe' | 'targa' | 'cabriolet';
  /** short label for the model picker chip, e.g. "Cayman (987)" */
  label: string;
  /** default vehicle.model when this variant is chosen, e.g. "Cayman S (987)" */
  modelName: string;
  /** public path of the exterior GLB */
  glb: string;
  /**
   * Whether we have the 2D cutaway hotspot experience (front + engine images
   * with clickable component pins) for this variant. Both 981 and 987 do.
   */
  hasCutaway2D: boolean;
  /**
   * Whether we have per-part 3D X-ray internals (assembly GLBs + parts
   * manifests + flow systems) for this variant. 981 and 987 both do — the
   * 987 set lives under /models/components/987/ (xray-assemblies-987).
   */
  hasXray3D: boolean;
  /**
   * Optional signature powertrain for variants that shipped in only one config
   * (e.g. the 981 GT4 is a 3.8 L, manual-only car). When set, new vehicles of
   * this variant seed to it and the model picker snaps to it, instead of the
   * generic per-generation default. Must exactly match a string returned by
   * enginesFor()/transmissionsFor() for this variant's generation.
   */
  defaultEngine?: string;
  defaultTransmission?: string;
  /**
   * Release gate. 'development' variants are hidden from the model picker for
   * non-admin users (but stay fully functional once in a garage) — the mechanism
   * for shipping an in-progress car to production for admin testing before it is
   * made public. Defaults to 'stable' when unset.
   */
  status?: 'stable' | 'development';
  /**
   * Manufacturer. Defaults to 'Porsche' when unset (every legacy variant). Set
   * explicitly for other marques (e.g. 'Audi') as multi-marque support lands.
   */
  make?: string;
  /**
   * Nameplate / model line for the cascading picker (e.g. 'Boxster', 'Cayman',
   * 'A4', future '911'). Defaults to the capitalised bodyStyle for Porsche
   * mid-engine cars; set explicitly for other marques. See variantNameplate().
   */
  nameplate?: string;
  /**
   * Sub-generation / "series" for the picker (e.g. '991.1' | '991.2'). Data is
   * still scoped by `generation` ('991'); `phase` only adds a picker step and is
   * shown in the summary. Undefined for cars with no such split (981/987/A4).
   */
  phase?: string;
  /**
   * Whether `glb` is this variant's OWN dedicated model. `false` means it renders
   * a same-family stand-in (another trim's GLB) — the garage shows a "3D model not
   * available yet, contribute on GitHub" notice. Defaults to true when unset.
   */
  modelAvailable?: boolean;
}

// ---- 991 (911) trim matrix -------------------------------------------------
// 12 exterior GLBs cover the whole range; trims without a dedicated model reuse a
// same-family stand-in (modelAvailable:false → the garage shows a "contribute on
// GitHub" notice). Every 991 shares generation:'991' for data scoping; phase
// (991.1/991.2) + bodyStyle (coupe/cabriolet/targa) drive the picker cascade only.
const GLB = {
  cs1: '/models/carrera-s-991-1.glb',
  gt3_1: '/models/gt3-991-1.glb',
  turbo1: '/models/turbo-991-1.glb',
  gt3rs1: '/models/gt3-rs-991-1.glb',
  gts2: '/models/carrera-gts-991-2.glb',
  ts2: '/models/turbo-s-991-2.glb',
  tse2: '/models/turbo-s-exclusive-991-2.glb',
  gt3rs2: '/models/gt3-rs-991-2.glb',
  gt3rsw2: '/models/gt3-rs-weissach-991-2.glb',
  gt2cs2: '/models/gt2-rs-clubsport-991-2.glb',
  speed2: '/models/speedster-991-2.glb',
  targa2: '/models/targa-4s-991-2.glb',
} as const;
// 991 engine/transmission ids — MUST match GENERATION_POWERTRAIN['991'] in lib/data.ts.
const ENG = {
  c34: '3.4 L Flat-Six (Carrera)',
  c38: '3.8 L Flat-Six (Carrera S/GTS)',
  c30: '3.0 L Twin-Turbo Flat-Six (Carrera)',
  c30s: '3.0 L Twin-Turbo Flat-Six (Carrera S/GTS)',
  gt38: '3.8 L Flat-Six (GT3)',
  gt40: '4.0 L Flat-Six (GT3/RS)',
  t38: '3.8 L Twin-Turbo Flat-Six (Turbo/S)',
  gt2: '3.8 L Twin-Turbo Flat-Six (GT2 RS)',
} as const;
const TRN = { m7: '7-Speed Manual', m6: '6-Speed Manual', pdk: '7-Speed PDK' } as const;
// Shared 991 base (rear-engine: no 2D cutaway / 3D X-ray internals yet — honest absence).
const B991 = { generation: '991' as const, nameplate: '911', hasCutaway2D: false, hasXray3D: false };

export const CAR_VARIANTS: CarVariant[] = [
  // Base Boxster / Cayman (981) — entry-level 2.7 L cars, distinct from the S so a
  // base owner isn't forced to pick "S". Share the 981 GLB/cutaway/knowledge; credit
  // resolves via the shared GLB (modelCreditFor). 981 offered no 5-speed (6MT/PDK).
  { id: 'boxster-base-981', generation: '981', bodyStyle: 'boxster', label: 'Boxster (981)', modelName: 'Boxster (981)', glb: '/models/boxster-real.glb', hasCutaway2D: true, hasXray3D: true, defaultEngine: '2.7 L Flat-Six', defaultTransmission: '6-Speed Manual' },
  { id: 'boxster', generation: '981', bodyStyle: 'boxster', label: 'Boxster S (981)', modelName: 'Boxster S (981)', glb: '/models/boxster-real.glb', hasCutaway2D: true, hasXray3D: true, defaultEngine: '3.4 L Flat-Six (S)', defaultTransmission: '7-Speed PDK' },
  { id: 'cayman-base-981', generation: '981', bodyStyle: 'cayman', label: 'Cayman (981)', modelName: 'Cayman (981)', glb: '/models/cayman.glb', hasCutaway2D: true, hasXray3D: true, defaultEngine: '2.7 L Flat-Six', defaultTransmission: '6-Speed Manual' },
  { id: 'cayman', generation: '981', bodyStyle: 'cayman', label: 'Cayman S (981)', modelName: 'Cayman S (981)', glb: '/models/cayman.glb', hasCutaway2D: true, hasXray3D: true, defaultEngine: '3.4 L Flat-Six (S)', defaultTransmission: '7-Speed PDK' },
  // Cayman GT4 (981) — dedicated exterior GLB; shares the 981 cutaway + X-ray.
  // Only ever a 3.8 L flat-six with a 6-speed manual (no PDK), so it carries a
  // signature powertrain instead of the generic 981 S/PDK default.
  { id: 'cayman-gt4-981', generation: '981', bodyStyle: 'cayman', label: 'Cayman GT4 (981)', modelName: 'Cayman GT4 (981)', glb: '/models/cayman-gt4-981.glb', hasCutaway2D: true, hasXray3D: true, defaultEngine: '3.8 L Flat-Six (Spyder/GT4)', defaultTransmission: '6-Speed Manual' },
  // Base Cayman (987) — entry-level (2.7 L, 5-speed manual on the 987.1), distinct
  // from the S. Shares the 987 GLB/cutaway/knowledge; credit via the shared GLB.
  { id: 'cayman-base-987', generation: '987', bodyStyle: 'cayman', label: 'Cayman (987)', modelName: 'Cayman (987)', glb: '/models/cayman-987.glb', hasCutaway2D: true, hasXray3D: true, defaultEngine: '2.7 L Flat-Six', defaultTransmission: '5-Speed Manual' },
  { id: 'cayman-987', generation: '987', bodyStyle: 'cayman', label: 'Cayman S (987)', modelName: 'Cayman S (987)', glb: '/models/cayman-987.glb', hasCutaway2D: true, hasXray3D: true, defaultEngine: '3.4 L Flat-Six (S)', defaultTransmission: '6-Speed Manual' },
  // No Boxster 987 GLB yet — reuse the Cayman 987 model for the 3D exterior.
  // Same generation, so it shares the 987 cutaway + knowledge + documents.
  // Base Boxster (987) — the entry-level car (2.7 L, 5-speed manual as standard on
  // the 987.1). Distinct from the S so a base owner isn't forced to pick "S". Shares
  // the 987 GLB/cutaway/knowledge; credit resolves via the shared GLB (modelCreditFor).
  { id: 'boxster-base-987', generation: '987', bodyStyle: 'boxster', label: 'Boxster (987)', modelName: 'Boxster (987)', glb: '/models/cayman-987.glb', hasCutaway2D: true, hasXray3D: true, defaultEngine: '2.7 L Flat-Six', defaultTransmission: '5-Speed Manual' },
  { id: 'boxster-987', generation: '987', bodyStyle: 'boxster', label: 'Boxster S (987)', modelName: 'Boxster S (987)', glb: '/models/cayman-987.glb', hasCutaway2D: true, hasXray3D: true, defaultEngine: '3.4 L Flat-Six (S)', defaultTransmission: '6-Speed Manual' },
  // Boxster Spyder (987.2) — dedicated exterior GLB; shares 987 cutaway + X-ray.
  { id: 'spyder-987', generation: '987', bodyStyle: 'boxster', label: 'Spyder (987)', modelName: 'Boxster Spyder (987)', glb: '/models/spyder-987.glb', hasCutaway2D: true, hasXray3D: true },
  // Audi A4 (B9, 2016–2023) — DEV MODE (status: 'development'): admin-only in the
  // model picker. FLAT·SIX's first non-Porsche marque — a scaffold to collect
  // models/data on. No 2D cutaway / 3D X-ray yet (honest absence); OBD runs on a
  // generic-UDS pack (lib/obd/pack-audi-b9.ts). Powertrain is provisional.
  { id: 'audi-a4-b9', make: 'Audi', nameplate: 'A4', generation: 'audi-b9', bodyStyle: 'sedan', label: 'A4 (B9) · dev', modelName: 'Audi A4 (B9)', glb: '/models/audi-a4-b9.glb', hasCutaway2D: false, hasXray3D: false, status: 'development', defaultEngine: '2.0 TFSI', defaultTransmission: '7-Speed S tronic (DSG)' },

  // ── 991.1 (2012–2016): NA flat-six Carreras, first-gen Turbo/GT3 ──
  { ...B991, id: 'carrera-991-1', phase: '991.1', bodyStyle: 'coupe', label: 'Carrera (991.1)', modelName: '911 Carrera (991.1)', glb: GLB.cs1, defaultEngine: ENG.c34, defaultTransmission: TRN.pdk, modelAvailable: false },
  { ...B991, id: 'carrera-cab-991-1', phase: '991.1', bodyStyle: 'cabriolet', label: 'Carrera Cabriolet (991.1)', modelName: '911 Carrera Cabriolet (991.1)', glb: GLB.cs1, defaultEngine: ENG.c34, defaultTransmission: TRN.pdk, modelAvailable: false },
  { ...B991, id: 'carrera-s-991-1', phase: '991.1', bodyStyle: 'coupe', label: 'Carrera S (991.1)', modelName: '911 Carrera S (991.1)', glb: GLB.cs1, defaultEngine: ENG.c38, defaultTransmission: TRN.pdk },
  { ...B991, id: 'carrera-s-cab-991-1', phase: '991.1', bodyStyle: 'cabriolet', label: 'Carrera S Cabriolet (991.1)', modelName: '911 Carrera S Cabriolet (991.1)', glb: GLB.cs1, defaultEngine: ENG.c38, defaultTransmission: TRN.pdk, modelAvailable: false },
  { ...B991, id: 'carrera-4-991-1', phase: '991.1', bodyStyle: 'coupe', label: 'Carrera 4 (991.1)', modelName: '911 Carrera 4 (991.1)', glb: GLB.cs1, defaultEngine: ENG.c34, defaultTransmission: TRN.pdk, modelAvailable: false },
  { ...B991, id: 'carrera-4-cab-991-1', phase: '991.1', bodyStyle: 'cabriolet', label: 'Carrera 4 Cabriolet (991.1)', modelName: '911 Carrera 4 Cabriolet (991.1)', glb: GLB.cs1, defaultEngine: ENG.c34, defaultTransmission: TRN.pdk, modelAvailable: false },
  { ...B991, id: 'carrera-4s-991-1', phase: '991.1', bodyStyle: 'coupe', label: 'Carrera 4S (991.1)', modelName: '911 Carrera 4S (991.1)', glb: GLB.cs1, defaultEngine: ENG.c38, defaultTransmission: TRN.pdk, modelAvailable: false },
  { ...B991, id: 'carrera-4s-cab-991-1', phase: '991.1', bodyStyle: 'cabriolet', label: 'Carrera 4S Cabriolet (991.1)', modelName: '911 Carrera 4S Cabriolet (991.1)', glb: GLB.cs1, defaultEngine: ENG.c38, defaultTransmission: TRN.pdk, modelAvailable: false },
  { ...B991, id: 'carrera-gts-991-1', phase: '991.1', bodyStyle: 'coupe', label: 'Carrera GTS (991.1)', modelName: '911 Carrera GTS (991.1)', glb: GLB.cs1, defaultEngine: ENG.c38, defaultTransmission: TRN.pdk, modelAvailable: false },
  { ...B991, id: 'carrera-gts-cab-991-1', phase: '991.1', bodyStyle: 'cabriolet', label: 'Carrera GTS Cabriolet (991.1)', modelName: '911 Carrera GTS Cabriolet (991.1)', glb: GLB.cs1, defaultEngine: ENG.c38, defaultTransmission: TRN.pdk, modelAvailable: false },
  { ...B991, id: 'carrera-4-gts-991-1', phase: '991.1', bodyStyle: 'coupe', label: 'Carrera 4 GTS (991.1)', modelName: '911 Carrera 4 GTS (991.1)', glb: GLB.cs1, defaultEngine: ENG.c38, defaultTransmission: TRN.pdk, modelAvailable: false },
  { ...B991, id: 'carrera-4-gts-cab-991-1', phase: '991.1', bodyStyle: 'cabriolet', label: 'Carrera 4 GTS Cabriolet (991.1)', modelName: '911 Carrera 4 GTS Cabriolet (991.1)', glb: GLB.cs1, defaultEngine: ENG.c38, defaultTransmission: TRN.pdk, modelAvailable: false },
  { ...B991, id: 'targa-4-991-1', phase: '991.1', bodyStyle: 'targa', label: 'Targa 4 (991.1)', modelName: '911 Targa 4 (991.1)', glb: GLB.targa2, defaultEngine: ENG.c34, defaultTransmission: TRN.pdk, modelAvailable: false },
  { ...B991, id: 'targa-4s-991-1', phase: '991.1', bodyStyle: 'targa', label: 'Targa 4S (991.1)', modelName: '911 Targa 4S (991.1)', glb: GLB.targa2, defaultEngine: ENG.c38, defaultTransmission: TRN.pdk, modelAvailable: false },
  { ...B991, id: 'turbo-991-1', phase: '991.1', bodyStyle: 'coupe', label: 'Turbo (991.1)', modelName: '911 Turbo (991.1)', glb: GLB.turbo1, defaultEngine: ENG.t38, defaultTransmission: TRN.pdk },
  { ...B991, id: 'turbo-cab-991-1', phase: '991.1', bodyStyle: 'cabriolet', label: 'Turbo Cabriolet (991.1)', modelName: '911 Turbo Cabriolet (991.1)', glb: GLB.turbo1, defaultEngine: ENG.t38, defaultTransmission: TRN.pdk, modelAvailable: false },
  { ...B991, id: 'turbo-s-991-1', phase: '991.1', bodyStyle: 'coupe', label: 'Turbo S (991.1)', modelName: '911 Turbo S (991.1)', glb: GLB.turbo1, defaultEngine: ENG.t38, defaultTransmission: TRN.pdk, modelAvailable: false },
  { ...B991, id: 'turbo-s-cab-991-1', phase: '991.1', bodyStyle: 'cabriolet', label: 'Turbo S Cabriolet (991.1)', modelName: '911 Turbo S Cabriolet (991.1)', glb: GLB.turbo1, defaultEngine: ENG.t38, defaultTransmission: TRN.pdk, modelAvailable: false },
  { ...B991, id: 'gt3-991-1', phase: '991.1', bodyStyle: 'coupe', label: 'GT3 (991.1)', modelName: '911 GT3 (991.1)', glb: GLB.gt3_1, defaultEngine: ENG.gt38, defaultTransmission: TRN.pdk },
  { ...B991, id: 'gt3-rs-991-1', phase: '991.1', bodyStyle: 'coupe', label: 'GT3 RS (991.1)', modelName: '911 GT3 RS (991.1)', glb: GLB.gt3rs1, defaultEngine: ENG.gt40, defaultTransmission: TRN.pdk },
  { ...B991, id: '911-r-991-1', phase: '991.1', bodyStyle: 'coupe', label: '911 R (991.1)', modelName: '911 R (991.1)', glb: GLB.gt3_1, defaultEngine: ENG.gt40, defaultTransmission: TRN.m6, modelAvailable: false },

  // ── 991.2 (2016–2019): 3.0 TT Carreras, 4.0 GT3/RS, GT2 RS, Speedster ──
  { ...B991, id: 'carrera-991-2', phase: '991.2', bodyStyle: 'coupe', label: 'Carrera (991.2)', modelName: '911 Carrera (991.2)', glb: GLB.gts2, defaultEngine: ENG.c30, defaultTransmission: TRN.pdk, modelAvailable: false },
  { ...B991, id: 'carrera-cab-991-2', phase: '991.2', bodyStyle: 'cabriolet', label: 'Carrera Cabriolet (991.2)', modelName: '911 Carrera Cabriolet (991.2)', glb: GLB.gts2, defaultEngine: ENG.c30, defaultTransmission: TRN.pdk, modelAvailable: false },
  { ...B991, id: 'carrera-s-991-2', phase: '991.2', bodyStyle: 'coupe', label: 'Carrera S (991.2)', modelName: '911 Carrera S (991.2)', glb: GLB.gts2, defaultEngine: ENG.c30s, defaultTransmission: TRN.pdk, modelAvailable: false },
  { ...B991, id: 'carrera-s-cab-991-2', phase: '991.2', bodyStyle: 'cabriolet', label: 'Carrera S Cabriolet (991.2)', modelName: '911 Carrera S Cabriolet (991.2)', glb: GLB.gts2, defaultEngine: ENG.c30s, defaultTransmission: TRN.pdk, modelAvailable: false },
  { ...B991, id: 'carrera-4-991-2', phase: '991.2', bodyStyle: 'coupe', label: 'Carrera 4 (991.2)', modelName: '911 Carrera 4 (991.2)', glb: GLB.gts2, defaultEngine: ENG.c30, defaultTransmission: TRN.pdk, modelAvailable: false },
  { ...B991, id: 'carrera-4-cab-991-2', phase: '991.2', bodyStyle: 'cabriolet', label: 'Carrera 4 Cabriolet (991.2)', modelName: '911 Carrera 4 Cabriolet (991.2)', glb: GLB.gts2, defaultEngine: ENG.c30, defaultTransmission: TRN.pdk, modelAvailable: false },
  { ...B991, id: 'carrera-4s-991-2', phase: '991.2', bodyStyle: 'coupe', label: 'Carrera 4S (991.2)', modelName: '911 Carrera 4S (991.2)', glb: GLB.gts2, defaultEngine: ENG.c30s, defaultTransmission: TRN.pdk, modelAvailable: false },
  { ...B991, id: 'carrera-4s-cab-991-2', phase: '991.2', bodyStyle: 'cabriolet', label: 'Carrera 4S Cabriolet (991.2)', modelName: '911 Carrera 4S Cabriolet (991.2)', glb: GLB.gts2, defaultEngine: ENG.c30s, defaultTransmission: TRN.pdk, modelAvailable: false },
  { ...B991, id: 'carrera-gts-991-2', phase: '991.2', bodyStyle: 'coupe', label: 'Carrera GTS (991.2)', modelName: '911 Carrera GTS (991.2)', glb: GLB.gts2, defaultEngine: ENG.c30s, defaultTransmission: TRN.pdk },
  { ...B991, id: 'carrera-gts-cab-991-2', phase: '991.2', bodyStyle: 'cabriolet', label: 'Carrera GTS Cabriolet (991.2)', modelName: '911 Carrera GTS Cabriolet (991.2)', glb: GLB.gts2, defaultEngine: ENG.c30s, defaultTransmission: TRN.pdk, modelAvailable: false },
  { ...B991, id: 'carrera-4-gts-991-2', phase: '991.2', bodyStyle: 'coupe', label: 'Carrera 4 GTS (991.2)', modelName: '911 Carrera 4 GTS (991.2)', glb: GLB.gts2, defaultEngine: ENG.c30s, defaultTransmission: TRN.pdk, modelAvailable: false },
  { ...B991, id: 'carrera-4-gts-cab-991-2', phase: '991.2', bodyStyle: 'cabriolet', label: 'Carrera 4 GTS Cabriolet (991.2)', modelName: '911 Carrera 4 GTS Cabriolet (991.2)', glb: GLB.gts2, defaultEngine: ENG.c30s, defaultTransmission: TRN.pdk, modelAvailable: false },
  { ...B991, id: 'targa-4-991-2', phase: '991.2', bodyStyle: 'targa', label: 'Targa 4 (991.2)', modelName: '911 Targa 4 (991.2)', glb: GLB.targa2, defaultEngine: ENG.c30, defaultTransmission: TRN.pdk, modelAvailable: false },
  { ...B991, id: 'targa-4s-991-2', phase: '991.2', bodyStyle: 'targa', label: 'Targa 4S (991.2)', modelName: '911 Targa 4S (991.2)', glb: GLB.targa2, defaultEngine: ENG.c30s, defaultTransmission: TRN.pdk },
  { ...B991, id: 'targa-4-gts-991-2', phase: '991.2', bodyStyle: 'targa', label: 'Targa 4 GTS (991.2)', modelName: '911 Targa 4 GTS (991.2)', glb: GLB.targa2, defaultEngine: ENG.c30s, defaultTransmission: TRN.pdk, modelAvailable: false },
  { ...B991, id: 'turbo-991-2', phase: '991.2', bodyStyle: 'coupe', label: 'Turbo (991.2)', modelName: '911 Turbo (991.2)', glb: GLB.ts2, defaultEngine: ENG.t38, defaultTransmission: TRN.pdk, modelAvailable: false },
  { ...B991, id: 'turbo-cab-991-2', phase: '991.2', bodyStyle: 'cabriolet', label: 'Turbo Cabriolet (991.2)', modelName: '911 Turbo Cabriolet (991.2)', glb: GLB.ts2, defaultEngine: ENG.t38, defaultTransmission: TRN.pdk, modelAvailable: false },
  { ...B991, id: 'turbo-s-991-2', phase: '991.2', bodyStyle: 'coupe', label: 'Turbo S (991.2)', modelName: '911 Turbo S (991.2)', glb: GLB.ts2, defaultEngine: ENG.t38, defaultTransmission: TRN.pdk },
  { ...B991, id: 'turbo-s-cab-991-2', phase: '991.2', bodyStyle: 'cabriolet', label: 'Turbo S Cabriolet (991.2)', modelName: '911 Turbo S Cabriolet (991.2)', glb: GLB.ts2, defaultEngine: ENG.t38, defaultTransmission: TRN.pdk, modelAvailable: false },
  { ...B991, id: 'turbo-s-exclusive-991-2', phase: '991.2', bodyStyle: 'coupe', label: 'Turbo S Exclusive Series (991.2)', modelName: '911 Turbo S Exclusive Series (991.2)', glb: GLB.tse2, defaultEngine: ENG.t38, defaultTransmission: TRN.pdk },
  { ...B991, id: 'gt3-991-2', phase: '991.2', bodyStyle: 'coupe', label: 'GT3 (991.2)', modelName: '911 GT3 (991.2)', glb: GLB.gt3rs2, defaultEngine: ENG.gt40, defaultTransmission: TRN.pdk, modelAvailable: false },
  { ...B991, id: 'gt3-touring-991-2', phase: '991.2', bodyStyle: 'coupe', label: 'GT3 Touring (991.2)', modelName: '911 GT3 Touring (991.2)', glb: GLB.gt3rs2, defaultEngine: ENG.gt40, defaultTransmission: TRN.m6, modelAvailable: false },
  { ...B991, id: 'gt3-rs-991-2', phase: '991.2', bodyStyle: 'coupe', label: 'GT3 RS (991.2)', modelName: '911 GT3 RS (991.2)', glb: GLB.gt3rs2, defaultEngine: ENG.gt40, defaultTransmission: TRN.pdk },
  { ...B991, id: 'gt2-rs-991-2', phase: '991.2', bodyStyle: 'coupe', label: 'GT2 RS (991.2)', modelName: '911 GT2 RS (991.2)', glb: GLB.gt2cs2, defaultEngine: ENG.gt2, defaultTransmission: TRN.pdk, modelAvailable: false },
  { ...B991, id: 'speedster-991-2', phase: '991.2', bodyStyle: 'cabriolet', label: 'Speedster (991.2)', modelName: '911 Speedster (991.2)', glb: GLB.speed2, defaultEngine: ENG.gt40, defaultTransmission: TRN.m6 },

  // ── 991.2 customs (dedicated GLB) ──
  { ...B991, id: 'gt3-rs-weissach-991-2', phase: '991.2', bodyStyle: 'coupe', label: 'GT3 RS Weissach (991.2)', modelName: '911 GT3 RS Weissach (991.2)', glb: GLB.gt3rsw2, defaultEngine: ENG.gt40, defaultTransmission: TRN.pdk },
  { ...B991, id: 'gt2-rs-clubsport-991-2', phase: '991.2', bodyStyle: 'coupe', label: 'GT2 RS Clubsport (991.2)', modelName: '911 GT2 RS Clubsport (991.2)', glb: GLB.gt2cs2, defaultEngine: ENG.gt2, defaultTransmission: TRN.pdk },
];

export function getVariant(id: BodyType): CarVariant {
  return CAR_VARIANTS.find((v) => v.id === id) ?? CAR_VARIANTS[0];
}

export function variantGlb(id: BodyType): string {
  return getVariant(id).glb;
}

/** All distinct generations we know about, e.g. ['981','987']. */
export const GENERATIONS: string[] = Array.from(new Set(CAR_VARIANTS.map((v) => v.generation)));

// ---- Cascading picker helpers (Brand → Model → Year → variant) -------------

/** Model-year range per generation, shown on the picker's "year" step. */
export const GENERATION_YEARS: Record<string, string> = {
  '987': '2005–2012',
  '981': '2012–2016',
  '991': '2011–2019',
  'audi-b9': '2016–2024',
};
export function generationYears(gen: string): string {
  return GENERATION_YEARS[gen] ?? '';
}

/** Short generation code for display (e.g. 'audi-b9' → 'B9', '981' → '981'). */
export function generationCode(gen: string): string {
  return gen.replace(/^audi-/i, '').toUpperCase();
}

/** Brand for a variant (defaults to Porsche). */
export function variantMake(v: CarVariant): string {
  return v.make ?? 'Porsche';
}

/** Nameplate / model line (Boxster & Cayman derive from bodyStyle). */
export function variantNameplate(v: CarVariant): string {
  if (v.nameplate) return v.nameplate;
  if (v.bodyStyle === 'boxster') return 'Boxster';
  if (v.bodyStyle === 'cayman') return 'Cayman';
  return v.modelName;
}

/** Parse a "2005–2012" style model-year range → [min, max] (handles en-dash + hyphen). */
function parseYearRange(range: string): [number, number] | null {
  const m = range.match(/(\d{4})\s*[–-]\s*(\d{4})/);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

/**
 * The sibling generation whose model-year range contains `year` for a given
 * make + nameplate — e.g. Boxster + 2005 → '987' (the 987 is 2005–2012; the 981
 * is 2012–2016). Returns null if none matches or the range is unknown. Used to
 * catch a model-year that doesn't fit the picked generation (a 2005 car left on
 * the 981 wouldn't offer the 5-speed manual it actually had). Prefers an exact
 * match; treats a boundary-overlap year as ambiguous (returns null → no nag).
 */
export function generationForYear(make: string, nameplate: string, year: number): string | null {
  if (!Number.isFinite(year)) return null;
  const gens = Array.from(
    new Set(
      CAR_VARIANTS.filter((v) => variantMake(v) === make && variantNameplate(v) === nameplate).map(
        (v) => v.generation,
      ),
    ),
  );
  const hits = gens.filter((g) => {
    const r = parseYearRange(generationYears(g));
    return r && year >= r[0] && year <= r[1];
  });
  return hits.length === 1 ? hits[0] : null;
}

/** Leaf label — modelName without the trailing "(gen)" (e.g. "Cayman GT4"). */
export function variantShortName(v: CarVariant): string {
  return v.modelName.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

/**
 * Trim-only chip label for the picker leaf, after Brand/Model/Series/Body are
 * chosen: drops the "911 " nameplate prefix and a trailing body word ("Cabriolet")
 * so 911s read as "Carrera S" / "Turbo S" / "Targa 4S". Keeps the "911 " prefix
 * when stripping would leave a bare token (the "911 R"). No-op for Boxster/Cayman/
 * A4 (their short name has no "911 " prefix), so it equals variantShortName there.
 */
export function variantTrimLabel(v: CarVariant): string {
  const short = variantShortName(v);
  const stripped = short.replace(/^911\s+/, '').replace(/\s+Cabriolet$/i, '');
  if (stripped.length >= 2) return stripped;
  return short.replace(/\s+Cabriolet$/i, '');
}

/** Selectable variants for the current user — 'development' cars are admin-only. */
export function visibleVariants(isAdmin: boolean): CarVariant[] {
  return isAdmin ? CAR_VARIANTS : CAR_VARIANTS.filter((v) => v.status !== 'development');
}

/** Resolve a stored vehicle.body id to its generation (defaults to 981). */
export function generationForBody(body: string | null | undefined): string {
  return CAR_VARIANTS.find((v) => v.id === body)?.generation ?? '981';
}

/**
 * Resolve a 987's sub-generation: 987.1 (2005–2008, M96/M97) vs 987.2 (2009–2012,
 * 9A1 DFI). Returns null for non-987 cars (981 has no such split). Used to scope
 * per-car part numbers — e.g. the 9A1 DFI engine/fuel parts only apply to 987.2.
 *
 * Powertrain signals are unambiguous where present (2.9 / PDK = 987.2; 2.7 /
 * Tiptronic = 987.1); the shared 3.4 S and plain manuals fall back to model year.
 */
export function subGeneration(vehicle: Pick<Vehicle, 'body' | 'engine' | 'trans' | 'year'>): '987.1' | '987.2' | null {
  if (generationForBody(vehicle.body) !== '987') return null;
  const engine = (vehicle.engine || '').toLowerCase();
  const trans = (vehicle.trans || '').toLowerCase();
  if (/\b2\.9\b/.test(engine) || trans.includes('pdk')) return '987.2';
  if (/\b2\.7\b/.test(engine) || trans.includes('tiptronic')) return '987.1';
  const year = parseInt(String(vehicle.year ?? '').replace(/\D/g, ''), 10);
  if (Number.isFinite(year) && year > 0) return year >= 2009 ? '987.2' : '987.1';
  return null;
}
