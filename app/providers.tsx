'use client';

import { VehicleProvider } from '@/lib/vehicle-context';
import { RecordsProvider } from '@/lib/records-context';
import { PlansProvider } from '@/lib/plans-context';
import { OfflineProvider } from '@/lib/offline/OfflineProvider';
import SetupGate from '@/components/shell/SetupGate';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <OfflineProvider>
      <VehicleProvider>
        <RecordsProvider>
          <PlansProvider>
            <SetupGate>{children}</SetupGate>
          </PlansProvider>
        </RecordsProvider>
      </VehicleProvider>
    </OfflineProvider>
  );
}
