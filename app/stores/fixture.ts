import { defineStore } from 'pinia'
import type { Fixture } from '../types'
import { FixtureStage, FixtureStatus } from '../types'
import type { ApiResponse } from './auth'

export interface UpdateFixtureData {
  homeTeamId?: string | null
  awayTeamId?: string | null
  homeTeamPlaceholder?: string | null
  awayTeamPlaceholder?: string | null
  homeScore?: number | null
  awayScore?: number | null
  homePenaltyScore?: number | null
  awayPenaltyScore?: number | null
  status?: string
  startTime?: string | null
  venue?: string | null
  lineupPlayerIds?: string[]
  homeFormation?: string | null
  awayFormation?: string | null
  lineupPositions?: Record<string, string> | null
  timerStartedAt?: string | null
  timerElapsedSeconds?: number | null
  timerIsRunning?: boolean | null
  matchDuration?: number
  manOfTheMatchPlayerId?: string | null
}

export interface CreateFixtureData {
  tournament_id: string
  homeTeamId: string
  awayTeamId: string
  round: number
  roundName?: string | null
  matchNumber?: number
  startTime?: string | null
  venue?: string | null
  groupId?: string | null
  stage?: string | null
  matchDuration?: number
}

export interface GenerateFixturesOptions {
  shuffleParticipants?: boolean
  clearExisting?: boolean
  numberOfGroups?: number
  teamsPerGroup?: number
  doubleRoundRobin?: boolean
  groupAssignments?: Record<string, string[]>
  useExistingGroups?: boolean
}

export const useFixtureStore = defineStore('fixture', () => {
  const { extractErrorMessage } = useErrors()
  const fixtures = ref<Fixture[]>([])
  const liveFixtures = ref<Fixture[]>([])
  const loading = ref(false)
  const generating = ref(false)
  const error = ref<string | null>(null)

  // Listen to SSE updates
  if (typeof window !== 'undefined') {
    window.addEventListener('live-match-update', (e: Event) => {
      const customEvent = e as CustomEvent
      const { type, data } = customEvent.detail

      if (type === 'fixture_updated') {
        const fixtureIdx = fixtures.value.findIndex(f => f.id === data.id)
        if (fixtureIdx !== -1) fixtures.value[fixtureIdx] = { ...fixtures.value[fixtureIdx], ...data }
        
        const liveIdx = liveFixtures.value.findIndex(f => f.id === data.id)
        if (liveIdx !== -1) {
          liveFixtures.value[liveIdx] = { ...liveFixtures.value[liveIdx], ...data }
          if (data.status !== FixtureStatus.LIVE) {
            liveFixtures.value.splice(liveIdx, 1) // Remove if no longer live
          }
        } else if (data.status === FixtureStatus.LIVE) {
          liveFixtures.value.push(data) // Add if newly live
        }
      }
    })
  }

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
        // Strip leg suffixes for display as column headers
        let baseName = fixture.roundName || `Round ${fixture.round}`
        baseName = baseName.replace(/^Group\s+Stage\s*-\s*/i, '')
        baseName = baseName.replace(/\s*([-–—]\s*)?Leg\s*\d+\s*$/i, '').trim()
        names[fixture.round] = baseName
      }
    })
    return names
  })

  // Stage-aware getters for hybrid tournaments
  const groupStageFixtures = computed(() =>
    fixtures.value.filter(f => f.stage === FixtureStage.GROUP_STAGE || !f.stage)
  )

  const knockoutFixtures = computed(() =>
    fixtures.value.filter(f => f.stage === FixtureStage.KNOCKOUT)
  )

  const knockoutFixturesByRound = computed(() => {
    const grouped: Record<number, Fixture[]> = {}
    knockoutFixtures.value.forEach(fixture => {
      if (!grouped[fixture.round]) {
        grouped[fixture.round] = []
      }
      grouped[fixture.round]!.push(fixture)
    })
    Object.values(grouped).forEach(roundFixtures => {
      roundFixtures.sort((a, b) => a.matchNumber - b.matchNumber)
    })
    return grouped
  })

  const knockoutRounds = computed(() =>
    Object.keys(knockoutFixturesByRound.value)
      .map(Number)
      .sort((a, b) => a - b)
  )

  const groupStageFixturesByRound = computed(() => {
    const grouped: Record<number, Fixture[]> = {}
    groupStageFixtures.value.forEach(fixture => {
      if (!grouped[fixture.round]) {
        grouped[fixture.round] = []
      }
      grouped[fixture.round]!.push(fixture)
    })
    Object.values(grouped).forEach(roundFixtures => {
      roundFixtures.sort((a, b) => a.matchNumber - b.matchNumber)
    })
    return grouped
  })

  const groupStageRounds = computed(() =>
    Object.keys(groupStageFixturesByRound.value)
      .map(Number)
      .sort((a, b) => a - b)
  )

  // Knockout-specific round display names (avoids collision with group stage rounds)
  const knockoutRoundNames = computed(() => {
    const names: Record<number, string> = {}
    knockoutFixtures.value.forEach(fixture => {
      if (!names[fixture.round]) {
        const baseName = (fixture.roundName || `Round ${fixture.round}`).replace(/\s*([-–—]\s*)?Leg\s*\d+\s*$/i, '').trim()
        names[fixture.round] = baseName
      }
    })
    return names
  })

  function getKnockoutRoundDisplayName(round: number): string {
    return knockoutRoundNames.value[round] || `Round ${round}`
  }

  // Group-stage-specific round display names
  const groupStageRoundNames = computed(() => {
    const names: Record<number, string> = {}
    groupStageFixtures.value.forEach(fixture => {
      if (!names[fixture.round]) {
        let baseName = fixture.roundName || `Matchday ${fixture.round}`
        baseName = baseName.replace(/^Group\s+Stage\s*-\s*/i, '')
        names[fixture.round] = baseName
      }
    })
    return names
  })

  function getGroupStageRoundDisplayName(round: number): string {
    return groupStageRoundNames.value[round] || `Matchday ${round}`
  }

  // Helper function to get round display name
  function getRoundDisplayName(round: number): string {
    return roundNames.value[round] || `Round ${round}`
  }

  // Fetch fixtures for a tournament
  async function fetchFixtures(tournamentId: string) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<{ rounds: { round: number; roundName: string; fixtures: Fixture[] }[] }>>(`/fixtures/tournaments/${tournamentId}`, {
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
      error.value = extractErrorMessage(err)
      console.error('Fetch fixtures failed:', error.value)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Generate fixtures for a tournament
  async function generateFixtures(tournamentId: string, options?: GenerateFixturesOptions) {
    generating.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<{ message: string; rounds: { round: number; roundName: string; fixtures: Fixture[] }[] }>>(`/fixtures/tournaments/${tournamentId}/generate`, {
        method: 'POST',
        body: options,
      })
      if (response.data?.rounds) {
        // Flatten fixtures from all rounds into a single array
        fixtures.value = response.data.rounds.flatMap(round => round.fixtures)
      }
      return response
    } catch (err: any) {
      error.value = extractErrorMessage(err)
      console.error('Generate fixtures failed:', error.value)
      throw err
    } finally {
      generating.value = false
    }
  }

  // Advance to knockout stage (for Hybrid tournaments)
  async function advanceToKnockout(tournamentId: string, qualifiedParticipantIds?: string[], manualSeeding?: string[]) {
    generating.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<{ message: string; rounds: { round: number; roundName: string; fixtures: Fixture[] }[] }>>(`/fixtures/tournaments/${tournamentId}/groups/advance`, {
        method: 'POST',
        body: { qualifiedParticipantIds, manualSeeding }
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
      error.value = extractErrorMessage(err)
      console.error('Advance to knockout failed:', error.value)
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
      error.value = extractErrorMessage(err)
      console.error('Update fixture failed:', error.value)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Fetch all live fixtures (optionally filtered by organization)
  async function fetchLiveFixtures(organizationId?: string) {
    loading.value = true
    error.value = null
    try {
      const url = organizationId
        ? `/fixtures/live?organizationId=${organizationId}`
        : '/fixtures/live'
      const response = await $api<ApiResponse<Fixture[]>>(url, {
        method: 'GET',
      })
      if (response.data) {
        liveFixtures.value = response.data
      }
      return response
    } catch (err: any) {
      error.value = extractErrorMessage(err)
      console.error('Fetch live fixtures failed:', error.value)
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
    relatedParticipantId?: string | null
    type: string
    minute?: number | null
    description?: string | null
  }) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<any>>(`/match-events/fixture/${data.fixtureId}`, {
        method: 'POST',
        body: {
          participantId: data.participantId,
          playerId: data.playerId || null,
          relatedPlayerId: data.relatedPlayerId || null,
          relatedParticipantId: data.relatedParticipantId || null,
          type: data.type,
          minute: data.minute,
          description: data.description
        },
      })
      return response
    } catch (err: any) {
      error.value = extractErrorMessage(err)
      console.error('Create match event failed:', error.value)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Update a match event
  async function updateMatchEvent(eventId: string, data: {
    participantId?: string
    playerId?: string | null
    relatedPlayerId?: string | null
    type?: string
    minute?: number | null
    description?: string | null
  }) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<any>>(`/match-events/${eventId}`, {
        method: 'PATCH',
        body: {
          ...data,
          playerId: data.playerId === undefined ? undefined : (data.playerId || null),
          relatedPlayerId: data.relatedPlayerId === undefined ? undefined : (data.relatedPlayerId || null),
        },
      })
      return response
    } catch (err: any) {
      error.value = extractErrorMessage(err)
      console.error('Update match event failed:', error.value)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Delete a match event
  async function deleteMatchEvent(eventId: string) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<any>>(`/match-events/${eventId}`, {
        method: 'DELETE',
      })
      return response
    } catch (err: any) {
      error.value = extractErrorMessage(err)
      console.error('Delete match event failed:', error.value)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Delete all fixtures for a tournament
  async function deleteAllFixtures(tournamentId: string, stage?: string) {
    loading.value = true
    error.value = null
    try {
      const url = stage ? `/fixtures/tournaments/${tournamentId}?stage=${stage}` : `/fixtures/tournaments/${tournamentId}`
      const response = await $api<ApiResponse<{ message: string }>>(url, {
        method: 'DELETE',
      })
      // Clear relevant local state
      if (stage) {
        fixtures.value = fixtures.value.filter(f => f.stage !== stage)
      } else {
        fixtures.value = []
      }
      return response
    } catch (err: any) {
      error.value = extractErrorMessage(err)
      console.error('Clear fixtures failed:', error.value)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Create a single fixture manually
  async function createFixture(data: CreateFixtureData) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<Fixture>>(`/fixtures`, {
        method: 'POST',
        body: data,
      })
      if (response.data) {
        fixtures.value.push(response.data)
      }
      return response
    } catch (err: any) {
      error.value = extractErrorMessage(err)
      console.error('Create fixture failed:', error.value)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Delete a specific fixture
  async function deleteFixture(fixtureId: string) {
    loading.value = true
    error.value = null
    try {
      const response = await $api<ApiResponse<{ message: string }>>(`/fixtures/${fixtureId}`, {
        method: 'DELETE',
      })
      if (response.success) {
        fixtures.value = fixtures.value.filter(f => f.id !== fixtureId)
      }
      return response
    } catch (err: any) {
      error.value = extractErrorMessage(err)
      console.error('Delete fixture failed:', error.value)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Clear local fixtures state
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
    groupStageFixtures,
    knockoutFixtures,
    knockoutFixturesByRound,
    knockoutRounds,
    groupStageFixturesByRound,
    groupStageRounds,
    knockoutRoundNames,
    groupStageRoundNames,
    // Helper functions
    getRoundDisplayName,
    getKnockoutRoundDisplayName,
    getGroupStageRoundDisplayName,
    // Actions
    fetchFixtures,
    fetchLiveFixtures,
    generateFixtures,
    updateFixture,
    createMatchEvent,
    updateMatchEvent,
    deleteMatchEvent,
    clearFixtures,
    deleteAllFixtures,
    deleteFixture,
    advanceToKnockout,
    createFixture
  }
})
