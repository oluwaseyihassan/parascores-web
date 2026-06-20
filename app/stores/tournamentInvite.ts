import { defineStore } from 'pinia'
import type { TournamentInvite } from '../types'
import { ref } from 'vue'

export const useTournamentInviteStore = defineStore('tournamentInvite', () => {
  const invites = ref<TournamentInvite[]>([])
  const currentInvite = ref<TournamentInvite | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Generate a new invite
  const createInvite = async (
    tournamentId: string,
    config: { maxUses?: number; expiresAt?: string }
  ) => {
    loading.value = true
    error.value = null
    try {
      const response = await $api<{ success: boolean; data: TournamentInvite }>('/tournament-invites', {
        method: 'POST',
        body: {
          tournamentId,
          maxUses: config.maxUses,
          expiresAt: config.expiresAt,
        },
      })

      if (response.data) {
        invites.value.unshift(response.data)
        return response.data
      }
      return null
    } catch (err: any) {
      error.value = err.data?.message || 'Failed to create invite'
      throw err
    } finally {
      loading.value = false
    }
  }

  // Get invite details publicly
  const getInviteByToken = async (token: string) => {
    loading.value = true
    error.value = null
    try {
      const response = await $api<{ success: boolean; data: TournamentInvite }>(`/tournament-invites/token/${token}`, {
        method: 'GET',
      })

      if (response.data) {
        currentInvite.value = response.data
        return response.data
      }
      return null
    } catch (err: any) {
      error.value = err.data?.message || 'Failed to load invite details'
      throw err
    } finally {
      loading.value = false
    }
  }

  // Accept an invite (Join team)
  const acceptInvite = async (
    token: string,
    data: { customName?: string; customShortName?: string; logoUrl?: string; teamId?: string }
  ) => {
    loading.value = true
    error.value = null
    try {
      const response = await $api<{
        success: boolean
        data: {
          participant: any
          tournament: any
          status: string
          message: string
        }
      }>(`/tournament-invites/token/${token}/accept`, {
        method: 'POST',
        body: data,
      })

      return response.data
    } catch (err: any) {
      error.value = err.data?.message || 'Failed to accept invite'
      throw err
    } finally {
      loading.value = false
    }
  }

  // Revoke an invite
  const revokeInvite = async (inviteId: string) => {
    loading.value = true
    error.value = null
    try {
      await $api(`/tournament-invites/${inviteId}`, {
        method: 'DELETE',
      })

      // Update local state
      const invite = invites.value.find((i) => i.id === inviteId)
      if (invite) {
        invite.isActive = false
      }
      
      return true
    } catch (err: any) {
      error.value = err.data?.message || 'Failed to revoke invite'
      throw err
    } finally {
      loading.value = false
    }
  }

  // Load invites for a tournament
  const loadInvitesForTournament = async (tournamentId: string) => {
    loading.value = true
    error.value = null
    try {
      const response = await $api<{ success: boolean; data: TournamentInvite[] }>(`/tournament-invites/tournament/${tournamentId}`, {
        method: 'GET',
      })

      if (response.data) {
        invites.value = response.data
      }
    } catch (err: any) {
      error.value = err.data?.message || 'Failed to load invites'
      throw err
    } finally {
      loading.value = false
    }
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
    loadInvitesForTournament,
  }
})
