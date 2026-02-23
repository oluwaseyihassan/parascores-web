<script setup lang="ts">
import { FixtureStatus, MatchEventType, ParticipantType } from '~/types'
import type { Fixture, Player, MatchEvent } from '~/types'

const props = withDefaults(defineProps<{
  fixture: Fixture | null
  open: boolean
  tournament?: any 
}>(), {
  fixture: null,
  open: false,
  tournament: null
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  'fixture-updated': [fixture: Fixture]
  'match-ended': []
}>()

const fixtureStore = useFixtureStore()
const standingStore = useStandingStore()

// Local state
const selectedFixture = ref<Fixture | null>(null)
const updatingMatch = ref(false)
const homePlayers = ref<Player[]>([])
const awayPlayers = ref<Player[]>([])
const loadingPlayers = ref(false)
const matchEvents = ref<MatchEvent[]>([])
const loadingEvents = ref(false)
const showEventsCollapsible = ref(true)
const showPenaltyCollapsible = ref(true)
const errorMessage = ref<string | null>(null)

// Goal scoring modal
const showGoalModal = ref(false)
const scoringTeam = ref<'home' | 'away'>('home')
const goalData = reactive({
  scorerId: undefined as string | undefined,
  assisterId: undefined as string | undefined,
  minute: null as number | null
})

// Edit event modal
const showEditEventModal = ref(false)
const eventBeingEdited = ref<MatchEvent | null>(null)
const editEventData = reactive({
  minute: null as number | null,
  playerId: undefined as string | undefined,
  relatedPlayerId: undefined as string | undefined,
})

// Watchers for mutual exclusion between scorer and assister
watch(() => goalData.scorerId, (newId) => {
  if (newId && newId === goalData.assisterId) {
    goalData.assisterId = undefined
  }
})

watch(() => goalData.assisterId, (newId) => {
  if (newId && newId === goalData.scorerId) {
    goalData.scorerId = undefined
  }
})

watch(() => editEventData.playerId, (newId) => {
  if (newId && newId === editEventData.relatedPlayerId) {
    editEventData.relatedPlayerId = undefined
  }
})

watch(() => editEventData.relatedPlayerId, (newId) => {
  if (newId && newId === editEventData.playerId) {
    editEventData.playerId = undefined
  }
})


// Fixture status colors
const fixtureStatusColors: Record<FixtureStatus, 'info' | 'success' | 'warning' | 'neutral'> = {
  [FixtureStatus.SCHEDULED]: 'info',
  [FixtureStatus.LIVE]: 'warning',
  [FixtureStatus.COMPLETED]: 'success',
  [FixtureStatus.CANCELLED]: 'neutral'
}

// Watch for fixture changes
watch(() => props.fixture, async (newFixture) => {
  if (newFixture && props.open) {
    selectedFixture.value = { ...newFixture }
    await loadMatchData(newFixture)
  }
}, { immediate: true })

watch(() => props.open, async (isOpen) => {
  if (isOpen && props.fixture) {
    errorMessage.value = null
    selectedFixture.value = { ...props.fixture }
    await loadMatchData(props.fixture)
  } else if (!isOpen) {
    // Reset state when closing
    errorMessage.value = null
    matchEvents.value = []
    homePlayers.value = []
    awayPlayers.value = []
  }
})

const loadMatchData = async (fixture: Fixture) => {
  matchEvents.value = []
  loadingPlayers.value = true
  loadingEvents.value = true
  
  try {
    const promises: Promise<any>[] = []
    
    if (fixture.homeTeamId) {
      promises.push(
        $api<any>(`/participants/${fixture.homeTeamId}/players`)
          .then(res => { homePlayers.value = res.data || [] })
          .catch(e => { console.error('Error fetching home players:', e); homePlayers.value = [] })
      )
    }

    if (fixture.awayTeamId) {
      promises.push(
        $api<any>(`/participants/${fixture.awayTeamId}/players`)
          .then(res => { awayPlayers.value = res.data || [] })
          .catch(e => { console.error('Error fetching away players:', e); awayPlayers.value = [] })
      )
    }
    
    // Fetch match events
    promises.push(
      $api<any>(`/fixtures/${fixture.id}/events`)
        .then(res => { matchEvents.value = res.data || [] })
        .catch(() => { matchEvents.value = [] })
    )
    
    await Promise.all(promises)
  } catch (e) {
    console.error('Failed to load data:', e)
  } finally {
    loadingPlayers.value = false
    loadingEvents.value = false
  }
}

const startMatch = async () => {
  if (!selectedFixture.value) return
  
  updatingMatch.value = true
  try {
    await fixtureStore.updateFixture(selectedFixture.value.id, {
      status: FixtureStatus.LIVE,
      homeScore: selectedFixture.value.homeScore ?? 0,
      awayScore: selectedFixture.value.awayScore ?? 0
    })
    
    selectedFixture.value = {
      ...selectedFixture.value,
      status: FixtureStatus.LIVE,
      homeScore: selectedFixture.value.homeScore ?? 0,
      awayScore: selectedFixture.value.awayScore ?? 0
    }
    
    emit('fixture-updated', selectedFixture.value)
    
    useToast().add({ 
      title: 'Match Started', 
      description: 'The match is now live!',
      icon: 'i-heroicons-play',
      color: 'success' 
    })
  } catch (error: any) {
    useToast().add({ 
      title: 'Failed to start match', 
      description: error.message || 'Unknown error', 
      color: 'error' 
    })
  } finally {
    updatingMatch.value = false
  }
}

const scoringTeamPlayers = computed(() => {
  return scoringTeam.value === 'home' ? homePlayers.value : awayPlayers.value
})

const confirmGoal = async () => {
  if (!selectedFixture.value) return
  
  const participantId = scoringTeam.value === 'home' 
    ? selectedFixture.value.homeTeamId 
    : selectedFixture.value.awayTeamId
  
  if (!participantId) return
  
  // Update local state immediately
  if (scoringTeam.value === 'home') {
    selectedFixture.value.homeScore = (selectedFixture.value.homeScore ?? 0) + 1
  } else {
    selectedFixture.value.awayScore = (selectedFixture.value.awayScore ?? 0) + 1
  }
  
  updatingMatch.value = true
  try {
    // Update fixture score
    await fixtureStore.updateFixture(selectedFixture.value.id, {
      homeScore: selectedFixture.value.homeScore,
      awayScore: selectedFixture.value.awayScore
    })
    
    // Create match event for the goal (skip for Individual tournaments)
    if (props.tournament?.participantType !== ParticipantType.INDIVIDUAL) {
      await fixtureStore.createMatchEvent({
        fixtureId: selectedFixture.value.id,
        participantId: participantId,
        playerId: goalData.scorerId,
        relatedPlayerId: goalData.assisterId,
        type: MatchEventType.GOAL,
        minute: goalData.minute
      })
    }
    
    showGoalModal.value = false
    emit('fixture-updated', selectedFixture.value)
    
    // Refresh match events (skip for Individual tournaments)
    if (props.tournament?.participantType !== ParticipantType.INDIVIDUAL) {
      await refreshMatchEvents()
    }
    
    useToast().add({ 
      title: 'Goal Recorded!', 
      description: goalData.scorerId ? 'Goal and scorer recorded.' : 'Goal recorded.',
      icon: 'i-heroicons-trophy',
      color: 'success' 
    })
  } catch (error: any) {
    // Revert on error
    if (scoringTeam.value === 'home') {
      selectedFixture.value.homeScore = (selectedFixture.value.homeScore ?? 1) - 1
    } else {
      selectedFixture.value.awayScore = (selectedFixture.value.awayScore ?? 1) - 1
    }
    useToast().add({ 
      title: 'Failed to record goal', 
      description: error.message || 'Unknown error', 
      color: 'error' 
    })
  } finally {
    updatingMatch.value = false
  }
}

const openGoalModal = (team: 'home' | 'away') => {
  scoringTeam.value = team
  goalData.scorerId = undefined
  goalData.assisterId = undefined
  goalData.minute = null
  
  // For Individual tournaments, record goal immediately without modal
  if (props.tournament?.participantType === ParticipantType.INDIVIDUAL) {
    confirmGoal()
    return
  }
  
  showGoalModal.value = true
}

const openEditEventModal = (event: MatchEvent) => {
  eventBeingEdited.value = event
  editEventData.minute = event.minute ?? null
  editEventData.playerId = event.playerId || undefined
  editEventData.relatedPlayerId = event.relatedPlayerId || undefined
  showEditEventModal.value = true
}

const showDeleteEventModal = ref(false)
const eventBeingDeleted = ref<MatchEvent | null>(null)

const confirmEditEvent = async () => {
  if (!eventBeingEdited.value) return
  updatingMatch.value = true
  try {
    await fixtureStore.updateMatchEvent(eventBeingEdited.value.id, {
      minute: editEventData.minute,
      playerId: editEventData.playerId,
      relatedPlayerId: editEventData.relatedPlayerId
    })
    showEditEventModal.value = false
    await refreshMatchEvents()
    useToast().add({ title: 'Event Updated', color: 'success' })
  } catch (e: any) {
    useToast().add({ title: 'Failed to update event', description: e.message, color: 'error' })
  } finally {
    updatingMatch.value = false
  }
}

const openDeleteEventModal = (event: MatchEvent) => {
  eventBeingDeleted.value = event
  showDeleteEventModal.value = true
}

const confirmDeleteEvent = async () => {
  if (!eventBeingDeleted.value) return
  
  const event = eventBeingDeleted.value
  loadingEvents.value = true
  try {
    await fixtureStore.deleteMatchEvent(event.id)
    
    // Update local score if it was a goal 
    if (event.type === MatchEventType.GOAL && selectedFixture.value) {
      if (event.participant_id === selectedFixture.value.homeTeamId) {
        selectedFixture.value.homeScore = Math.max(0, (selectedFixture.value.homeScore ?? 0) - 1)
      } else if (event.participant_id === selectedFixture.value.awayTeamId) {
        selectedFixture.value.awayScore = Math.max(0, (selectedFixture.value.awayScore ?? 0) - 1)
      }
      await fixtureStore.updateFixture(selectedFixture.value.id, {
        homeScore: selectedFixture.value.homeScore,
        awayScore: selectedFixture.value.awayScore
      })
      emit('fixture-updated', selectedFixture.value)
    }
    
    await refreshMatchEvents()
    showDeleteEventModal.value = false
    eventBeingDeleted.value = null
    useToast().add({ title: 'Event Deleted', color: 'success' })
  } catch (e: any) {
    useToast().add({ title: 'Failed to delete event', description: e.message, color: 'error' })
  } finally {
    loadingEvents.value = false
  }
}

const editEventTeamPlayers = computed(() => {
  if (!eventBeingEdited.value || !selectedFixture.value) return []
  return eventBeingEdited.value.participant_id === selectedFixture.value.homeTeamId 
    ? homePlayers.value 
    : awayPlayers.value
})

const editEventPlayerOptions = computed(() => {
  return editEventTeamPlayers.value.map(p => ({
    label: `${p.number ? `#${p.number} ` : ''}${p.name}`,
    value: p.id
  }))
})

const editEventRelatedPlayerOptions = computed(() => {
  return editEventTeamPlayers.value.map(p => ({
    label: `${p.number ? `#${p.number} ` : ''}${p.name}`,
    value: p.id,
    disabled: p.id === editEventData.playerId
  }))
})

const getEventActionItems = (event: MatchEvent) => [
  [{
    label: 'Edit',
    icon: 'i-heroicons-pencil',
    onSelect: () => openEditEventModal(event)
  }],
  [{
    label: 'Delete',
    icon: 'i-heroicons-trash',
    onSelect: () => openDeleteEventModal(event)
  }]
]

const decrementScore = async (team: 'home' | 'away') => {
  if (!selectedFixture.value) return
  
  const currentScore = team === 'home' 
    ? (selectedFixture.value.homeScore ?? 0) 
    : (selectedFixture.value.awayScore ?? 0)
  
  if (currentScore <= 0) return
  
  const newScore = currentScore - 1
  
  // Update local state immediately
  if (team === 'home') {
    selectedFixture.value.homeScore = newScore
  } else {
    selectedFixture.value.awayScore = newScore
  }
  
  updatingMatch.value = true
  try {
    await fixtureStore.updateFixture(selectedFixture.value.id, {
      homeScore: selectedFixture.value.homeScore,
      awayScore: selectedFixture.value.awayScore
    })
    emit('fixture-updated', selectedFixture.value)
  } catch (error: any) {
    // Revert on error
    if (team === 'home') {
      selectedFixture.value.homeScore = currentScore
    } else {
      selectedFixture.value.awayScore = currentScore
    }
    useToast().add({ 
      title: 'Failed to update score', 
      description: error.message || 'Unknown error', 
      color: 'error' 
    })
  } finally {
    updatingMatch.value = false
  }
}

const endMatch = async () => {
  if (!selectedFixture.value) return
  
  updatingMatch.value = true
  try {
    await fixtureStore.updateFixture(selectedFixture.value.id, {
      status: FixtureStatus.COMPLETED,
      homePenaltyScore: selectedFixture.value.homePenaltyScore,
      awayPenaltyScore: selectedFixture.value.awayPenaltyScore
    })
    
    selectedFixture.value.status = FixtureStatus.COMPLETED
    emit('fixture-updated', selectedFixture.value)
    emit('match-ended')
    closeModal()
    
    useToast().add({ 
      title: 'Match Ended', 
      description: 'The match has been completed.',
      icon: 'i-heroicons-check-circle',
      color: 'success' 
    })
  } catch (error: any) {
    errorMessage.value = error?.data?.message || error?.message || 'Unknown error'
    useToast().add({ 
      title: 'Failed to end match', 
      description: errorMessage.value || undefined,
      color: 'error' 
    })
  } finally {
    updatingMatch.value = false
  }
}

// Player selection items for dropdowns
const scorerOptions = computed(() => {
  return scoringTeamPlayers.value.map(p => ({
    label: `${p.number ? `#${p.number} ` : ''}${p.name}`,
    value: p.id
  }))
})

const assisterOptions = computed(() => {
  return scoringTeamPlayers.value.map(p => ({
    label: `${p.number ? `#${p.number} ` : ''}${p.name}`,
    value: p.id,
    disabled: p.id === goalData.scorerId
  }))
})

// Event helper functions
const getEventIcon = (type: MatchEventType) => {
  switch (type) {
    case MatchEventType.GOAL: return 'i-heroicons-trophy'
    case MatchEventType.OWN_GOAL: return 'i-heroicons-exclamation-triangle'
    case MatchEventType.PENALTY: return 'i-heroicons-stop'
    case MatchEventType.YELLOW_CARD: return 'i-heroicons-exclamation-circle'
    case MatchEventType.RED_CARD: return 'i-heroicons-x-circle'
    case MatchEventType.SUBSTITUTION: return 'i-heroicons-arrows-right-left'
    case MatchEventType.ASSIST: return 'i-heroicons-hand-raised'
    default: return 'i-heroicons-flag'
  }
}

const getEventColor = (type: MatchEventType) => {
  switch (type) {
    case MatchEventType.GOAL: return 'text-green-500'
    case MatchEventType.OWN_GOAL: return 'text-orange-500'
    case MatchEventType.PENALTY: return 'text-blue-500'
    case MatchEventType.YELLOW_CARD: return 'text-yellow-500'
    case MatchEventType.RED_CARD: return 'text-red-500'
    case MatchEventType.SUBSTITUTION: return 'text-purple-500'
    case MatchEventType.ASSIST: return 'text-cyan-500'
    default: return 'text-gray-500'
  }
}

const getPlayerName = (playerId: string | null | undefined) => {
  if (!playerId) return null
  const player = [...homePlayers.value, ...awayPlayers.value].find(p => p.id === playerId)
  return player ? `${player.number ? `#${player.number} ` : ''}${player.name}` : null
}

const getTeamName = (participantId: string | null | undefined) => {
  if (!participantId || !selectedFixture.value) return null
  if (participantId === selectedFixture.value.homeTeamId) {
    return selectedFixture.value.homeTeam?.customName || 'Home'
  }
  if (participantId === selectedFixture.value.awayTeamId) {
    return selectedFixture.value.awayTeam?.customName || 'Away'
  }
  return null
}

const refreshMatchEvents = async () => {
  if (!selectedFixture.value) return
  loadingEvents.value = true
  try {
    const res = await $api<any>(`/fixtures/${selectedFixture.value.id}/events`)
    matchEvents.value = res.data || []
  } catch (e) {
    console.error('Failed to refresh events:', e)
  } finally {
    loadingEvents.value = false
  }
}

const closeModal = () => {
  emit('update:open', false)
}

const downloading = ref(false)
const sharingMatch = ref(false)

const { canShare, shareGraphic: shareGraphicFn } = useGraphicShare()

const generateGraphicBlob = async (): Promise<Blob | null> => {
  if (!selectedFixture.value || !props.tournament) return null
  
  try {
    return await $fetch<Blob>('/api/graphics/match-result', {
      method: 'POST',
      body: {
        match: selectedFixture.value,
        homeTeam: selectedFixture.value.homeTeam,
        awayTeam: selectedFixture.value.awayTeam,
        tournament: props.tournament
      },
      responseType: 'blob'
    })
  } catch (e) {
    console.error('Graphic generation failed', e)
    return null
  }
}

const handleShareGraphic = async () => {
  sharingMatch.value = true
  try {
    const blob = await generateGraphicBlob()
    if (blob) {
      const filename = `match-${selectedFixture.value?.id || 'result'}.png`
      await shareGraphicFn(blob, filename)
    } else {
      useToast().add({
        title: 'Generation Failed',
        description: 'Could not generate graphic for sharing.',
        color: 'error'
      })
    }
  } finally {
    sharingMatch.value = false
  }
}

const downloadGraphic = async () => {
  if (!selectedFixture.value || !props.tournament) return
  
  downloading.value = true
  try {
    const response = await $fetch<Blob>('/api/graphics/match-result', {
      method: 'POST',
      body: {
        match: selectedFixture.value,
        homeTeam: selectedFixture.value.homeTeam,
        awayTeam: selectedFixture.value.awayTeam,
        tournament: props.tournament
      },
      responseType: 'blob'
    })
    
    // Create download link
    const url = window.URL.createObjectURL(response)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `match-${selectedFixture.value.id}.png`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    useToast().add({
      title: 'Graphic Generated',
      description: 'Match result graphic has been downloaded.',
      icon: 'i-heroicons-photo',
      color: 'success'
    })
  } catch (e) {
    console.error('Download failed', e)
    useToast().add({
      title: 'Generation Failed',
      description: 'Could not generate graphic.',
      color: 'error'
    })
  } finally {
    downloading.value = false
  }
}
</script>

<template>
  <!-- Match Control Modal -->
  <UModal :open="open" @update:open="$emit('update:open', $event)">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-adjustments-horizontal" class="w-5 h-5 text-warning-500" />
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                Match Control
              </h3>
              <UBadge v-if="selectedFixture" :color="fixtureStatusColors[selectedFixture.status]" variant="subtle" size="sm">
                {{ selectedFixture.status }}
              </UBadge>
            </div>
            <UButton 
              icon="i-heroicons-x-mark" 
              variant="ghost" 
              color="neutral" 
              size="sm"
              @click="closeModal"
            />
        </div>
        </template>

        <div v-if="selectedFixture" class="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
          <!-- Error Alert -->
          <UAlert
            v-if="errorMessage"
            icon="i-heroicons-exclamation-triangle"
            color="error"
            variant="soft"
            :title="errorMessage"
          />

          <!-- Teams Display -->
          <div class="flex items-center justify-between gap-4">
            <!-- Home Team -->
            <div class="flex-1 text-center">
              <div class="w-16 h-16 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden mb-2">
                <img 
                  v-if="selectedFixture.homeTeam?.logoUrl" 
                  :src="selectedFixture.homeTeam.logoUrl" 
                  class="w-full h-full object-cover"
                />
                <span v-else class="text-xl font-bold text-gray-600 dark:text-gray-300">
                  {{ (selectedFixture.homeTeam?.customName || 'H').charAt(0).toUpperCase() }}
                </span>
              </div>
              <p class="font-medium text-gray-900 dark:text-white truncate">
                {{ selectedFixture.homeTeam?.customName || 'Home Team' }}
              </p>
            </div>

            <!-- VS -->
            <div class="text-gray-400 font-medium">VS</div>

            <!-- Away Team -->
            <div class="flex-1 text-center">
              <div class="w-16 h-16 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden mb-2">
                <img 
                  v-if="selectedFixture.awayTeam?.logoUrl" 
                  :src="selectedFixture.awayTeam.logoUrl" 
                  class="w-full h-full object-cover"
                />
                <span v-else class="text-xl font-bold text-gray-600 dark:text-gray-300">
                  {{ (selectedFixture.awayTeam?.customName || 'A').charAt(0).toUpperCase() }}
                </span>
              </div>
              <p class="font-medium text-gray-900 dark:text-white truncate">
                {{ selectedFixture.awayTeam?.customName || 'Away Team' }}
              </p>
            </div>
          </div>

          <!-- Score Controls -->
          <div class="flex items-center justify-center gap-8 py-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
            <!-- Home Score -->
            <div class="flex flex-col items-center gap-2">
              <UButton 
                icon="i-heroicons-plus" 
                size="lg" 
                color="primary" 
                variant="soft"
                :disabled="selectedFixture.status !== 'LIVE' || loadingPlayers"
                :loading="updatingMatch"
                @click="openGoalModal('home')"
              />
              <span class="text-4xl font-bold text-gray-900 dark:text-white min-w-[3rem] text-center">
                {{ selectedFixture.homeScore ?? 0 }}
              </span>
              <UButton 
                v-if="props.tournament?.participantType === ParticipantType.INDIVIDUAL"
                icon="i-heroicons-minus" 
                size="lg" 
                color="neutral" 
                variant="soft"
                :disabled="selectedFixture.status !== 'LIVE' || (selectedFixture.homeScore ?? 0) <= 0"
                :loading="updatingMatch"
                @click="decrementScore('home')"
              />
            </div>

            <span class="text-2xl font-bold text-gray-400">-</span>

            <!-- Away Score -->
            <div class="flex flex-col items-center gap-2">
              <UButton 
                icon="i-heroicons-plus" 
                size="lg" 
                color="primary" 
                variant="soft"
                :disabled="selectedFixture.status !== 'LIVE' || loadingPlayers"
                :loading="updatingMatch"
                @click="openGoalModal('away')"
              />
              <span class="text-4xl font-bold text-gray-900 dark:text-white min-w-[3rem] text-center">
                {{ selectedFixture.awayScore ?? 0 }}
              </span>
              <UButton 
                v-if="props.tournament?.participantType === ParticipantType.INDIVIDUAL"
                icon="i-heroicons-minus" 
                size="lg" 
                color="neutral" 
                variant="soft"
                :disabled="selectedFixture.status !== 'LIVE' || (selectedFixture.awayScore ?? 0) <= 0"
                :loading="updatingMatch"
                @click="decrementScore('away')"
              />
            </div>
          </div>

          <!-- Penalty Shootout Controls (only if drawn and live) -->
          <div 
            v-if="selectedFixture.status === 'LIVE' && (selectedFixture.homeScore ?? 0) === (selectedFixture.awayScore ?? 0)" 
            class="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
          >
            <button 
              class="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              @click="showPenaltyCollapsible = !showPenaltyCollapsible"
            >
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-bolt" class="w-5 h-5 text-yellow-500" />
                <span class="font-medium text-gray-900 dark:text-white">Penalty Shootout</span>
                <UBadge color="neutral" variant="subtle" size="xs">Tie Breaker</UBadge>
              </div>
              <UIcon 
                :name="showPenaltyCollapsible ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" 
                class="w-5 h-5 text-gray-400"
              />
            </button>
            
            <div v-if="showPenaltyCollapsible" class="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 space-y-3">
              <div class="flex items-center justify-center gap-8">
                <!-- Home Penalties -->
                <div class="flex flex-col items-center gap-2">
                  <span class="text-xs text-gray-500 uppercase tracking-wider font-semibold">Home</span>
                  <UInput 
                    v-model.number="selectedFixture.homePenaltyScore" 
                    type="number" 
                    :min="0"
                    placeholder="0"
                    class="w-20 text-center"
                    :ui="{ base: 'text-center text-lg font-bold' }"
                  />
                </div>

                <span class="text-gray-400 font-medium">vs</span>

                <!-- Away Penalties -->
                <div class="flex flex-col items-center gap-2">
                  <span class="text-xs text-gray-500 uppercase tracking-wider font-semibold">Away</span>
                  <UInput 
                    v-model.number="selectedFixture.awayPenaltyScore" 
                    type="number" 
                    :min="0"
                    placeholder="0"
                    class="w-20 text-center"
                    :ui="{ base: 'text-center text-lg font-bold' }"
                  />
                </div>
              </div>
              
              <p class="text-xs text-center text-gray-500 mt-2">
                Enter penalty shootout scores to determine the winner.
              </p>
            </div>
          </div>

          <!-- Loading Players Indicator -->
          <div v-if="loadingPlayers" class="text-center text-sm text-gray-500">
            <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin inline mr-1" />
            Loading players...
          </div>

          <!-- Match Events Collapsible (hidden for Individual tournaments) -->
          <div 
            v-if="tournament?.participantType !== ParticipantType.INDIVIDUAL"
            class="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
          >
            <button 
              class="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              @click="showEventsCollapsible = !showEventsCollapsible"
            >
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-clipboard-document-list" class="w-5 h-5 text-indigo-500" />
                <span class="font-medium text-gray-900 dark:text-white">Match Events</span>
                <UBadge color="neutral" variant="subtle" size="xs">
                  {{ matchEvents.length }}
                </UBadge>
              </div>
              <UIcon 
                :name="showEventsCollapsible ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" 
                class="w-5 h-5 text-gray-400"
              />
            </button>
            
            <div v-if="showEventsCollapsible" class="p-3 space-y-2">
              <!-- Loading Events -->
              <div v-if="loadingEvents" class="flex items-center justify-center py-4 text-sm text-gray-500">
                <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin mr-2" />
                Loading events...
              </div>
              
              <!-- No Events -->
              <div v-else-if="matchEvents.length === 0" class="text-center py-4 text-sm text-gray-500">
                No events recorded yet
              </div>
              
              <div v-else class="space-y-3 max-h-48 overflow-y-auto">
                <div 
                  v-for="event in matchEvents" 
                  :key="event.id"
                  class="flex items-start gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/30"
                >
                  <div class="mt-0.5">
                    <span class="text-lg flex-shrink-0 flex items-center justify-center">
                      <IconsSoccerBallIcon v-if="event.type === 'GOAL' || event.type === 'OWN_GOAL'" class="w-6 h-6 text-green-500" />
                      <IconsAssistIcon v-else-if="event.type === 'ASSIST'" class="w-6 h-6 text-cyan-500" />
                      <UIcon 
                        v-else
                        :name="getEventIcon(event.type)" 
                        :class="['w-5 h-5', getEventColor(event.type)]"
                      />
                    </span>
                  </div>
                  
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-sm font-bold tracking-wide uppercase text-gray-900 dark:text-white">
                        {{ event.type.replace('_', ' ') }}
                      </span>
                      <span v-if="event.minute" class="text-sm font-medium text-gray-500 tabular-nums">
                        {{ event.minute }}'
                      </span>
                    </div>
                    
                    <p class="text-sm text-gray-500 dark:text-gray-400 truncate">
                      <span v-if="getTeamName(event.participant_id)">
                        {{ getTeamName(event.participant_id) }}
                      </span>
                      <span v-if="getPlayerName(event.playerId)">
                        - {{ getPlayerName(event.playerId) }}
                      </span>
                      <span v-if="getPlayerName(event.relatedPlayerId)">
                        (assist: {{ getPlayerName(event.relatedPlayerId) }})
                      </span>
                    </p>
                  </div>
                  <div class="flex-shrink-0">
                    <UDropdownMenu :items="getEventActionItems(event)" :content="{ align: 'end' }">
                      <UButton color="neutral" variant="ghost" icon="i-heroicons-ellipsis-vertical" size="sm" />
                    </UDropdownMenu>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Match Info -->
          <div v-if="selectedFixture.startTime" class="text-center text-sm text-gray-500">
            Scheduled: {{ new Date(selectedFixture.startTime).toLocaleString() }}
          </div>

          <!-- Actions -->
          <div class="flex justify-between gap-3 pt-2">
            <UButton 
              v-if="selectedFixture.status === 'SCHEDULED'"
              label="Start Match" 
              icon="i-heroicons-play"
              color="success"
              :loading="updatingMatch"
              @click="startMatch"
            />
            <UButton 
              v-if="selectedFixture.status === 'LIVE'"
              label="End Match" 
              icon="i-heroicons-flag"
              color="error"
              :loading="updatingMatch"
              @click="endMatch"
            />
            <UButton 
              v-if="canShare"
              label="Share" 
              icon="i-heroicons-share" 
              variant="soft"
              color="primary"
              class="ml-auto"
              :loading="sharingMatch"
              @click="handleShareGraphic"
            />
            <UButton 
              label="Export" 
              icon="i-heroicons-arrow-down-tray" 
              variant="outline"
              color="neutral"
              :class="{ 'ml-auto': !canShare }"
              :loading="downloading"
              @click="downloadGraphic"
            />
            <UButton 
              label="Close" 
              variant="ghost" 
              color="neutral"
              class="ml-2"
              @click="closeModal"
            />
          </div>
        </div>
      </UCard>
    </template>
  </UModal>

  <!-- Goal Scoring Modal -->
  <UModal v-model:open="showGoalModal">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-trophy" class="w-5 h-5 text-green-500" />
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                Record Goal
              </h3>
              <UBadge :color="scoringTeam === 'home' ? 'primary' : 'warning'" variant="subtle" size="sm">
                {{ scoringTeam === 'home' ? selectedFixture?.homeTeam?.customName : selectedFixture?.awayTeam?.customName }}
              </UBadge>
            </div>
            <UButton 
              icon="i-heroicons-x-mark" 
              variant="ghost" 
              color="neutral" 
              size="sm"
              @click="showGoalModal = false"
            />
          </div>
        </template>

        <div class="space-y-4">
          <!-- Minute -->
          <UFormField label="Minute (optional)">
            <UInput 
              v-model.number="goalData.minute" 
              type="number" 
              placeholder="e.g. 45"
              icon="i-heroicons-clock"
              :min="0"
              :max="120"
            />
          </UFormField>

          <!-- Scorer -->
          <UFormField label="Goal Scorer (optional)">
            <USelect
              v-model="goalData.scorerId"
              :items="scorerOptions"
              placeholder="Select scorer..."
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <!-- Assister -->
          <UFormField label="Assist By (optional)">
            <USelect
              v-model="goalData.assisterId"
              :items="assisterOptions"
              placeholder="Select assister..."
              value-key="value"
              :disabled="!goalData.scorerId"
              class="w-full"
            />
          </UFormField>

          <p v-if="scoringTeamPlayers.length === 0" class="text-sm text-gray-500">
            No players registered for this team. You can still record the goal without player details.
          </p>

          <!-- Actions -->
          <div class="flex justify-end gap-3 pt-2">
            <UButton 
              label="Cancel" 
              variant="ghost" 
              color="neutral"
              @click="showGoalModal = false"
            />
            <UButton 
              label="Record Goal" 
              icon="i-heroicons-check"
              color="success"
              :loading="updatingMatch"
              @click="confirmGoal"
            />
          </div>
        </div>
      </UCard>
    </template>
  </UModal>

  <!-- Edit Event Modal -->
  <UModal v-model:open="showEditEventModal">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-pencil" class="w-5 h-5 text-primary-500" />
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                Edit Event
              </h3>
            </div>
            <UButton 
              icon="i-heroicons-x-mark" 
              variant="ghost" 
              color="neutral" 
              size="sm"
              @click="showEditEventModal = false"
            />
          </div>
        </template>

        <div class="space-y-4">
          <!-- Minute -->
          <UFormField label="Minute (optional)">
            <UInput 
              v-model.number="editEventData.minute" 
              type="number" 
              placeholder="e.g. 45"
              icon="i-heroicons-clock"
              :min="0"
              :max="120"
            />
          </UFormField>

          <!-- Scorer/Player -->
          <UFormField label="Player">
            <USelect
              v-model="editEventData.playerId"
              :items="editEventPlayerOptions"
              placeholder="Select player..."
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <!-- Assister/Related -->
          <UFormField label="Related Player / Assist (optional)">
            <USelect
              v-model="editEventData.relatedPlayerId"
              :items="editEventRelatedPlayerOptions"
              placeholder="Select related player..."
              value-key="value"
              :disabled="!editEventData.playerId"
              class="w-full"
            />
          </UFormField>

          <!-- Actions -->
          <div class="flex justify-end gap-3 pt-2">
            <UButton 
              label="Cancel" 
              variant="ghost" 
              color="neutral"
              @click="showEditEventModal = false"
            />
            <UButton 
              label="Save Changes" 
              icon="i-heroicons-check"
              color="primary"
              :loading="updatingMatch"
              @click="confirmEditEvent"
            />
          </div>
        </div>
      </UCard>
    </template>
  </UModal>

  <!-- Delete Event Confirmation Modal -->
  <UModal v-model:open="showDeleteEventModal">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-error-500" />
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                Delete Event
              </h3>
            </div>
            <UButton 
              icon="i-heroicons-x-mark" 
              variant="ghost" 
              color="neutral" 
              size="sm"
              @click="showDeleteEventModal = false"
            />
          </div>
        </template>

        <div class="space-y-4">
          <p class="text-gray-600 dark:text-gray-300">
            Are you sure you want to delete this event? This action cannot be undone. 
            If this is a goal event, the score will be updated accordingly.
          </p>

          <!-- Actions -->
          <div class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <UButton 
              label="Cancel" 
              variant="ghost" 
              color="neutral"
              @click="showDeleteEventModal = false"
            />
            <UButton 
              label="Delete Event" 
              icon="i-heroicons-trash"
              color="error"
              :loading="loadingEvents"
              @click="confirmDeleteEvent"
            />
          </div>
        </div>
      </UCard>
    </template>
  </UModal>
</template>
