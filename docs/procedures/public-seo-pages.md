# Procedure: Public SEO pages

Marketing and reference content lives on **public SSR routes**; the garage app stays **auth-gated**.

## Public vs private

| Public (indexable) | Private (auth required) |
|---|---|
| `/` landing | `/garage`, `/history`, `/plans` |
| `/features/*` | `/faults`, `/manual`, `/tools`, `/ai` |
| `/987`, `/981` generation hubs | `/settings`, `/onboarding`, `/admin` |
| `/guides`, `/guides/[gen]/[slug]` | |
| `/codes`, `/codes/[gen]`, `/codes/[gen]/[code]` | |
| `/about` | |
| `/legal` | |

## Adding a new public page

1. Create `app/.../page.tsx` as a **server component** with `pageMetadata()` from [`lib/marketing/seo.ts`](../../lib/marketing/seo.ts).
2. Wrap content in [`MarketingShell`](../../components/marketing/MarketingShell.tsx) and build the page from the shared primitives (below) — do not hand-roll heroes or sections.
3. Add the path to [`lib/supabase/middleware.ts`](../../lib/supabase/middleware.ts) `isPublic()` if it is not already covered by a prefix rule.
4. Add the URL to [`app/sitemap.ts`](../../app/sitemap.ts).
5. Confirm [`app/robots.ts`](../../app/robots.ts) does not disallow it.

## Design system — use the shared primitives

Every marketing page shares one visual language (anchored on the home landing
page). The building blocks live in
[`components/marketing/layout.tsx`](../../components/marketing/layout.tsx) and the
style tokens in [`tokens.ts`](../../components/marketing/tokens.ts). **Reuse them —
never invent a new hero, width, or card style per page.**

- **`PageHero`** — the dark hero every page opens with: big "FLAT" (or
  contextual, e.g. a generation number via `watermark`) watermark, optional
  `breadcrumb`, red `kicker`, `title`, `lead`, `chips`, `actions`. Use
  `size="md"` for article-detail pages (guide/code detail), `size="lg"` (default)
  for hubs and index pages.
- **`Breadcrumbs`** — rendered inside the hero; pass `Crumb[]` (uppercase labels).
- **`Section`** — the light content band. `width` is `wide` (1200, default),
  `mid` (940) or `narrow` (760). Index/hub pages use `wide` so content shares the
  hero's left gutter; single-column article bodies use `narrow` centered.
- **`SectionHeading`** — kicker + h2 (+ optional `sub` and trailing `action`).
- **`CheckList`** — white card of red-checked benefit rows (feature pages).
- **`GenerationCards` / `FeatureCard` / `IssueCard` / `GuideCard`** — the card
  variants; all use `cardStyle` and the `.fcard` hover.
- **`ArrowLink`** — the uppercase red "read more →" affordance.
- Always end the page with [`CtaBand`](../../components/marketing/CtaBand.tsx).

Colours, fonts, `cardStyle`, `chipDark`/`chipLight`, `h1Style`/`h2Style`, and
`severityColor()` all come from `tokens.ts` — match the app design system in
`CLAUDE.md` (white cards, `#D5001C` red, tone-coloured borders, mono labels).

## Adding a generation hub

1. Register the knowledge bundle in [`lib/knowledge/index.ts`](../../lib/knowledge/index.ts).
2. Add the generation to `KNOWLEDGE_GENERATIONS` — [`app/[generation]/page.tsx`](../../app/[generation]/page.tsx) and sitemap pick it up via `generateStaticParams`.
3. Allow the exact path in middleware (`isPublic`).

## Adding guides or fault codes

- **Guides:** add to `lib/knowledge/articles*.ts` — [`app/guides/[generation]/[slug]/page.tsx`](../../app/guides/[generation]/[slug]/page.tsx) builds static params from `getArticles()`.
- **Fault codes:** add to `lib/knowledge/fault-codes*.json` — code detail pages use lowercase slugs in URLs.

## Feature marketing pages

Feature copy and slugs live in [`lib/marketing/features.ts`](../../lib/marketing/features.ts). The route is [`app/features/[slug]/page.tsx`](../../app/features/[slug]/page.tsx).

Do not confuse `/features/tools` (public marketing) with `/tools` (auth-gated app).

## Verify

- `npx tsc --noEmit`
- Load a public page signed out (no redirect to login)
- Check `/sitemap.xml` includes new URLs
