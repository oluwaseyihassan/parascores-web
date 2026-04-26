import { defineStore } from 'pinia'
import type { Organization, Tournament, ApiResponse, PaginatedResponse } from '../types'

export const useOrganizationStore = defineStore('organization', () => {
  const { extractErrorMessage } = useErrors()
  const currentOrganization = ref<Organization | null>(null)
  const organizationTournaments = ref<Tournament[]>([])
  
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  const pagination = ref({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0
  })

  async function fetchPublicOrganization(slug: string) {
    loading.value = true
    error.value = null
    try {
      const response = await $publicApi<ApiResponse<Organization>>(`/organizations/public/${slug}`, {
        method: 'GET',
      })
      if (response.data) {
        currentOrganization.value = response.data
      }
      return response
    } catch (err: any) {
      error.value = extractErrorMessage(err)
      console.error('Fetch public organization failed:', error.value)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchOrganizationTournaments(slug: string, page: number = 1, limit: number = 12, append = false) {
    loading.value = true
    try {
      const response = await $publicApi<PaginatedResponse<Tournament>>(`/tournaments/public?page=${page}&limit=${limit}&organizationSlug=${slug}`, {
        method: 'GET',
      })
      if (response.data) {
        if (append) {
          organizationTournaments.value = [...organizationTournaments.value, ...response.data]
        } else {
          organizationTournaments.value = response.data
        }
      }
      if (response.pagination) {
        pagination.value = response.pagination
      }
      return response
    } catch (err: any) {
      console.error('Fetch organization tournaments failed:', extractErrorMessage(err))
      throw err
    } finally {
      loading.value = false
    }
  }

  function clearOrganization() {
    currentOrganization.value = null
    organizationTournaments.value = []
    error.value = null
    pagination.value = { page: 1, limit: 12, total: 0, totalPages: 0 }
  }

  return {
    currentOrganization,
    organizationTournaments,
    loading,
    error,
    pagination,
    fetchPublicOrganization,
    fetchOrganizationTournaments,
    clearOrganization
  }
})
