<script setup lang="ts">
import { FixtureStatus, MatchEventType, ParticipantType, FixtureStage } from '~/types'
import type { Fixture, Player, MatchEvent } from '~/types'
import { CalendarDate, parseDate, type DateValue } from '@internationalized/date'

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

const internalOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value)
})

const fixtureStore = useFixtureStore()
const standingStore = useStandingStore()
const participantStore = useParticipantStore()
const venueStore = useVenueStore()
const { handleError, extractErrorMessage } = useErrors()

// Local state
const selectedFixture = ref<Fixture | null>(null)
const updatingMatch = ref(false)
const matchTime = ref<string>('') // Used for fallback/comparison
const matchDateVal = shallowRef<DateValue | null>(null)
const matchTimeVal = ref<string>('12:00')
const matchVenue = ref<string>('')
const updatingTime = ref(false)
const homePlayers = ref<Player[]>([])
const awayPlayers = ref<Player[]>([])
const loadingPlayers = ref(false)
const matchEvents = ref<MatchEvent[]>([])
const loadingEvents = ref(false)
const showEventsCollapsible = ref(true)
const showScheduleCollapsible = ref(false)
const showPenaltyCollapsible = ref(true)
const showPenaltyOverride = ref(false)
const errorMessage = ref<string | null>(null)

// Goal scoring modal
const showGoalModal = ref(false)
const scoringTeam = ref<'home' | 'away'>('home')
const goalData = reactive({
  type: MatchEventType.GOAL as MatchEventType,
  scorerId: undefined as string | undefined,
  assisterId: undefined as string | undefined,
  minute: null as number | null
})

// Card modal
const showCardModal = ref(false)
const cardTeam = ref<'home' | 'away'>('home')
const cardData = reactive({
  type: MatchEventType.YELLOW_CARD as MatchEventType,
  playerId: undefined as string | undefined,
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
    matchVenue.value = props.fixture.venue || ''
    showScheduleCollapsible.value = props.fixture.status === 'SCHEDULED'
    if (props.fixture.startTime) {
      // Format correctly for native comparison
      const date = new Date(props.fixture.startTime)
      const tzOffset = date.getTimezoneOffset() * 60000 
      const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0,16)
      matchTime.value = localISOTime
      
      const isoParts = date.toISOString().split('T')
      if (isoParts[0]) {
        matchDateVal.value = parseDate(isoParts[0])
      }
      
      const hours = String(date.getHours()).padStart(2, '0')
      const mins = String(date.getMinutes()).padStart(2, '0')
      matchTimeVal.value = `${hours}:${mins}`
      
    } else {
      matchTime.value = ''
      matchDateVal.value = null
      matchTimeVal.value = ''
    }
    await loadMatchData(props.fixture)
  } else if (!isOpen) {
    // Reset state when closing
    errorMessage.value = null
    showPenaltyOverride.value = false
    matchEvents.value = []
    homePlayers.value = []
    awayPlayers.value = []
    matchVenue.value = ''
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
        participantStore.fetchParticipantPlayers(fixture.homeTeamId)
          .then(players => { homePlayers.value = players })
          .catch(e => { console.error('Error fetching home players:', e); homePlayers.value = [] })
      )
    }

    if (fixture.awayTeamId) {
      promises.push(
        participantStore.fetchParticipantPlayers(fixture.awayTeamId)
          .then(players => { awayPlayers.value = players })
          .catch(e => { console.error('Error fetching away players:', e); awayPlayers.value = [] })
      )
    }
    
    // Fetch match events
    promises.push(
      $api<any>(`/match-events/fixture/${fixture.id}`)
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
    handleError(error, { title: 'Failed to start match' })
  } finally {
    updatingMatch.value = false
  }
}

const undoStartMatch = async () => {
  if (!selectedFixture.value) return
  
  updatingMatch.value = true
  try {
    await fixtureStore.updateFixture(selectedFixture.value.id, {
      status: FixtureStatus.SCHEDULED
    })
    
    selectedFixture.value = {
      ...selectedFixture.value,
      status: FixtureStatus.SCHEDULED
    }
    
    emit('fixture-updated', selectedFixture.value)
    
    useToast().add({ 
      title: 'Match Un-started', 
      description: 'The match has been reverted to SCHEDULED.',
      icon: 'i-heroicons-arrow-uturn-left',
      color: 'warning' 
    })
  } catch (error: any) {
    handleError(error, { title: 'Failed to undo start' })
  } finally {
    updatingMatch.value = false
  }
}

const formatDateDisplay = (date: DateValue | null) => {
  if (!date) return 'Select date'
  return new Date(date.year, date.month - 1, date.day).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const parseDateString = (dateStr: string | null | undefined): DateValue | undefined => {
  if (!dateStr) return undefined
  try {
    const datePart = dateStr.split('T')[0]
    if (!datePart) return undefined
    return parseDate(datePart)
  } catch (e) {
    console.warn('Failed to parse date:', dateStr)
    return undefined
  }
}

const tournamentMinDate = computed(() => {
  if (!props.tournament) return undefined
  return parseDateString(props.tournament.start_date)
})

const tournamentMaxDate = computed(() => {
  if (!props.tournament) return undefined
  return parseDateString(props.tournament.end_date)
})

const venueOptions = computed(() => {
  return venueStore.venues.map(v => ({ label: v.name, value: v.name }))
})

const isLeg2 = computed(() => {
  if (!props.tournament?.twoLegsKnockout) return false
  if (!selectedFixture.value) return false
  if (selectedFixture.value.stage !== FixtureStage.KNOCKOUT && selectedFixture.value.stage != null) return false
  return selectedFixture.value.matchNumber % 2 === 0
})

const leg1Completed = computed(() => {
  if (!isLeg2.value || !selectedFixture.value) return true
  
  const leg1 = fixtureStore.fixtures.find(f => 
    f.tournament_id === selectedFixture.value?.tournament_id &&
    f.round === selectedFixture.value?.round &&
    f.matchNumber === selectedFixture.value!.matchNumber - 1 &&
    (selectedFixture.value?.stage == null || f.stage === selectedFixture.value?.stage) &&
    (selectedFixture.value?.groupId == null || f.groupId === selectedFixture.value?.groupId)
  )
  
  if (!leg1) return true
  return leg1.status === FixtureStatus.COMPLETED
})

// Check if scores are tied (or aggregate tied for Leg 2)
const isScoreTiedOrAggregateTied = computed(() => {
  if (!selectedFixture.value) return false
  const homeScore = selectedFixture.value.homeScore ?? 0
  const awayScore = selectedFixture.value.awayScore ?? 0

  if (isLeg2.value) {
    // For Leg 2, check the aggregate score
    const leg1 = fixtureStore.fixtures.find(f =>
      f.tournament_id === selectedFixture.value?.tournament_id &&
      f.round === selectedFixture.value?.round &&
      f.matchNumber === selectedFixture.value!.matchNumber - 1 &&
      (selectedFixture.value?.stage == null || f.stage === selectedFixture.value?.stage) &&
      (selectedFixture.value?.groupId == null || f.groupId === selectedFixture.value?.groupId)
    )

    if (leg1) {
      // Leg 2 home = Leg 1 away, so aggregate:
      const aggHome = homeScore + (leg1.awayScore ?? 0)
      const aggAway = awayScore + (leg1.homeScore ?? 0)
      return aggHome === aggAway
    }
  }

  // Single leg or Leg 1: simple comparison
  return homeScore === awayScore
})

// Check if the fixture already has penalty scores
const hasPenalties = computed(() => {
  if (!selectedFixture.value) return false
  return (selectedFixture.value.homePenaltyScore != null && selectedFixture.value.homePenaltyScore > 0)
    || (selectedFixture.value.awayPenaltyScore != null && selectedFixture.value.awayPenaltyScore > 0)
})

// Warning: completed knockout match with tied aggregate and no decisive penalties
const needsPenaltyWarning = computed(() => {
  if (!selectedFixture.value) return false
  if (selectedFixture.value.status !== 'COMPLETED') return false
  // Only show for knockout stage matches — draws are valid in group stage
  if (selectedFixture.value.stage !== FixtureStage.KNOCKOUT) return false
  if (!isScoreTiedOrAggregateTied.value) return false
  
  // Check if penalties resolve the tie
  const homePen = selectedFixture.value.homePenaltyScore ?? 0
  const awayPen = selectedFixture.value.awayPenaltyScore ?? 0
  return homePen === awayPen // Equal penalties (including 0-0) means no winner
})

const isUpdateDisabled = computed(() => {
  if (!matchDateVal.value || !matchTimeVal.value) return true
  if (!selectedFixture.value) return true
  
  const selectedYear = matchDateVal.value.year
  const selectedMonth = matchDateVal.value.month - 1
  const selectedDay = matchDateVal.value.day
  const [h, m] = matchTimeVal.value.split(':').map(Number)
  
  const newDate = new Date(selectedYear, selectedMonth, selectedDay, h, m)
  
  const timeChanged = selectedFixture.value.startTime 
    ? new Date(selectedFixture.value.startTime).toISOString() !== newDate.toISOString()
    : true

  const venueChanged = (selectedFixture.value.venue || '') !== matchVenue.value

  return !timeChanged && !venueChanged
})

const updateMatchTime = async () => {
  if (!selectedFixture.value || !matchDateVal.value || !matchTimeVal.value) return
  
  updatingTime.value = true
  try {
    const selectedYear = matchDateVal.value.year
    const selectedMonth = matchDateVal.value.month - 1
    const selectedDay = matchDateVal.value.day
    const [h, m] = matchTimeVal.value.split(':').map(Number)
    
    const newDate = new Date(selectedYear, selectedMonth, selectedDay, h, m)
    const newIso = newDate.toISOString()
    const newVenue = matchVenue.value || null
    
    await fixtureStore.updateFixture(selectedFixture.value.id, {
      startTime: newIso,
      venue: newVenue
    })
    
    selectedFixture.value = {
      ...selectedFixture.value,
      startTime: newIso,
      venue: newVenue
    }
    matchTime.value = newIso
    
    emit('fixture-updated', selectedFixture.value)
    
    useToast().add({ 
      title: 'Time Updated', 
      description: 'The match schedule has been updated.',
      icon: 'i-heroicons-calendar',
      color: 'success' 
    })
  } catch (error: any) {
    handleError(error, { title: 'Failed to update time' })
  } finally {
    updatingTime.value = false
  }
}

const scoringTeamPlayers = computed(() => {
  if (goalData.type === MatchEventType.OWN_GOAL) {
    return scoringTeam.value === 'home' ? awayPlayers.value : homePlayers.value
  }
  return scoringTeam.value === 'home' ? homePlayers.value : awayPlayers.value
})

const cardTeamPlayers = computed(() => {
  return cardTeam.value === 'home' ? homePlayers.value : awayPlayers.value
})

const confirmGoal = async () => {
  if (!selectedFixture.value) return
  
  const participantId = scoringTeam.value === 'home' 
    ? selectedFixture.value.homeTeamId 
    : selectedFixture.value.awayTeamId
  
  if (!participantId) return
  
  // Update local state immediately (but only if it's a goal that counts towards the score)
  const isScoringEvent = goalData.type === MatchEventType.GOAL || goalData.type === MatchEventType.OWN_GOAL || goalData.type === MatchEventType.PENALTY
  
  if (isScoringEvent) {
    if (scoringTeam.value === 'home') {
      selectedFixture.value.homeScore = (selectedFixture.value.homeScore ?? 0) + 1
    } else {
      selectedFixture.value.awayScore = (selectedFixture.value.awayScore ?? 0) + 1
    }
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
        type: goalData.type,
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
    if (isScoringEvent) {
      if (scoringTeam.value === 'home') {
        selectedFixture.value.homeScore = (selectedFixture.value.homeScore ?? 1) - 1
      } else {
        selectedFixture.value.awayScore = (selectedFixture.value.awayScore ?? 1) - 1
      }
    }
    handleError(error, { title: 'Failed to record goal' })
  } finally {
    updatingMatch.value = false
  }
}

const openGoalModal = (team: 'home' | 'away', type: MatchEventType = MatchEventType.GOAL) => {
  scoringTeam.value = team
  goalData.type = type
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

const openCardModal = (team: 'home' | 'away') => {
  cardTeam.value = team
  cardData.type = MatchEventType.YELLOW_CARD
  cardData.playerId = undefined
  cardData.minute = null
  showCardModal.value = true
}

const confirmCard = async () => {
  if (!selectedFixture.value) return
  
  const participantId = cardTeam.value === 'home' 
    ? selectedFixture.value.homeTeamId 
    : selectedFixture.value.awayTeamId
  
  if (!participantId || !cardData.playerId) return
  
  updatingMatch.value = true
  try {
    await fixtureStore.createMatchEvent({
      fixtureId: selectedFixture.value.id,
      participantId: participantId,
      playerId: cardData.playerId,
      type: cardData.type,
      minute: cardData.minute
    })
    
    showCardModal.value = false
    await refreshMatchEvents()
    
    useToast().add({ 
      title: 'Card Recorded!', 
      description: 'Card event has been added.',
      icon: cardData.type === MatchEventType.YELLOW_CARD ? 'i-heroicons-exclamation-triangle' : 'i-heroicons-x-circle',
      color: cardData.type === MatchEventType.YELLOW_CARD ? 'warning' : 'error' 
    })
  } catch (error: any) {
    handleError(error, { title: 'Failed to record card' })
  } finally {
    updatingMatch.value = false
  }
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
    handleError(e, { title: 'Failed to update event' })
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
    const isScoringEvent = event.type === MatchEventType.GOAL || event.type === MatchEventType.OWN_GOAL || event.type === MatchEventType.PENALTY
    if (isScoringEvent && selectedFixture.value) {
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
    handleError(e, { title: 'Failed to delete event' })
  } finally {
    loadingEvents.value = false
  }
}

const editEventTeamPlayers = computed(() => {
  if (!eventBeingEdited.value || !selectedFixture.value) return []
  
  if (eventBeingEdited.value.type === MatchEventType.OWN_GOAL) {
    return eventBeingEdited.value.participant_id === selectedFixture.value.homeTeamId 
      ? awayPlayers.value 
      : homePlayers.value
  }
  
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
    handleError(error, { title: 'Failed to update score' })
  } finally {
    updatingMatch.value = false
  }
}

const endMatch = async () => {
  if (!selectedFixture.value) return
  
  updatingMatch.value = true
  try {
    const homePen = selectedFixture.value.homePenaltyScore
    const awayPen = selectedFixture.value.awayPenaltyScore
    const penaltyData = (isScoreTiedOrAggregateTied.value && homePen != null && awayPen != null) ? {
      homePenaltyScore: homePen,
      awayPenaltyScore: awayPen
    } : {}

    await fixtureStore.updateFixture(selectedFixture.value.id, {
      status: FixtureStatus.COMPLETED,
      ...penaltyData
    })
    
    selectedFixture.value.status = FixtureStatus.COMPLETED
    emit('fixture-updated', selectedFixture.value)
    emit('match-ended')
    closeModal()
    
    useToast().add({ title: 'Match Ended', color: 'success' })
  } catch (error: any) {
    errorMessage.value = extractErrorMessage(error)
    handleError(error, { title: 'Failed to end match' })
  } finally {
    updatingMatch.value = false
  }
}

const reopenMatch = async () => {
  if (!selectedFixture.value) return
  
  updatingMatch.value = true
  try {
    await fixtureStore.updateFixture(selectedFixture.value.id, {
      status: FixtureStatus.LIVE
    })
    
    selectedFixture.value.status = FixtureStatus.LIVE
    emit('fixture-updated', selectedFixture.value)
    
    useToast().add({ 
      title: 'Match Reopened', 
      description: 'The match has been set back to LIVE.',
      icon: 'i-heroicons-arrow-path',
      color: 'warning' 
    })
  } catch (error: any) {
    handleError(error, { title: 'Failed to reopen match' })
  } finally {
    updatingMatch.value = false
  }
}

const savePenalties = async () => {
  if (!selectedFixture.value) return
  
  updatingMatch.value = true
  try {
    await fixtureStore.updateFixture(selectedFixture.value.id, {
      homePenaltyScore: selectedFixture.value.homePenaltyScore ?? 0,
      awayPenaltyScore: selectedFixture.value.awayPenaltyScore ?? 0
    })
    
    emit('fixture-updated', selectedFixture.value)
    
    useToast().add({ 
      title: 'Penalties Saved', 
      description: 'Penalty shootout scores have been updated.',
      icon: 'i-heroicons-bolt',
      color: 'success' 
    })
  } catch (error: any) {
    handleError(error, { title: 'Failed to save penalties' })
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
    case MatchEventType.MISSED_PENALTY: return 'i-heroicons-x-circle'
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
    case MatchEventType.MISSED_PENALTY: return 'text-red-500'
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
    const res = await $api<any>(`/match-events/fixture/${selectedFixture.value.id}`)
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
      handleError(new Error('Could not generate graphic'), { title: 'Generation Failed' })
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
    handleError(e, { title: 'Generation Failed', description: 'Could not generate graphic.' })
  } finally {
    downloading.value = false
  }
}
</script>

<template>
  <!-- Match Control Modal -->
  <UModal v-model:open="internalOpen">
    <template #content>
      <div class="mc-shell">

        <!-- ── Header ──────────────────────────────────────────── -->
        <div class="mc-header">
          <div class="mc-header__left">
            <span class="mc-header__icon">
              <UIcon name="i-heroicons-adjustments-horizontal" class="w-3.5 h-3.5" />
            </span>
            <span class="mc-header__title">Match Control</span>
            <span
              v-if="selectedFixture"
              class="mc-status-chip"
              :class="`mc-status-chip--${selectedFixture.status.toLowerCase()}`"
            >
              <span class="mc-status-chip__dot" />
              {{ selectedFixture.status }}
            </span>
          </div>
          <button class="mc-header__close" @click="closeModal">
            <UIcon name="i-heroicons-x-mark" class="w-4 h-4" />
          </button>
        </div>

        <div v-if="selectedFixture" class="mc-body">

          <!-- Alerts -->
          <UAlert
            v-if="errorMessage"
            icon="i-heroicons-exclamation-triangle"
            color="error"
            variant="soft"
            :title="errorMessage"
            class="mb-4"
          />
          <UAlert
            v-if="needsPenaltyWarning"
            icon="i-heroicons-exclamation-triangle"
            color="warning"
            variant="soft"
            title="No winner — scores are tied"
            description="Add penalty shootout scores to determine a winner."
            class="mb-4"
          >
            <template #actions>
              <UButton size="xs" color="warning" variant="soft" icon="i-heroicons-bolt" label="Add Penalties"
                @click="showPenaltyOverride = true; showPenaltyCollapsible = true" />
            </template>
          </UAlert>

          <!-- ── Scoreboard ──────────────────────────────────── -->
          <div class="mc-scoreboard">
            <!-- Home team -->
            <div class="mc-team">
              <div class="mc-team__logo">
                <img v-if="selectedFixture.homeTeam?.logoUrl" :src="selectedFixture.homeTeam.logoUrl" class="w-full h-full object-cover" />
                <span v-else class="mc-team__initial">{{ (selectedFixture.homeTeam?.customName || 'H').charAt(0) }}</span>
              </div>
              <span class="mc-team__name">{{ selectedFixture.homeTeam?.customName || 'Home' }}</span>
            </div>

            <!-- Score -->
            <div class="mc-score-block">
              <div class="mc-score-numbers">
                <span class="mc-score-val">{{ selectedFixture.homeScore ?? 0 }}</span>
                <span class="mc-score-sep">–</span>
                <span class="mc-score-val">{{ selectedFixture.awayScore ?? 0 }}</span>
              </div>
              <div v-if="selectedFixture.homePenaltyScore != null || selectedFixture.awayPenaltyScore != null" class="mc-pen-badge">
                <UIcon name="i-heroicons-bolt" class="w-2.5 h-2.5" />
                <span>{{ selectedFixture.homePenaltyScore ?? 0 }} – {{ selectedFixture.awayPenaltyScore ?? 0 }} pen</span>
              </div>
              <div v-if="selectedFixture.startTime" class="mc-match-time">
                {{ new Date(selectedFixture.startTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }}
                · {{ new Date(selectedFixture.startTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) }}
              </div>
            </div>

            <!-- Away team -->
            <div class="mc-team mc-team--away">
              <div class="mc-team__logo">
                <img v-if="selectedFixture.awayTeam?.logoUrl" :src="selectedFixture.awayTeam.logoUrl" class="w-full h-full object-cover" />
                <span v-else class="mc-team__initial">{{ (selectedFixture.awayTeam?.customName || 'A').charAt(0) }}</span>
              </div>
              <span class="mc-team__name">{{ selectedFixture.awayTeam?.customName || 'Away' }}</span>
            </div>
          </div>

          <!-- ── Score Controls ─────────────────────────────── -->
          <div v-if="['LIVE', 'COMPLETED'].includes(selectedFixture.status)" class="mc-controls">
            <!-- Home side -->
            <div class="mc-ctrl-side">
              <button class="mc-btn mc-btn--goal" :disabled="loadingPlayers || updatingMatch" @click="openGoalModal('home')">
                <UIcon name="i-heroicons-plus" class="w-3.5 h-3.5" />
                <span>Goal</span>
              </button>
              <button
                v-if="props.tournament?.participantType !== ParticipantType.INDIVIDUAL"
                class="mc-btn mc-btn--card"
                :disabled="loadingPlayers || updatingMatch"
                @click="openCardModal('home')"
              >
                <span class="card-icons">
                  <span class="card-icon card-icon--yellow" />
                  <span class="card-icon card-icon--red" />
                </span>
                <span>Card</span>
              </button>
              <button
                v-if="props.tournament?.participantType !== ParticipantType.INDIVIDUAL"
                class="mc-btn mc-btn--penalty"
                :disabled="loadingPlayers || updatingMatch"
                @click="openGoalModal('home', MatchEventType.PENALTY)"
              >
                <IconsSoccerBallIcon class="w-3.5 h-3.5" />
                <span>Penalty</span>
              </button>
              <button
                v-if="props.tournament?.participantType !== ParticipantType.INDIVIDUAL"
                class="mc-btn mc-btn--og"
                :disabled="loadingPlayers || updatingMatch"
                @click="openGoalModal('home', MatchEventType.OWN_GOAL)"
              >
                <IconsSoccerBallIcon class="w-3.5 h-3.5" />
                <span>OG</span>
              </button>
              <button
                v-if="props.tournament?.participantType !== ParticipantType.INDIVIDUAL"
                class="mc-btn mc-btn--miss"
                :disabled="loadingPlayers || updatingMatch"
                @click="openGoalModal('home', MatchEventType.MISSED_PENALTY)"
              >
                <UIcon name="i-heroicons-x-circle" class="w-3.5 h-3.5" />
                <span>Miss</span>
              </button>
              <button
                v-if="props.tournament?.participantType === ParticipantType.INDIVIDUAL"
                class="mc-btn mc-btn--minus"
                :disabled="(selectedFixture.homeScore ?? 0) <= 0 || updatingMatch"
                @click="decrementScore('home')"
              >
                <UIcon name="i-heroicons-minus" class="w-3.5 h-3.5" />
              </button>
            </div>

            <div v-if="loadingPlayers" class="mc-loading">
              <UIcon name="i-heroicons-arrow-path" class="w-3.5 h-3.5 animate-spin" />
            </div>
            <div v-else class="mc-ctrl-divider" />

            <!-- Away side -->
            <div class="mc-ctrl-side mc-ctrl-side--right">
              <button class="mc-btn mc-btn--goal" :disabled="loadingPlayers || updatingMatch" @click="openGoalModal('away')">
                <UIcon name="i-heroicons-plus" class="w-3.5 h-3.5" />
                <span>Goal</span>
              </button>
              <button
                v-if="props.tournament?.participantType !== ParticipantType.INDIVIDUAL"
                class="mc-btn mc-btn--card"
                :disabled="loadingPlayers || updatingMatch"
                @click="openCardModal('away')"
              >
                <span class="card-icons">
                  <span class="card-icon card-icon--yellow" />
                  <span class="card-icon card-icon--red" />
                </span>
                <span>Card</span>
              </button>
              <button
                v-if="props.tournament?.participantType !== ParticipantType.INDIVIDUAL"
                class="mc-btn mc-btn--penalty"
                :disabled="loadingPlayers || updatingMatch"
                @click="openGoalModal('away', MatchEventType.PENALTY)"
              >
                <IconsSoccerBallIcon class="w-3.5 h-3.5" />
                <span>Penalty</span>
              </button>
              <button
                v-if="props.tournament?.participantType !== ParticipantType.INDIVIDUAL"
                class="mc-btn mc-btn--og"
                :disabled="loadingPlayers || updatingMatch"
                @click="openGoalModal('away', MatchEventType.OWN_GOAL)"
              >
                <IconsSoccerBallIcon class="w-3.5 h-3.5" />
                <span>OG</span>
              </button>
              <button
                v-if="props.tournament?.participantType !== ParticipantType.INDIVIDUAL"
                class="mc-btn mc-btn--miss"
                :disabled="loadingPlayers || updatingMatch"
                @click="openGoalModal('away', MatchEventType.MISSED_PENALTY)"
              >
                <UIcon name="i-heroicons-x-circle" class="w-3.5 h-3.5" />
                <span>Miss</span>
              </button>
              <button
                v-if="props.tournament?.participantType === ParticipantType.INDIVIDUAL"
                class="mc-btn mc-btn--minus"
                :disabled="(selectedFixture.awayScore ?? 0) <= 0 || updatingMatch"
                @click="decrementScore('away')"
              >
                <UIcon name="i-heroicons-minus" class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <!-- ── Sections ────────────────────────────────────── -->
          <div class="mc-sections">

            <!-- Schedule -->
            <div v-if="['SCHEDULED', 'LIVE', 'COMPLETED'].includes(selectedFixture.status)" class="mc-section">
              <button class="mc-section__toggle" @click="showScheduleCollapsible = !showScheduleCollapsible">
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-calendar" class="w-3.5 h-3.5 text-emerald-500" />
                  <span>Schedule</span>
                </div>
                <UIcon :name="showScheduleCollapsible ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" class="w-4 h-4 text-gray-400" />
              </button>
              <div v-if="showScheduleCollapsible" class="mc-section__body">
                <div class="flex flex-col sm:flex-row flex-wrap gap-2">
                  <UPopover class="flex-1 min-w-0">
                    <UButton variant="outline" color="neutral" icon="i-heroicons-calendar"
                      class="w-full justify-start" :class="!matchDateVal && 'text-gray-400'" :disabled="updatingTime">
                      {{ formatDateDisplay(matchDateVal) }}
                    </UButton>
                    <template #content>
                      <UCalendar v-model="matchDateVal" :min-value="tournamentMinDate" :max-value="tournamentMaxDate" />
                    </template>
                  </UPopover>
                  <UInput type="time" v-model="matchTimeVal" class="w-full sm:w-32" size="md" :disabled="updatingTime" />
                  <USelect
                    v-if="venueStore.venues.length"
                    v-model="matchVenue"
                    :items="venueOptions"
                    value-key="value"
                    placeholder="Select venue…"
                    class="w-full sm:w-44"
                    size="md"
                    :disabled="updatingTime"
                  />
                </div>
                <UButton color="primary" variant="solid" size="sm"
                  :loading="updatingTime" :disabled="isUpdateDisabled"
                  @click="updateMatchTime" class="mt-2 w-full sm:w-auto">
                  Update Schedule
                </UButton>
              </div>
            </div>

            <!-- Penalty shootout -->
            <div
              v-if="['LIVE', 'COMPLETED'].includes(selectedFixture.status) && (isScoreTiedOrAggregateTied || hasPenalties || showPenaltyOverride)"
              class="mc-section"
            >
              <button class="mc-section__toggle" @click="showPenaltyCollapsible = !showPenaltyCollapsible">
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-bolt" class="w-3.5 h-3.5 text-amber-500" />
                  <span>Penalty Shootout</span>
                  <span class="mc-tag">Tie Breaker</span>
                </div>
                <UIcon :name="showPenaltyCollapsible ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" class="w-4 h-4 text-gray-400" />
              </button>
              <div v-if="showPenaltyCollapsible" class="mc-section__body">
                <div class="flex items-end justify-center gap-8">
                  <div class="flex flex-col items-center gap-1.5">
                    <span class="mc-pen-label">{{ selectedFixture.homeTeam?.customName || 'Home' }}</span>
                    <UInput v-model.number="selectedFixture.homePenaltyScore" type="number" :min="0" placeholder="0"
                      class="w-20 text-center" :ui="{ base: 'text-center text-xl font-bold' }" />
                  </div>
                  <span class="text-gray-400 font-medium pb-2">–</span>
                  <div class="flex flex-col items-center gap-1.5">
                    <span class="mc-pen-label">{{ selectedFixture.awayTeam?.customName || 'Away' }}</span>
                    <UInput v-model.number="selectedFixture.awayPenaltyScore" type="number" :min="0" placeholder="0"
                      class="w-20 text-center" :ui="{ base: 'text-center text-xl font-bold' }" />
                  </div>
                </div>
                <div class="flex items-center justify-center gap-2 mt-3">
                  <UButton
                    v-if="selectedFixture.homePenaltyScore != null && selectedFixture.awayPenaltyScore != null"
                    size="xs" color="success" variant="soft" icon="i-heroicons-check" label="Save Penalties"
                    :loading="updatingMatch" @click="savePenalties"
                  />
                  <UButton
                    v-if="hasPenalties && !isScoreTiedOrAggregateTied"
                    size="xs" color="warning" variant="soft" icon="i-heroicons-x-circle" label="Clear"
                    @click="selectedFixture!.homePenaltyScore = 0; selectedFixture!.awayPenaltyScore = 0"
                  />
                </div>
                <p class="text-xs text-center text-gray-400 dark:text-gray-500 mt-2">Penalty shootout scores to determine the winner.</p>
              </div>
            </div>

            <!-- Edit penalties toggle -->
            <div v-if="selectedFixture.status === 'COMPLETED' && !isScoreTiedOrAggregateTied && !hasPenalties && !showPenaltyOverride" class="flex justify-center">
              <UButton size="xs" variant="link" color="neutral" icon="i-heroicons-bolt" label="Edit Penalties" @click="showPenaltyOverride = true" />
            </div>

            <!-- Match Events -->
            <div v-if="tournament?.participantType !== ParticipantType.INDIVIDUAL" class="mc-section">
              <button class="mc-section__toggle" @click="showEventsCollapsible = !showEventsCollapsible">
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-clipboard-document-list" class="w-3.5 h-3.5 text-indigo-500" />
                  <span>Match Events</span>
                  <span class="mc-tag">{{ matchEvents.length }}</span>
                </div>
                <UIcon :name="showEventsCollapsible ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" class="w-4 h-4 text-gray-400" />
              </button>
              <div v-if="showEventsCollapsible" class="mc-events-body">
                <div v-if="loadingEvents" class="flex items-center justify-center gap-2 py-6 text-sm text-gray-400">
                  <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" /> Loading…
                </div>
                <div v-else-if="matchEvents.length === 0" class="py-6 text-center text-sm text-gray-400">
                  No events recorded yet
                </div>
                <div v-else class="mc-events-list">
                  <div
                    v-for="event in [...matchEvents].sort((a, b) => (a.minute || 0) - (b.minute || 0))"
                    :key="event.id"
                  >
                    <!-- Home event -->
                    <div v-if="event.participant_id === selectedFixture?.homeTeamId" class="mc-event mc-event--home">
                      <div class="mc-event__min">{{ event.minute || '–' }}'</div>
                      <div class="mc-event__info">
                        <div class="flex items-center gap-1.5">
                          <IconsSoccerBallIcon v-if="['GOAL','PENALTY','OWN_GOAL'].includes(event.type)" class="w-4 h-4 flex-shrink-0" :class="getEventColor(event.type)" />
                          <UIcon v-else :name="getEventIcon(event.type)" :class="['w-4 h-4 flex-shrink-0', getEventColor(event.type)]" />
                          <span class="mc-event__player">{{ getPlayerName(event.playerId) || 'Unknown' }}</span>
                          <span v-if="event.type === 'PENALTY'" class="mc-event__tag">(P)</span>
                          <span v-if="event.type === 'OWN_GOAL'" class="mc-event__tag">(OG)</span>
                        </div>
                        <div v-if="event.relatedPlayerId && event.type !== 'OWN_GOAL'" class="mc-event__assist">
                          <IconsAssistIcon class="w-2.5 h-2.5 flex-shrink-0" /> {{ getPlayerName(event.relatedPlayerId) }}
                        </div>
                      </div>
                      <UDropdownMenu :items="getEventActionItems(event)" :content="{ align: 'end' }">
                        <UButton color="neutral" variant="ghost" icon="i-heroicons-ellipsis-vertical" size="xs" />
                      </UDropdownMenu>
                    </div>
                    <!-- Away event -->
                    <div v-else-if="event.participant_id === selectedFixture?.awayTeamId" class="mc-event mc-event--away">
                      <UDropdownMenu :items="getEventActionItems(event)" :content="{ align: 'start' }">
                        <UButton color="neutral" variant="ghost" icon="i-heroicons-ellipsis-vertical" size="xs" />
                      </UDropdownMenu>
                      <div class="mc-event__info mc-event__info--right">
                        <div class="flex items-center justify-end gap-1.5">
                          <span v-if="event.type === 'OWN_GOAL'" class="mc-event__tag">(OG)</span>
                          <span v-if="event.type === 'PENALTY'" class="mc-event__tag">(P)</span>
                          <span class="mc-event__player">{{ getPlayerName(event.playerId) || 'Unknown' }}</span>
                          <IconsSoccerBallIcon v-if="['GOAL','PENALTY','OWN_GOAL'].includes(event.type)" class="w-4 h-4 flex-shrink-0" :class="getEventColor(event.type)" />
                          <UIcon v-else :name="getEventIcon(event.type)" :class="['w-4 h-4 flex-shrink-0', getEventColor(event.type)]" />
                        </div>
                        <div v-if="event.relatedPlayerId && event.type !== 'OWN_GOAL'" class="mc-event__assist mc-event__assist--right">
                          {{ getPlayerName(event.relatedPlayerId) }} <IconsAssistIcon class="w-2.5 h-2.5 flex-shrink-0" />
                        </div>
                      </div>
                      <div class="mc-event__min">{{ event.minute || '–' }}'</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div><!-- /mc-sections -->

          <!-- ── Action Bar ──────────────────────────────────── -->
          <div class="mc-action-bar">
            <!-- Primary action -->
            <div class="mc-action-bar__primary">
              <template v-if="selectedFixture.status === 'SCHEDULED' && selectedFixture.startTime">
                <button
                  v-if="!isLeg2 || leg1Completed"
                  class="mc-primary-btn mc-primary-btn--start"
                  :disabled="updatingMatch"
                  @click="startMatch"
                >
                  <UIcon name="i-heroicons-play" class="w-4 h-4" />
                  <span>{{ updatingMatch ? 'Starting…' : 'Start Match' }}</span>
                </button>
                <UTooltip text="Complete Leg 1 first to unlock" v-else>
                  <button class="mc-primary-btn mc-primary-btn--locked" disabled>
                    <UIcon name="i-heroicons-lock-closed" class="w-4 h-4" />
                    <span>Leg 1 Pending</span>
                  </button>
                </UTooltip>
              </template>
              <button
                v-if="selectedFixture.status === 'LIVE'"
                class="mc-primary-btn mc-primary-btn--end"
                :disabled="updatingMatch"
                @click="endMatch"
              >
                <UIcon name="i-heroicons-flag" class="w-4 h-4" />
                <span>{{ updatingMatch ? 'Ending…' : 'End Match' }}</span>
              </button>
              <button
                v-if="selectedFixture.status === 'COMPLETED'"
                class="mc-primary-btn mc-primary-btn--reopen"
                :disabled="updatingMatch"
                @click="reopenMatch"
              >
                <UIcon name="i-heroicons-arrow-path" class="w-4 h-4" />
                <span>{{ updatingMatch ? 'Reopening…' : 'Reopen Match' }}</span>
              </button>
              <button
                v-if="selectedFixture.status === 'LIVE'"
                class="mc-primary-btn mc-primary-btn--reopen"
                :disabled="updatingMatch"
                @click="undoStartMatch"
              >
                <UIcon name="i-heroicons-arrow-uturn-left" class="w-4 h-4" />
                <span>{{ updatingMatch ? 'Undoing…' : 'Undo Start' }}</span>
              </button>
            </div>

            <!-- Secondary actions -->
            <div class="mc-action-bar__secondary">
              <button v-if="canShare" class="mc-sec-btn" :disabled="sharingMatch" @click="handleShareGraphic">
                <UIcon name="i-heroicons-share" class="w-3.5 h-3.5" />
                <span>Share</span>
              </button>
              <button class="mc-sec-btn" :disabled="downloading" @click="downloadGraphic">
                <UIcon name="i-heroicons-arrow-down-tray" class="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
              <button class="mc-sec-btn" @click="closeModal">
                <UIcon name="i-heroicons-x-mark" class="w-3.5 h-3.5" />
                <span>Close</span>
              </button>
            </div>
          </div>

        </div><!-- /mc-body -->
      </div><!-- /mc-shell -->
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
          <!-- Goal Type -->
          <UFormField label="Goal Type">
            <USelect
              v-model="goalData.type"
              :items="[
                { label: 'Normal Goal', value: 'GOAL' }, 
                { label: 'Penalty', value: 'PENALTY' }, 
                { label: 'Missed Penalty', value: 'MISSED_PENALTY' }, 
                { label: 'Own Goal', value: 'OWN_GOAL' }
              ]"
              class="w-full"
            />
          </UFormField>

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
          <UFormField v-if="goalData.type !== 'OWN_GOAL'" label="Assist By (optional)">
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

  <!-- Card Event Modal -->
  <UModal v-model:open="showCardModal">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-warning-500" />
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                Record Card
              </h3>
              <UBadge :color="cardTeam === 'home' ? 'primary' : 'warning'" variant="subtle" size="sm">
                {{ cardTeam === 'home' ? selectedFixture?.homeTeam?.customName : selectedFixture?.awayTeam?.customName }}
              </UBadge>
            </div>
            <UButton icon="i-heroicons-x-mark" variant="ghost" color="neutral" size="sm" @click="showCardModal = false" />
          </div>
        </template>

        <div class="space-y-4">
          <!-- Card Type -->
          <UFormField label="Card Type">
            <USelect
              v-model="cardData.type"
              :items="[
                { label: 'Yellow Card', value: 'YELLOW_CARD' }, 
                { label: 'Red Card', value: 'RED_CARD' }
              ]"
              class="w-full"
            />
          </UFormField>

          <!-- Minute -->
          <UFormField label="Minute (optional)">
            <UInput 
              v-model.number="cardData.minute" 
              type="number" 
              placeholder="e.g. 45"
              icon="i-heroicons-clock"
              :min="0"
              :max="120"
            />
          </UFormField>

          <!-- Player -->
          <UFormField label="Player">
            <USelect
              v-model="cardData.playerId"
              :items="cardTeamPlayers.map(p => ({ label: `${p.number ? `#${p.number} ` : ''}${p.name}`, value: p.id }))"
              placeholder="Select player..."
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <p v-if="cardTeamPlayers.length === 0" class="text-sm text-gray-500">
            No players registered for this team. You can still record a card event but cannot assign it to a player.
          </p>

          <!-- Actions -->
          <div class="flex justify-end gap-3 pt-2">
            <UButton label="Cancel" variant="ghost" color="neutral" @click="showCardModal = false" />
            <UButton 
              label="Record Card" 
              icon="i-heroicons-check"
              :color="cardData.type === 'YELLOW_CARD' ? 'warning' : 'error'"
              :loading="updatingMatch"
              @click="confirmCard"
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

<style scoped>
/* ── Shell ─────────────────────────────────────────────────── */
.mc-shell {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

:root.dark .mc-shell {
  background: #141414;
}

/* ── Header ────────────────────────────────────────────────── */
.mc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: linear-gradient(135deg, #064e3b 0%, #065f46 100%);
  flex-shrink: 0;
}

.mc-header__left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mc-header__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: rgba(255,255,255,0.15);
  color: #fff;
}

.mc-header__title {
  font-size: 0.875rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.01em;
}

.mc-header__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: transparent;
  color: rgba(255,255,255,0.6);
  cursor: pointer;
  border: none;
  transition: background 0.15s, color 0.15s;
}

.mc-header__close:hover {
  background: rgba(255,255,255,0.12);
  color: #fff;
}

/* Status chips */
.mc-status-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  padding: 2px 8px;
  border-radius: 20px;
}

.mc-status-chip__dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}

.mc-status-chip--live {
  background: rgba(245,158,11,0.2);
  color: #fbbf24;
}
.mc-status-chip--live .mc-status-chip__dot {
  background: #fbbf24;
  animation: pulse 1.2s ease-in-out infinite;
}

.mc-status-chip--scheduled {
  background: rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.7);
}
.mc-status-chip--scheduled .mc-status-chip__dot { background: rgba(255,255,255,0.5); }

.mc-status-chip--completed {
  background: rgba(16,185,129,0.2);
  color: #34d399;
}
.mc-status-chip--completed .mc-status-chip__dot { background: #34d399; }

.mc-status-chip--cancelled {
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.4);
}
.mc-status-chip--cancelled .mc-status-chip__dot { background: rgba(255,255,255,0.3); }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}

/* ── Body ──────────────────────────────────────────────────── */
.mc-body {
  overflow-y: auto;
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* ── Scoreboard ────────────────────────────────────────────── */
.mc-scoreboard {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px;
  padding: 20px 8px;
  background: #f9fafb;
  border-radius: 12px;
  margin-bottom: 12px;
}

:root.dark .mc-scoreboard {
  background: rgba(255,255,255,0.04);
}

.mc-team {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.mc-team__logo {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #e5e7eb;
  border: 2px solid #d1d5db;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

:root.dark .mc-team__logo {
  background: #1e1e1e;
  border-color: rgba(255,255,255,0.1);
}

.mc-team__initial {
  font-size: 1.1rem;
  font-weight: 800;
  color: #6b7280;
}

:root.dark .mc-team__initial { color: #9ca3af; }

.mc-team__name {
  font-size: 0.8125rem;
  font-weight: 700;
  color: #111827;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100px;
}

:root.dark .mc-team__name { color: #f3f4f6; }

/* Score block */
.mc-score-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.mc-score-numbers {
  display: flex;
  align-items: center;
  gap: 6px;
}

.mc-score-val {
  font-size: 2.25rem;
  font-weight: 900;
  color: #111827;
  min-width: 2rem;
  text-align: center;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

:root.dark .mc-score-val { color: #f9fafb; }

.mc-score-sep {
  font-size: 1.5rem;
  color: #d1d5db;
  font-weight: 300;
  line-height: 1;
}

:root.dark .mc-score-sep { color: #4b5563; }

.mc-pen-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.6rem;
  font-weight: 600;
  color: #d97706;
  background: rgba(245,158,11,0.1);
  border: 1px solid rgba(245,158,11,0.2);
  padding: 2px 6px;
  border-radius: 10px;
}

.mc-match-time {
  font-size: 0.625rem;
  color: #9ca3af;
  font-weight: 500;
  white-space: nowrap;
}

/* ── Score Controls ────────────────────────────────────────── */
.mc-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;
}

.mc-ctrl-side {
  flex: 1;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.mc-ctrl-side--right {
  justify-content: flex-end;
}

.mc-ctrl-divider {
  width: 1px;
  height: 28px;
  background: #e5e7eb;
  flex-shrink: 0;
}

:root.dark .mc-ctrl-divider { background: rgba(255,255,255,0.08); }

.mc-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  flex-shrink: 0;
}

/* Action buttons */
.mc-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 5px 10px;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
  line-height: 1.4;
}

.mc-btn:disabled { opacity: 0.4; cursor: default; }

.mc-btn--goal {
  border-color: rgba(16, 185, 129, 0.2);
  color: #10b981;
}
.mc-btn--goal:hover:not(:disabled) { background: rgba(16,185,129,0.18); }

.mc-btn--miss {
  border-color: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}
.mc-btn--miss:hover:not(:disabled) { background: rgba(239, 68, 68, 0.1); }

.mc-btn--penalty {
  border-color: rgba(107, 114, 128, 0.2);
  color: #6b7280;
}
.mc-btn--penalty:hover:not(:disabled) { background: rgba(107, 114, 128, 0.1); }

.mc-btn--og {
  border-color: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}
.mc-btn--og:hover:not(:disabled) { background: rgba(239, 68, 68, 0.1); }

.mc-btn--card {
  background: rgba(245,158,11,0.1);
  color: #d97706;
  border-color: rgba(245,158,11,0.2);
}
.mc-btn--card:hover:not(:disabled) { background: rgba(245,158,11,0.18); }

.card-icons {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  flex-shrink: 0;
}

.card-icon {
  display: inline-block;
  width: 7px;
  height: 10px;
  border-radius: 1.5px;
}

.card-icon--yellow { background: #facc15; }
.card-icon--red    { background: #ef4444; }

.mc-btn--minus {
  background: rgba(107,114,128,0.08);
  color: #6b7280;
  border-color: rgba(107,114,128,0.12);
  padding: 5px 8px;
}
.mc-btn--minus:hover:not(:disabled) { background: rgba(107,114,128,0.14); }

/* ── Sections ──────────────────────────────────────────────── */
.mc-sections {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.mc-section {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
}

:root.dark .mc-section { border-color: rgba(255,255,255,0.07); }

.mc-section__head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  background: #f9fafb;
  font-size: 0.75rem;
  font-weight: 600;
  color: #374151;
}

:root.dark .mc-section__head {
  background: rgba(255,255,255,0.03);
  color: #d1d5db;
}

.mc-section__toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 12px;
  background: #f9fafb;
  font-size: 0.75rem;
  font-weight: 600;
  color: #374151;
  cursor: pointer;
  border: none;
  transition: background 0.15s;
  text-align: left;
}

.mc-section__toggle:hover { background: #f3f4f6; }

:root.dark .mc-section__toggle {
  background: rgba(255,255,255,0.03);
  color: #d1d5db;
}
:root.dark .mc-section__toggle:hover { background: rgba(255,255,255,0.05); }

.mc-section__body {
  padding: 12px;
  background: #fff;
  border-top: 1px solid #f3f4f6;
}

:root.dark .mc-section__body {
  background: rgba(255,255,255,0.01);
  border-color: rgba(255,255,255,0.05);
}

/* Tag pill */
.mc-tag {
  display: inline-flex;
  align-items: center;
  font-size: 0.575rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 10px;
  background: #f3f4f6;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

:root.dark .mc-tag {
  background: rgba(255,255,255,0.08);
  color: #9ca3af;
}

/* Penalty labels */
.mc-pen-label {
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #9ca3af;
}

/* ── Events ────────────────────────────────────────────────── */
.mc-events-body {
  border-top: 1px solid #f3f4f6;
}

:root.dark .mc-events-body { border-color: rgba(255,255,255,0.05); }

.mc-events-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 260px;
  overflow-y: auto;
  padding: 8px;
}

.mc-event {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 4px;
  border-radius: 6px;
}

.mc-event:hover { background: #f9fafb; }
:root.dark .mc-event:hover { background: rgba(255,255,255,0.03); }

.mc-event--away { justify-content: flex-end; }

.mc-event__min {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 50%;
  font-size: 0.625rem;
  font-weight: 700;
  color: #6b7280;
}

:root.dark .mc-event__min {
  background: #1e1e1e;
  border-color: rgba(255,255,255,0.08);
  color: #9ca3af;
}

.mc-event__info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.mc-event__info--right {
  align-items: flex-end;
  text-align: right;
}

.mc-event__player {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:root.dark .mc-event__player { color: #f3f4f6; }

.mc-event__tag {
  font-size: 0.625rem;
  color: #9ca3af;
  flex-shrink: 0;
}

.mc-event__assist {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 0.6rem;
  color: #9ca3af;
  margin-top: 1px;
  padding-left: 20px;
}

.mc-event__assist--right {
  justify-content: flex-end;
  padding-left: 0;
  padding-right: 20px;
}

/* ── Action Bar ────────────────────────────────────────────── */
.mc-action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid #f3f4f6;
  flex-shrink: 0;
}

:root.dark .mc-action-bar { border-color: rgba(255,255,255,0.06); }

.mc-action-bar__primary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.mc-action-bar__secondary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  margin-left: auto;
}

/* Primary action buttons */
.mc-primary-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8125rem;
  font-weight: 700;
  padding: 7px 16px;
  border-radius: 9px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  white-space: nowrap;
  line-height: 1.4;
}

.mc-primary-btn:disabled { opacity: 0.5; cursor: default; }
.mc-primary-btn:not(:disabled):active { transform: scale(0.97); }

.mc-primary-btn--start {
  background: #059669;
  color: #fff;
  border-color: #047857;
  box-shadow: 0 2px 6px rgba(5,150,105,0.3);
}
.mc-primary-btn--start:hover:not(:disabled) { background: #047857; }

.mc-primary-btn--end {
  background: #dc2626;
  color: #fff;
  border-color: #b91c1c;
  box-shadow: 0 2px 6px rgba(220,38,38,0.3);
}
.mc-primary-btn--end:hover:not(:disabled) { background: #b91c1c; }

.mc-primary-btn--reopen {
  background: #d97706;
  color: #fff;
  border-color: #b45309;
  box-shadow: 0 2px 6px rgba(217,119,6,0.3);
}
.mc-primary-btn--reopen:hover:not(:disabled) { background: #b45309; }

.mc-primary-btn--locked {
  background: #f3f4f6;
  color: #9ca3af;
  border-color: #e5e7eb;
}
:root.dark .mc-primary-btn--locked {
  background: rgba(255,255,255,0.05);
  color: #6b7280;
  border-color: rgba(255,255,255,0.08);
}

/* Secondary action buttons */
.mc-sec-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 5px 10px;
  border-radius: 7px;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #6b7280;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  white-space: nowrap;
}

.mc-sec-btn:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #d1d5db;
  color: #374151;
}

.mc-sec-btn:disabled { opacity: 0.4; cursor: default; }

:root.dark .mc-sec-btn {
  background: rgba(255,255,255,0.04);
  border-color: rgba(255,255,255,0.08);
  color: #9ca3af;
}
:root.dark .mc-sec-btn:hover:not(:disabled) {
  background: rgba(255,255,255,0.07);
  color: #d1d5db;
}
</style>
