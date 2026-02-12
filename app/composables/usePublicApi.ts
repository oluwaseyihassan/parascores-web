import type { FetchOptions } from 'ofetch'

/**
 * Lightweight API helper for public (unauthenticated) endpoints.
 * Does NOT attach auth cookies or attempt token refresh.
 */
export async function $publicApi<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const runtimeConfig = useRuntimeConfig()

  return await $fetch<T>(url, {
    baseURL: runtimeConfig.public.API_BASE_URL,
    ...options,
    method: options.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | undefined,
  })
}
