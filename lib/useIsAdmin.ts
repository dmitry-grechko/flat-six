'use client';

import { useEffect, useState } from 'react';
import { DEMO_MODE } from './demo';
import { createClient } from './supabase/client';
import { isAdminEmail } from './admin';

/**
 * Client-side admin check. Encapsulates the getUser → isAdminEmail pattern used
 * across the app (Sidebar, ObdWorkspace, the model picker). Returns `true` in
 * demo mode so the full app is exercisable with no backend.
 *
 * This is a soft, client-side gate (the admin allowlist ships in the bundle),
 * suitable for hiding in-development UI — not a security boundary. Anything that
 * must be truly restricted belongs behind a server/RLS check.
 */
export function useIsAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(DEMO_MODE);
  useEffect(() => {
    if (DEMO_MODE) return;
    createClient()
      .auth.getUser()
      .then(({ data }) => setIsAdmin(isAdminEmail(data.user?.email)))
      .catch(() => setIsAdmin(false));
  }, []);
  return isAdmin;
}
