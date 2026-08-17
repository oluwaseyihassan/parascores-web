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

    // Any non-reserved subdomain on a known base domain is an event hub slug
    const RESERVED_SUBDOMAINS = ['manage', 'manage-dev', 'admin', 'admin-dev', 'dev', 'www', 'api']
    const hostname = host.split(':')[0] || ''
    const labels = hostname.split('.')
    const isKnownBaseDomain = hostname === 'lvh.me' || hostname.endsWith('.lvh.me')
      || hostname === 'parascores.com' || hostname.endsWith('.parascores.com')
    const firstLabel = labels.length > 2 ? labels[0]! : null
    const isEventSubdomain = isKnownBaseDomain && !!firstLabel && !RESERVED_SUBDOMAINS.includes(firstLabel)

    // 3. Return the correct routes
    if (isEventSubdomain) {
      // 🟣 EVENT HUB: Show _event routes + widget routes
      return _routes
        .filter(r => r.path.startsWith('/_event') || r.path.startsWith('/widget'))
        .map(r => ({
          ...r,
          // Rewrite path: /_event/football -> /football
          path: r.path.replace('/_event', '') || '/'
        }))
    }

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