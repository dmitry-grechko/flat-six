import MarketingShell from '@/components/marketing/MarketingShell';
import CodesIndex from '@/components/marketing/CodesIndex';
import { getFaultCodes } from '@/lib/knowledge';
import { MARKETING_GENERATIONS } from '@/lib/marketing/content';
import { pageMetadata } from '@/lib/marketing/seo';

export const metadata = pageMetadata({
  title: 'Fault codes',
  description: 'OBD-II fault codes for the 987 and 981 Boxster and Cayman — symptoms, causes, and diagnosis steps.',
  path: '/codes',
});

export default function CodesHubPage() {
  const codes = MARKETING_GENERATIONS.flatMap((generation) =>
    getFaultCodes(generation).map((fault) => ({ generation, fault })),
  );

  return (
    <MarketingShell active="faults">
      <CodesIndex codes={codes} />
    </MarketingShell>
  );
}
