# Parascores Web

Nuxt 4 + Vue 3 multi-tenant frontend for tournament management, live scoreboards, brackets, standings, stats, and social graphics. Served alongside a separate NestJS API backend (runs on port 3000).

## Commands

- `npm run dev` — Vite dev server on port 3001 (bound to 0.0.0.0)
- `npm run build` — production build into `.output/`
- `npm run preview` — preview production build
- No test suite, no lint script configured. Playwright is a devDependency but no test script exists; verify changes by running `npm run build` and manually testing subdomains.

## Multi-tenant subdomain routing (critical architecture)

One codebase serves multiple apps based on hostname. When adding a new subdomain (e.g. `waug26`), you must touch:

1. `app/router.options.ts` — host detection filters/rewrites route paths. Underscore-prefixed page dirs (`_manage`, `_admin`, `_marketing`) are stripped to root on their subdomain.
2. `app/middleware/auth.global.ts` — enforces per-subdomain access control and redirects.
3. `app/composables/useHost.ts` — host parsing, `isManage`, URL helpers (`toMain`, `toManage`, `toTournament`). Handles `lvh.me` (local), `parascores.com` (prod), and `-dev.` variants.
4. `nuxt.config.ts` — `vite.server.allowedHosts` must include new local dev hosts.
5. Local `hosts` file — map new subdomain to 127.0.0.1 (see README).
6. `runtimeConfig.public` in `nuxt.config.ts` / `.env` — add URL env vars if the subdomain needs cross-domain links.

Hostnames: `lvh.me` (marketing/public), `manage.lvh.me` (organizer dashboard, ORGANIZER/OWNER roles), `admin.lvh.me` (SUPER_ADMIN). `widget/` routes are served on all domains.

## Codebase layout

- `app/pages/_marketing/` — public site (landing, explore, `t/` tournament pages, teams, players, join links)
- `app/pages/_manage/` — organizer dashboard
- `app/pages/_admin/` — super admin
- `app/pages/auth/` — login/signup/reset (shared on root domain)
- `app/pages/widget/` — embeddable iframes (all domains)
- `app/stores/` — Pinia stores (auth, tournament, fixture, standing, etc.)
- `app/composables/` — incl. `useApi.ts` (fetch wrapper with cookie auth + 401 refresh retry) and `match/` composables
- `app/components/` — UI components; `match/`, `marketing/` subdirs; `MatchControl.vue` is the live scoring control surface
- `server/api/graphics/` — server-side social graphic rendering via Satori + Resvg (SVG → PNG)
- `app/layouts/` — default, dashboard, admin, auth, widget, feed, explore
- `app/engines/` — per-sport scoring engines behind the `SportEngine` contract (`types.ts`, `registry.ts` with `resolveEngine(sport)`); engines: football, basketball, tennis, tabletennis, volleyball (set-scoring via `_shared/SetScoringPanel.vue`), athletics/swimming (placement via `_shared/RaceControl.vue`); `_shared/` has common panels/composables; `creation` config drives engine-specific tournament creation options
- `app/pages/_event/` + `app/components/event/` — event hub (subdomain live-results pages, e.g. waug26)
- `app/skins/<slug>/` — per-event hub customization (colors/section toggles/slot components in `config.ts`, bespoke blocks in `slots/`); resolved by `useEventSkin` via `import.meta.glob`, fallback `default/`. Hub colors are CSS vars (`--event-*`) with defaults in `layouts/event.vue`; the match modal teleports to body so it binds skin vars onto its own panel.

## Conventions

- Tailwind CSS v4 + Nuxt UI v4 for styling. Color mode default is dark.
- Data validation with Zod. XLSX for spreadsheet import/export. Leaflet for venue maps.
- Auth is cookie-based via `$api`; never hand-roll fetch calls — use the `useApi`/`$api` composable.
- PWA via `@vite-pwa/nuxt` with custom `app/sw.ts` (injectManifest strategy).
- TypeScript throughout; types live in `app/types/`.

## Gotchas

- Backend API runs separately on port 3000; frontend on 3001.
- Sentry is currently disabled (config commented out in `nuxt.config.ts`).
- `waug-screenshots/` at repo root contains design mockups/screenshots for the WAUG26 event site work.

## Ongoing work

- WAUG26 event subdomain — see `docs/waug26-plan.md`
