import { defineStore } from 'pinia'
import type { Participant } from '../types'
import type { ApiResponse } from './auth'

export interface CreateParticipantData {
  customName: string
  logoUrl?: string | null
  seed?: number | null
}

export interface CreatePlayerData {
  name: string
  number?: number | null
  position?: string | null
}

export const useParticipantStore = defineStore('participant', () => {
  const participants = ref<Participant[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Fetch participants for a tournament
  async function fetchParticipants(tournamentId: string) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<Participant[]>>(`/participants/tournaments/${tournamentId}`, {
        method: 'GET',
      })
      if (response.data) {
        participants.value = response.data
      }
      return response
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch participants'
      console.error('Fetch participants failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Add a participant to a tournament
  async function addParticipant(tournamentId: string, data: CreateParticipantData) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<Participant>>(`/participants/tournaments/${tournamentId}`, {
        method: 'POST',
        body: data,
      })
      if (response.data) {
        participants.value.push(response.data)
      }
      return response
    } catch (err: any) {
      error.value = err.message || 'Failed to add participant'
      console.error('Add participant failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Update a participant
  async function updateParticipant(id: string, updates: Partial<CreateParticipantData>) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<Participant>>(`/participants/${id}`, {
        method: 'PATCH',
        body: updates,
      })
      if (response.data) {
        const index = participants.value.findIndex(p => p.id === id)
        if (index !== -1) {
          participants.value[index] = response.data
        }
      }
      return response
    } catch (err: any) {
      error.value = err.message || 'Failed to update participant'
      console.error('Update participant failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Remove a participant
  async function removeParticipant(id: string) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<null>>(`/participants/${id}`, {
        method: 'DELETE',
      })
      participants.value = participants.value.filter(p => p.id !== id)
      return response
    } catch (err: any) {
      error.value = err.message || 'Failed to remove participant'
      console.error('Remove participant failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Fetch players for a participant
  async function fetchPlayers(tournamentId: string, participantId: string) {
    // We don't set global loading here to avoid full page spinner when just opening a modal
    try {
      const response = await $api<ApiResponse<any[]>>(`/participants/${participantId}/players`, {
        method: 'GET',
      })
      if (response.data) {
        const index = participants.value.findIndex(p => p.id === participantId)
        if (index !== -1 && participants.value[index]) {
          participants.value[index]!.players = response.data
        }
      }
      return response
    } catch (err: any) {
      console.error('Fetch players failed:', err)
      throw err
    }
  }

  // Add a player to a participant
  async function addPlayer(tournamentId: string, participantId: string, data: CreatePlayerData) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<any>>(`/participants/${participantId}/players`, {
        method: 'POST',
        body: data,
      })
      if (response.data) {
        const index = participants.value.findIndex(p => p.id === participantId)
        if (index !== -1 && participants.value[index]) {
          if (!participants.value[index]!.players) {
            participants.value[index]!.players = []
          }
          participants.value[index]!.players!.push(response.data)
        }
      }
      return response
    } catch (err: any) {
      error.value = err.message || 'Failed to add player'
      console.error('Add player failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Clear participants (useful when changing tournaments)
  function clearParticipants() {
    participants.value = []
    error.value = null
  }

  return {
    // State
    participants,
    loading,
    error,
    // Actions
    fetchParticipants,
    addParticipant,
    updateParticipant,
    removeParticipant,
    addPlayer,
    fetchPlayers,
    clearParticipants,
  }
})
