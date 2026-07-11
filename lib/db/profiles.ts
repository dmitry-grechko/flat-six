'use client';

import { createClient } from '@/lib/supabase/client';
import { DEMO_MODE } from '@/lib/demo';
import type { Profile } from '@/lib/types';

interface ProfileRow {
  id: string;
  display_name: string | null;
  units: string;
  documents_access: boolean;
  created_at: string;
}

function rowToProfile(r: ProfileRow): Profile {
  return {
    id: r.id,
    displayName: r.display_name ?? '',
    units: r.units === 'metric' ? 'metric' : 'imperial',
    documentsAccess: !!r.documents_access,
    createdAt: r.created_at,
  };
}

/** Current user's profile (RLS-scoped). Demo mode: documents access on. */
export async function getMyProfile(): Promise<Profile | null> {
  if (DEMO_MODE) {
    return {
      id: 'demo',
      displayName: 'demo@flatsix.garage',
      units: 'imperial',
      documentsAccess: true,
      createdAt: new Date().toISOString(),
    };
  }
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, units, documents_access, created_at')
    .eq('id', user.id)
    .maybeSingle();
  if (error || !data) return null;
  return rowToProfile(data as ProfileRow);
}

/** Whether the signed-in user may open the factory PDF library / deep links. */
export async function getMyDocumentsAccess(): Promise<boolean> {
  if (DEMO_MODE) return true;
  const profile = await getMyProfile();
  return !!profile?.documentsAccess;
}
