# Parascores Web Application

Welcome to the **Parascores Web** repository. This is the front-end application built with **Nuxt 4**, **Vue 3**, **Tailwind CSS v4**, and **Nuxt UI v4**. The platform delivers a premium, real-time user experience for tournament management, live scoreboards, brackets, standings, stats, team registration, public widgets, and shareable social graphic generation.

---

## 🚀 Key Features

*   **Multi-tenant Subdomain Routing:** Dynamically serves distinct applications (Public Marketing Site, Organizer Dashboard, System Admin Panel) from the same codebase depending on the hostname.
*   **Real-time Scoring & Match Timers:** Live minute updates, event triggers, and state management for active fixtures.
*   **Dynamic Social Graphics Generator:** Server-side API endpoints (`server/api/graphics/`) that render real-time brackets, standings, stats, and matchday results to PNG images using Satori and Resvg.
*   **Embeddable Widgets:** Performance-tuned iframe widgets for displaying live tournament brackets, standings, and matches on third-party websites.
*   **PWA Support:** Full offline fallback capabilities and background sync using Vite PWA service workers.

---

## 🛠️ Technology Stack

*   **Core Framework:** [Nuxt 4](https://nuxt.com/) (Vue 3, Vite, SSR/CSR hybrid rendering)
*   **Styling & UI:** [Tailwind CSS v4](https://tailwindcss.com/) & [Nuxt UI v4](https://ui.nuxt.com/)
*   **State Management:** [Pinia](https://pinia.vuejs.org/) (`@pinia/nuxt`)
*   **Authentication & API Client:** Custom fetch-wrapper (`$api`) with automatic token refresh (`/auth/refresh`) interceptors.
*   **Service Worker / PWA:** `@vite-pwa/nuxt` (utilizing custom `sw.ts` lifecycle logic)
*   **Graphics Engines:** [Satori](https://github.com/vercel/satori) (HTML/CSS to SVG) & [Resvg JS](https://github.com/yisibl/resvg-js) (SVG to PNG)
*   **Data Validation:** [Zod](https://zod.dev/)
*   **Spreadsheet Parsing:** [XLSX](https://github.com/SheetJS/sheetjs) for importing/exporting tournament and team lists
*   **Maps & Venues:** [Leaflet](https://leafletjs.com/) for interactive venue mappings

---

## 📂 Codebase Architecture

The application is structured around Nuxt 4 conventions under the `app/` folder, alongside server-side assets and graphics rendering in the `server/` folder:

```
parascores-web/
├── app/                      # Main client application code (Nuxt 4 structure)
│   ├── assets/               # Tailwind stylesheets and global fonts
│   ├── components/           # UI components (sub-divided by admin/dashboard/marketing/widget)
│   ├── composables/          # Custom hooks (e.g. useApi, useMatchTimer, useGraphicShare)
│   ├── layouts/              # Route layouts (admin, dashboard, default, widget, feed)
│   ├── middleware/           # Route guards & auth checks (e.g. auth.global.ts)
│   ├── pages/                # Multi-tenant page structure
│   │   ├── _admin/           # Pages loaded only on admin.lvh.me
│   │   ├── _manage/          # Pages loaded only on manage.lvh.me
│   │   ├── _marketing/       # Pages loaded only on the root domain (lvh.me)
│   │   ├── auth/             # Shareable authorization views (login, signup)
│   │   └── widget/           # Embeddable public iframe views
│   ├── stores/               # Pinia store modules (auth, tournament, fixture, standings, etc.)
│   ├── types/                # Core TypeScript interfaces & API schemas
│   ├── app.vue               # Hydrates user & controls layout switching
│   ├── router.options.ts     # Domain-based route router intercepts
│   └── sw.ts                 # Service worker file for PWA
├── public/                   # Static public assets (icons, PWA manifests, fallback screenshots)
├── server/                   # Nuxt server engine endpoints
│   ├── api/graphics/         # Server-side SVG/PNG template builders for social sharing
│   └── utils/                # Cache and Satori image utilities
├── scripts/                  # Administrative scripts (e.g. cache clearance utilities)
├── nuxt.config.ts            # Core Nuxt modules, PWA, devServer, and runtime variables
└── package.json              # Project dependencies and script execution definitions
```

---

## 🌐 Dynamic Routing & Domain Strategy

Rather than deploying multiple separate apps, Parascores uses host detection in [router.options.ts](file:///c:/Users/USER/Desktop/parascores-web/app/router.options.ts) and route-guards in [auth.global.ts](file:///c:/Users/USER/Desktop/parascores-web/app/middleware/auth.global.ts) to filter and map page requests:

| Target Subdomain | Page Directory Route | Accessible Users / Roles | Purpose |
| :--- | :--- | :--- | :--- |
| **`lvh.me`** | `app/pages/_marketing/` | Public (Guests & Users) | Marketing homepage, auth, explore, and public profiles. |
| **`manage.lvh.me`** | `app/pages/_manage/` | `ORGANIZER` or `OWNER` | Tournament setups, bracket builders, live score editing, organizations. |
| **`admin.lvh.me`** | `app/pages/_admin/` | `SUPER_ADMIN` | Global dashboard, user role editing, system health, payments. |

---

## 💻 Local Development Setup

To run this application locally, you must map the subdomains to your local loopback address and set up environment configs.

### 1. Map Local Hosts
Because the application routes dynamically based on the domain headers, you must edit your computer's `hosts` file to resolve the local domains.

*   **Windows:** Open notepad as administrator and open `C:\Windows\System32\drivers\etc\hosts`.
*   **macOS / Linux:** Open terminal and run `sudo nano /etc/hosts`.

Add the following entry:
```hosts
127.0.0.1  lvh.me manage.lvh.me admin.lvh.me
```

### 2. Environment Configuration
Create a `.env` file in the root directory:

```env
API_BASE_URL=http://lvh.me:3000/api
DASHBOARD_URL=http://manage.lvh.me:3001
FRONTEND_URL=http://lvh.me:3001
ADMIN_URL=http://admin.lvh.me:3001
SENTRY_DSN=your_sentry_dsn_here
```

*(Note: The API Backend default runs on port `3000`, while this Web Frontend runs on port `3001`.)*

### 3. Install Dependencies
Ensure you have Node.js installed (v18+ recommended).
```bash
npm install
```

### 4. Start the Dev Server
```bash
npm run dev
```
The server will start up on `http://lvh.me:3001` (host configuration: `0.0.0.0:3001`). 

To test:
*   Go to `http://lvh.me:3001` for the public site.
*   Go to `http://manage.lvh.me:3001` to test the manager dashboard.
*   Go to `http://admin.lvh.me:3001` to test the super-admin portal.

---

## 🔐 Authentication & Session Flow

1.  **Global Middleware Check:** [auth.global.ts](file:///c:/Users/USER/Desktop/parascores-web/app/middleware/auth.global.ts) runs on every route change. On initial load, it invokes the [auth store](file:///c:/Users/USER/Desktop/parascores-web/app/stores/auth.ts)'s `fetchUser` method, sending credentials to retrieve the user's profile from the NestJS API.
2.  **API Client & Tokens:** The custom `$api` utility (`app/composables/useApi.ts`) includes cookies (`credentials: 'include'`). If an API call fails with a `401 Unauthorized` status code, `$api` catches the error, hits the `/auth/refresh` endpoint to renew the session cookie, and retries the original request seamlessly.
3.  **Role Protection:**
    *   `SUPER_ADMIN` roles can bypass subdomain checks and access the admin dashboard.
    *   `ORGANIZER` role is required for most features in `manage.lvh.me`.
    *   Standard `USER` role accounts attempting to access `manage.lvh.me` will be restricted to `/onboarding`, `/profile`, or `/`.

---

## ⚡ Available Commands

| Command | Action |
| :--- | :--- |
| `npm run dev` | Runs the local Vite dev server on port `3001` |
| `npm run build` | Builds the production bundle inside `.output/` |
| `npm run preview` | Runs a local preview of the production-built Nuxt application |
| `npm run generate` | Generates a static-only build (if static target is desired) |
| `npm run postinstall` | Automatically runs `nuxt prepare` to build temporary typing files |
