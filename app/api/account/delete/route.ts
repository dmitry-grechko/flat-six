import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Permanently delete the signed-in user's account. Deleting the auth user
 * cascades to all their data — profiles, vehicles, service_records and
 * service_plans all reference auth.users(id) ON DELETE CASCADE.
 */
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: 'server_misconfigured', detail: 'SUPABASE_SERVICE_ROLE_KEY is not set on the server.' },
      { status: 500 },
    );
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json({ error: 'delete_failed', detail: error.message }, { status: 500 });
  }

  // Clear the now-orphaned session cookie (best effort).
  await supabase.auth.signOut().catch(() => {});
  return NextResponse.json({ ok: true });
}
