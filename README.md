<p align="center">
  <img src="https://res.cloudinary.com/djsnerfzp/image/upload/q_auto/f_auto/v1780327900/parascores-logo.png" width="110" alt="ParaScores Logo" />
</p>

<h1 align="center">ParaScores Web</h1>

<p align="center">
  Next-generation multi-tenant frontend for live tournament management, real-time scoreboards, dynamic brackets, fan predictions, community chat, and automated social graphics.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Nuxt-4.x-00DC82?logo=nuxt&logoColor=white" alt="Nuxt 4" />
  <img src="https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vuedotjs&logoColor=white" alt="Vue 3" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS v4" />
  <img src="https://img.shields.io/badge/Nuxt_UI-v4-00DC82?logo=nuxt&logoColor=white" alt="Nuxt UI v4" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Pinia-3.x-FFD859?logo=pinia&logoColor=black" alt="Pinia" />
  <img src="https://img.shields.io/badge/Socket.io_Client-4.x-010101?logo=socket.io&logoColor=white" alt="Socket.io" />
  <img src="https://img.shields.io/badge/PWA-Enabled-orange?logo=pwa&logoColor=white" alt="PWA" />
  <img src="https://img.shields.io/badge/Satori_%26_Resvg-Graphics_Engine-purple" alt="Satori & Resvg" />
  <img src="https://img.shields.io/badge/License-Proprietary-blue" alt="License" />
</p>

---

## 📖 Overview

**ParaScores Web** is the official web client for [ParaScores](https://parascores.com). It provides a unified, high-performance interface for tournament organizers, athletes, and fans.

Architected on top of **Nuxt 4**, **Vue 3**, **Tailwind CSS v4**, and **Nuxt UI v4**, the application uses dynamic **multi-tenant subdomain routing** to serve three isolated user experiences—**Public Fan Portal**, **Organizer Management Console**, and **Super Admin Dashboard**—plus embeddable third-party widgets, all from a single, maintainable codebase.

Served alongside a separate [NestJS API backend](https://github.com/oluwaseyihassan/parascores-api) running on port `3000`.

---

## ✨ Key Features

### 🏆 Multi-Format Tournament & Playoff Engine
- **Versatile Competition Formats**: Single Elimination, Double Elimination, Round-Robin (single & double), Groups + Knockouts, Swiss System matchmaking, and UEFA Champions League-style Swiss league phases.
- **Interactive Knockout Brackets**: Tactile visual brackets rendered with dynamic SVG connector paths, curved routing, compact/expanded modes, and champion trophy showcases.
- **Hybrid Play-Offs & Two-Legged Ties**: Support for UEFA Champions League play-off rounds (seeded vs unseeded pairings), two-legged knockout ties with aggregate scores, and 3rd place consolation matches.
- **Automated Scheduling**: One-click fixture generation with round-robin matrices, round steppers, and manual bracket pairing overrides.

### ⚽ Pluggable Multi-Sport Scoring Engines (`app/engines/`)
- Per-sport scoring logic unified behind a standardized `SportEngine` contract (`types.ts`, `registry.ts` with `resolveEngine(sport)`).
- **Supported Sports & Modalities**:
  - **Football & Futsal**: Full match clock, minute-by-minute timeline, goals, assists, yellow/red cards, substitutions, own goals, penalty shootouts, and match statistics.
  - **Basketball, Handball & Rugby**: Increment scoring panels (+1, +2, +3 points), quarter/half clocks, fouls, and bonus trackers via `basketball/panel.vue`.
  - **Tennis, Table Tennis, Volleyball & Badminton**: Set-based scoring engine (`_shared/SetScoringPanel.vue`), games/sets tallying, deuce/advantage, and tiebreakers.
  - **Athletics, Swimming, Cycling & Weightlifting**: Placement & timed race control (`_shared/RaceControl.vue`) supporting high/low metric rankings.
  - **Combat Sports (Boxing, Judo, Taekwondo, Wrestling)**: Rounds clock, points system, and stoppage/decision tracking.
  - **Esports**: Dedicated game-mode presets and tournament formats.

### 🔮 Fan Score Predictions & Tournament Leaderboard
- Pre-match score prediction contest on football fixtures.
- Interactive score stepper cards with quick 1X2 outcome buttons.
- Kickoff lockout enforcement with countdown timers.
- Live community consensus analytics (Home Win %, Draw %, Away Win %, most predicted score).
- Automated point evaluation (Exact Score vs Correct Outcome) and tournament podiums & leaderboards with celebratory outcome badges.

### ⏱️ Live Match Center & Real-Time Scoring
- **Sub-Second Updates**: Live match events streamed over Server-Sent Events (SSE).
- **Match Control Surface**: Dedicated organizer scoring console (`MatchControl.vue`) with synchronized match timers, period transitions (`1H`, `HT`, `2H`, `FT`, `ET`, `PEN`), quick-action scoring buttons, and state recovery.
- **Live Match Timeline & Stats**: Minute-by-minute match logs and detailed team statistics.

### 💬 Real-Time Tournament Chat & Match Pulse
- **WebSocket Gateway**: Low-latency bi-directional chat powered by Socket.IO (`socket.io-client`).
- **Interactive Community Chat**: Match and tournament chat rooms, @user mentions, emoji reactions, typing indicators, pinned organizer announcements, and moderation controls.
- **Pulse**: Real-time spectator activity stream capturing match milestones, cheers, and social reactions.

### 📅 Competitions & Multi-Season Management
- Link tournaments across overarching competitions (e.g. Premier League 2024/25, 2025/26).
- Public header season switcher dropdown with active season indicators.
- Competition follower tracking and organizer season edition manager.

### 📱 Touch-Optimized Continuous Swipe Navigation
- Fluid, continuous finger-tracking swipeable tabs track on public tournament hubs.
- Directional slide animations with auto-centering sticky tab navigation bar.

### 🎨 Automated Social Graphics Studio (`server/api/graphics/`)
- Server-side SVG rendering via **Satori** converted to ultra-sharp PNGs via **Resvg**.
- On-the-fly shareable social cards for:
  - Matchday schedules (`/api/graphics/matchday`)
  - Live & Full-time match results (`/api/graphics/match-result`)
  - Tournament brackets (`/api/graphics/bracket`)
  - League tables & standings (`/api/graphics/standing`)
  - Top scorers & assist stats (`/api/graphics/stats`)

### 📺 Vertical Video Highlights Feed
- Dedicated tournament highlights tab displaying a vertical video feed.
- Automatic resolution of TikTok shortlinks (`vt.tiktok.com`, `vm.tiktok.com`) to canonical media.
- Cloudinary video/image player and YouTube embed support.

### 🧩 Embeddable Iframe Widgets (`/widget/*`)
- Isolated, performance-tuned iframe widgets for third-party websites:
  - `/widget/bracket` — Interactive tournament bracket
  - `/widget/standings` — Real-time league table
  - `/widget/fixtures` — Upcoming and live schedule
  - `/widget/results` — Completed matchday scores
- Responsive, dark-mode default, lightweight bundle footprint.

### 💳 Monetization, Team Registration & Payouts
- **Paystack Integration**: Secure online checkout for team tournament registration fees.
- **Pro Subscriptions**: Monthly and annual organizer tier subscriptions.
- **Automated Payouts**: Automated platform commission splits and instant organizer payouts via Paystack Transfers.
- **Discount Codes**: Promotional percentage and fixed-amount coupon codes.

### 📲 Progressive Web App (PWA) & Web Push
- Configured via `@vite-pwa/nuxt` with custom service worker lifecycle (`app/sw.ts`).
- Offline asset precaching, custom installation prompt (`PwaInstallBanner.vue`), and Web Push notifications for match alerts and tournament announcements.

---

## 🌐 Multi-Tenant Subdomain Routing

Parascores Web uses hostname detection in [app/router.options.ts](file:///c:/Users/USER/Desktop/parascores-web/app/router.options.ts) to strip subdomain folder prefixes and dynamically route traffic, while [app/middleware/auth.global.ts](file:///c:/Users/USER/Desktop/parascores-web/app/middleware/auth.global.ts) enforces strict role-based access:

| Subdomain (Local) | Production Subdomain | Source Directory | Access Level | Description |
| :--- | :--- | :--- | :--- | :--- |
| **`lvh.me:3001`** | `parascores.com` | `app/pages/_marketing/`<br>`app/pages/auth/` | Public (Guests & Users) | Landing page, explore feed, public tournament hubs (`/t/:id`), team pages, player profiles, predictions, and auth flows. |
| **`manage.lvh.me:3001`** | `manage.parascores.com` | `app/pages/_manage/` | `ORGANIZER` or `OWNER` | Organizer dashboard: tournament wizard, fixture generators, score controls, season manager, billing, graphics studio, and widgets. |
| **`admin.lvh.me:3001`** | `admin.parascores.com` | `app/pages/_admin/` | `SUPER_ADMIN` | Platform administration: global user/org management, payment auditing, system telemetry, and platform configurations. |
| **All Domains** | Any host | `app/pages/widget/` | Public | Embeddable iframe views (`/widget/bracket`, `/widget/standings`, `/widget/fixtures`). |

---

## 📂 Codebase Layout

```
parascores-web/
├── app/
│   ├── assets/               # CSS styles (main.css, match-control.css) & fonts
│   ├── components/           # Reusable Vue components
│   │   ├── admin/            # Super-admin management tables and health metrics
│   │   ├── dashboard/        # Organizer console cards, wizards, and controls
│   │   ├── marketing/        # Public tournament tabs, predictions, chat, and headers
│   │   ├── match/            # Match scoring controls, timer footers, and event panels
│   │   ├── tournament/       # Brackets, fixtures, standings, and season pickers
│   │   └── widget/           # Embeddable widget templates
│   ├── composables/          # Vue composables (useApi, useHost, useTournament, etc.)
│   │   └── match/            # Live timer controls, scoring actions, and SSE subscribers
│   ├── engines/              # Pluggable sport scoring engines
│   │   ├── football/         # Football match events, timer, statistics
│   │   ├── basketball/       # Increment scoring (+1/+2/+3), fouls, quarters
│   │   ├── combat/           # Boxing, Judo, Taekwondo, Wrestling rounds clocks
│   │   ├── esports/          # Esports scoring and match hubs
│   │   ├── _shared/          # SetScoringPanel, RaceControl, shared timers
│   │   ├── registry.ts       # Sport registry and resolveEngine() resolver
│   │   └── types.ts          # SportEngine interfaces & scoring contracts
│   ├── layouts/              # Nuxt layouts (default, dashboard, admin, auth, widget, feed)
│   ├── middleware/           # Route guards (auth.global.ts multi-tenant interceptor)
│   ├── pages/                # Multi-tenant page directory
│   │   ├── _admin/           # Routes served on admin.lvh.me
│   │   ├── _manage/          # Routes served on manage.lvh.me
│   │   ├── _marketing/       # Routes served on root lvh.me
│   │   ├── auth/             # Shared login, signup, password reset routes
│   │   └── widget/           # Embeddable iframe routes
│   ├── stores/               # 17 Pinia stores (auth, fixture, prediction, tournament, etc.)
│   ├── types/                # Strict TypeScript schemas (competition, match, user, etc.)
│   ├── app.config.ts         # Nuxt UI styling and theme configuration
│   ├── app.vue               # Root layout shell and hydration coordinator
│   ├── router.options.ts     # Subdomain URL rewriting and route filtering
│   └── sw.ts                 # Service worker definition for offline caching and web push
├── docs/                     # Section-by-section engineering documentation
│   ├── sections/             # Detailed architecture, engines, data layer, roles guides
│   └── README.md             # Documentation directory index
├── public/                   # Static assets, logos, and PWA manifest icons
├── server/                   # Nuxt server endpoints
│   ├── api/graphics/         # Satori + Resvg dynamic SVG-to-PNG social image renderers
│   └── utils/                # Server-side image and font caching helpers
├── nuxt.config.ts            # Nuxt 4 configuration, modules, PWA, and Vite build options
└── package.json              # Project scripts and dependencies
```

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | [Nuxt 4](https://nuxt.com/) (Vue 3.5) | Full-stack Vue framework with hybrid SSR/CSR and file-based routing |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) & [Nuxt UI v4](https://ui.nuxt.com/) | Modern design system, HSL color tokens, and headless UI primitives |
| **State Management** | [Pinia 3](https://pinia.vuejs.org/) | Centralized reactive stores for auth, tournaments, fixtures, and predictions |
| **Real-Time Gateway** | [Socket.IO Client](https://socket.io/) | Low-latency WebSockets for tournament chat, typing status, and presence |
| **Graphics Engine** | [Satori](https://github.com/vercel/satori) & [Resvg JS](https://github.com/yisibl/resvg-js) | Server-side HTML/CSS to SVG to PNG rendering pipeline |
| **PWA & Offline** | [@vite-pwa/nuxt](https://vite-pwa-org.netlify.app/) | Service worker caching, install banner, and native push notifications |
| **Spreadsheets** | [XLSX (SheetJS)](https://sheetjs.com/) | Client-side spreadsheet parsing for bulk team and fixture import/export |
| **Geospatial Maps** | [Leaflet](https://leafletjs.com/) | Interactive venue discovery and tournament location maps |
| **Validation** | [Zod](https://zod.dev/) | Type-safe runtime schema parsing and form validation |
| **Testing** | [Playwright](https://playwright.dev/) | End-to-end browser automation testing across viewports |

---

## 💻 Local Development Setup

### 1. Map Local Subdomains in `hosts`
Parascores inspects the HTTP request hostname to serve the appropriate application. Add the local testing domains to your operating system's `hosts` file:

- **Windows**: `C:\Windows\System32\drivers\etc\hosts` (run Notepad as Administrator)
- **macOS / Linux**: `/etc/hosts` (`sudo nano /etc/hosts`)

```hosts
127.0.0.1  lvh.me manage.lvh.me admin.lvh.me
```

### 2. Configure Environment Variables
Create a `.env` file in the root of `parascores-web`:

```env
# API Backend connection (runs on port 3000)
API_BASE_URL=http://localhost:3000/api

# Subdomain URLs (Web runs on port 3001)
FRONTEND_URL=http://lvh.me:3001
DASHBOARD_URL=http://manage.lvh.me:3001
ADMIN_URL=http://admin.lvh.me:3001

# Sentry APM (Optional)
SENTRY_DSN=
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Start the Development Server
```bash
npm run dev
```

The Vite dev server will start on port `3001` (bound to `0.0.0.0:3001`).

Access the different portals in your browser:
- **Public Fan Site**: [http://lvh.me:3001](http://lvh.me:3001)
- **Organizer Dashboard**: [http://manage.lvh.me:3001](http://manage.lvh.me:3001)
- **Super Admin Panel**: [http://admin.lvh.me:3001](http://admin.lvh.me:3001)

> **Note**: Ensure the NestJS API backend (`parascores-api`) is running concurrently on port `3000` (`npm run start:dev`).

---

## 🔐 Authentication & Session Management

1. **Global Auth Guard**: [auth.global.ts](file:///c:/Users/USER/Desktop/parascores-web/app/middleware/auth.global.ts) executes on every client route transition. During initial app boot, it hydrates user credentials via `fetchUser()`.
2. **Cookie Auth & Refresh Interceptor**: The custom `$api` composable (`app/composables/useApi.ts`) includes HTTP-only session cookies (`credentials: 'include'`). If an API call receives a `401 Unauthorized`, `$api` automatically calls `/auth/refresh` to renew tokens and retries the original request seamlessly.
3. **Role Gating**:
   - `SUPER_ADMIN`: Unrestricted access across all domains and admin tools.
   - `ORGANIZER` / `OWNER`: Full access to `manage.lvh.me` features.
   - `USER`: Restricted on `manage.lvh.me` to onboarding and profile settings; full access to public fan features.

---

## ⚡ Available NPM Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Vite dev server with host binding (`0.0.0.0:3001`) |
| `npm run build` | Builds the production Nuxt bundle into `.output/` |
| `npm run preview` | Runs a local Node.js server previewing the `.output/` build |
| `npm run generate` | Pre-renders routes to static HTML (for SSG deployment) |
| `npm run postinstall` | Runs `nuxt prepare` to generate `.nuxt/` types and auto-imports |

---

## 📚 Documentation Index

For in-depth architectural specifications and onboarding guides, refer to the [docs/](file:///c:/Users/USER/Desktop/parascores-web/docs) directory:

- [Architecture & Subdomains](file:///c:/Users/USER/Desktop/parascores-web/docs/sections/01-architecture.md)
- [Public Site & Fan Experience](file:///c:/Users/USER/Desktop/parascores-web/docs/sections/02-public-site.md)
- [Organizer Dashboard](file:///c:/Users/USER/Desktop/parascores-web/docs/sections/03-organizer-dashboard.md)
- [Super Admin Panel](file:///c:/Users/USER/Desktop/parascores-web/docs/sections/04-admin-panel.md)
- [Live Scoring & Match Control](file:///c:/Users/USER/Desktop/parascores-web/docs/sections/05-live-scoring.md)
- [Sport Engines Framework](file:///c:/Users/USER/Desktop/parascores-web/docs/sections/06-sport-engines.md)
- [Embeddable Widgets](file:///c:/Users/USER/Desktop/parascores-web/docs/sections/07-widgets.md)
- [Graphics Pipeline (Satori + Resvg)](file:///c:/Users/USER/Desktop/parascores-web/docs/sections/08-graphics-pipeline.md)
- [Data Layer & Stores](file:///c:/Users/USER/Desktop/parascores-web/docs/sections/09-data-layer.md)
- [Accounts & Authentication](file:///c:/Users/USER/Desktop/parascores-web/docs/sections/10-accounts-auth.md)
- [Score Predictions & Leaderboards](file:///c:/Users/USER/Desktop/parascores-web/docs/sections/15-score-predictions.md)
- [Platform Roles & Permissions](file:///c:/Users/USER/Desktop/parascores-web/docs/platform-roles.md)

---

## 📄 License

Proprietary software. All rights reserved &copy; ParaScores.
