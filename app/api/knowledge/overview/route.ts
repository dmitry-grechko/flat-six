import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DEMO_MODE } from '@/lib/demo';
import { generationForBody } from '@/lib/models';
import {
  getFaultCodes,
  getSpecs,
  getMaintenance,
  getKnownIssues,
  getArticles,
  DEFAULT_GENERATION,
} from '@/lib/knowledge';
import { documentsForGeneration } from '@/lib/documents';

export const dynamic = 'force-dynamic';

type SourceRow = {
  name: string;
  detail: string;
  status: 'INDEXED' | 'LIVE' | 'EMPTY';
  group: 'curated' | 'factory' | 'garage';
};

export async function GET() {
  const supabase = createClient();
  let generation = DEFAULT_GENERATION;
  let recordsCount = 0;
  let partsCount: number | null = null;
  let factory = { workshop: 0, diagnostic: 0, sit: 0, training: 0, total: 0 };

  if (!DEMO_MODE) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('body, is_primary, created_at')
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1);
      const body = (vehicles as { body: string }[] | null)?.[0]?.body;
      if (body) generation = generationForBody(body);

      const { count: recs } = await supabase
        .from('service_records')
        .select('*', { count: 'exact', head: true });
      recordsCount = recs ?? 0;

      const bySource = async (src: string) => {
        const { count } = await supabase
          .from('manual_sections')
          .select('*', { count: 'exact', head: true })
          .eq('source', src)
          .in('generation', [generation, 'shared']);
        return count ?? 0;
      };
      const { count: ws } = await supabase
        .from('manual_sections')
        .select('*', { count: 'exact', head: true })
        .eq('source', 'workshop')
        .eq('generation', generation);
      factory.workshop = ws ?? 0;
      factory.diagnostic = await bySource('mtl-diagnostic');
      factory.sit = await bySource('mtl-sit');
      factory.training = await bySource('mtl-training');

      const { count: total } = await supabase
        .from('manual_sections')
        .select('*', { count: 'exact', head: true })
        .in('generation', [generation, 'shared']);
      factory.total = total ?? 0;
    }
  } else {
    // Demo: show curated counts only; factory docs look empty until imported.
    generation = DEFAULT_GENERATION;
  }

  try {
    const { count } = await supabase.from('parts').select('*', { count: 'exact', head: true });
    partsCount = count ?? 0;
  } catch {
    partsCount = null;
  }

  const docs = documentsForGeneration(generation);
  const curated: SourceRow[] = [
    { name: 'Fault Codes', detail: `${getFaultCodes(generation).length} entries`, status: 'INDEXED', group: 'curated' },
    { name: 'Specifications', detail: `${getSpecs(generation).length} entries`, status: 'INDEXED', group: 'curated' },
    { name: 'Maintenance Schedule', detail: `${getMaintenance(generation).length} entries`, status: 'INDEXED', group: 'curated' },
    { name: 'Known Issues', detail: `${getKnownIssues(generation).length} entries`, status: 'INDEXED', group: 'curated' },
    { name: 'Reference Articles', detail: `${getArticles(generation).length} articles`, status: 'INDEXED', group: 'curated' },
  ];

  const factoryRows: SourceRow[] = [
    {
      name: 'Workshop Manual',
      detail: factory.workshop
        ? `${factory.workshop.toLocaleString()} procedures`
        : generation === '981' ? 'not imported yet' : '981 only',
      status: factory.workshop ? 'INDEXED' : 'EMPTY',
      group: 'factory',
    },
    {
      name: 'MTL Diagnostics',
      detail: factory.diagnostic
        ? `${factory.diagnostic.toLocaleString()} sections`
        : 'not imported yet',
      status: factory.diagnostic ? 'INDEXED' : 'EMPTY',
      group: 'factory',
    },
    {
      name: 'Service Information Technik',
      detail: factory.sit
        ? `${factory.sit.toLocaleString()} sections`
        : 'not imported yet',
      status: factory.sit ? 'INDEXED' : 'EMPTY',
      group: 'factory',
    },
    {
      name: 'Training Books',
      detail: factory.training
        ? `${factory.training.toLocaleString()} sections`
        : 'not imported yet',
      status: factory.training ? 'INDEXED' : 'EMPTY',
      group: 'factory',
    },
  ];

  const garage: SourceRow[] = [
    {
      name: 'OEM Parts Catalog',
      detail: partsCount === null ? 'unavailable' : `${partsCount.toLocaleString()} parts`,
      status: partsCount ? 'INDEXED' : 'EMPTY',
      group: 'garage',
    },
    {
      name: 'Your service history',
      detail: `${recordsCount} ${recordsCount === 1 ? 'record' : 'records'}`,
      status: 'LIVE',
      group: 'garage',
    },
  ];

  return NextResponse.json({
    generation,
    documentCount: docs.length,
    factorySections: factory.total,
    sources: [...curated, ...factoryRows, ...garage],
  });
}
