import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { DEMO_MODE } from '@/lib/demo';
import { ADMIN_EMAIL, isAdminEmail, type AdminOverview, type AdminUser } from '@/lib/admin';

export const dynamic = 'force-dynamic';

// Placeholder data so the panel is fully testable in demo mode (no DB/auth).
function demoOverview(): AdminOverview {
  const users: AdminUser[] = [
    { email: ADMIN_EMAIL, joined: '2026-06-18', vehicleCount: 1, vehicles: ['Boxster S (981)'], recordCount: 4, planCount: 2, mcpConnected: true },
    { email: 'alex.driver@example.com', joined: '2026-06-21', vehicleCount: 1, vehicles: ['Cayman S (981)'], recordCount: 7, planCount: 1, mcpConnected: true },
    { email: 'sam@example.com', joined: '2026-06-24', vehicleCount: 2, vehicles: ['Boxster GTS (981)', 'Cayman GT4'], recordCount: 12, planCount: 3, mcpConnected: false },
    { email: 'newbie@example.com', joined: '2026-06-27', vehicleCount: 0, vehicles: [], recordCount: 0, planCount: 0, mcpConnected: false },
  ];
  return {
    totalUsers: users.length,
    usersWithCar: users.filter((u) => u.vehicleCount > 0).length,
    totalVehicles: users.reduce((n, u) => n + u.vehicleCount, 0),
    totalRecords: users.reduce((n, u) => n + u.recordCount, 0),
    totalPlans: users.reduce((n, u) => n + u.planCount, 0),
    mcpConnectedUsers: users.filter((u) => u.mcpConnected).length,
    users,
    demo: true,
  };
}

function countByUser(rows: { user_id: string }[] | null): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows ?? []) {
    map.set(row.user_id, (map.get(row.user_id) ?? 0) + 1);
  }
  return map;
}

export async function GET() {
  if (DEMO_MODE) return NextResponse.json(demoOverview());

  // 1) Verify the caller is the admin, using their own session.
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdminEmail(user?.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 2) Read across ALL users with the service-role key (bypasses RLS).
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY is not configured on the server.' },
      { status: 500 },
    );
  }
  const admin = createServiceClient(url, serviceKey, { auth: { persistSession: false } });

  const [
    { data: profiles, error: pErr },
    { data: vehicles, error: vErr },
    { data: records, error: rErr },
    { data: plans, error: plErr },
    { data: oauthCodes, error: oErr },
  ] = await Promise.all([
    admin.from('profiles').select('id, display_name, created_at').order('created_at', { ascending: true }),
    admin.from('vehicles').select('user_id, model'),
    admin.from('service_records').select('user_id'),
    admin.from('service_plans').select('user_id'),
    admin.from('oauth_codes').select('user_id').eq('used', true),
  ]);
  if (pErr || vErr || rErr || plErr || oErr) {
    return NextResponse.json({ error: (pErr ?? vErr ?? rErr ?? plErr ?? oErr)?.message ?? 'Query failed' }, { status: 500 });
  }

  const byUser = new Map<string, string[]>();
  for (const v of vehicles ?? []) {
    const list = byUser.get(v.user_id) ?? [];
    list.push(v.model || 'Vehicle');
    byUser.set(v.user_id, list);
  }

  const recordsByUser = countByUser(records);
  const plansByUser = countByUser(plans);
  const mcpUsers = new Set((oauthCodes ?? []).map((c) => c.user_id));

  const users: AdminUser[] = (profiles ?? []).map((p) => {
    const models = byUser.get(p.id) ?? [];
    return {
      email: p.display_name ?? '(unknown)',     // profiles.display_name is seeded with the signup email
      joined: p.created_at,
      vehicleCount: models.length,
      vehicles: models,
      recordCount: recordsByUser.get(p.id) ?? 0,
      planCount: plansByUser.get(p.id) ?? 0,
      mcpConnected: mcpUsers.has(p.id),
    };
  });

  const overview: AdminOverview = {
    totalUsers: users.length,
    usersWithCar: users.filter((u) => u.vehicleCount > 0).length,
    totalVehicles: (vehicles ?? []).length,
    totalRecords: users.reduce((n, u) => n + u.recordCount, 0),
    totalPlans: users.reduce((n, u) => n + u.planCount, 0),
    mcpConnectedUsers: users.filter((u) => u.mcpConnected).length,
    users,
  };
  return NextResponse.json(overview);
}
