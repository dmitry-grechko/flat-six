'use client';

import { VehicleProvider } from '@/lib/vehicle-context';
import { RecordsProvider } from '@/lib/records-context';
import { PlansProvider } from '@/lib/plans-context';
import { OfflineProvider } from '@/lib/offline/OfflineProvider';
import { UnitsProvider } from '@/lib/units';
import SetupGate from '@/components/shell/SetupGate';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UnitsProvider>
      <OfflineProvider>
        <VehicleProvider>
          <RecordsProvider>
            <PlansProvider>
              <SetupGate>{children}</SetupGate>
            </PlansProvider>
          </RecordsProvider>
        </VehicleProvider>
      </OfflineProvider>
    </UnitsProvider>
  );
}
