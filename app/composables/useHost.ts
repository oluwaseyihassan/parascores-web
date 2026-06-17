export const useHost = () => {
  const config = useRuntimeConfig()
  const route = useRoute()
  
  const host = process.server 
    ? useRequestHeaders(['host']).host || ''
    : window.location.host

  const isManage = computed(() => host.startsWith('manage.') || host.startsWith('manage-dev.'))
  
  const dashboardUrl = config.public.DASHBOARD_URL
  const frontendUrl = config.public.FRONT_END_URL

  /**
   * Generates a URL for the marketing/main site.
   * If we are on manage subdomain, it returns an absolute URL.
   * If we are already on main site, it returns a relative path for smooth navigation.
   */
  const toMain = (path: string = '/', options: { absolute?: boolean } = {}) => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    if (isManage.value || options.absolute) {
      return `${frontendUrl}${cleanPath}`
    }
    return cleanPath
  }

  /**
   * Generates a URL for the dashboard subdomain.
   * If we are on main site, it returns an absolute URL.
   * If we are already on dashboard, it returns a relative path.
   */
  const toManage = (path: string = '/', options: { absolute?: boolean } = {}) => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    if (!isManage.value || options.absolute) {
      return `${dashboardUrl}${cleanPath}`
    }
    return cleanPath
  }

  /**
   * Returns a tournament URL using slug if available.
   * Always ensures it points to the main site /t/ route.
   */
  const toTournament = (tournament: { id: string, customName?: string | null }) => {
    const slug = tournament.customName || tournament.id
    return toMain(`/t/${slug}`)
  }

  return {
    host,
    isManage,
    toMain,
    toManage,
    toTournament,
    dashboardUrl,
    frontendUrl
  }
}
