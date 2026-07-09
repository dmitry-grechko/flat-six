'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useVehicle } from '@/lib/vehicle-context';
import { DEMO_MODE } from '@/lib/demo';

/** Paths where first-time users are not forced into vehicle onboarding. */
function isSetupExempt(pathname: string): boolean {
  if (pathname === '/') return true;
  return (
    pathname === '/onboarding' ||
    pathname === '/legal' ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/oauth') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/.well-known')
  );
}

/**
 * Redirects signed-in users with no vehicles to /onboarding, and users who
 * already have a car away from the onboarding screen.
 */
export default function SetupGate({ children }: { children: React.ReactNode }) {
  const { loading, needsSetup } = useVehicle();
  const pathname = usePathname();
  const router = useRouter();

  const redirectingToOnboarding = !DEMO_MODE && !loading && needsSetup && !isSetupExempt(pathname);
  const redirectingToGarage = !DEMO_MODE && !loading && !needsSetup && pathname === '/onboarding';

  useEffect(() => {
    if (DEMO_MODE || loading) return;

    if (redirectingToOnboarding) {
      router.replace('/onboarding');
      return;
    }

    if (redirectingToGarage) {
      router.replace('/garage');
    }
  }, [loading, redirectingToOnboarding, redirectingToGarage, router]);

  if (redirectingToOnboarding || redirectingToGarage) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#ECECEE',
          font: "500 11px/1 'JetBrains Mono',monospace",
          letterSpacing: '.12em',
          color: '#9A9AA0',
        }}
      >
        Loading…
      </div>
    );
  }

  return children;
}
