// https://nuxt.com/docs/api/configuration/nuxt-config

import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: process.env.NODE_ENV === 'development' },

  devServer: {
    port: 3001
  },

  modules: [
    "@nuxt/ui",
    "@nuxt/icon",
    "@pinia/nuxt",
    "@nuxtjs/color-mode",
    "@nuxtjs/i18n",
    "@nuxt/image",
    "@vite-pwa/nuxt",
    '@sentry/nuxt/module'
  ],

  pwa: {
    strategies: 'injectManifest',
    srcDir: '.',
    filename: 'sw.ts',
    registerType: 'autoUpdate',
    manifest: {
      name: 'Parascores',
      short_name: 'Parascores',
      theme_color: '#000000',
      background_color: '#000000',
      icons: [
        {
          src: 'pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: 'pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        },
        {
          src: 'pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        }
      ],
      screenshots: [
        {
          src: 'images/landing/dashboard-screenshot.png',
          sizes: '1906x921',
          type: 'image/png',
          form_factor: 'wide',
          label: 'Tournament Dashboard'
        },
        {
          src: 'images/landing/bracket-view.png',
          sizes: '695x487',
          type: 'image/png',
          label: 'Tournament Brackets'
        }
      ]
    },
    workbox: {
      navigateFallback: '/',
      navigateFallbackDenylist: [/^\/api($|\/)/, /^\/_manage($|\/)/],
      globPatterns: ['**/*.{js,css,html,png,svg,ico}']
    },
    client: {
      installPrompt: true,
      periodicSyncForUpdates: 3600
    },
    devOptions: {
      enabled: process.env.NODE_ENV === 'development',
      suppressWarnings: true,
      navigateFallbackAllowlist: [/^\/$/],
      type: 'module'
    }
  },

  icon: {
    serverBundle: {
      collections: ['heroicons']
    }
  },

  css: ["@/assets/css/main.css"],

  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: ['manage.lvh.me']
    }
  },

  colorMode: {
    classSuffix: "",
    preference: "dark",
    fallback: "light",
  },

  // hooks: {
  //   'pages:extend'(pages) {
  //     const authPageIndex = pages.findIndex(page => page.path === '/auth')
  //     if (authPageIndex > -1) {
  //       pages.splice(authPageIndex, 1)
  //     }
  //     pages.push({
  //       name: 'auth-login',
  //       path: 'login',
  //       file: './app/pages/_marketing/auth/login.vue'
  //     })
  //     pages.push({
  //       name: 'auth-signup',
  //       path: 'signup',
  //       file: './app/pages/_marketing/auth/login.vue'
  //     })
  //   }
  // }
  runtimeConfig: {
    public: {
      API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000/api',
      DASHBOARD_URL: process.env.DASHBOARD_URL || 'http://manage.lvh.me:3001',
      ADMIN_URL: process.env.ADMIN_URL || 'http://admin.lvh.me:3001',
      FRONT_END_URL: process.env.FRONTEND_URL || 'http://lvh.me:3001',
      SENTRY_DSN: process.env.SENTRY_DSN || '',
    }
  },

  sentry: {
    org: 'parascores',
    project: 'javascript-nuxt',
    autoInjectServerSentry: 'top-level-import'
  },

  sourcemap: {
    client: 'hidden'
  }
})