// 987 (Boxster/Cayman 2005–2012, calibrated to the 987.2 / 2009 Service
// Introduction) component registry — consumed by build-components.mjs --gen 987.
//
// Each module here owns the 987-specific geometry. Where the 987 packaging
// matches the 981 the module delegates to the shared 981 builder; where the
// Service Introduction figures show differences (exhaust cans, PDK case,
// hydraulic-steering hardware…) the module forks geometry locally.
//
// NOTE: `engine` is intentionally ABSENT — public/models/components/987/engine.glb
// is a copy of the real 9A1 flat-six model (987.2 shares the 9A1 family with the
// 981) and must never be overwritten by a procedural build.

import * as transaxle from './transaxle.mjs';
import * as transaxleManual from './transaxleManual.mjs';
import * as exhaust from './exhaust.mjs';
import * as frontBrake from './frontBrake.mjs';
import * as rearBrake from './rearBrake.mjs';
import * as coolingRadiator from './coolingRadiator.mjs';
import * as oilSystem from './oilSystem.mjs';
import * as airIntake from './airIntake.mjs';
import * as ignitionFuel from './ignitionFuel.mjs';
import * as suspension from './suspension.mjs';
import * as electrical from './electrical.mjs';
import * as driveline from './driveline.mjs';
import * as fuelSystem from './fuelSystem.mjs';

export const COMPONENTS = [
  transaxle,
  transaxleManual,
  exhaust,
  frontBrake,
  rearBrake,
  coolingRadiator,
  oilSystem,
  airIntake,
  ignitionFuel,
  suspension,
  electrical,
  driveline,
  fuelSystem,
];
