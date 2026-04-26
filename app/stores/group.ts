import { defineStore } from 'pinia'
import type { Group, Participant } from '../types'
import type { ApiResponse } from './auth'

export interface CreateGroupData {
  name: string
  tournament_id: string
}

export const useGroupStore = defineStore('group', () => {
  const { extractErrorMessage } = useErrors()
  const groups = ref<Group[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Fetch groups for a tournament
  async function fetchGroups(tournamentId: string) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<Group[]>>(`/groups/tournaments/${tournamentId}`, {
        method: 'GET',
      })
      if (response.data) {
        groups.value = response.data
      }
      return response
    } catch (err: any) {
      error.value = extractErrorMessage(err)
      console.error('Fetch groups failed:', error.value)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Create a new group
  async function createGroup(data: CreateGroupData) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<Group>>('/groups', {
        method: 'POST',
        body: data,
      })
      if (response.data) {
        groups.value.push(response.data)
      }
      return response
    } catch (err: any) {
      error.value = extractErrorMessage(err)
      console.error('Create group failed:', error.value)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Update a group
  async function updateGroup(id: string, updates: Partial<CreateGroupData>) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<Group>>(`/groups/${id}`, {
        method: 'PATCH',
        body: updates,
      })
      if (response.data) {
        const index = groups.value.findIndex(g => g.id === id)
        if (index !== -1) {
          groups.value[index] = response.data
        }
      }
      return response
    } catch (err: any) {
      error.value = extractErrorMessage(err)
      console.error('Update group failed:', error.value)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Delete a group
  async function deleteGroup(id: string) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<null>>(`/groups/${id}`, {
        method: 'DELETE',
      })
      groups.value = groups.value.filter(g => g.id !== id)
      return response
    } catch (err: any) {
      error.value = extractErrorMessage(err)
      console.error('Delete group failed:', error.value)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Assign participant to group
  async function assignParticipant(participantId: string, groupId: string | null) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<Participant>>(`/participants/${participantId}`, {
        method: 'PATCH',
        body: { groupId },
      })
      
      // Update participant in all groups if they were there
      groups.value.forEach(group => {
        if (group.participants) {
          group.participants = group.participants.filter(p => p.id !== participantId)
        }
        if (group.id === groupId && response.data) {
          if (!group.participants) group.participants = []
          group.participants.push(response.data)
        }
      })
      
      return response
    } catch (err: any) {
      error.value = extractErrorMessage(err)
      console.error('Assign participant failed:', error.value)
      throw err
    } finally {
      loading.value = false
    }
  }

  function clearGroups() {
    groups.value = []
    error.value = null
  }

  return {
    groups,
    loading,
    error,
    fetchGroups,
    createGroup,
    updateGroup,
    deleteGroup,
    assignParticipant,
    clearGroups
  }
})
