import { Suspense } from 'react';
import AppShell from '@/components/shell/AppShell';
import FaultFinding from '@/components/views/FaultFinding';

export default function FaultsPage() {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <FaultFinding />
      </Suspense>
    </AppShell>
  );
}
