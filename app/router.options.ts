import type { RouterConfig } from '@nuxt/schema'

export default <RouterConfig> {
  routes: (_routes) => {
    // 1. Detect the Host (Domain)
    let host = ''
    
    // Server-side detection (First load)
    if (import.meta.server) {
      const nuxtApp = useNuxtApp()
      host = nuxtApp.ssrContext?.event.node.req.headers.host || ''
    } 
    // Client-side detection (Navigation)
    else {
      host = window.location.host
    }

    // 2. Define our logic
    // Checks for "manage." at the start (Works for manage.parascores.com AND manage.lvh.me)
    const isAppSubdomain = host.startsWith('manage.')

    // 3. Return the correct routes
    if (isAppSubdomain) {
      // 🟢 DASHBOARD: Only show files from pages/_manage
      return _routes
        .filter(r => r.path.startsWith('/_manage')) 
        .map(r => ({
          ...r,
          // Rewrite path: /_manage/tournaments -> /tournaments
          path: r.path.replace('/_manage', '') || '/' 
        }))
    } else {
      // 🔵 MARKETING: Only show files from pages/_marketing
      return _routes
        .filter(r => 
          r.path.startsWith('/_marketing') || 
          r.path.startsWith('/auth') || 
          r.path === '/login' || 
          r.path === '/signup' || 
          r.path === '/forgot-password' || 
          r.path === '/reset-password'
        )
        .map(r => ({
          ...r,
          // Rewrite path: /_marketing/pricing -> /pricing
          path: r.path.replace('/_marketing', '') || '/'
        }))
    }
  }
}