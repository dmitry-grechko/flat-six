'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { isElectronShell } from '@/lib/obd/electronClient';
import { getConsent, loadGa, trackPageView } from '@/lib/analytics';
import ConsentBanner from './ConsentBanner';

/**
 * Loads GA (once consent is granted), shows the consent banner until the visitor
 * chooses, and sends a page_view on each SPA route change. Renders nothing — and
 * loads nothing — inside the Electron desktop shell.
 */
export default function Analytics() {
  const pathname = usePathname();
  const [electron, setElectron] = useState(false);
  const [needsChoice, setNeedsChoice] = useState(false);

  useEffect(() => {
    if (isElectronShell()) {
      setElectron(true);
      return;
    }
    const consent = getConsent();
    if (consent === 'granted') loadGa();
    else if (consent === null) setNeedsChoice(true);
  }, []);

  // Fires on route changes; no-ops until consent is granted (analyticsEnabled).
  useEffect(() => {
    if (pathname) trackPageView(pathname);
  }, [pathname]);

  // Accepting mid-page doesn't change `pathname`, so send the current page_view
  // now — otherwise a first-time visitor who accepts and never navigates is
  // invisible to GA.
  const handleChoose = () => {
    setNeedsChoice(false);
    if (getConsent() === 'granted' && pathname) trackPageView(pathname);
  };

  if (electron || !needsChoice) return null;
  return <ConsentBanner onChoose={handleChoose} />;
}
