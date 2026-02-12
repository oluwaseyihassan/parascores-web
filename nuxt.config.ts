// https://nuxt.com/docs/api/configuration/nuxt-config

import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
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
  ],
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
  runtimeConfig: {
    public: {
      API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000/api',
      DASHBOARD_URL: process.env.DASHBOARD_URL || 'http://manage.lvh.me:3001',
    }
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
})