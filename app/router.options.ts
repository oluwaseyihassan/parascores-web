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
    const isAppSubdomain = host.startsWith('manage.') || host.startsWith('manage-dev.')
    const isAdminSubdomain = host.startsWith('admin.')

    if (isAdminSubdomain) {
      // 🔴 ADMIN: Show _admin routes only
      return _routes
        .filter(r => r.path.startsWith('/_admin'))
        .map(r => ({
          ...r,
          // Rewrite path: /_admin/users -> /users
          path: r.path.replace('/_admin', '') || '/'
        }))
    } else if (isAppSubdomain) {
      // 🟢 DASHBOARD: Show _manage routes + widget routes
      return _routes
        .filter(r => r.path.startsWith('/_manage') || r.path.startsWith('/widget')) 
        .map(r => ({
          ...r,
          // Rewrite path: /_manage/tournaments -> /tournaments
          path: r.path.replace('/_manage', '') || '/' 
        }))
    } else {
      // 🔵 MARKETING: Show _marketing routes + auth routes + widget routes
      return _routes
        .filter(r => 
          r.path === '/' ||
          r.path.startsWith('/_marketing') || 
          r.path.startsWith('/auth') || 
          r.path.startsWith('/widget') ||
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