import { defineStore } from 'pinia'
import type { Social } from '../types'
import type { ApiResponse } from './auth'

export interface CreateSocialData {
  platform: string
  url: string
  handle?: string | null
}

export const useSocialStore = defineStore('social', () => {
  const socials = ref<Social[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Fetch socials for a tournament
  async function fetchSocials(tournamentId: string) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<Social[]>>(`/tournaments/${tournamentId}/socials`, {
        method: 'GET',
      })
      if (response.data) {
        socials.value = response.data
      }
      return response
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch socials'
      console.error('Fetch socials failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Add a social link to a tournament
  async function addSocial(tournamentId: string, data: CreateSocialData) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<Social>>(`/tournaments/${tournamentId}/socials`, {
        method: 'POST',
        body: data,
      })
      if (response.data) {
        socials.value.push(response.data)
      }
      return response
    } catch (err: any) {
      error.value = err.message || 'Failed to add social'
      console.error('Add social failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Update a social link
  async function updateSocial(tournamentId: string, socialId: string, updates: Partial<CreateSocialData>) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<Social>>(`/tournaments/${tournamentId}/socials/${socialId}`, {
        method: 'PATCH',
        body: updates,
      })
      if (response.data) {
        const index = socials.value.findIndex(s => s.id === socialId)
        if (index !== -1) {
          socials.value[index] = response.data
        }
      }
      return response
    } catch (err: any) {
      error.value = err.message || 'Failed to update social'
      console.error('Update social failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Remove a social link
  async function removeSocial(tournamentId: string, socialId: string) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<null>>(`/tournaments/${tournamentId}/socials/${socialId}`, {
        method: 'DELETE',
      })
      socials.value = socials.value.filter(s => s.id !== socialId)
      return response
    } catch (err: any) {
      error.value = err.message || 'Failed to remove social'
      console.error('Remove social failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Clear socials (useful when changing tournaments)
  function clearSocials() {
    socials.value = []
    error.value = null
  }

  return {
    // State
    socials,
    loading,
    error,
    // Actions
    fetchSocials,
    addSocial,
    updateSocial,
    removeSocial,
    clearSocials,
  }
})
