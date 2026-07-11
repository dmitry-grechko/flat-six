/** The single account allowed to see the admin usage panel. */
export const ADMIN_EMAIL = 'grechkoda@gmail.com';

export function isAdminEmail(email?: string | null): boolean {
  return !!email && email.trim().toLowerCase() === ADMIN_EMAIL;
}

// ---- Admin overview shape (returned by /api/admin/overview, rendered by AdminPanel) ----
export interface AdminUser {
  id: string;
  email: string;
  joined: string;        // ISO date
  vehicleCount: number;
  vehicles: string[];    // model names
  recordCount: number;
  planCount: number;
  /** true if the user has completed OAuth at least once (MCP connector). */
  mcpConnected: boolean;
  /** Factory PDF library / deep-link access. */
  documentsAccess: boolean;
}

export interface AdminOverview {
  totalUsers: number;
  usersWithCar: number;
  totalVehicles: number;
  totalRecords: number;
  totalPlans: number;
  mcpConnectedUsers: number;
  users: AdminUser[];
  /** true when served from demo placeholder data rather than the real DB. */
  demo?: boolean;
}
