import { defineStore } from 'pinia'
import type { Participant } from '../types'
import type { ApiResponse } from './auth'

export interface CreateParticipantData {
  customName: string
  logoUrl?: string | null
  seed?: number | null
  groupId?: string | null
  teamId?: string | null
}

export interface CreatePlayerData {
  name: string
  number?: number | null
  position?: string | null
}

export const useParticipantStore = defineStore('participant', () => {
  const { extractErrorMessage } = useErrors()
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
      error.value = extractErrorMessage(err)
      console.error('Fetch participants failed:', error.value)
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
      error.value = extractErrorMessage(err)
      console.error('Add participant failed:', error.value)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Add multiple participants in bulk
  async function addParticipantsBulk(tournamentId: string, data: { participants: CreateParticipantData[] }) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<Participant[]>>(`/participants/tournaments/${tournamentId}/bulk`, {
        method: 'POST',
        body: data,
      })
      if (response.data) {
        participants.value = response.data
      }
      return response
    } catch (err: any) {
      error.value = extractErrorMessage(err)
      console.error('Bulk add participants failed:', error.value)
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
      error.value = extractErrorMessage(err)
      console.error('Update participant failed:', error.value)
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
      error.value = extractErrorMessage(err)
      console.error('Remove participant failed:', error.value)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Fetch players for a participant independently
  async function fetchParticipantPlayers(participantId: string) {
    try {
      const response = await $api<ApiResponse<any[]>>(`/players/participant/${participantId}`, {
        method: 'GET',
      })
      return response.data || []
    } catch (err: any) {
      console.error('Fetch participant players failed:', extractErrorMessage(err))
      return []
    }
  }

  // Add a player to a participant
  async function addPlayer(tournamentId: string, participantId: string, data: CreatePlayerData) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<any>>(`/players`, {
        method: 'POST',
        body: { ...data, participantId },
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
      error.value = extractErrorMessage(err)
      console.error('Add player failed:', error.value)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Add players in bulk to a participant
  async function addPlayersBulk(participantId: string, data: { players: CreatePlayerData[] }) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<any>>(`/participants/${participantId}/players/bulk`, {
        method: 'POST',
        body: data,
      })
      if (response.data) {
        const index = participants.value.findIndex(p => p.id === participantId)
        if (index !== -1 && participants.value[index]) {
          participants.value[index]!.players = response.data
        }
      }
      return response
    } catch (err: any) {
      error.value = extractErrorMessage(err)
      console.error('Bulk add players failed:', error.value)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Update a player
  async function updatePlayer(participantId: string, playerId: string, updates: Partial<CreatePlayerData>) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<any>>(`/players/${playerId}`, {
        method: 'PATCH',
        body: updates,
      })
      if (response.data) {
        const pIndex = participants.value.findIndex(p => p.id === participantId)
        if (pIndex !== -1 && participants.value[pIndex]?.players) {
          const players = participants.value[pIndex]!.players!
          const playerIdx = players.findIndex((p: any) => p.id === playerId)
          if (playerIdx !== -1) {
            players[playerIdx] = { ...players[playerIdx], ...response.data }
          }
        }
      }
      return response
    } catch (err: any) {
      error.value = extractErrorMessage(err)
      console.error('Update player failed:', error.value)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Update participant status (approve/reject)
  async function updateParticipantStatus(id: string, status: string) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<Participant>>(`/participants/${id}/status`, {
        method: 'PATCH',
        body: { status },
      })
      if (response.data) {
        const index = participants.value.findIndex(p => p.id === id)
        if (index !== -1) {
          participants.value[index] = response.data
        }
      }
      return response
    } catch (err: any) {
      error.value = extractErrorMessage(err)
      console.error('Update participant status failed:', error.value)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Update player status (approve/reject)
  async function updatePlayerStatus(participantId: string, playerId: string, status: string) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<any>>(`/participants/${participantId}/players/${playerId}/status`, {
        method: 'PATCH',
        body: { status },
      })
      const pIndex = participants.value.findIndex(p => p.id === participantId)
      if (pIndex !== -1 && participants.value[pIndex]?.players) {
        if (response.data) {
          const players = participants.value[pIndex]!.players!
          const playerIdx = players.findIndex((p: any) => p.id === playerId)
          if (playerIdx !== -1) {
            players[playerIdx] = { ...players[playerIdx], ...response.data }
          }
        } else if (status === 'REJECTED') {
          participants.value[pIndex]!.players = participants.value[pIndex]!.players!.filter(
            (p: any) => p.id !== playerId
          )
        }
      }
      return response
    } catch (err: any) {
      error.value = extractErrorMessage(err)
      console.error('Update player status failed:', error.value)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Remove a player
  async function removePlayer(participantId: string, playerId: string) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<any>>(`/participants/${participantId}/players/${playerId}`, {
        method: 'DELETE',
      })
      const pIndex = participants.value.findIndex(p => p.id === participantId)
      if (pIndex !== -1 && participants.value[pIndex]?.players) {
        participants.value[pIndex]!.players = participants.value[pIndex]!.players!.filter(
          (p: any) => p.id !== playerId
        )
      }
      return response
    } catch (err: any) {
      error.value = extractErrorMessage(err)
      console.error('Remove player failed:', error.value)
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
    updateParticipantStatus,
    addPlayer,
    addPlayersBulk,
    updatePlayer,
    removePlayer,
    updatePlayerStatus,
    fetchParticipantPlayers,
    addParticipantsBulk,
    clearParticipants,
  }
})
