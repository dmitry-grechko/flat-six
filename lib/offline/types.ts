/** Offline garage cache types (v1 — no documents/PDFs). */

import type { Profile, ServicePlan, ServiceRecord } from '@/lib/types';
import type { StoredVehicle } from '@/lib/db/vehicles';
import type { NewServiceRecord } from '@/lib/db/service-records';
import type { NewServicePlan, PlanPatch } from '@/lib/db/service-plans';
import type { Vehicle } from '@/lib/types';

export type PendingOp =
  | { id: string; kind: 'vehicle.create'; at: string; payload: { vehicle: Vehicle; primary?: boolean; localId: string } }
  | { id: string; kind: 'vehicle.update'; at: string; payload: { id: string; patch: Partial<Vehicle> } }
  | { id: string; kind: 'vehicle.delete'; at: string; payload: { id: string } }
  | { id: string; kind: 'record.add'; at: string; payload: { vehicleId: string; rec: NewServiceRecord; localId: string } }
  | { id: string; kind: 'record.update'; at: string; payload: { id: string; rec: NewServiceRecord } }
  | { id: string; kind: 'record.delete'; at: string; payload: { id: string } }
  | { id: string; kind: 'plan.add'; at: string; payload: { vehicleId: string; plan: NewServicePlan; localId: string } }
  | { id: string; kind: 'plan.update'; at: string; payload: { id: string; patch: PlanPatch } }
  | { id: string; kind: 'plan.delete'; at: string; payload: { id: string } };

export interface GarageSnapshot {
  userId: string;
  syncedAt: string;
  profile: Profile | null;
  vehicles: StoredVehicle[];
  /** keyed by vehicle id */
  records: Record<string, ServiceRecord[]>;
  /** keyed by vehicle id */
  plans: Record<string, ServicePlan[]>;
}

export const OFFLINE_DB = 'flatsix-garage';
export const OFFLINE_DB_VERSION = 1;
