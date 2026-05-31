
import type { FetchOptions } from 'ofetch'

export async function $api<T>(url: string, options: FetchOptions & { _retry?: boolean } = {}): Promise<T> {
  const runtimeConfig = useRuntimeConfig()
  const authStore = useAuthStore()

  // 1. Prepare Headers (SSR & CSR)
  const headers = useRequestHeaders(['cookie'])

  const defaults: FetchOptions = {
    baseURL: runtimeConfig.public.API_BASE_URL,
    credentials: 'include',
    headers: {
      ...headers,
      ...options.headers
    },
  }

  try {
    // 2. Try the request normally
    return await $fetch<T>(url, {
      ...defaults,
      ...options,
      method: options.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | undefined,
      headers: headers
    })

  } catch (error: any) {
    // 3. Catch 401 Errors
    // We check '!options._retry' to ensure we only try to refresh ONCE per request
    // preventing infinite loops.
    if (error.statusCode === 401 && !options._retry) {

      // A. If the failed URL was ALREADY the refresh endpoint, stop.
      // We can't refresh the refresh token!
      if (url.includes('/auth/refresh')) {
        if (authStore.user) {
          await authStore.logout()
        }
        throw error
      }

      try {
        // B. Attempt to Refresh Token
        await $fetch('/auth/refresh', {
          baseURL: runtimeConfig.public.API_BASE_URL,
          method: 'POST', // Check your NestJS method (POST/GET)
          credentials: 'include'
        })

        // C. RECURSION: Retry the ORIGINAL request
        // We pass '_retry: true' so we don't loop forever if this fails again.
        return await $api<T>(url, { ...options, _retry: true })

      } catch (refreshError) {
        // D. Refresh failed? User is truly logged out.
        if (authStore.user) {
          await authStore.logout()
        }
        if (import.meta.client) {
          navigateTo('/')
        }
        throw refreshError
      }
    }

    // 4. Throw any other error (500, 404, etc.)
    throw error
  }
}