// middleware/auth.global.ts
import { storeToRefs } from 'pinia'

export default defineNuxtRouteMiddleware(async (to, from) => {

  // Widget pages are public — skip all auth logic
  if (to.path.startsWith('/widget')) {
    return
  }

  const authStore = useAuthStore()
  const { user } = storeToRefs(authStore)
  console.log("user", user.value)
  // 🔵 1. HYDRATION: If user is missing, try to fetch them from the cookie FIRST
  // This must happen before we check permissions
  if (!user.value) {
    try {
      await authStore.fetchUser() 
    } catch (e) {
      // If fetch fails (token expired/invalid), user stays null
      authStore.authLoading = false
    }
  } else {
    // User already exists, no need to fetch
    authStore.authLoading = false
  }

  const headers = useRequestHeaders(['cookie'])


  // 2. Identify Host
  const host = import.meta.server
    ? useRequestHeaders(['host']).host || ''
    : window.location.host

  const isApp = host.startsWith('manage.')

  // 3. Dynamic Protocol & Domain Helper
  const protocol = import.meta.dev ? 'http' : 'https'
  // Fix: Strip both 'manage.' and 'www.' to get the true root domain
  const rootHost = host.replace(/^(manage\.|www\.)+/i, '')

  // --- LOGIC ---
  
  // 0. Redirect Tournament/Team Join links to the root host if hit on manage subdomain
  // These routes only exist on the marketing site and should never be processed on manage.
  if (isApp && (to.path.startsWith('/t-join/') || to.path.startsWith('/join/'))) {
    return navigateTo(`${protocol}://${rootHost}${to.fullPath}`, { external: true })
  }

  // A. Protect Dashboard (App Subdomain)
  // Logic: If on dashboard AND not logged in -> Go to Login
  if (isApp && !user.value) {
    // Allow them to visit login/signup pages if they exist on the subdomain (optional)
    // But typically you send them to the main site login:
    if (to.path !== '/login') {
       return navigateTo(`${protocol}://${rootHost}/login?appRedirect=${encodeURIComponent(to.fullPath)}`, { external: true })
    }
  }

  // B. Intercept non-organizers accessing the Dashboard
  if (isApp && user.value && user.value.role === 'USER') {
    const allowedPaths = ['/', '/onboarding', '/profile']
    if (!allowedPaths.includes(to.path)) {
      return navigateTo('/onboarding')
    }
  }

  // C. Redirect Logged-In Users visiting Auth Pages
  if (!isApp && user.value) {
    if (to.path === '/login' || to.path === '/signup') {
      return navigateTo('/')
    }
  }
})