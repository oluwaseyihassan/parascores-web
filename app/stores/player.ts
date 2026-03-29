import { defineStore } from 'pinia'
import type { Player } from '../types'
import type { ApiResponse } from './auth'

export const usePlayerStore = defineStore('player', () => {
  const myProfiles = ref<Player[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Fetch player profiles for the logged-in user
  async function fetchMyProfiles() {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<Player[]>>('/players/me', {
        method: 'GET',
      })
      if (response.data) {
        myProfiles.value = response.data
      }
      return response
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch player profiles'
      console.error('Fetch player profiles failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Fetch player profiles by user ID (public)
  async function fetchByUserId(userId: string) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<Player[]>>(`/players/user/${userId}`, {
        method: 'GET',
      })
      return response.data || []
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch player profiles'
      console.error('Fetch player profiles failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Update a player profile
  async function updateProfile(playerId: string, data: Partial<Player>) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<Player>>(`/players/${playerId}`, {
        method: 'PATCH',
        body: data,
      })
      if (response.data) {
        const idx = myProfiles.value.findIndex(p => p.id === playerId)
        if (idx !== -1) {
          myProfiles.value[idx] = response.data
        }
      }
      return response
    } catch (err: any) {
      error.value = err.message || 'Failed to update player profile'
      console.error('Update player profile failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Get a single player profile by ID (public)
  async function fetchPlayer(playerId: string) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<Player>>(`/players/${playerId}`, {
        method: 'GET',
      })
      return response.data
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch player'
      console.error('Fetch player failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  function clearProfiles() {
    myProfiles.value = []
    error.value = null
  }

  return {
    myProfiles,
    loading,
    error,
    fetchMyProfiles,
    fetchByUserId,
    updateProfile,
    fetchPlayer,
    clearProfiles,
  }
})
