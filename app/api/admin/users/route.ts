import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { DEMO_MODE } from '@/lib/demo';
import { isAdminEmail } from '@/lib/admin';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/admin/users
 * Body: { userId: string, documentsAccess: boolean }
 * Admin-only — toggles profiles.documents_access via service role.
 */
export async function PATCH(req: Request) {
  if (DEMO_MODE) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdminEmail(user?.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const userId = typeof body?.userId === 'string' ? body.userId : '';
  const documentsAccess = body?.documentsAccess;
  if (!userId || typeof documentsAccess !== 'boolean') {
    return NextResponse.json({ error: 'userId (string) and documentsAccess (boolean) required' }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured on the server.' }, { status: 500 });
  }
  const admin = createServiceClient(url, serviceKey, { auth: { persistSession: false } });

  const { error } = await admin
    .from('profiles')
    .update({ documents_access: documentsAccess })
    .eq('id', userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, userId, documentsAccess });
}
