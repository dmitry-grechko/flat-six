import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  getFaultCodes,
  getSpecs,
  getMaintenance,
  getKnownIssues,
  searchKnowledge,
  DEFAULT_GENERATION,
} from '@/lib/knowledge';
import { searchCatalog, formatPartNumber } from '@/lib/catalog';
import { GENERATIONS, generationForBody } from '@/lib/models';
import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveUser, AUTH_REQUIRED_MESSAGE, publicClient } from './auth';
import { manualHitHref } from '@/lib/documents';

/** Optional generation arg shared by the knowledge tools. */
const GENERATION_ARG = z
  .string()
  .optional()
  .describe(`Car generation, e.g. ${GENERATIONS.map((g) => `"${g}"`).join(' / ')}. Defaults to your garage vehicle, else ${DEFAULT_GENERATION}.`);

/**
 * Resolve which generation a knowledge/catalog lookup should use:
 * explicit arg (if a known generation) → the caller's primary vehicle (if
 * authenticated) → the default (981).
 */
async function resolveGeneration(explicit: string | undefined, token: string | undefined): Promise<string> {
  if (explicit && GENERATIONS.includes(explicit)) return explicit;
  if (token) {
    const user = await resolveUser(token);
    if (user) {
      const { data } = await user.supabase
        .from('vehicles')
        .select('body, is_primary, created_at')
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1);
      const body = (data as { body: string }[] | null)?.[0]?.body;
      if (body) return generationForBody(body);
    }
  }
  return DEFAULT_GENERATION;
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
        'Scoped to the car generation (defaults to your garage vehicle).',
      inputSchema: {
        query: z.string().min(1).describe('What to search for, e.g. "AOS failure symptoms"'),
        limit: z.number().int().min(1).max(25).optional().describe('Max results (default 8)'),
        generation: GENERATION_ARG,
      },
    },
    async ({ query, limit, generation }, extra) => {
      const gen = await resolveGeneration(generation, extra.authInfo?.token);
      return json(searchKnowledge(query, { limit: limit ?? 8, generation: gen }));
    },
  );

  server.registerTool(
    'lookup_fault_code',
    {
      title: 'Look up a fault / OBD code',
      description: 'Resolve a fault or OBD-II code (e.g. P0011) to its meaning, causes and fixes.',
      inputSchema: {
        code: z.string().min(1).describe('The fault code, e.g. "P0011" (case-insensitive)'),
        generation: GENERATION_ARG,
      },
    },
    async ({ code, generation }, extra) => {
      const gen = await resolveGeneration(generation, extra.authInfo?.token);
      const needle = code.trim().toLowerCase();
      const faults = getFaultCodes(gen);
      const exact = faults.find((f) => f.code?.toLowerCase() === needle);
      if (exact) return json(exact);
      const fuzzy = faults.filter(
        (f) =>
          f.code?.toLowerCase().includes(needle) ||
          f.title?.toLowerCase().includes(needle) ||
          f.description?.toLowerCase().includes(needle),
      );
      if (fuzzy.length === 0) return err(`No fault code matching "${code}" was found.`);
      return json(fuzzy);
    },
  );

  server.registerTool(
    'get_spec',
    {
      title: 'Get a specification',
      description: 'Look up a torque value, capacity, fluid grade or other spec for the car generation.',
      inputSchema: {
        query: z.string().min(1).describe('What spec you need, e.g. "wheel bolt torque"'),
        category: z.string().optional().describe('Optional category filter, e.g. "torque"'),
        generation: GENERATION_ARG,
      },
    },
    async ({ query, category, generation }, extra) => {
      const gen = await resolveGeneration(generation, extra.authInfo?.token);
      const q = query.trim().toLowerCase();
      const cat = category?.trim().toLowerCase();
      const specs = getSpecs(gen).filter((s) => {
        const inCat = !cat || s.category?.toLowerCase() === cat;
        const text = [s.name, s.value, s.category, s.notes, ...(s.appliesTo ?? [])]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return inCat && text.includes(q);
      });
      if (specs.length === 0) return err(`No spec matching "${query}" was found.`);
      return json(specs);
    },
  );

  server.registerTool(
    'get_maintenance_schedule',
    {
      title: 'Get the maintenance schedule',
      description: 'List recommended maintenance items, optionally filtered by system or mileage.',
      inputSchema: {
        system: z.string().optional().describe('Filter by system, e.g. "Engine"'),
        dueByMiles: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe('Only items due at or before this mileage'),
        generation: GENERATION_ARG,
      },
    },
    async ({ system, dueByMiles, generation }, extra) => {
      const gen = await resolveGeneration(generation, extra.authInfo?.token);
      const sys = system?.trim().toLowerCase();
      const items = getMaintenance(gen).filter((m) => {
        const bySystem = !sys || m.system?.toLowerCase() === sys;
        const byMiles =
          dueByMiles == null ||
          typeof m.intervalMiles !== 'number' ||
          m.intervalMiles <= dueByMiles;
        return bySystem && byMiles;
      });
      return json(items);
    },
  );

  server.registerTool(
    'list_known_issues',
    {
      title: 'List known issues',
      description: 'List documented common problems / weak points for the car generation, optionally filtered by system.',
      inputSchema: {
        system: z.string().optional().describe('Filter by system, e.g. "Cooling"'),
        generation: GENERATION_ARG,
      },
    },
    async ({ system, generation }, extra) => {
      const gen = await resolveGeneration(generation, extra.authInfo?.token);
      const sys = system?.trim().toLowerCase();
      const issues = getKnownIssues(gen).filter((i) => !sys || i.system?.toLowerCase() === sys);
      return json(issues);
    },
  );

  server.registerTool(
    'find_part',
    {
      title: 'Find an OEM part',
      description:
        'Search the full Porsche OEM parts catalog by part number or keyword, ' +
        'plus the curated catalog (torque/notes) and knowledge base. Returns part numbers, ' +
        'descriptions and the assembly system. Scoped to the car generation (defaults to your vehicle).',
      inputSchema: {
        query: z.string().min(1).describe('Part name or number, e.g. "oil filter", "9A1 105", "981.351"'),
        generation: GENERATION_ARG,
      },
    },
    async ({ query, generation }, extra) => {
      const gen = await resolveGeneration(generation, extra.authInfo?.token);
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
        return err(`No part matching "${query}" was found.`);
      }
      return json({ parts, catalog: fromCatalog, knowledge: fromKnowledge });
    },
  );

  server.registerTool(
    'search_workshop_manual',
    {
      title: 'Search workshop manuals & tech library',
      description:
        'Full-text search over factory reference docs: the 981 workshop manual plus Mobile Tech Library ' +
        'diagnostics, Service Information Technik, and training books for 981/987. ' +
        'Returns ranked sections with codes/snippets — fetch full text with get_manual_procedure. ' +
        'Requires your garage login (licensed content, not public).',
      inputSchema: {
        query: z.string().min(2).describe('e.g. "bleeding the cooling system", "P0562 PDK", "WM 197019"'),
        limit: z.number().int().min(1).max(20).optional().describe('Max sections (default 8)'),
        generation: GENERATION_ARG,
      },
    },
    async ({ query, limit, generation }, extra) => {
      const user = await resolveUser(extra.authInfo?.token);
      if (!user) return err(AUTH_REQUIRED_MESSAGE);
      const gen = await resolveGeneration(generation, extra.authInfo?.token);
      const { data, error } = await user.supabase.rpc('search_manual', {
        q: query,
        lim: limit ?? 8,
        gen,
        src: null,
      });
      if (error) return err(`Manual search failed: ${error.message}`);
      if (!Array.isArray(data) || data.length === 0) {
        return err(`No manual/tech-library section matches "${query}". Import with npm run db:import-manual / db:import-mtl.`);
      }
      return json(
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
            viewerUrl: manualHitHref(hit),
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
        viewerUrl: manualHitHref(hit),
        content: data.content,
      });
    },
  );

  // ---------------------------------------------------------------------------
  // Garage tools — require a valid Supabase Bearer token (RLS-scoped).
  // ---------------------------------------------------------------------------

  server.registerTool(
    'get_my_vehicles',
    {
      title: 'Get my vehicles',
      description: 'List the vehicles in your garage. Requires authentication.',
      inputSchema: {},
    },
    async (_args, extra) => {
      const user = await resolveUser(extra.authInfo?.token);
      if (!user) return err(AUTH_REQUIRED_MESSAGE);
      const { data, error } = await user.supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) return err(`Could not load vehicles: ${error.message}`);
      return json(data);
    },
  );

  server.registerTool(
    'get_service_history',
    {
      title: 'Get service history',
      description:
        'List service records for a vehicle. Omit vehicleId to use your primary (or first) vehicle. ' +
        'Requires authentication.',
      inputSchema: {
        vehicleId: z.string().uuid().optional().describe('Vehicle id; defaults to your primary vehicle'),
      },
    },
    async ({ vehicleId }, extra) => {
      const user = await resolveUser(extra.authInfo?.token);
      if (!user) return err(AUTH_REQUIRED_MESSAGE);

      const id = vehicleId ?? (await resolvePrimaryVehicleId(user.supabase));
      if (!id) return err('No vehicle found in your garage. Add one first.');

      const { data, error } = await user.supabase
        .from('service_records')
        .select('*')
        .eq('vehicle_id', id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) return err(`Could not load service history: ${error.message}`);
      return json({ vehicleId: id, records: data });
    },
  );

  server.registerTool(
    'log_service_record',
    {
      title: 'Log a service record',
      description:
        'Add a maintenance/service record to a vehicle. Items are flexible line items — ' +
        'each with a name and optional description, OEM part number and per-item cost. ' +
        'Plain strings are accepted too (treated as item names). Omit vehicleId to use your ' +
        'primary (or first) vehicle. Requires authentication.',
      inputSchema: {
        vehicleId: z.string().uuid().optional().describe('Vehicle id; defaults to your primary vehicle'),
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

      const id = vehicleId ?? (await resolvePrimaryVehicleId(user.supabase));
      if (!id) return err('No vehicle found in your garage. Add one first.');

      // Columns mirror lib/db/service-records.ts addRecord() and the
      // service_records schema in supabase/migrations/0001_init.sql.
      const { data, error } = await user.supabase
        .from('service_records')
        .insert({
          vehicle_id: id,
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
      return json(data);
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
        'List planned/upcoming service plans for a vehicle (the work an owner is gathering parts ' +
        'and how-to links for). Omit vehicleId to use your primary vehicle. Requires authentication.',
      inputSchema: {
        vehicleId: z.string().uuid().optional().describe('Vehicle id; defaults to your primary vehicle'),
      },
    },
    async ({ vehicleId }, extra) => {
      const user = await resolveUser(extra.authInfo?.token);
      if (!user) return err(AUTH_REQUIRED_MESSAGE);

      const id = vehicleId ?? (await resolvePrimaryVehicleId(user.supabase));
      if (!id) return err('No vehicle found in your garage. Add one first.');

      const { data, error } = await user.supabase
        .from('service_plans')
        .select('*')
        .eq('vehicle_id', id)
        .order('created_at', { ascending: false });
      if (error) return err(`Could not load service plans: ${error.message}`);
      return json({ vehicleId: id, plans: data });
    },
  );

  server.registerTool(
    'create_service_plan',
    {
      title: 'Create a service plan',
      description:
        'Plan an upcoming service. Add flexible items, each with optional description, part number ' +
        'and reference links (how-to guides, part listings). Omit vehicleId to use your primary ' +
        'vehicle. Requires authentication.',
      inputSchema: {
        vehicleId: z.string().uuid().optional().describe('Vehicle id; defaults to your primary vehicle'),
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

      const id = vehicleId ?? (await resolvePrimaryVehicleId(user.supabase));
      if (!id) return err('No vehicle found in your garage. Add one first.');

      const { data, error } = await user.supabase
        .from('service_plans')
        .insert({
          vehicle_id: id,
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
      return json(data);
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

/** Resolve the user's primary vehicle id (falls back to their oldest vehicle). */
async function resolvePrimaryVehicleId(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase
    .from('vehicles')
    .select('id, is_primary, created_at')
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1);
  return (data as { id: string }[] | null)?.[0]?.id ?? null;
}
