'use client';

import { useEffect, useState } from 'react';
import { getMyDocumentsAccess } from '@/lib/db/profiles';
import { DEMO_MODE } from '@/lib/demo';

/** Client hook: factory PDF library / deep-link access for the signed-in user. */
export function useDocumentsAccess(): { allowed: boolean; loading: boolean } {
  const [allowed, setAllowed] = useState(DEMO_MODE);
  const [loading, setLoading] = useState(!DEMO_MODE);

  useEffect(() => {
    if (DEMO_MODE) {
      setAllowed(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    getMyDocumentsAccess()
      .then((ok) => {
        if (!cancelled) setAllowed(ok);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { allowed, loading };
}
