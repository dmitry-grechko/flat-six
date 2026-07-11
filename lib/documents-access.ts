import { DEMO_MODE } from '@/lib/demo';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side check: may this user open factory PDF documents?
 * Embeddings / manual_sections search are separate and stay available.
 */
export async function userHasDocumentsAccess(
  supabase: SupabaseClient,
  userId: string | null | undefined,
): Promise<boolean> {
  if (DEMO_MODE) return true;
  if (!userId) return false;
  const { data, error } = await supabase
    .from('profiles')
    .select('documents_access')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return false;
  return !!data.documents_access;
}
