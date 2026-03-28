import { defineStore } from 'pinia'
import type { Venue } from '../types'
import type { ApiResponse } from './auth'

export const useVenueStore = defineStore('venue', () => {
  const venues = ref<Venue[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Fetch venues for a tournament
  async function fetchVenues(tournamentId: string) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<Venue[]>>(`/venues/tournaments/${tournamentId}`, {
        method: 'GET',
      })
      if (response.data) {
        venues.value = response.data
      }
      return response
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch venues'
      console.error('Fetch venues failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Add a venue to a tournament
  async function addVenue(tournamentId: string, name: string) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<Venue>>(`/venues/tournaments/${tournamentId}`, {
        method: 'POST',
        body: { name },
      })
      if (response.data) {
        venues.value.push(response.data)
      }
      return response
    } catch (err: any) {
      error.value = err.message || 'Failed to add venue'
      console.error('Add venue failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Remove a venue
  async function removeVenue(venueId: string) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<null>>(`/venues/${venueId}`, {
        method: 'DELETE',
      })
      venues.value = venues.value.filter(v => v.id !== venueId)
      return response
    } catch (err: any) {
      error.value = err.message || 'Failed to remove venue'
      console.error('Remove venue failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  function clearVenues() {
    venues.value = []
    error.value = null
  }

  return {
    venues,
    loading,
    error,
    fetchVenues,
    addVenue,
    removeVenue,
    clearVenues,
  }
})
