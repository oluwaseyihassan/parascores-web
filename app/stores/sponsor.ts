import { defineStore } from 'pinia'
import type { Sponsor } from '../types'
import type { ApiResponse } from './auth'

export interface CreateSponsorData {
  name: string
  logoUrl?: string | null
  websiteUrl?: string | null
}

export const useSponsorStore = defineStore('sponsor', () => {
  const sponsors = ref<Sponsor[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Fetch sponsors for a tournament
  async function fetchSponsors(tournamentId: string) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<Sponsor[]>>(`/tournaments/${tournamentId}/sponsors`, {
        method: 'GET',
      })
      if (response.data) {
        sponsors.value = response.data
      }
      return response
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch sponsors'
      console.error('Fetch sponsors failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Add a sponsor to a tournament
  async function addSponsor(tournamentId: string, data: CreateSponsorData) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<Sponsor>>(`/tournaments/${tournamentId}/sponsors`, {
        method: 'POST',
        body: data,
      })
      if (response.data) {
        sponsors.value.push(response.data)
      }
      return response
    } catch (err: any) {
      error.value = err.message || 'Failed to add sponsor'
      console.error('Add sponsor failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Update a sponsor
  async function updateSponsor(tournamentId: string, sponsorId: string, updates: Partial<CreateSponsorData>) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<Sponsor>>(`/tournaments/${tournamentId}/sponsors/${sponsorId}`, {
        method: 'PATCH',
        body: updates,
      })
      if (response.data) {
        const index = sponsors.value.findIndex(s => s.id === sponsorId)
        if (index !== -1) {
          sponsors.value[index] = response.data
        }
      }
      return response
    } catch (err: any) {
      error.value = err.message || 'Failed to update sponsor'
      console.error('Update sponsor failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Remove a sponsor
  async function removeSponsor(tournamentId: string, sponsorId: string) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<null>>(`/tournaments/${tournamentId}/sponsors/${sponsorId}`, {
        method: 'DELETE',
      })
      sponsors.value = sponsors.value.filter(s => s.id !== sponsorId)
      return response
    } catch (err: any) {
      error.value = err.message || 'Failed to remove sponsor'
      console.error('Remove sponsor failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Clear sponsors (useful when changing tournaments)
  function clearSponsors() {
    sponsors.value = []
    error.value = null
  }

  return {
    // State
    sponsors,
    loading,
    error,
    // Actions
    fetchSponsors,
    addSponsor,
    updateSponsor,
    removeSponsor,
    clearSponsors,
  }
})
