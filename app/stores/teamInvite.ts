import { defineStore } from 'pinia'
import type { TeamInvite } from '../types'
import type { ApiResponse } from './auth'

export const useTeamInviteStore = defineStore('teamInvite', () => {
  const invites = ref<TeamInvite[]>([])
  const currentInvite = ref<TeamInvite | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Create an invite link for a participant (team)
  async function createInvite(data: {
    participantId: string
    tournamentId: string
    maxUses?: number
    expiresAt?: string
  }) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<TeamInvite>>('/team-invites', {
        method: 'POST',
        body: data,
      })
      if (response.data) {
        invites.value.push(response.data)
      }
      return response
    } catch (err: any) {
      error.value = err.message || 'Failed to create invite'
      console.error('Create invite failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Get invite details by token (public, for the join page)
  async function getInviteByToken(token: string) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<TeamInvite>>(`/team-invites/token/${token}`, {
        method: 'GET',
      })
      if (response.data) {
        currentInvite.value = response.data
      }
      return response.data
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch invite details'
      console.error('Fetch invite failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Accept an invite and join the team
  async function acceptInvite(token: string, playerData: {
    name: string
    number?: number
    position?: string
    avatarUrl?: string
  }) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<any>>(`/team-invites/token/${token}/accept`, {
        method: 'POST',
        body: playerData,
      })
      return response.data
    } catch (err: any) {
      error.value = err.message || 'Failed to accept invite'
      console.error('Accept invite failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Revoke an invite
  async function revokeInvite(inviteId: string) {
    loading.value = true
    error.value = null
    try {
      await $api<ApiResponse<null>>(`/team-invites/${inviteId}`, {
        method: 'DELETE',
      })
      invites.value = invites.value.filter(i => i.id !== inviteId)
    } catch (err: any) {
      error.value = err.message || 'Failed to revoke invite'
      console.error('Revoke invite failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Fetch all invites for a participant (team)
  async function fetchInvitesForParticipant(participantId: string) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<TeamInvite[]>>(`/team-invites/participant/${participantId}`, {
        method: 'GET',
      })
      if (response.data) {
        invites.value = response.data
      }
      return response
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch invites'
      console.error('Fetch invites failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  function clearInvites() {
    invites.value = []
    currentInvite.value = null
    error.value = null
  }

  return {
    invites,
    currentInvite,
    loading,
    error,
    createInvite,
    getInviteByToken,
    acceptInvite,
    revokeInvite,
    fetchInvitesForParticipant,
    clearInvites,
  }
})
