'use client';

import AppShell from '@/components/shell/AppShell';
import ObdWorkspace from '@/components/views/ObdWorkspace';
import { ObdFocusProvider } from '@/lib/obd-react/ObdFocusContext';

export default function ObdPage() {
  return (
    <ObdFocusProvider>
      <AppShell>
        <ObdWorkspace />
      </AppShell>
    </ObdFocusProvider>
  );
}
