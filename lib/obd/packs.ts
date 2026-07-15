/**
 * Vehicle-pack registry — the multi-vehicle spine of the OBD engine.
 *
 * A "pack" bundles everything the engine needs to talk to one class of vehicle:
 * its OBD profile (protocol, cylinder count, DME fault access, module map). The
 * decode/protocol core stays marque-agnostic — it ships only a generic fallback
 * and reads every specific vehicle from this registry. Porsche generations
 * register themselves (profiles.ts); other marques (e.g. Audi) register from
 * their own pack module the same way. Adding a vehicle therefore never means
 * editing the engine core — it means registering data.
 *
 * `visibility` records publishing intent for the eventual open-source split:
 * 'public' packs may ship in the open engine; 'private' packs (data derived from
 * licensed manuals, or personal / in-development vehicles) are meant to stay out
 * of a public release. It is metadata today, enforced at publish time.
 */
import type { ObdProfile } from './profiles';

export interface VehiclePack {
  /** Registry key — matches the app's `generation` string (e.g. '981', 'audi-b9'). */
  key: string;
  /** Manufacturer, for display / grouping (e.g. 'Porsche', 'Audi'). */
  make: string;
  /** Human label for the vehicle class this pack covers. */
  model: string;
  /** Generation/platform code (mirrors `key` today). */
  generation: string;
  /** Publishing intent for the open-source split. */
  visibility: 'public' | 'private';
  /** Protocol + cylinders + DME fault access + module map. */
  profile: ObdProfile;
}

const REGISTRY = new Map<string, VehiclePack>();

/** Register (or replace) a vehicle pack. Idempotent by `key`. */
export function registerVehiclePack(pack: VehiclePack): void {
  REGISTRY.set(pack.key, pack);
}

/** The pack for a vehicle key, or undefined if none is registered. */
export function vehiclePack(key: string): VehiclePack | undefined {
  return REGISTRY.get(key);
}

/** Every registered pack. */
export function allVehiclePacks(): VehiclePack[] {
  return [...REGISTRY.values()];
}

/** Keys of all registered packs — the vehicles the engine currently knows. */
export function registeredVehicleKeys(): string[] {
  return [...REGISTRY.keys()];
}
