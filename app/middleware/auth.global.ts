// middleware/auth.global.ts
import { storeToRefs } from 'pinia'

export default defineNuxtRouteMiddleware(async (to, from) => {

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

  // A. Protect Dashboard (App Subdomain)
  // Logic: If on dashboard AND not logged in -> Go to Login
  if (isApp && !user.value) {
    // Allow them to visit login/signup pages if they exist on the subdomain (optional)
    // But typically you send them to the main site login:
    if (to.path !== '/login') {
       return navigateTo(`${protocol}://${rootHost}/login`, { external: true })
    }
  }

  // B. Redirect Logged-In Users (Marketing Site)
  // Logic: If on Marketing AND Logged in -> Go to Dashboard
  if (!isApp && user.value) {
    // Only redirect if they are trying to login or signup
    // (So they can still browse your landing page if they want)
    if (to.path === '/login' || to.path === '/signup') {
       return navigateTo(`${protocol}://manage.${rootHost}`, { external: true })
    }
  }
})