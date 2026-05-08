import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Team {
  id: string
  name: string
  logoUrl?: string
  ownerId: string
  created_at: string
}

export const useTeamStore = defineStore('team', () => {
  const teams = ref<Team[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function loadMyTeams() {
    loading.value = true
    error.value = null
    try {
      const res = await $api<{ success: boolean, data: Team[] }>('/teams/mine')
      teams.value = res.data
    } catch (err: any) {
      error.value = err.data?.message || 'Failed to load teams'
    } finally {
      loading.value = false
    }
  }

  async function searchAllTeams(query?: string) {
    loading.value = true
    error.value = null
    try {
      const res = await $api<{ success: boolean, data: Team[] }>(`/teams${query ? `?q=${encodeURIComponent(query)}` : ''}`)
      return res.data
    } catch (err: any) {
      error.value = err.data?.message || 'Failed to search teams'
      return []
    } finally {
      loading.value = false
    }
  }

  async function createTeam(data: { name: string, logoUrl?: string }) {
    loading.value = true
    error.value = null
    try {
      const res = await $api<{ success: boolean, data: Team }>('/teams', {
        method: 'POST',
        body: data
      })
      teams.value.unshift(res.data)
      return res.data
    } catch (err: any) {
      error.value = err.data?.message || 'Failed to create team profile'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateTeam(id: string, data: Partial<{ name: string, logoUrl: string }>) {
    loading.value = true
    error.value = null
    try {
      const res = await $api<{ success: boolean, data: Team }>(`/teams/${id}`, {
        method: 'PATCH',
        body: data
      })
      const index = teams.value.findIndex(t => t.id === id)
      if (index !== -1) teams.value[index] = res.data
      return res.data
    } catch (err: any) {
      error.value = err.data?.message || 'Failed to update team profile'
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    teams,
    loading,
    error,
    loadMyTeams,
    searchAllTeams,
    createTeam,
    updateTeam
  }
})
