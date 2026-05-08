export default defineNuxtRouteMiddleware((to, from) => {
  const authStore = useAuthStore()
  
  // Condition A: If the user is NOT logged in, redirect to login
  if (!authStore.isAuthenticated) {
    return navigateTo('/login')
  }
  
  // Condition B: If the user IS logged in, but is not an organizer
  if (!authStore.isOrganizer) {
    return navigateTo('/onboarding')
  }
})
