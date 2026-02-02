import { defineStore } from 'pinia'
import type { Standing } from '~/types'
import type { ApiResponse } from './auth'

export const useStandingStore = defineStore('standing', () => {
  const standings = ref<Standing[]>([])
  const loading = ref(false)
  const generating = ref(false)
  
  // Fetch standings for a tournament
  async function fetchStandings(tournamentId: string) {
    loading.value = true
    try {
      const response = await $api<ApiResponse<Standing[]>>(`/tournaments/${tournamentId}/standings`)
      
      if (response.error) throw new Error(response.message || 'Failed to fetch standings')
      
      if (response.data) {
        // Handle both direct array and nested object { standings: [...] }
        const data = response.data as any
        standings.value = Array.isArray(data) ? data : (data.standings || [])
      }
    } catch (error: any) {
      console.error('Failed to fetch standings:', error)
      throw error // Re-throw to handle in component
    } finally {
      loading.value = false
    }
  }
  
  // Generate standings (if backend supports manual trigger)
  // Usually standings are auto-updated on match completion, but this could be useful
  async function generateStandings(tournamentId: string) {
    generating.value = true
    try {
      const response = await $api<ApiResponse<Standing[]>>(`/tournaments/${tournamentId}/standings/calculate`, {
        method: 'POST'
      })
      
      if (response.error) throw new Error(response.message || 'Failed to generate standings')
      
      if (response.data) {
        standings.value = response.data || []
      }
      return response.data
    } catch (error: any) {
      console.error('Failed to generate standings:', error)
      throw error
    } finally {
      generating.value = false
    }
  }
  
  // Getters
  const getStandingsByGroup = computed(() => {
    const grouped: Record<string, Standing[]> = {}
    
    standings.value.forEach(standing => {
      const group = standing.group || 'default'
      if (!grouped[group]) {
        grouped[group] = []
      }
      grouped[group].push(standing)
    })
    
    // Sort each group by position
    Object.keys(grouped).forEach(key => {
      grouped[key]!.sort((a, b) => (a.position || 0) - (b.position || 0))
    })
    
    return grouped
  })

  return {
    standings,
    loading,
    generating,
    fetchStandings,
    generateStandings,
    getStandingsByGroup
  }
})
