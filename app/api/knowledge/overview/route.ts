import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DEMO_MODE } from '@/lib/demo';
import { generationForBody, GENERATIONS } from '@/lib/models';
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

function resolveGenerationParam(raw: string | null): string | null {
  if (!raw) return null;
  const g = raw.trim();
  return GENERATIONS.includes(g) ? g : null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  // Client passes the *active* vehicle's generation so the AI tab matches the
  // sidebar switcher (not just the DB primary).
  const requestedGen = resolveGenerationParam(searchParams.get('generation'));
  const requestedVehicleId = searchParams.get('vehicleId');

  const supabase = createClient();
  let generation = requestedGen ?? DEFAULT_GENERATION;
  let recordsCount = 0;
  let partsCount: number | null = null;
  let factory = { workshop: 0, diagnostic: 0, sit: 0, training: 0, service: 0, total: 0 };

  if (!DEMO_MODE) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      // Fall back to primary vehicle only when the client didn't send a generation.
      if (!requestedGen) {
        const { data: vehicles } = await supabase
          .from('vehicles')
          .select('body, is_primary, created_at')
          .order('is_primary', { ascending: false })
          .order('created_at', { ascending: true })
          .limit(1);
        const body = (vehicles as { body: string }[] | null)?.[0]?.body;
        if (body) generation = generationForBody(body);
      }

      let recQuery = supabase
        .from('service_records')
        .select('*', { count: 'exact', head: true });
      if (requestedVehicleId) {
        recQuery = recQuery.eq('vehicle_id', requestedVehicleId);
      }
      const { count: recs } = await recQuery;
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
      factory.service = await bySource('mtl-service');

      const { count: total } = await supabase
        .from('manual_sections')
        .select('*', { count: 'exact', head: true })
        .in('generation', [generation, 'shared']);
      factory.total = total ?? 0;
    }
  }
  // DEMO_MODE: curated + document counts still follow the requested generation
  // (active car in the sidebar). Factory section counts stay 0 without auth.

  try {
    let partsQuery = supabase.from('parts').select('*', { count: 'exact', head: true });
    // Prefer generation-scoped parts when the column is populated.
    if (generation) {
      const { count, error } = await supabase
        .from('parts')
        .select('*', { count: 'exact', head: true })
        .contains('generations', [generation]);
      if (!error && count != null) {
        partsCount = count;
      } else {
        const { count: all } = await partsQuery;
        partsCount = all ?? 0;
      }
    } else {
      const { count } = await partsQuery;
      partsCount = count ?? 0;
    }
  } catch {
    partsCount = null;
  }

  const docs = documentsForGeneration(generation);
  const curated: SourceRow[] = [
    {
      name: 'Fault Codes',
      detail: `${getFaultCodes(generation).length} entries`,
      status: 'INDEXED',
      group: 'curated',
    },
    {
      name: 'Specifications',
      detail: `${getSpecs(generation).length} entries`,
      status: 'INDEXED',
      group: 'curated',
    },
    {
      name: 'Maintenance Schedule',
      detail: `${getMaintenance(generation).length} entries`,
      status: 'INDEXED',
      group: 'curated',
    },
    {
      name: 'Known Issues',
      detail: `${getKnownIssues(generation).length} entries`,
      status: 'INDEXED',
      group: 'curated',
    },
    {
      name: 'Reference Articles',
      detail: `${getArticles(generation).length} articles`,
      status: 'INDEXED',
      group: 'curated',
    },
  ];

  const factoryRows: SourceRow[] = [
    {
      name: 'Workshop Manual',
      detail: factory.workshop
        ? `${factory.workshop.toLocaleString()} procedures`
        : 'not imported yet',
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

  if (generation === '987' || factory.service > 0) {
    factoryRows.push({
      name: 'Owner & Maintenance',
      detail: factory.service
        ? `${factory.service.toLocaleString()} sections`
        : 'not imported yet',
      status: factory.service ? 'INDEXED' : 'EMPTY',
      group: 'factory',
    });
  }

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
