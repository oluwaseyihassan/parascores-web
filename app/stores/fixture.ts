import { defineStore } from 'pinia'
import type { Fixture } from '../types'
import type { ApiResponse } from './auth'

export interface UpdateFixtureData {
  homeScore?: number | null
  awayScore?: number | null
  homePenaltyScore?: number | null
  awayPenaltyScore?: number | null
  status?: string
  startTime?: string | null
}

export const useFixtureStore = defineStore('fixture', () => {
  const fixtures = ref<Fixture[]>([])
  const liveFixtures = ref<Fixture[]>([])
  const loading = ref(false)
  const generating = ref(false)
  const error = ref<string | null>(null)

  // Group fixtures by round
  const fixturesByRound = computed(() => {
    const grouped: Record<number, Fixture[]> = {}
    fixtures.value.forEach(fixture => {
      if (!grouped[fixture.round]) {
        grouped[fixture.round] = []
      }
      grouped[fixture.round]!.push(fixture)
    })
    // Sort by match number within each round
    Object.values(grouped).forEach(roundFixtures => {
      roundFixtures.sort((a, b) => a.matchNumber - b.matchNumber)
    })
    return grouped
  })

  const rounds = computed(() => {
    return Object.keys(fixturesByRound.value)
      .map(Number)
      .sort((a, b) => a - b)
  })

  // Get round display names (uses roundName from fixtures when available)
  const roundNames = computed(() => {
    const names: Record<number, string> = {}
    fixtures.value.forEach(fixture => {
      if (!names[fixture.round]) {
        // Use roundName if available (knockout rounds), otherwise fallback to "Round X"
        names[fixture.round] = fixture.roundName || `Round ${fixture.round}`
      }
    })
    return names
  })

  // Helper function to get round display name
  function getRoundDisplayName(round: number): string {
    return roundNames.value[round] || `Round ${round}`
  }

  // Fetch fixtures for a tournament
  async function fetchFixtures(tournamentId: string) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<{ rounds: { round: number; roundName: string; fixtures: Fixture[] }[] }>>(`/tournaments/${tournamentId}/fixtures`, {
        method: 'GET',
      })
      if (response.data && response.data.rounds) {
        // Flatten fixtures from all rounds into a single array
        fixtures.value = response.data.rounds.flatMap(r => r.fixtures)
      } else if (Array.isArray(response.data)) {
        // Fallback for old API response (if needed)
        fixtures.value = response.data
      }
      return response
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch fixtures'
      console.error('Fetch fixtures failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Generate fixtures for a tournament
  async function generateFixtures(tournamentId: string, options?: { teamsPerGroup?: number; numberOfGroups?: number; doubleRoundRobin?: boolean }) {
    generating.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<{ message: string; rounds: { round: number; roundName: string; fixtures: Fixture[] }[] }>>(`/tournaments/${tournamentId}/fixtures/generate`, {
        method: 'POST',
        body: options,
      })
      if (response.data?.rounds) {
        // Flatten fixtures from all rounds into a single array
        fixtures.value = response.data.rounds.flatMap(round => round.fixtures)
      }
      return response
    } catch (err: any) {
      error.value = err.message || 'Failed to generate fixtures'
      console.error('Generate fixtures failed:', err)
      throw err
    } finally {
      generating.value = false
    }
  }

  // Advance to knockout stage (for Hybrid tournaments)
  async function advanceToKnockout(tournamentId: string, qualifiedParticipantIds?: string[]) {
    generating.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<{ message: string; rounds: { round: number; roundName: string; fixtures: Fixture[] }[] }>>(`/tournaments/${tournamentId}/groups/advance`, {
        method: 'POST',
        body: { qualifiedParticipantIds }
      })
      
      if (response.data?.rounds) {
        // Append new knockout fixtures to existing fixtures
        // Note: The backend might return ALL fixtures or just new ones. 
        // Based on "reload fixtures" recommendation, maybe safer to re-fetch or append correctly.
        // If "rounds" contains only new rounds, we should append.
        // But usually "rounds" structure suggests complete set? 
        // Let's assume response.data.rounds contains the *new* rounds.
        // However, safest to just fetch all fixtures again to be sure, OR if the response contains all.
        // Let's rely on component to re-fetch or just append.
        // Valid strategy: add new ones.
        const newFixtures = response.data.rounds.flatMap(r => r.fixtures)
        
        // Avoid duplicates just in case
        const existingIds = new Set(fixtures.value.map(f => f.id))
        const uniqueNewFixtures = newFixtures.filter(f => !existingIds.has(f.id))
        
        fixtures.value = [...fixtures.value, ...uniqueNewFixtures]
      }
      return response
    } catch (err: any) {
      error.value = err.message || 'Failed to advance to knockout stage'
      console.error('Advance to knockout failed:', err)
      throw err
    } finally {
      generating.value = false
    }
  }

  // Update a fixture (e.g., enter scores)
  async function updateFixture(id: string, updates: UpdateFixtureData) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<Fixture>>(`/fixtures/${id}`, {
        method: 'PATCH',
        body: updates,
      })
      if (response.data) {
        const index = fixtures.value.findIndex(f => f.id === id)
        if (index !== -1) {
          fixtures.value[index] = response.data
        }
      }
      return response
    } catch (err: any) {
      error.value = err.message || 'Failed to update fixture'
      console.error('Update fixture failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Fetch all live fixtures across all tournaments
  async function fetchLiveFixtures() {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<Fixture[]>>('/fixtures/live', {
        method: 'GET',
      })
      if (response.data) {
        liveFixtures.value = response.data
      }
      return response
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch live fixtures'
      console.error('Fetch live fixtures failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Create a match event (goal, card, etc.)
  async function createMatchEvent(data: {
    fixtureId: string
    participantId: string
    playerId?: string | null
    relatedPlayerId?: string | null
    type: string
    minute?: number | null
    description?: string | null
  }) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<any>>(`/fixtures/${data.fixtureId}/events`, {
        method: 'POST',
        body: {
          participantId: data.participantId,
          playerId: data.playerId,
          relatedPlayerId: data.relatedPlayerId,
          type: data.type,
          minute: data.minute,
          description: data.description
        },
      })
      return response
    } catch (err: any) {
      error.value = err.message || 'Failed to create match event'
      console.error('Create match event failed:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Clear fixtures
  function clearFixtures() {
    fixtures.value = []
    liveFixtures.value = []
    error.value = null
  }

  return {
    // State
    fixtures,
    liveFixtures,
    loading,
    generating,
    error,
    // Getters
    fixturesByRound,
    rounds,
    roundNames,
    // Helper functions
    getRoundDisplayName,
    // Actions
    fetchFixtures,
    fetchLiveFixtures,
    generateFixtures,
    updateFixture,
    createMatchEvent,
    clearFixtures,
    advanceToKnockout
  }
})
