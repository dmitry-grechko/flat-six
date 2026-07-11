<p align="center">
  <img src="./public/logo.svg" alt="FLAT·SIX" width="360" />
</p>

# FLAT·SIX

A DIY maintenance OS for the **Boxster / Cayman** platform — **987 and 981 today**, with more generations on the way: an interactive component explorer, a generation-scoped knowledge base (fault codes, torque specs, known issues), a personal service log + planner, and an **AI workshop assistant** exposed to Claude over the Model Context Protocol (MCP).

Built as a single Next.js app that deploys for free on **Vercel + Supabase**.

> ⚠️ Hobby/community project. Independent and unofficial — not affiliated with the vehicle manufacturer.
> All maintenance data is provided for reference only — always verify against an
> official workshop manual before working on your car.

---

## Features

- **Garage / Component Explorer** — interactive 2D cutaways with clickable hotspots,
  an exterior 3D model viewer (paint picker), and real part numbers, torque specs,
  and step-by-step procedures per component.
- **Service history** — per-vehicle maintenance log with flexible line items
  (part numbers, costs, notes).
- **Service planner** — plan upcoming work with parts and how-to links, then
  "start service" to pre-fill a record.
- **Fault finding** — symptom/cause/check reference.
- **DIY Tools** — native wheel & tyre fitment tools: a "will it fit?" checker
  (save your disks, test any tyre → tyre↔rim, rolling-diameter, speedo, poke/
  clearance), plus tyre-size, offset, staggered-diameter and alignment
  calculators — with visual diagrams. Our own math, no third-party API
  (`lib/fitment/`, `components/tools/`).
- **981 & 987 knowledge base** — per-generation fault codes, specs, maintenance
  schedules, known issues, and reference articles, with a dependency-free search
  used for RAG (`lib/knowledge/`).
- **MCP server** — connect the garage to Claude. Knowledge + fitment tools
  (fault/spec/part lookup, search, wheel-fitment, "will it fit", alignment specs)
  need no auth; per-user garage tools are scoped by Supabase Row Level Security.
  See [`MCP_SETUP.md`](./MCP_SETUP.md).
- **Multi-user** — magic-link auth, each user owns their own vehicles and records.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 14 (App Router) + TypeScript |
| Runtime | Node.js 24 |
| Backend | Supabase — Postgres, magic-link auth, Row Level Security |
| 3D | `@react-three/fiber` + `drei`, Google `<model-viewer>` |
| AI | Model Context Protocol via `mcp-handler` |

Single monolith, no separate backend service. The only external dependency is
Supabase, and the whole thing runs on free tiers.

## Architecture

- **Shared reference data** (components, fault library, part catalog, 981 knowledge
  base) is static and version-controlled in `lib/` — identical for everyone.
- **Per-user data** (vehicles, service records, plans) lives in Postgres. Every row
  carries a `user_id`; RLS policies (`auth.uid() = user_id`) enforce isolation at the
  database, not in app code.
- Auth is gated in `middleware.ts`; unauthenticated traffic is redirected to
  `/auth/login` (public paths: `/`, `/legal`, `/api/mcp`).

## Getting started

### Prerequisites

- **Node.js 24** (pinned via `.nvmrc` / `.node-version`; with `fnm` or `nvm`, run
  `fnm use` / `nvm use` in the project root)
- A free [Supabase](https://supabase.com) project

### Setup

```bash
npm install
cp .env.local.example .env.local   # fill in your Supabase URL + anon key
```

Then provision the database (link your project and push migrations) and configure
auth — full walkthrough in **[`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md)**:

```bash
npx supabase login
npx supabase link --project-ref <your-ref>
npm run db:push
```

### Run

```bash
npm run dev          # http://localhost:3000
```

> **Try it without a backend:** set `NEXT_PUBLIC_DEMO_MODE=true` in `.env.local` to
> run the whole front-end on in-memory placeholder data (no Supabase account needed).

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server (port 3000) |
| `npm run build` / `start` | Production build / serve |
| `npm run lint` | Next.js lint |
| `npm run db:push` | Apply Supabase migrations to the linked project |
| `npm run db:diff` | Diff local schema vs the remote database |
| `npm run gen:components` | Regenerate procedural component GLBs (`tools/gen/`) |

## Connecting Claude (MCP)

The app exposes a Streamable-HTTP MCP server at **`/api/mcp`**. Quick test with
Claude Code:

```bash
claude mcp add --transport http flatsix http://localhost:3000/api/mcp \
  --header "Authorization: Bearer <token>"
```

Get `<token>` from **Settings → MCP** in the app. Knowledge tools work without it;
garage tools (read/write your records) require it. Full details and other clients
(Claude Desktop, MCP Inspector) in [`MCP_SETUP.md`](./MCP_SETUP.md).

## Project structure

```
app/                Next.js routes (garage, history, plans, faults, settings, auth, api/mcp)
components/         UI — shell, garage explorer, views, home landing
lib/
  data.ts, catalog* Static reference data + part catalog
  knowledge/        981 knowledge base + search (RAG layer)
  mcp/              MCP tool definitions + auth
  db/               Per-user data access (vehicles, records, plans)
  supabase/         Browser/server clients + session middleware
  *-context.tsx     Client state for vehicle, records, plans
public/             Shipped assets — 3D models, cutaway images, posters
supabase/           config.toml, migrations/, email templates
tools/gen/          Procedural 3D component generator
```

## Deployment

Deploy on **Vercel**: import the repo, set `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars, and add your production `/auth/callback` URL
to the Supabase dashboard. Node 24 is selected automatically via the `engines` field.

## Contributing & procedures

Common, repeatable work has step-by-step runbooks under
**[`docs/procedures/`](./docs/procedures)** — keep them current when the process changes:

| Procedure | What it covers |
| --- | --- |
| [Adding documents](./docs/procedures/adding-documents.md) | Add a manual/TSB/tech doc → knowledge base, faults, Documents registry, Supabase upload |
| [Adding a model variant](./docs/procedures/adding-model-variant.md) | New `BodyType` (e.g. a Spyder) — registry, GLB, credits, colors |
| [Adding a new generation](./docs/procedures/adding-new-generation.md) | A whole new generation (e.g. 991/718) — knowledge, docs, 3D, fitment |
| [Building features](./docs/procedures/building-features.md) | Design-system rules, backend/MCP changes, when to update these docs |

The same rules are encoded for AI pair-programming in [`CLAUDE.md`](./CLAUDE.md) and
[`.cursor/rules/`](./.cursor/rules) so Claude Code and Cursor follow them automatically.

## License & attributions

- **Code** — [MIT](./LICENSE).
- **Bundled assets** — third-party 3D models carry their own Creative Commons
  licences (CC BY 4.0 / CC BY-NC-SA 4.0). See [`NOTICE.md`](./NOTICE.md) for
  required attributions. Two bundled models (the 987 Spyder and the 981 GT4) are
  **CC BY-NC-SA**, so any redistributed derivative of the app must stay
  non-commercial + share-alike.
- **Reference documentation** — any third-party workshop PDFs used for local
  development are **not** redistributed (gitignored) and are served only to
  authenticated users when configured.

Contributing a model or generation? See [`CONTRIBUTING.md`](./CONTRIBUTING.md).
`app/api/devshot` is a dev-only render-capture route; remove it before a public
production deploy.
