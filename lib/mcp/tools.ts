import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  getFaultCodes,
  getSpecs,
  getMaintenance,
  getKnownIssues,
  searchKnowledge,
  DEFAULT_GENERATION,
  type FaultCode,
} from '@/lib/knowledge';
import type { FaultsData, LiveData, Mode06Data, ModuleScanData } from '@/lib/obd/types';
import { searchCatalog, formatPartNumber } from '@/lib/catalog';
import { GENERATIONS, generationForBody } from '@/lib/models';
import { resolveUser, AUTH_REQUIRED_MESSAGE, publicClient } from './auth';
import { manualHitHref } from '@/lib/documents';
import { userHasDocumentsAccess } from '@/lib/documents-access';
import { embedQuery, toVectorLiteral, voyageConfigured } from '@/lib/embeddings';
import {
  presetsForGeneration,
  getPreset,
  PCD,
  CENTER_BORE_MM,
  WHEEL_BOLT_TORQUE,
} from '@/lib/fitment/oem';
import { willItFit } from '@/lib/fitment/tirefit';
import { alignmentForGeneration } from '@/lib/fitment/alignment';

/** Optional generation arg shared by the knowledge tools. */
const GENERATION_ARG = z
  .string()
  .optional()
  .describe(
    `Car generation to scope results, e.g. ${GENERATIONS.map((g) => `"${g}"`).join(' / ')}. ` +
      `ALWAYS pass this (or vehicleId) when the user names a specific car/generation, or when ` +
      `get_my_vehicles shows multiple generations in the garage — never guess across models.`,
  );

/** Optional vehicle id — preferred over generation when the user has multiple cars. */
const VEHICLE_ID_ARG = z
  .string()
  .uuid()
  .optional()
  .describe(
    'Garage vehicle id from get_my_vehicles. Prefer this when the user has multiple cars — ' +
      'it pins both the generation AND which car garage tools should use.',
  );

type GarageVehicle = {
  id: string;
  body: string;
  model: string | null;
  year: number | null;
  is_primary: boolean | null;
  generation: string;
};

type KnowledgeScope = {
  generation: string;
  vehicleId?: string;
  vehicleLabel?: string;
  /** Set when the garage has multiple generations and the caller didn't disambiguate. */
  ambiguous?: boolean;
  garageGenerations?: string[];
};

/**
 * Resolve which generation (and optional vehicle) a knowledge/catalog lookup
 * should use. Priority:
 *   1. explicit vehicleId (maps to that car's generation)
 *   2. explicit generation arg
 *   3. single-generation garage → that generation
 *   4. multi-generation garage → primary vehicle, but flagged ambiguous
 *   5. DEFAULT_GENERATION (981)
 *
 * Callers should surface `ambiguous` so the model asks which car — this is the
 * main guard against cross-generation hallucinations when users own both a 981
 * and a 987.
 */
async function resolveKnowledgeScope(
  explicitGen: string | undefined,
  vehicleId: string | undefined,
  token: string | undefined,
): Promise<KnowledgeScope> {
  const vehicles = token ? await listGarageVehicles(token) : [];

  if (vehicleId) {
    const match = vehicles.find((v) => v.id === vehicleId);
    if (match) {
      return {
        generation: match.generation,
        vehicleId: match.id,
        vehicleLabel: formatVehicleLabel(match),
      };
    }
    // Unknown / unauthenticated vehicleId — fall through; generation arg may still help.
  }

  if (explicitGen && GENERATIONS.includes(explicitGen)) {
    const match = vehicles.find((v) => v.generation === explicitGen);
    return {
      generation: explicitGen,
      vehicleId: match?.id,
      vehicleLabel: match ? formatVehicleLabel(match) : undefined,
    };
  }

  if (vehicles.length === 0) {
    return { generation: DEFAULT_GENERATION };
  }

  const gens = Array.from(new Set(vehicles.map((v) => v.generation)));
  const primary =
    vehicles.find((v) => v.is_primary) ?? vehicles[0];

  if (gens.length === 1) {
    return {
      generation: primary.generation,
      vehicleId: primary.id,
      vehicleLabel: formatVehicleLabel(primary),
    };
  }

  // Multi-generation garage without an explicit pick — use primary but warn.
  return {
    generation: primary.generation,
    vehicleId: primary.id,
    vehicleLabel: formatVehicleLabel(primary),
    ambiguous: true,
    garageGenerations: gens,
  };
}

async function listGarageVehicles(token: string): Promise<GarageVehicle[]> {
  const user = await resolveUser(token);
  if (!user) return [];
  const { data } = await user.supabase
    .from('vehicles')
    .select('id, body, model, year, is_primary, created_at')
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true });
  return ((data as Omit<GarageVehicle, 'generation'>[] | null) ?? []).map((v) => ({
    ...v,
    generation: generationForBody(v.body),
  }));
}

function formatVehicleLabel(v: GarageVehicle): string {
  const bits = [v.year, v.model || v.body].filter(Boolean);
  return `${bits.join(' ')} (${v.generation})`;
}

/** Resolve which garage vehicle a history/plans tool should use. */
async function resolveGarageVehicle(
  token: string,
  vehicleId: string | undefined,
): Promise<
  | { ok: true; vehicle: GarageVehicle; ambiguous: boolean; garageCount: number }
  | { ok: false; message: string }
> {
  const vehicles = await listGarageVehicles(token);
  if (!vehicles.length) {
    return { ok: false, message: 'No vehicle found in your garage. Add one first.' };
  }
  if (vehicleId) {
    const match = vehicles.find((v) => v.id === vehicleId);
    if (!match) {
      return {
        ok: false,
        message:
          `No vehicle with id "${vehicleId}". Call get_my_vehicles and pass one of: ` +
          vehicles.map((v) => `${v.id} (${formatVehicleLabel(v)})`).join(', '),
      };
    }
    return { ok: true, vehicle: match, ambiguous: false, garageCount: vehicles.length };
  }
  const primary = vehicles.find((v) => v.is_primary) ?? vehicles[0];
  return {
    ok: true,
    vehicle: primary,
    ambiguous: vehicles.length > 1,
    garageCount: vehicles.length,
  };
}

function garageScopedJson(
  vehicle: GarageVehicle,
  ambiguous: boolean,
  garageCount: number,
  value: unknown,
) {
  const payload: Record<string, unknown> = {
    scope: {
      vehicleId: vehicle.id,
      vehicleLabel: formatVehicleLabel(vehicle),
      generation: vehicle.generation,
    },
    result: value,
  };
  if (ambiguous) {
    payload.warning =
      `Garage has ${garageCount} vehicles. Showing data for the primary car ` +
      `(${formatVehicleLabel(vehicle)}). Service history and plans are per vehicle — ` +
      `call get_my_vehicles and re-run with vehicleId if the user meant a different car.`;
  }
  return json(payload);
}

/**
 * Wrap a knowledge result with scope metadata so the model always knows which
 * generation the answer is for — and gets a clear prompt when the garage is
 * ambiguous.
 */
function scopedJson(scope: KnowledgeScope, value: unknown) {
  const payload: Record<string, unknown> = {
    scope: {
      generation: scope.generation,
      vehicleId: scope.vehicleId ?? null,
      vehicleLabel: scope.vehicleLabel ?? null,
    },
    result: value,
  };
  if (scope.ambiguous) {
    payload.warning =
      `Your garage has multiple generations (${(scope.garageGenerations ?? []).join(', ')}). ` +
      `Results below are scoped to the primary vehicle (${scope.vehicleLabel ?? scope.generation}). ` +
      `If the user meant a different car, call get_my_vehicles and re-run with vehicleId or generation.`;
  }
  return json(payload);
}

/** Wrap a JSON-serialisable value as an MCP text content result. */
function json(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] };
}

/** A plain error result (isError) the model can read and recover from. */
function err(message: string) {
  return { content: [{ type: 'text' as const, text: message }], isError: true };
}

/**
 * Injected into MCP clients that support server instructions (Claude Desktop,
 * Claude Code, etc.). Workflow rules only — tool schemas carry field detail.
 */
export const MCP_SERVER_INSTRUCTIONS = `FLAT·SIX is a Porsche Boxster/Cayman (981 & 987) garage assistant.

Generation scoping (mandatory):
- NEVER mix 981 and 987 facts in one answer.
- Call get_my_vehicles when the user has multiple cars or does not name a generation.
- Pass vehicleId (preferred) or generation on every knowledge and manual tool call.

Factory procedures and in-depth torque (licensed content — requires login):
- search_workshop_manual → get_manual_procedure on the best-matching section id.
- Always fetch full procedure text before prescribing steps, warnings, or Nm values.
- Treat search titles skeptically — near-miss sections exist; verify in the full text.

Curated specs and quick facts:
- get_spec / search_knowledge cover verified DIY shortcuts (~35 torque entries + faults/issues).
- If get_spec returns nothing, fall through to search_workshop_manual — do not invent values.

Torque lookups:
- Try get_spec first for common DIY fasteners (oil drain, caliper, wheel bolts, plugs).
- For anything else, search_workshop_manual with the fastener name + generation.`;

/**
 * Register every FLAT·SIX MCP tool on the server.
 *
 * Knowledge tools (search/fault/spec/maintenance/issues/parts) are open — they
 * never look at auth. Garage tools (vehicles/history/log) read the bearer token
 * from `extra.authInfo?.token` (populated by withMcpAuth) and resolve it to an
 * RLS-scoped Supabase client; without a valid token they return a clear error.
 */
export function registerTools(server: McpServer): void {
  // ---------------------------------------------------------------------------
  // Knowledge tools — no auth required.
  // ---------------------------------------------------------------------------

  server.registerTool(
    'search_knowledge',
    {
      title: 'Search the Porsche knowledge base',
      description:
        'Full-text search across the Porsche knowledge base: fault codes, specs, ' +
        'maintenance items, known issues and articles. Use for general "how/why/what" questions. ' +
        'ALWAYS scoped to one car generation — pass vehicleId or generation when the user has ' +
        'multiple cars or names a specific model (981 vs 987). Call get_my_vehicles first if unsure.',
      inputSchema: {
        query: z.string().min(1).describe('What to search for, e.g. "AOS failure symptoms"'),
        limit: z.number().int().min(1).max(25).optional().describe('Max results (default 8)'),
        generation: GENERATION_ARG,
        vehicleId: VEHICLE_ID_ARG,
      },
    },
    async ({ query, limit, generation, vehicleId }, extra) => {
      const scope = await resolveKnowledgeScope(generation, vehicleId, extra.authInfo?.token);
      return scopedJson(scope, searchKnowledge(query, { limit: limit ?? 8, generation: scope.generation }));
    },
  );

  server.registerTool(
    'lookup_fault_code',
    {
      title: 'Look up a fault / OBD code',
      description:
        'Resolve a fault or OBD-II code (e.g. P0011) to its meaning, causes and fixes for ONE ' +
        'car generation. Pass vehicleId/generation when the garage has multiple models.',
      inputSchema: {
        code: z.string().min(1).describe('The fault code, e.g. "P0011" (case-insensitive)'),
        generation: GENERATION_ARG,
        vehicleId: VEHICLE_ID_ARG,
      },
    },
    async ({ code, generation, vehicleId }, extra) => {
      const scope = await resolveKnowledgeScope(generation, vehicleId, extra.authInfo?.token);
      const needle = code.trim().toLowerCase();
      const faults = getFaultCodes(scope.generation);
      const exact = faults.find((f) => f.code?.toLowerCase() === needle);
      if (exact) return scopedJson(scope, exact);
      const fuzzy = faults.filter(
        (f) =>
          f.code?.toLowerCase().includes(needle) ||
          f.title?.toLowerCase().includes(needle) ||
          f.description?.toLowerCase().includes(needle),
      );
      if (fuzzy.length === 0) {
        return err(
          `No fault code matching "${code}" was found for generation ${scope.generation}.`,
        );
      }
      return scopedJson(scope, fuzzy);
    },
  );

  server.registerTool(
    'get_spec',
    {
      title: 'Get a specification',
      description:
        'Look up a curated DIY spec for ONE car generation — ~35 verified torque entries plus ' +
        'fluids, capacities, tyre pressures, etc. Does NOT search the full workshop manual; ' +
        'if nothing matches, call search_workshop_manual for factory torque/procedure text. ' +
        'Pass vehicleId/generation when the garage has multiple models — 981 and 987 specs differ.',
      inputSchema: {
        query: z.string().min(1).describe('What spec you need, e.g. "wheel bolt torque"'),
        category: z.string().optional().describe('Optional category filter, e.g. "torque"'),
        generation: GENERATION_ARG,
        vehicleId: VEHICLE_ID_ARG,
      },
    },
    async ({ query, category, generation, vehicleId }, extra) => {
      const scope = await resolveKnowledgeScope(generation, vehicleId, extra.authInfo?.token);
      const q = query.trim().toLowerCase();
      const cat = category?.trim().toLowerCase();
      const specs = getSpecs(scope.generation).filter((s) => {
        const inCat = !cat || s.category?.toLowerCase() === cat;
        const text = [s.name, s.value, s.category, s.notes, ...(s.appliesTo ?? [])]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return inCat && text.includes(q);
      });
      if (specs.length === 0) {
        return err(
          `No curated spec matching "${query}" was found for generation ${scope.generation}. ` +
            `get_spec covers verified DIY shortcuts only — not the full workshop manual. ` +
            `Call search_workshop_manual with the same query (generation: "${scope.generation}") ` +
            `then get_manual_procedure on the best section id before quoting torque values or steps.`,
        );
      }
      return scopedJson(scope, specs);
    },
  );

  server.registerTool(
    'get_maintenance_schedule',
    {
      title: 'Get the maintenance schedule',
      description:
        'List recommended maintenance items for ONE car generation, optionally filtered by system ' +
        'or mileage. Pass vehicleId/generation when the garage has multiple models.',
      inputSchema: {
        system: z.string().optional().describe('Filter by system, e.g. "Engine"'),
        dueByMiles: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe('Only items due at or before this mileage'),
        generation: GENERATION_ARG,
        vehicleId: VEHICLE_ID_ARG,
      },
    },
    async ({ system, dueByMiles, generation, vehicleId }, extra) => {
      const scope = await resolveKnowledgeScope(generation, vehicleId, extra.authInfo?.token);
      const sys = system?.trim().toLowerCase();
      const items = getMaintenance(scope.generation).filter((m) => {
        const bySystem = !sys || m.system?.toLowerCase() === sys;
        const byMiles =
          dueByMiles == null ||
          typeof m.intervalMiles !== 'number' ||
          m.intervalMiles <= dueByMiles;
        return bySystem && byMiles;
      });
      return scopedJson(scope, items);
    },
  );

  server.registerTool(
    'list_known_issues',
    {
      title: 'List known issues',
      description:
        'List documented common problems / weak points for ONE car generation. ' +
        'Pass vehicleId/generation when the garage has multiple models — 981 and 987 issues differ.',
      inputSchema: {
        system: z.string().optional().describe('Filter by system, e.g. "Cooling"'),
        generation: GENERATION_ARG,
        vehicleId: VEHICLE_ID_ARG,
      },
    },
    async ({ system, generation, vehicleId }, extra) => {
      const scope = await resolveKnowledgeScope(generation, vehicleId, extra.authInfo?.token);
      const sys = system?.trim().toLowerCase();
      const issues = getKnownIssues(scope.generation).filter(
        (i) => !sys || i.system?.toLowerCase() === sys,
      );
      return scopedJson(scope, issues);
    },
  );

  server.registerTool(
    'find_part',
    {
      title: 'Find an OEM part',
      description:
        'Search the full Porsche OEM parts catalog by part number or keyword, ' +
        'plus the curated catalog (torque/notes) and knowledge base. Returns part numbers, ' +
        'descriptions and the assembly system. Scoped to ONE car generation — pass vehicleId/' +
        'generation when the garage has multiple models.',
      inputSchema: {
        query: z.string().min(1).describe('Part name or number, e.g. "oil filter", "9A1 105", "981.351"'),
        generation: GENERATION_ARG,
        vehicleId: VEHICLE_ID_ARG,
      },
    },
    async ({ query, generation, vehicleId }, extra) => {
      const scope = await resolveKnowledgeScope(generation, vehicleId, extra.authInfo?.token);
      const gen = scope.generation;
      // 1) Full PET parts catalog in Supabase (part-number + full-text search).
      //    Falls back gracefully if env/table is absent.
      let parts: unknown[] = [];
      const pub = publicClient();
      if (pub) {
        const { data, error } = await pub.rpc('search_parts', { q: query, lim: 15, gen });
        if (!error && Array.isArray(data)) {
          parts = data.map((r: any) => ({
            partNumber: r.part_number,
            description: r.description,
            system: r.system,
            models: r.models,
          }));
        }
      }
      // 2) Curated catalog (adds torque/notes the PET catalog lacks).
      const fromCatalog = searchCatalog(query, 10, gen).map((p) => ({
        ...p,
        partNumber: p.partNumber,
        partNumberFormatted: formatPartNumber(p.partNumber),
      }));
      // 3) Parts mentioned in the knowledge base (specs/articles).
      const fromKnowledge = searchKnowledge(query, { limit: 5, kinds: ['spec', 'article'], generation: gen });
      if (parts.length === 0 && fromCatalog.length === 0 && fromKnowledge.length === 0) {
        return err(`No part matching "${query}" was found for generation ${gen}.`);
      }
      return scopedJson(scope, { parts, catalog: fromCatalog, knowledge: fromKnowledge });
    },
  );

  server.registerTool(
    'search_workshop_manual',
    {
      title: 'Search workshop manuals & tech library',
      description:
        'Hybrid semantic + full-text search over factory reference docs for ONE generation: workshop ' +
        'manuals plus curated Mobile Tech Library diagnostics, Service Information Technik, and training ' +
        'books. Results are scoped to the active car (981 or 987) — never mixed across generations. ' +
        'Pass vehicleId/generation when the user has multiple cars. Prefer natural-language procedure ' +
        'queries ("bleed cooling system", "PDK clutch adaptation") as well as WM codes / DTCs. ' +
        'Returns ranked sections with codes/snippets — fetch full text with get_manual_procedure. ' +
        'Requires your garage login (licensed content, not public).',
      inputSchema: {
        query: z.string().min(2).describe('e.g. "bleeding the cooling system", "P0562 PDK", "WM 197019"'),
        limit: z.number().int().min(1).max(20).optional().describe('Max sections (default 8)'),
        generation: GENERATION_ARG,
        vehicleId: VEHICLE_ID_ARG,
      },
    },
    async ({ query, limit, generation, vehicleId }, extra) => {
      const user = await resolveUser(extra.authInfo?.token);
      if (!user) return err(AUTH_REQUIRED_MESSAGE);
      const scope = await resolveKnowledgeScope(generation, vehicleId, extra.authInfo?.token);
      const lim = limit ?? 8;

      // Prefer hybrid (semantic + keyword, RRF-fused) when Voyage is configured
      // and the embeddings have been backfilled; fall back to plain full-text on
      // any error (missing key, migration not applied, transient failure).
      let data: unknown = null;
      let error: { message: string } | null = null;
      if (voyageConfigured()) {
        try {
          const emb = await embedQuery(query);
          const r = await user.supabase.rpc('search_manual_hybrid', {
            q: query,
            query_embedding: toVectorLiteral(emb),
            lim,
            gen: scope.generation,
            src: null,
          });
          if (!r.error && Array.isArray(r.data)) data = r.data;
        } catch {
          // fall through to full-text
        }
      }
      if (data === null) {
        const r = await user.supabase.rpc('search_manual', {
          q: query,
          lim,
          gen: scope.generation,
          src: null,
        });
        data = r.data;
        error = r.error;
      }
      if (error) return err(`Manual search failed: ${error.message}`);
      if (!Array.isArray(data) || data.length === 0) {
        return err(
          `No manual/tech-library section matches "${query}" for generation ${scope.generation}. ` +
            `Import with npm run db:import-manual / db:import-mtl.`,
        );
      }
      const canViewDocs = await userHasDocumentsAccess(user.supabase, user.userId);
      return scopedJson(
        scope,
        (data as any[]).map((r) => {
          const hit = {
            source: r.source,
            generation: r.generation,
            title: r.title as string,
            docId: r.doc_id,
            page: r.page as number,
          };
          return {
            id: r.id,
            wmCode: r.wm_code,
            group: r.group_label,
            title: r.title,
            subsection: r.subsection,
            models: r.models,
            sourcePage: r.page,
            source: r.source,
            generation: r.generation,
            docId: r.doc_id,
            viewerUrl: canViewDocs ? manualHitHref(hit) : null,
            snippet: (r.snippet ?? '').replace(/<\/?b>/g, '**'),
          };
        }),
      );
    },
  );

  server.registerTool(
    'get_manual_procedure',
    {
      title: 'Get a workshop-manual procedure',
      description:
        'Fetch the full text of one workshop-manual section by the id returned from search_workshop_manual ' +
        '(complete steps, torque values, warnings, figure captions). Requires your garage login.',
      inputSchema: {
        id: z.string().min(1).describe('Section id from search_workshop_manual'),
      },
    },
    async ({ id }, extra) => {
      const user = await resolveUser(extra.authInfo?.token);
      if (!user) return err(AUTH_REQUIRED_MESSAGE);
      const { data, error } = await user.supabase
        .from('manual_sections')
        .select('id, wm_code, group_label, title, subsection, models, page, content, source, generation, doc_id')
        .eq('id', id)
        .maybeSingle();
      if (error) return err(`Lookup failed: ${error.message}`);
      if (!data) return err(`No manual section with id "${id}".`);
      const hit = {
        source: data.source,
        generation: data.generation,
        title: data.title as string,
        docId: data.doc_id,
        page: data.page as number,
      };
      const canViewDocs = await userHasDocumentsAccess(user.supabase, user.userId);
      return json({
        id: data.id,
        wmCode: data.wm_code,
        group: data.group_label,
        title: data.title,
        subsection: data.subsection,
        models: data.models,
        sourcePage: data.page,
        source: data.source,
        generation: data.generation,
        docId: data.doc_id,
        viewerUrl: canViewDocs ? manualHitHref(hit) : null,
        content: data.content,
      });
    },
  );

  // ---------------------------------------------------------------------------
  // Fitment tools — no auth required (static presets + pure computation).
  // Mirror the in-app Tools tab (lib/fitment/*).
  // ---------------------------------------------------------------------------

  server.registerTool(
    'get_wheel_fitment',
    {
      title: 'Get OEM wheel & tyre fitment',
      description:
        'OEM wheel/tyre fitment presets (rim width J, diameter, offset ET, tyre size) for ONE car ' +
        'generation, plus bolt pattern (PCD), centre bore and wheel-bolt torque. Pass vehicleId/' +
        'generation when the garage has multiple models.',
      inputSchema: { generation: GENERATION_ARG, vehicleId: VEHICLE_ID_ARG },
    },
    async ({ generation, vehicleId }, extra) => {
      const scope = await resolveKnowledgeScope(generation, vehicleId, extra.authInfo?.token);
      const presets = presetsForGeneration(scope.generation);
      if (!presets.length) return err(`No wheel-fitment data for generation ${scope.generation}.`);
      return scopedJson(scope, {
        pcd: PCD,
        centerBoreMm: CENTER_BORE_MM,
        wheelBoltTorque: WHEEL_BOLT_TORQUE[scope.generation as '981' | '987'],
        presets,
      });
    },
  );

  server.registerTool(
    'check_tyre_fit',
    {
      title: 'Check if a wheel/tyre will fit',
      description:
        'Native "will it fit" check: given a rim (width J, diameter, offset ET) and tyre ' +
        '(section width, aspect), returns whether the tyre suits the rim, plus rolling-diameter ' +
        'change, speedo error and poke/clearance vs the OEM fitment for the chosen axle. ' +
        'Pass vehicleId/generation when the garage has multiple models.',
      inputSchema: {
        rimWidth: z.number().describe('Rim width, J (inches), e.g. 9.5'),
        rimDiameter: z.number().describe('Rim diameter, inches, e.g. 19'),
        offsetEt: z.number().describe('Offset ET, mm, e.g. 45'),
        tyreWidth: z.number().int().describe('Tyre section width, mm, e.g. 265'),
        tyreAspect: z.number().int().describe('Tyre aspect ratio, %, e.g. 40'),
        axle: z.enum(['front', 'rear']).optional().describe('OEM axle fitment to compare against (default rear)'),
        presetId: z.string().optional().describe('OEM preset id from get_wheel_fitment (defaults to the generation default)'),
        generation: GENERATION_ARG,
        vehicleId: VEHICLE_ID_ARG,
      },
    },
    async ({ rimWidth, rimDiameter, offsetEt, tyreWidth, tyreAspect, axle, presetId, generation, vehicleId }, extra) => {
      const scope = await resolveKnowledgeScope(generation, vehicleId, extra.authInfo?.token);
      const presets = presetsForGeneration(scope.generation);
      const preset = (presetId ? getPreset(presetId) : undefined) ?? presets[0] ?? null;
      const which = axle ?? 'rear';
      const oem = preset ? (which === 'front' ? preset.front : preset.rear) : null;
      const report = willItFit(
        { rimWidth, rimDiameter, offsetEt, tire: { width: tyreWidth, aspect: tyreAspect } },
        oem,
      );
      return scopedJson(scope, {
        comparedTo: preset ? { id: preset.id, label: preset.label, axle: which } : null,
        report,
      });
    },
  );

  server.registerTool(
    'get_alignment_specs',
    {
      title: 'Get wheel-alignment specs',
      description:
        'Factory/reference wheel-alignment values (camber, toe, caster ranges in decimal degrees) ' +
        'for ONE car generation, with a `verified` flag: 987 = workshop-manual verified; 981 = ' +
        'unconfirmed placeholder (see repo issue #7). For DIY spec-checking against a Hunter/string ' +
        'alignment. Pass vehicleId/generation when the garage has multiple models.',
      inputSchema: { generation: GENERATION_ARG, vehicleId: VEHICLE_ID_ARG },
    },
    async ({ generation, vehicleId }, extra) => {
      const scope = await resolveKnowledgeScope(generation, vehicleId, extra.authInfo?.token);
      const data = alignmentForGeneration(scope.generation);
      if (!data) return err(`No alignment data for generation ${scope.generation}.`);
      return scopedJson(scope, data);
    },
  );

  // ---------------------------------------------------------------------------
  // Garage tools — require a valid Supabase Bearer token (RLS-scoped).
  // ---------------------------------------------------------------------------

  server.registerTool(
    'get_my_vehicles',
    {
      title: 'Get my vehicles',
      description:
        'List every vehicle in the garage with id, generation (981/987/…), model, year, and ' +
        'which one is primary. Call this FIRST when the user has (or might have) multiple cars, ' +
        'then pass the matching vehicleId (or generation) into knowledge/manual/garage tools so ' +
        'answers stay model-specific. Requires authentication.',
      inputSchema: {},
    },
    async (_args, extra) => {
      const user = await resolveUser(extra.authInfo?.token);
      if (!user) return err(AUTH_REQUIRED_MESSAGE);
      const vehicles = await listGarageVehicles(extra.authInfo!.token!);
      const gens = Array.from(new Set(vehicles.map((v) => v.generation)));
      return json({
        vehicles: vehicles.map((v) => ({
          id: v.id,
          body: v.body,
          model: v.model,
          year: v.year,
          generation: v.generation,
          isPrimary: !!v.is_primary,
          label: formatVehicleLabel(v),
        })),
        generationsInGarage: gens,
        vehicleCount: vehicles.length,
        note:
          vehicles.length > 1
            ? 'Multiple vehicles in this garage. Service history and plans are per vehicle — ' +
              'always pass vehicleId on get_service_history / log_service_record / get_service_plans / ' +
              'create_service_plan. Also pass vehicleId (or generation) on knowledge/manual tools when ' +
              'generations differ.'
            : gens.length === 1
              ? `Single vehicle, generation ${gens[0]}.`
              : 'No vehicles yet.',
      });
    },
  );

  server.registerTool(
    'get_service_history',
    {
      title: 'Get service history',
      description:
        'List service records for ONE vehicle (history is never shared across cars). ' +
        'Pass vehicleId when the garage has multiple vehicles — call get_my_vehicles first. ' +
        'Requires authentication.',
      inputSchema: {
        vehicleId: z
          .string()
          .uuid()
          .optional()
          .describe('Vehicle id from get_my_vehicles. Required when the garage has multiple cars.'),
      },
    },
    async ({ vehicleId }, extra) => {
      const user = await resolveUser(extra.authInfo?.token);
      if (!user) return err(AUTH_REQUIRED_MESSAGE);

      const resolved = await resolveGarageVehicle(extra.authInfo!.token!, vehicleId);
      if (!resolved.ok) return err(resolved.message);

      const { data, error } = await user.supabase
        .from('service_records')
        .select('*')
        .eq('vehicle_id', resolved.vehicle.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) return err(`Could not load service history: ${error.message}`);
      return garageScopedJson(resolved.vehicle, resolved.ambiguous, resolved.garageCount, {
        records: data,
      });
    },
  );

  server.registerTool(
    'log_service_record',
    {
      title: 'Log a service record',
      description:
        'Add a maintenance/service record to ONE vehicle (never shared across cars). Items are ' +
        'flexible line items — each with a name and optional description, OEM part number and ' +
        'per-item cost. Plain strings are accepted too (treated as item names). Pass vehicleId ' +
        'when the garage has multiple vehicles. Requires authentication.',
      inputSchema: {
        vehicleId: z
          .string()
          .uuid()
          .optional()
          .describe('Vehicle id from get_my_vehicles. Required when the garage has multiple cars.'),
        date: z.string().describe('Service date, YYYY-MM-DD'),
        mileage: z.number().int().min(0).describe('Odometer reading at service'),
        title: z.string().min(1).describe('Short title, e.g. "Annual Oil Service"'),
        system: z.string().optional().describe('System, e.g. "Engine"'),
        diy: z.boolean().optional().describe('Done yourself? (default true)'),
        cost: z.string().optional().describe('Total cost, free-form e.g. "$240"'),
        notes: z.string().optional().describe('Free-text note covering the whole visit'),
        items: z
          .array(SERVICE_ITEM_SCHEMA)
          .optional()
          .describe('Work performed — line items (name + optional description/partNumber/cost), or plain strings'),
      },
    },
    async ({ vehicleId, date, mileage, title, system, diy, cost, notes, items }, extra) => {
      const user = await resolveUser(extra.authInfo?.token);
      if (!user) return err(AUTH_REQUIRED_MESSAGE);

      const resolved = await resolveGarageVehicle(extra.authInfo!.token!, vehicleId);
      if (!resolved.ok) return err(resolved.message);

      // Columns mirror lib/db/service-records.ts addRecord() and the
      // service_records schema in supabase/migrations/0001_init.sql.
      const { data, error } = await user.supabase
        .from('service_records')
        .insert({
          vehicle_id: resolved.vehicle.id,
          user_id: user.userId,
          date,
          mileage: mileage || null,
          title,
          system: system || null,
          diy: diy ?? true,
          cost: cost || null,
          notes: notes || null,
          items: normalizeServiceItems(items),
        })
        .select('*')
        .single();
      if (error) return err(`Could not save service record: ${error.message}`);
      return garageScopedJson(resolved.vehicle, resolved.ambiguous, resolved.garageCount, data);
    },
  );

  server.registerTool(
    'get_obd_scan',
    {
      title: 'Get the latest saved OBD scan',
      description:
        'Read the most recent OBD scan the owner saved from Live OBD for ONE vehicle (scans are ' +
        'never shared across cars). Returns the fault list with every DTC cross-referenced to its ' +
        "knowledge-base entry (title, system, severity, likely causes, diagnosis) for the car's " +
        'generation, plus a live-data and module-scan summary. This server cannot read the car ' +
        'directly — the owner must connect and save a scan in Live OBD first. Pass vehicleId when ' +
        'the garage has multiple vehicles. Requires authentication.',
      inputSchema: {
        vehicleId: z
          .string()
          .uuid()
          .optional()
          .describe('Vehicle id from get_my_vehicles. Required when the garage has multiple cars.'),
      },
    },
    async ({ vehicleId }, extra) => {
      const user = await resolveUser(extra.authInfo?.token);
      if (!user) return err(AUTH_REQUIRED_MESSAGE);

      const resolved = await resolveGarageVehicle(extra.authInfo!.token!, vehicleId);
      if (!resolved.ok) return err(resolved.message);

      // Latest saved snapshot for this car (RLS scopes to the token's user).
      const { data, error } = await user.supabase
        .from('obd_scans')
        .select('*')
        .eq('vehicle_id', resolved.vehicle.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return err(`Could not load saved OBD scan: ${error.message}`);
      if (!data) {
        return garageScopedJson(resolved.vehicle, resolved.ambiguous, resolved.garageCount, {
          scan: null,
          message:
            `No saved OBD scan yet for ${formatVehicleLabel(resolved.vehicle)}. Open Live OBD (/obd), ` +
            'connect to the car, read faults / live data, then tap "Save scan" to store a snapshot ' +
            'the AI can read here.',
        });
      }

      // Cross-reference DTCs against the scan's OWN stored generation when
      // present, else the vehicle's — never mix 981 and 987 fault tables.
      const gen = (data.generation as string) || resolved.vehicle.generation;
      return garageScopedJson(resolved.vehicle, resolved.ambiguous, resolved.garageCount, {
        scan: summarizeObdScan(data as ObdScanRowLoose, gen),
      });
    },
  );

  // ---------------------------------------------------------------------------
  // Service plans — plan upcoming work, gather parts + how-to links.
  // ---------------------------------------------------------------------------

  server.registerTool(
    'get_service_plans',
    {
      title: 'Get service plans',
      description:
        'List planned/upcoming service plans for ONE vehicle (plans are never shared across cars). ' +
        'Pass vehicleId when the garage has multiple vehicles — call get_my_vehicles first. ' +
        'Requires authentication.',
      inputSchema: {
        vehicleId: z
          .string()
          .uuid()
          .optional()
          .describe('Vehicle id from get_my_vehicles. Required when the garage has multiple cars.'),
      },
    },
    async ({ vehicleId }, extra) => {
      const user = await resolveUser(extra.authInfo?.token);
      if (!user) return err(AUTH_REQUIRED_MESSAGE);

      const resolved = await resolveGarageVehicle(extra.authInfo!.token!, vehicleId);
      if (!resolved.ok) return err(resolved.message);

      const { data, error } = await user.supabase
        .from('service_plans')
        .select('*')
        .eq('vehicle_id', resolved.vehicle.id)
        .order('created_at', { ascending: false });
      if (error) return err(`Could not load service plans: ${error.message}`);
      return garageScopedJson(resolved.vehicle, resolved.ambiguous, resolved.garageCount, {
        plans: data,
      });
    },
  );

  server.registerTool(
    'create_service_plan',
    {
      title: 'Create a service plan',
      description:
        'Plan an upcoming service on ONE vehicle (plans are never shared across cars). Add flexible ' +
        'items, each with optional description, part number and reference links. Pass vehicleId when ' +
        'the garage has multiple vehicles. Requires authentication.',
      inputSchema: {
        vehicleId: z
          .string()
          .uuid()
          .optional()
          .describe('Vehicle id from get_my_vehicles. Required when the garage has multiple cars.'),
        title: z.string().min(1).describe('Plan title, e.g. "Spring major service"'),
        status: PLAN_STATUS_SCHEMA.optional().describe('planning | ordered | scheduled | done (default planning)'),
        targetDate: z.string().optional().describe('Intended service date, YYYY-MM-DD'),
        targetMileage: z.number().int().min(0).optional().describe('Target odometer reading'),
        notes: z.string().optional().describe('Overall goal / budget note'),
        items: z.array(PLAN_ITEM_SCHEMA).optional().describe('Planned items with parts and reference links'),
      },
    },
    async ({ vehicleId, title, status, targetDate, targetMileage, notes, items }, extra) => {
      const user = await resolveUser(extra.authInfo?.token);
      if (!user) return err(AUTH_REQUIRED_MESSAGE);

      const resolved = await resolveGarageVehicle(extra.authInfo!.token!, vehicleId);
      if (!resolved.ok) return err(resolved.message);

      const { data, error } = await user.supabase
        .from('service_plans')
        .insert({
          vehicle_id: resolved.vehicle.id,
          user_id: user.userId,
          title,
          status: status ?? 'planning',
          target_date: targetDate || null,
          target_mileage: targetMileage || null,
          notes: notes || null,
          items: normalizePlanItems(items),
        })
        .select('*')
        .single();
      if (error) return err(`Could not create service plan: ${error.message}`);
      return garageScopedJson(resolved.vehicle, resolved.ambiguous, resolved.garageCount, data);
    },
  );

  server.registerTool(
    'update_service_plan',
    {
      title: 'Update a service plan',
      description:
        'Update a service plan by id. Only the fields you pass are changed; passing `items` ' +
        'replaces the whole item list. Requires authentication.',
      inputSchema: {
        planId: z.string().uuid().describe('Service plan id (from get_service_plans)'),
        title: z.string().min(1).optional().describe('New title'),
        status: PLAN_STATUS_SCHEMA.optional().describe('planning | ordered | scheduled | done'),
        targetDate: z.string().nullable().optional().describe('Intended date YYYY-MM-DD, or null to clear'),
        targetMileage: z.number().int().min(0).nullable().optional().describe('Target odometer, or null to clear'),
        notes: z.string().nullable().optional().describe('Note, or null to clear'),
        items: z.array(PLAN_ITEM_SCHEMA).optional().describe('Replacement item list'),
      },
    },
    async ({ planId, title, status, targetDate, targetMileage, notes, items }, extra) => {
      const user = await resolveUser(extra.authInfo?.token);
      if (!user) return err(AUTH_REQUIRED_MESSAGE);

      const patch: Record<string, unknown> = {};
      if (title !== undefined) patch.title = title;
      if (status !== undefined) patch.status = status;
      if (targetDate !== undefined) patch.target_date = targetDate || null;
      if (targetMileage !== undefined) patch.target_mileage = targetMileage ?? null;
      if (notes !== undefined) patch.notes = notes || null;
      if (items !== undefined) patch.items = normalizePlanItems(items);
      if (Object.keys(patch).length === 0) return err('Nothing to update — pass at least one field.');

      const { data, error } = await user.supabase
        .from('service_plans')
        .update(patch)
        .eq('id', planId)
        .select('*')
        .single();
      if (error) return err(`Could not update service plan: ${error.message}`);
      if (!data) return err('No plan with that id in your garage.');
      return json(data);
    },
  );

  server.registerTool(
    'delete_service_plan',
    {
      title: 'Delete a service plan',
      description: 'Delete a service plan by id. Requires authentication.',
      inputSchema: {
        planId: z.string().uuid().describe('Service plan id (from get_service_plans)'),
      },
    },
    async ({ planId }, extra) => {
      const user = await resolveUser(extra.authInfo?.token);
      if (!user) return err(AUTH_REQUIRED_MESSAGE);

      const { error } = await user.supabase.from('service_plans').delete().eq('id', planId);
      if (error) return err(`Could not delete service plan: ${error.message}`);
      return json({ deleted: planId });
    },
  );
}

// ---------------------------------------------------------------------------
// Shared input schemas + normalisers for flexible items (records + plans).
// These mirror the shapes in lib/types.ts and the jsonb stored by the data layer.
// ---------------------------------------------------------------------------

/** A service-record line item, or a plain string (treated as the item name). */
const SERVICE_ITEM_SCHEMA = z.union([
  z.string(),
  z.object({
    name: z.string().min(1).describe('Item name, e.g. "Engine oil & filter"'),
    description: z.string().optional().describe('What was actually done'),
    partNumber: z.string().optional().describe('OEM / aftermarket part number fitted'),
    cost: z.string().optional().describe('Per-item cost, free-form'),
  }),
]);

const PLAN_STATUS_SCHEMA = z.enum(['planning', 'ordered', 'scheduled', 'done']);

/** A plan item with optional reference links. */
const PLAN_ITEM_SCHEMA = z.object({
  name: z.string().min(1).describe('Item name, e.g. "Spark plugs"'),
  description: z.string().optional().describe("What's involved / why it's planned"),
  partNumber: z.string().optional().describe('OEM / aftermarket part number being sourced'),
  links: z
    .array(
      z.object({
        label: z.string().optional().describe('Link label, e.g. "FCP how-to" (defaults to the URL)'),
        url: z.string().describe('URL of a how-to guide, part listing or video'),
      }),
    )
    .optional()
    .describe('Reference links to review when doing the work'),
  done: z.boolean().optional().describe('Already done? (default false)'),
});

type ServiceItemInput = z.infer<typeof SERVICE_ITEM_SCHEMA>;
type PlanItemInput = z.infer<typeof PLAN_ITEM_SCHEMA>;

/** Coerce record items into the stored {name, description?, partNumber?, cost?} shape. */
function normalizeServiceItems(items: ServiceItemInput[] | undefined) {
  return (items ?? [])
    .map((it) => (typeof it === 'string' ? { name: it.trim() } : { ...it, name: it.name.trim() }))
    .filter((it) => it.name.length > 0);
}

// ---------------------------------------------------------------------------
// Saved OBD scan → AI summary (get_obd_scan). Cross-references every DTC against
// the generation's fault-code knowledge and condenses the live / module-scan
// blobs. Raw jsonb shapes mirror lib/obd/types.ts.
// ---------------------------------------------------------------------------

/** A public.obd_scans row as returned by select('*') (snake_case, jsonb blobs). */
type ObdScanRowLoose = {
  id: string;
  created_at: string;
  generation: string | null;
  faults: unknown;
  live: unknown;
  mode06: unknown;
  module_scan: unknown;
};

/** Resolve one DTC to its knowledge-base entry (or flag it unknown to the KB). */
function describeDtc(byCode: Map<string, FaultCode>, code: string) {
  const f = byCode.get(code.toUpperCase());
  if (!f) return { code, knownToKb: false as const };
  return {
    code,
    knownToKb: true as const,
    title: f.title,
    system: f.system,
    severity: f.severity,
    description: f.description,
    causes: f.causes,
    diagnosis: f.diagnosis,
  };
}

/** Build the get_obd_scan payload: cross-referenced faults + live/module summaries. */
function summarizeObdScan(row: ObdScanRowLoose, generation: string) {
  const byCode = new Map<string, FaultCode>();
  for (const f of getFaultCodes(generation)) byCode.set(f.code.toUpperCase(), f);
  const describe = (code: string) => describeDtc(byCode, code);

  const faults = (row.faults ?? null) as FaultsData | null;
  const faultModules = (faults?.modules ?? []).map((m) => ({
    module: m.name,
    id: m.id,
    available: m.available,
    mil: m.readiness?.mil ?? null,
    confirmed: m.confirmed.map(describe),
    pending: m.pending.map(describe),
    permanent: m.permanent.map(describe),
  }));
  const dtcCount = faultModules.reduce(
    (n, m) => n + m.confirmed.length + m.pending.length + m.permanent.length,
    0,
  );

  const live = (row.live ?? null) as LiveData | null;
  const liveSummary = live
    ? {
        at: live.at,
        protocol: live.protocol,
        adapter: live.adapter,
        readiness: live.readiness,
        values: live.values,
        errorCount: live.errors?.length ?? 0,
      }
    : null;

  const mode06 = (row.mode06 ?? null) as Mode06Data | null;
  const mode06Summary = mode06
    ? {
        at: mode06.at,
        testCount: mode06.tests.length,
        failed: mode06.tests.filter((t) => t.result === 'fail'),
      }
    : null;

  const moduleScan = (row.module_scan ?? null) as ModuleScanData | null;
  const moduleScanSummary = moduleScan
    ? {
        at: moduleScan.at,
        generation: moduleScan.generation,
        note: moduleScan.note,
        modulesProbed: moduleScan.results.length,
        reachable: moduleScan.results.filter((r) => r.reachable === 'positive').map((r) => r.name),
        modulesWithFaults: moduleScan.results
          .filter((r) => r.confirmedDtcs.length > 0 || r.pendingDtcs.length > 0)
          .map((r) => ({
            module: r.name,
            reachable: r.reachable,
            confirmed: r.confirmedDtcs.map(describe),
            pending: r.pendingDtcs.map(describe),
          })),
      }
    : null;

  return {
    scanId: row.id,
    savedAt: row.created_at,
    generation,
    faults: { at: faults?.at ?? null, dtcCount, modules: faultModules },
    live: liveSummary,
    mode06: mode06Summary,
    moduleScan: moduleScanSummary,
  };
}

/** Coerce plan items into the stored shape, generating stable ids + cleaning links. */
function normalizePlanItems(items: PlanItemInput[] | undefined) {
  return (items ?? [])
    .filter((it) => it.name.trim().length > 0)
    .map((it, i) => {
      const links = (it.links ?? [])
        .map((l) => ({ label: (l.label ?? '').trim(), url: l.url.trim() }))
        .filter((l) => l.url.length > 0)
        .map((l) => ({ label: l.label || l.url, url: l.url }));
      return {
        // Stable-ish id so the UI can edit rows the agent created.
        id: `item-${Date.now().toString(36)}-${i}`,
        name: it.name.trim(),
        description: it.description?.trim() || undefined,
        partNumber: it.partNumber?.trim() || undefined,
        links: links.length ? links : undefined,
        done: it.done ?? false,
      };
    });
}
