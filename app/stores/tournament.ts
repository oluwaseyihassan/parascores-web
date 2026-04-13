import { defineStore } from 'pinia'
import type { Tournament } from '../types'
import type { ApiResponse } from './auth'

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  success: boolean
  message: string
  data: T[]
  pagination: Pagination
  timestamp: string
}

export const useTournamentStore = defineStore('tournament', () => {
  const tournaments = ref<Tournament[]>([])
  const followedTournaments = ref<Tournament[]>([])
  const currentTournament = ref<Tournament | null>(null)
  const loading = ref(false)
  const followedLoading = ref(false)
  const error = ref<string | null>(null)
  const pagination = ref<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })

  // Computed properties
  const getTournamentById = computed(() => {
    return (id: string) => tournaments.value.find(t => t.id === id)
  })

  const publicTournaments = computed(() => {
    return tournaments.value.filter(t => t.visibility === 'PUBLIC')
  })

  const hasMore = computed(() => pagination.value.page < pagination.value.totalPages)
  const totalCount = computed(() => pagination.value.total)

  // Actions
  async function fetchTournaments(params: { page?: number; limit?: number; append?: boolean, organizationId?: string } = {}) {
    const { page = 1, limit = 10, append = false, organizationId } = params
    loading.value = true
    error.value = null
    try {
      const authStore = useAuthStore()
      const orgId = organizationId || authStore.activeOrganizationId
      let url = `/tournaments/mine?page=${page}&limit=${limit}`
      if (orgId) {
        url += `&organizationId=${orgId}`
      }
      const response = await $api<PaginatedResponse<Tournament>>(url, {
        method: 'GET',
      })
      if (response.data) {
        if (append) {
          tournaments.value = [...tournaments.value, ...response.data]
        } else {
          tournaments.value = response.data
        }
      }
      if (response.pagination) {
        pagination.value = response.pagination
      }
      return response
    } catch (err: any) {
      error.value = err.data?.message || err.message || 'Failed to fetch tournaments'
      console.error('Fetch tournaments failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function loadMore() {
    if (!hasMore.value || loading.value) return
    await fetchTournaments({ 
      page: pagination.value.page + 1, 
      limit: pagination.value.limit, 
      append: true 
    })
  }

  async function fetchTournament(id: string) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<Tournament>>(`/tournaments/${id}`, {
        method: 'GET',
      })
      if (response.data) {
        currentTournament.value = response.data
        // Update in list if exists
        const index = tournaments.value.findIndex(t => t.id === id)
        if (index !== -1) {
          tournaments.value[index] = response.data
        }
      }
      return response
    } catch (err: any) {
      error.value = err.data?.message || err.message || 'Failed to fetch tournament'
      console.error('Fetch tournament failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createTournament(data: Partial<Tournament>) {
    loading.value = true
    error.value = null
    try {
      const authStore = useAuthStore()
      const body = {
        ...data,
        organization_id: data.organization_id || authStore.activeOrganizationId
      }
      const response = await $api<ApiResponse<Tournament>>('/tournaments', {
        method: 'POST',
        body,
      })
      if (response.data) {
        tournaments.value.push(response.data)
        currentTournament.value = response.data
      }
      return response
    } catch (err: any) {
      error.value = err.data?.message || err.message || 'Failed to create tournament'
      console.error('Create tournament failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function startSeason(id: string, data: { seasonName: string; start_date: string; end_date: string }) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<Tournament>>(`/tournaments/${id}/season`, {
        method: 'POST',
        body: data,
      })
      if (response.data) {
        tournaments.value.push(response.data)
      }
      return response
    } catch (err: any) {
      error.value = err.data?.message || err.message || 'Failed to start season'
      console.error('Start season failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateTournament(id: string, updates: Partial<Tournament>) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<Tournament>>(`/tournaments/${id}`, {
        method: 'PATCH',
        body: updates,
      })
      if (response.data) {
        // Update in list
        const index = tournaments.value.findIndex(t => t.id === id)
        if (index !== -1) {
          tournaments.value[index] = response.data
        }
        // Update current if same
        if (currentTournament.value?.id === id || currentTournament.value?.customName === id) {
          currentTournament.value = response.data
        }
      }
      return response
    } catch (err: any) {
      error.value = err.data?.message || err.message || 'Failed to update tournament'
      console.error('Update tournament failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteTournament(id: string) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<null>>(`/tournaments/${id}`, {
        method: 'DELETE',
      })
      // Remove from list
      tournaments.value = tournaments.value.filter(t => t.id !== id)
      // Clear current if same
      if (currentTournament.value?.id === id || currentTournament.value?.customName === id) {
        currentTournament.value = null
      }
      return response
    } catch (err: any) {
      error.value = err.data?.message || err.message || 'Failed to delete tournament'
      console.error('Delete tournament failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchFollowedTournaments(page: number = 1, limit: number = 20) {
    followedLoading.value = true
    try {
      const response = await $api<PaginatedResponse<Tournament>>(`/tournaments/following/mine?page=${page}&limit=${limit}`, {
        method: 'GET',
      })
      if (response.data) {
        followedTournaments.value = response.data
      }
      return response
    } catch (err: any) {
      console.error('Fetch followed tournaments failed:', err)
      throw err
    } finally {
      followedLoading.value = false
    }
  }

  async function followTournament(id: string) {
    const t = tournaments.value.find(x => x.id === id || x.customName === id) || (currentTournament.value?.id === id || currentTournament.value?.customName === id ? currentTournament.value : null)
    
    try {
      await $api(`/tournaments/${id}/follow`, { method: 'POST' })
    } catch (err: any) {
      if (err.data?.message !== 'Tournament already followed') {
        console.error('Follow tournament failed:', err)
        throw err
      }
    }
    
    if (t && !followedTournaments.value.some(x => x.id === t.id)) {
      followedTournaments.value.push(t)
    } else if (!t) {
      // Tournament not in local store (e.g. following from public page) — re-fetch to update sidebar
      await fetchFollowedTournaments()
    }
  }

  async function unfollowTournament(id: string) {
    try {
      await $api(`/tournaments/${id}/unfollow`, { method: 'DELETE' })
      followedTournaments.value = followedTournaments.value.filter(t => t.id !== id && t.customName !== id)
    } catch (err: any) {
      console.error('Unfollow tournament failed:', err)
      throw err
    }
  }

  function setCurrentTournament(tournament: Tournament | null) {
    currentTournament.value = tournament
  }

  function clearTournaments() {
    tournaments.value = []
    currentTournament.value = null
    error.value = null
    pagination.value = { page: 1, limit: 10, total: 0, totalPages: 0 }
  }

  return {
    // State
    tournaments,
    followedTournaments,
    currentTournament,
    loading,
    followedLoading,
    error,
    pagination,
    // Getters
    getTournamentById,
    publicTournaments,
    hasMore,
    totalCount,
    // Actions
    fetchTournaments,
    fetchTournament,
    loadMore,
    createTournament,
    startSeason,
    updateTournament,
    deleteTournament,
    fetchFollowedTournaments,
    followTournament,
    unfollowTournament,
    setCurrentTournament,
    clearTournaments,
  }
})
