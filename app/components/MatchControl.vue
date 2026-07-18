<script setup lang="ts">
import { FixtureStatus, MatchEventType, ParticipantType, FixtureStage, MatchHalf } from '~/types'
import type { Fixture, Player, MatchEvent } from '~/types'
import { CalendarDate, parseDate, type DateValue } from '@internationalized/date'
import { useMatchTimer, isFixtureLiveStatus, getMatchElapsedSeconds } from '~/composables/useMatchTimer'

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
const playerStore = usePlayerStore()
const { handleError, extractErrorMessage } = useErrors()

// Local state
const selectedFixture = ref<Fixture | null>(null)
const updatingMatch = ref(false)
const matchTime = ref<string>('') // Used for fallback/comparison
const matchDateVal = shallowRef<DateValue | null>(null)
const matchTimeVal = ref<string>('12:00')
const matchVenue = ref<string>('')
const matchDuration = ref(90)
const matchTimer = useMatchTimer()
const adjustedMinute = ref(1)

// Local reactive clock for second-half detection
const localNow = ref(Date.now())
let localNowInterval: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  localNowInterval = setInterval(() => {
    localNow.value = Date.now()
  }, 1000)
})
onUnmounted(() => {
  if (localNowInterval) clearInterval(localNowInterval)
})

const adjustTimerMaxMinutes = computed(() => {
  if (!selectedFixture.value) return 90
  const duration = selectedFixture.value.matchDuration ?? 90
  const htSeconds = (duration * 60) / 2
  const baseElapsed = selectedFixture.value.timerElapsedSeconds ?? 0
  
  if (baseElapsed < htSeconds) {
    return Math.floor(htSeconds / 60)
  }
  return duration
})

const liveClock = computed(() => {
  if (!selectedFixture.value) return ''
  return matchTimer.formatClock(selectedFixture.value)
})

const liveMinuteLabel = computed(() => {
  if (!selectedFixture.value) return ''
  return matchTimer.formatMinuteLabel(selectedFixture.value)
})

const isTimerRunning = computed(() => {
  return (selectedFixture.value?.status === FixtureStatus.LIVE || selectedFixture.value?.status === FixtureStatus.EXTRATIME) && !!selectedFixture.value?.timerIsRunning
})

const isTimerPaused = computed(() => {
  return (selectedFixture.value?.status === FixtureStatus.LIVE || selectedFixture.value?.status === FixtureStatus.EXTRATIME) && !selectedFixture.value?.timerIsRunning
})

const halftimeSeconds = computed(() => {
  return (matchDuration.value * 60) / 2
})

const isHalftime = computed(() => {
  if (!selectedFixture.value) return false
  return selectedFixture.value.timerIsRunning === false && selectedFixture.value.timerElapsedSeconds === halftimeSeconds.value
})

const isSecondHalf = computed(() => {
  if (!selectedFixture.value) return false
  localNow.value // trigger re-evaluation every second
  const elapsed = getMatchElapsedSeconds(selectedFixture.value) ?? 0
  return elapsed >= halftimeSeconds.value
})

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
const homePenaltyPlayerId = ref<string | undefined>(undefined)
const awayPenaltyPlayerId = ref<string | undefined>(undefined)
const errorMessage = ref<string | null>(null)
const swappingTeams = ref(false)
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

const selectedLineupIds = ref<string[]>([])
const showLineupCollapsible = ref(false)
const savingLineups = ref(false)
const selectedManOfTheMatchPlayerId = ref<string | null>(null)
const savingMotm = ref(false)
const showMotmCollapsible = ref(true)
const homeFormation = ref<string>('')
const awayFormation = ref<string>('')
const lineupViewMode = ref<'list' | 'pitch'>('pitch')
const changedPositions = ref<Record<string, string>>({})
const lineupPositions = ref<Record<string, string>>({})
const activeLineupTeam = ref<'home' | 'away'>('home')

const formationPresets = [
  { label: 'Select formation...', value: '' },
  { label: '4-4-2', value: '4-4-2' },
  { label: '4-3-3', value: '4-3-3' },
  { label: '4-2-3-1', value: '4-2-3-1' },
  { label: '3-5-2', value: '3-5-2' },
  { label: '3-4-3', value: '3-4-3' },
  { label: '5-3-2', value: '5-3-2' },
  { label: '5-4-1', value: '5-4-1' },
  { label: '4-1-4-1', value: '4-1-4-1' },
  { label: '4-5-1', value: '4-5-1' }
]

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

// Walkover modal
const showWalkoverModal = ref(false)
const walkoverScore = ref(3)

// Swap confirmation modal
const showSwapConfirmModal = ref(false)

type ButtonColor = 'info' | 'error' | 'success' | 'primary' | 'secondary' | 'warning' | 'neutral'

// Generic confirmation modal
const showConfirmModal = ref(false)
const confirmModalTitle = ref('')
const confirmModalMessage = ref('')
const confirmModalConfirmLabel = ref('')
const confirmModalConfirmColor = ref<ButtonColor>('error')
const confirmModalOnConfirm = ref<() => Promise<void>>(async () => {})

const openConfirmModal = (options: {
  title: string
  message: string
  confirmLabel: string
  confirmColor?: ButtonColor
  onConfirm: () => Promise<void>
}) => {
  confirmModalTitle.value = options.title
  confirmModalMessage.value = options.message
  confirmModalConfirmLabel.value = options.confirmLabel
  confirmModalConfirmColor.value = options.confirmColor || 'error'
  confirmModalOnConfirm.value = options.onConfirm
  showConfirmModal.value = true
}

const handleConfirmModal = async () => {
  await confirmModalOnConfirm.value()
  showConfirmModal.value = false
}

// Substitution modal
const showSubstitutionModal = ref(false)
const subTeam = ref<'home' | 'away'>('home')
const subData = reactive({
  playerOutId: undefined as string | undefined,
  playerInId: undefined as string | undefined,
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

watch(() => subData.playerOutId, (newId) => {
  if (newId && newId === subData.playerInId) {
    subData.playerInId = undefined
  }
})

watch(() => subData.playerInId, (newId) => {
  if (newId && newId === subData.playerOutId) {
    subData.playerOutId = undefined
  }
})


// Fixture status colors
const fixtureStatusColors: Record<FixtureStatus, 'info' | 'success' | 'warning' | 'neutral'> = {
  [FixtureStatus.SCHEDULED]: 'info',
  [FixtureStatus.LIVE]: 'warning',
  [FixtureStatus.NORMAL_TIME_ENDED]: 'warning',
  [FixtureStatus.EXTRATIME]: 'warning',
  [FixtureStatus.COMPLETED]: 'success',
  [FixtureStatus.CANCELLED]: 'neutral'
}

// Watch for fixture changes
watch(() => props.fixture, async (newFixture) => {
  if (newFixture && props.open) {
    selectedFixture.value = { ...newFixture }
    matchDuration.value = newFixture.matchDuration ?? 90
    selectedLineupIds.value = newFixture.lineupPlayers?.map(p => p.id) || []
    homeFormation.value = newFixture.homeFormation || ''
    awayFormation.value = newFixture.awayFormation || ''
    changedPositions.value = {}
    lineupPositions.value = (newFixture.lineupPositions as Record<string, string>) || {}
    lineupViewMode.value = (newFixture.homeFormation || newFixture.awayFormation) ? 'pitch' : 'list'
    activeLineupTeam.value = 'home'
    selectedManOfTheMatchPlayerId.value = newFixture.manOfTheMatchPlayerId || null
    await loadMatchData(newFixture)
  }
}, { immediate: true })

watch(() => props.open, async (isOpen) => {
  if (isOpen && props.fixture) {
    errorMessage.value = null
    selectedFixture.value = { ...props.fixture }
    matchDuration.value = props.fixture.matchDuration ?? 90
    selectedLineupIds.value = props.fixture.lineupPlayers?.map(p => p.id) || []
    homeFormation.value = props.fixture.homeFormation || ''
    awayFormation.value = props.fixture.awayFormation || ''
    changedPositions.value = {}
    lineupPositions.value = (props.fixture.lineupPositions as Record<string, string>) || {}
    lineupViewMode.value = (props.fixture.homeFormation || props.fixture.awayFormation) ? 'pitch' : 'list'
    activeLineupTeam.value = 'home'
    selectedManOfTheMatchPlayerId.value = props.fixture.manOfTheMatchPlayerId || null
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
    selectedLineupIds.value = []
    homeFormation.value = ''
    awayFormation.value = ''
    changedPositions.value = {}
    activeLineupTeam.value = 'home'
    selectedManOfTheMatchPlayerId.value = null
  }
})

watch(showScheduleCollapsible, (isOpen) => {
  if (isOpen && isFixtureLiveStatus(selectedFixture.value?.status)) {
    const currentElapsed = matchTimer.getElapsedSeconds(selectedFixture.value) ?? 0
    const rawMinute = Math.floor(currentElapsed / 60)
    adjustedMinute.value = Math.min(rawMinute, adjustTimerMaxMinutes.value)
  }
})

watch(matchDateVal, (newVal, oldVal) => {
  if (newVal && props.tournament?.start_date && props.tournament?.end_date) {
    const tStart = parseDateString(props.tournament.start_date)
    const tEnd = parseDateString(props.tournament.end_date)
    if (tStart && tEnd) {
      if (newVal.compare(tStart) < 0 || newVal.compare(tEnd) > 0) {
        useToast().add({
          title: 'Date out of range',
          description: `The fixture date must be between the tournament start date (${formatDateDisplay(tStart)}) and end date (${formatDateDisplay(tEnd)}). Please adjust the tournament's start or end date to select this date.`,
          color: 'error'
        })
        // Revert to old value
        setTimeout(() => {
          matchDateVal.value = oldVal
        }, 0)
      }
    }
  }
})

const loadMatchData = async (fixture: Fixture) => {
  matchEvents.value = []
  loadingPlayers.value = true
  loadingEvents.value = true
  
  try {
    // Fetch full fixture details to get the saved lineup players
    const detailedFixtureRes = await $api<any>(`/fixtures/${fixture.id}`)
    const detailedFixture = detailedFixtureRes?.data || detailedFixtureRes
    if (detailedFixture) {
      selectedFixture.value = detailedFixture
      selectedLineupIds.value = detailedFixture.lineupPlayers?.map((p: any) => p.id) || []
      homeFormation.value = detailedFixture.homeFormation || ''
      awayFormation.value = detailedFixture.awayFormation || ''
      selectedManOfTheMatchPlayerId.value = detailedFixture.manOfTheMatchPlayerId || null
    }

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
    const now = new Date().toISOString()
    const updatePayload = {
      status: FixtureStatus.LIVE,
      homeScore: selectedFixture.value.homeScore ?? 0,
      awayScore: selectedFixture.value.awayScore ?? 0,
      timerStartedAt: now,
      timerElapsedSeconds: 0,
      timerIsRunning: true
    }
    await fixtureStore.updateFixture(selectedFixture.value.id, updatePayload)
    
    selectedFixture.value = {
      ...selectedFixture.value,
      ...updatePayload
    }
    
    emit('fixture-updated', selectedFixture.value!)
    
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
    const updatePayload = {
      status: FixtureStatus.SCHEDULED,
      timerStartedAt: null,
      timerElapsedSeconds: 0,
      timerIsRunning: false
    }
    await fixtureStore.updateFixture(selectedFixture.value.id, updatePayload)
    
    selectedFixture.value = {
      ...selectedFixture.value,
      ...updatePayload
    }
    
    emit('fixture-updated', selectedFixture.value!)
    
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

const pauseMatch = async () => {
  if (!selectedFixture.value) return
  
  updatingMatch.value = true
  try {
    const currentElapsed = matchTimer.getElapsedSeconds(selectedFixture.value) ?? 0
    const updatePayload = {
      timerIsRunning: false,
      timerElapsedSeconds: currentElapsed
    }
    await fixtureStore.updateFixture(selectedFixture.value.id, updatePayload)
    
    selectedFixture.value = {
      ...selectedFixture.value,
      ...updatePayload
    }
    
    emit('fixture-updated', selectedFixture.value!)
    
    useToast().add({ 
      title: 'Match Paused', 
      description: 'The clock has been paused.',
      icon: 'i-heroicons-pause',
      color: 'warning' 
    })
  } catch (error: any) {
    handleError(error, { title: 'Failed to pause match' })
  } finally {
    updatingMatch.value = false
  }
}

const resumeMatch = async () => {
  if (!selectedFixture.value) return
  
  updatingMatch.value = true
  try {
    const now = new Date().toISOString()
    const updatePayload = {
      timerIsRunning: true,
      timerStartedAt: now
    }
    await fixtureStore.updateFixture(selectedFixture.value.id, updatePayload)
    
    selectedFixture.value = {
      ...selectedFixture.value,
      ...updatePayload
    }
    
    emit('fixture-updated', selectedFixture.value!)
    
    useToast().add({ 
      title: 'Match Resumed', 
      description: 'The clock has resumed.',
      icon: 'i-heroicons-play',
      color: 'success' 
    })
  } catch (error: any) {
    handleError(error, { title: 'Failed to resume match' })
  } finally {
    updatingMatch.value = false
  }
}

const setHalftime = async () => {
  if (!selectedFixture.value) return
  
  updatingMatch.value = true
  try {
    const htSeconds = halftimeSeconds.value
    const updatePayload = {
      timerIsRunning: false,
      timerElapsedSeconds: htSeconds
    }
    await fixtureStore.updateFixture(selectedFixture.value.id, updatePayload)
    
    selectedFixture.value = {
      ...selectedFixture.value,
      ...updatePayload
    }
    
    emit('fixture-updated', selectedFixture.value!)
    
    useToast().add({ 
      title: 'Halftime', 
      description: 'Match set to halftime.',
      icon: 'i-heroicons-clock',
      color: 'warning' 
    })
  } catch (error: any) {
    handleError(error, { title: 'Failed to set halftime' })
  } finally {
    updatingMatch.value = false
  }
}

const startSecondHalf = async () => {
  if (!selectedFixture.value) return
  
  updatingMatch.value = true
  try {
    const now = new Date().toISOString()
    const htSeconds = halftimeSeconds.value
    const updatePayload = {
      timerIsRunning: true,
      timerStartedAt: now,
      timerElapsedSeconds: htSeconds
    }
    await fixtureStore.updateFixture(selectedFixture.value.id, updatePayload)
    
    selectedFixture.value = {
      ...selectedFixture.value,
      ...updatePayload
    }
    
    emit('fixture-updated', selectedFixture.value!)
    
    useToast().add({ 
      title: 'Second Half Started', 
      description: 'The second half has kicked off!',
      icon: 'i-heroicons-play',
      color: 'success' 
    })
  } catch (error: any) {
    handleError(error, { title: 'Failed to start second half' })
  } finally {
    updatingMatch.value = false
  }
}

const endNormalTime = async () => {
  if (!selectedFixture.value) return

  updatingMatch.value = true
  try {
    const now = new Date().toISOString()
    const currentElapsed = matchTimer.getElapsedSeconds(selectedFixture.value) ?? 90 * 60
    const updatePayload = {
      status: FixtureStatus.NORMAL_TIME_ENDED,
      timerIsRunning: false,
      timerStartedAt: now,
      timerElapsedSeconds: currentElapsed,
      matchDuration: 90
    }
    await fixtureStore.updateFixture(selectedFixture.value.id, updatePayload)

    selectedFixture.value = {
      ...selectedFixture.value,
      ...updatePayload
    }
    matchDuration.value = 90

    emit('fixture-updated', selectedFixture.value!)

    useToast().add({
      title: 'Normal Time Ended',
      description: 'The match is tied after 90 minutes. Start extra time when ready.',
      icon: 'i-heroicons-flag',
      color: 'warning'
    })
  } catch (error: any) {
    handleError(error, { title: 'Failed to end normal time' })
  } finally {
    updatingMatch.value = false
  }
}

const startExtraTime = async () => {
  if (!selectedFixture.value) return

  updatingMatch.value = true
  try {
    const now = new Date().toISOString()
    const updatePayload = {
      status: FixtureStatus.EXTRATIME,
      timerIsRunning: true,
      timerStartedAt: now,
      timerElapsedSeconds: 90 * 60,
      matchDuration: 120
    }
    await fixtureStore.updateFixture(selectedFixture.value.id, updatePayload)

    selectedFixture.value = {
      ...selectedFixture.value,
      ...updatePayload
    }
    matchDuration.value = 120

    emit('fixture-updated', selectedFixture.value!)

    useToast().add({
      title: 'Extra Time Started',
      description: 'The match is now in extra time.',
      icon: 'i-heroicons-clock',
      color: 'warning'
    })
  } catch (error: any) {
    handleError(error, { title: 'Failed to start extra time' })
  } finally {
    updatingMatch.value = false
  }
}

const canEndNormalTime = computed(() => {
  if (!selectedFixture.value) return false
  if (selectedFixture.value.status !== FixtureStatus.LIVE) return false
  // Only offer end-of-normal-time for knockout stage matches
  if (selectedFixture.value.stage !== FixtureStage.KNOCKOUT && selectedFixture.value.stage != null) return false
  if (!isScoreTiedOrAggregateTied.value) return false
  const elapsed = matchTimer.getElapsedSeconds(selectedFixture.value) ?? 0
  return elapsed >= 90 * 60
})

const canStartExtraTime = computed(() => {
  if (!selectedFixture.value) return false
  if (selectedFixture.value.status !== FixtureStatus.NORMAL_TIME_ENDED) return false
  // Only offer extra time for knockout stage matches
  if (selectedFixture.value.stage !== FixtureStage.KNOCKOUT && selectedFixture.value.stage != null) return false
  return isScoreTiedOrAggregateTied.value
})

const adjustMatchTimer = async () => {
  if (!selectedFixture.value) return
  
  updatingTime.value = true
  try {
    const cappedMin = Math.min(adjustedMinute.value, adjustTimerMaxMinutes.value)
    adjustedMinute.value = cappedMin
    const targetSeconds = Math.max(0, cappedMin * 60)
    const now = new Date().toISOString()
    
    const updatePayload: any = {
      timerElapsedSeconds: targetSeconds
    }
    
    // If clock is running, we must reset timerStartedAt to now so it accumulates from targetSeconds
    if (selectedFixture.value.timerIsRunning) {
      updatePayload.timerStartedAt = now
    }
    
    await fixtureStore.updateFixture(selectedFixture.value.id, updatePayload)
    
    selectedFixture.value = {
      ...selectedFixture.value,
      ...updatePayload
    }
    
    emit('fixture-updated', selectedFixture.value!)
    
    useToast().add({ 
      title: 'Clock Adjusted', 
      description: `Clock running time has been set to ${cappedMin}:00.`,
      icon: 'i-heroicons-clock',
      color: 'success' 
    })
  } catch (error: any) {
    handleError(error, { title: 'Failed to adjust clock' })
  } finally {
    updatingTime.value = false
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
  return selectedFixture.value.homePenaltyScore != null || selectedFixture.value.awayPenaltyScore != null
})

const isKnockoutMatch = computed(() => {
  return selectedFixture.value?.stage === FixtureStage.KNOCKOUT
})

const penaltyShootoutEvents = computed(() => {
  return matchEvents.value.filter(e => e.metadata?.isPenaltyShootout === true)
})

const homePenaltyShootoutEvents = computed(() => {
  return penaltyShootoutEvents.value
    .filter(e => e.participant_id === selectedFixture.value?.homeTeamId)
    .sort((a, b) => getShootoutOrder(a) - getShootoutOrder(b))
})

const awayPenaltyShootoutEvents = computed(() => {
  return penaltyShootoutEvents.value
    .filter(e => e.participant_id === selectedFixture.value?.awayTeamId)
    .sort((a, b) => getShootoutOrder(a) - getShootoutOrder(b))
})

const getShootoutOrder = (event: MatchEvent) => {
  return event.metadata?.shootoutOrder || penaltyShootoutOrderMap.value.get(event.id) || 0
}

const penaltyShootoutOrderMap = computed(() => {
  const sorted = [...penaltyShootoutEvents.value].sort((a, b) => {
    if (a.minute !== b.minute) return (a.minute || 0) - (b.minute || 0)
    return a.id.localeCompare(b.id)
  })
  const map = new Map<string, number>()
  sorted.forEach((event, index) => map.set(event.id, index + 1))
  return map
})

const chronologicalPenaltyEvents = computed(() => {
  const sorted = [...penaltyShootoutEvents.value].sort((a, b) => getShootoutOrder(a) - getShootoutOrder(b))
  let homeScore = 0
  let awayScore = 0
  return sorted.map(event => {
    const isHome = event.participant_id === selectedFixture.value?.homeTeamId
    if (event.type === MatchEventType.PENALTY) {
      if (isHome) homeScore++
      else awayScore++
    }
    return {
      ...event,
      homeScore,
      awayScore,
      isHome,
      isScored: event.type === MatchEventType.PENALTY
    }
  })
})

const maxPenaltyRounds = computed(() => {
  return Math.max(homePenaltyShootoutEvents.value.length, awayPenaltyShootoutEvents.value.length)
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
  
  const durationChanged = (selectedFixture.value.matchDuration ?? 90) !== matchDuration.value

  return !timeChanged && !venueChanged && !durationChanged
})

const updateMatchTime = async () => {
  if (!selectedFixture.value || !matchDateVal.value || !matchTimeVal.value) return
  
  const selectedYear = matchDateVal.value.year
  const selectedMonth = matchDateVal.value.month - 1
  const selectedDay = matchDateVal.value.day
  const [h, m] = matchTimeVal.value.split(':').map(Number)
  
  const newDate = new Date(selectedYear, selectedMonth, selectedDay, h, m)
  
  if (props.tournament?.start_date && props.tournament?.end_date) {
    const startDate = new Date(props.tournament.start_date)
    startDate.setHours(0, 0, 0, 0)
    const endDate = new Date(props.tournament.end_date)
    endDate.setHours(23, 59, 59, 999)
    if (newDate < startDate || newDate > endDate) {
      useToast().add({
        title: 'Date out of range',
        description: `The fixture date must be between the tournament start date (${formatDateDisplay(parseDateString(props.tournament.start_date) || null)}) and end date (${formatDateDisplay(parseDateString(props.tournament.end_date) || null)}). Please adjust the tournament's start or end date to select this date.`,
        color: 'error'
      })
      return
    }
  }

  updatingTime.value = true
  try {
    const newIso = newDate.toISOString()
    const newVenue = matchVenue.value || null
    
    await fixtureStore.updateFixture(selectedFixture.value.id, {
      startTime: newIso,
      venue: newVenue,
      matchDuration: matchDuration.value
    })
    
    selectedFixture.value = {
      ...selectedFixture.value,
      startTime: newIso,
      venue: newVenue,
      matchDuration: matchDuration.value
    }
    matchTime.value = newIso
    
    emit('fixture-updated', selectedFixture.value!)
    
    useToast().add({ 
      title: 'Schedule Updated', 
      description: 'The match schedule and duration have been updated.',
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

const subTeamPlayers = computed(() => {
  return subTeam.value === 'home' ? homePlayers.value : awayPlayers.value
})

const motmPlayerOptions = computed(() => {
  const homeTeamName = selectedFixture.value?.homeTeam?.customShortName || selectedFixture.value?.homeTeam?.customName || 'Home'
  const awayTeamName = selectedFixture.value?.awayTeam?.customShortName || selectedFixture.value?.awayTeam?.customName || 'Away'
  const home = homePlayers.value.map(p => ({
    label: `${homeTeamName}: ${p.number ? '#' + p.number + ' ' : ''}${p.name}`,
    value: p.id
  }))
  const away = awayPlayers.value.map(p => ({
    label: `${awayTeamName}: ${p.number ? '#' + p.number + ' ' : ''}${p.name}`,
    value: p.id
  }))
  return [...home, ...away]
})

const motmDisplayName = computed(() => {
  const playerId = selectedManOfTheMatchPlayerId.value || selectedFixture.value?.manOfTheMatchPlayerId
  if (!playerId) return null
  const player = [...homePlayers.value, ...awayPlayers.value].find(p => p.id === playerId)
  return player || selectedFixture.value?.manOfTheMatchPlayer || null
})

const selectedMotmModel = computed({
  get: () => selectedManOfTheMatchPlayerId.value || undefined,
  set: (val) => selectedManOfTheMatchPlayerId.value = val || null
})

const teamSubEvents = computed(() => {
  const participantId = subTeam.value === 'home' 
    ? selectedFixture.value?.homeTeamId 
    : selectedFixture.value?.awayTeamId
  if (!participantId) return []
  return matchEvents.value.filter(e => e.type === MatchEventType.SUBSTITUTION && e.participant_id === participantId)
})

const subbedOutPlayerIds = computed(() => {
  return teamSubEvents.value.map(e => e.relatedPlayerId).filter(Boolean) as string[]
})

const currentlyOnPitch = computed(() => {
  const teamRoster = subTeamPlayers.value
  const teamLineupIds = teamRoster.map(p => p.id).filter(id => selectedLineupIds.value.includes(id))
  
  const baseLineupIds = teamLineupIds.length > 0 ? teamLineupIds : teamRoster.map(p => p.id)
  const onPitchIds = new Set(baseLineupIds)
  
  const sortedSubEvents = [...teamSubEvents.value].sort((a, b) => (a.minute || 0) - (b.minute || 0))
  for (const event of sortedSubEvents) {
    if (event.relatedPlayerId) {
      onPitchIds.delete(event.relatedPlayerId)
    }
    if (event.playerId) {
      onPitchIds.add(event.playerId)
    }
  }
  
  return teamRoster.filter(p => onPitchIds.has(p.id))
})

const subPlayerOutOptions = computed(() => {
  return currentlyOnPitch.value.map(p => ({
    label: `${p.number ? '#' + p.number + ' ' : ''}${p.name}${p.position ? ' (' + p.position.split('-')[0] + ')' : ''}`,
    value: p.id
  }))
})

const subPlayerInOptions = computed(() => {
  const teamRoster = subTeamPlayers.value
  const onPitchIds = new Set(currentlyOnPitch.value.map(p => p.id))
  const outIds = new Set(subbedOutPlayerIds.value)
  
  const benchPlayers = teamRoster.filter(p => !onPitchIds.has(p.id) && !outIds.has(p.id))

  return benchPlayers
    .filter(p => p.id !== subData.playerOutId)
    .map(p => ({
      label: `${p.number ? '#' + p.number + ' ' : ''}${p.name}${p.position ? ' (' + p.position.split('-')[0] + ')' : ''}`,
      value: p.id
    }))
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
        half: getMatchHalf(goalData.minute),
        minute: goalData.minute
      })
    }
    
    showGoalModal.value = false
    emit('fixture-updated', selectedFixture.value!)
    
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
  
  const currentMin = isFixtureLiveStatus(selectedFixture.value?.status)
    ? (matchTimer.getMinute(selectedFixture.value) ?? null)
    : null
  goalData.minute = currentMin
  
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
  
  const currentMin = isFixtureLiveStatus(selectedFixture.value?.status)
    ? (matchTimer.getMinute(selectedFixture.value) ?? null)
    : null
  cardData.minute = currentMin
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
      half: getMatchHalf(cardData.minute),
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

const openSubstitutionModal = (team: 'home' | 'away') => {
  subTeam.value = team
  subData.playerOutId = undefined
  subData.playerInId = undefined
  
  const currentMin = isFixtureLiveStatus(selectedFixture.value?.status)
    ? (matchTimer.getMinute(selectedFixture.value) ?? null)
    : null
  subData.minute = currentMin
  showSubstitutionModal.value = true
}

const confirmSubstitution = async () => {
  if (!selectedFixture.value) return
  
  const participantId = subTeam.value === 'home' 
    ? selectedFixture.value.homeTeamId 
    : selectedFixture.value.awayTeamId
  
  if (!participantId || !subData.playerOutId || !subData.playerInId) return
  
  updatingMatch.value = true
  try {
    await fixtureStore.createMatchEvent({
      fixtureId: selectedFixture.value.id,
      participantId: participantId,
      playerId: subData.playerInId, // Player In
      relatedPlayerId: subData.playerOutId, // Player Out
      type: MatchEventType.SUBSTITUTION,
      half: getMatchHalf(subData.minute),
      minute: subData.minute
    })
    
    showSubstitutionModal.value = false
    await refreshMatchEvents()
    
    useToast().add({ 
      title: 'Substitution Recorded!', 
      description: 'Substitution event has been added.',
      icon: 'i-heroicons-arrow-path',
      color: 'success' 
    })
  } catch (error: any) {
    handleError(error, { title: 'Failed to record substitution' })
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
const showRemovePenaltiesModal = ref(false)

const confirmEditEvent = async () => {
  if (!eventBeingEdited.value) return
  updatingMatch.value = true
  try {
    await fixtureStore.updateMatchEvent(eventBeingEdited.value.id, {
      minute: editEventData.minute,
      half: getMatchHalf(editEventData.minute, eventBeingEdited.value.metadata),
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
      emit('fixture-updated', selectedFixture.value!)
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
    emit('fixture-updated', selectedFixture.value!)
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

    const updatePayload = {
      status: FixtureStatus.COMPLETED,
      timerIsRunning: false,
      ...penaltyData
    }
    await fixtureStore.updateFixture(selectedFixture.value.id, updatePayload)
    
    selectedFixture.value = {
      ...selectedFixture.value,
      ...updatePayload
    }
    emit('fixture-updated', selectedFixture.value!)
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

const setWalkover = async (winner: 'home' | 'away') => {
  if (!selectedFixture.value) return

  updatingMatch.value = true
  try {
    const homeScore = winner === 'home' ? walkoverScore.value : 0
    const awayScore = winner === 'away' ? walkoverScore.value : 0

    const updatePayload = {
      status: FixtureStatus.COMPLETED,
      homeScore,
      awayScore,
      timerIsRunning: false,
    }
    await fixtureStore.updateFixture(selectedFixture.value.id, updatePayload)

    selectedFixture.value = {
      ...selectedFixture.value,
      ...updatePayload
    }
    emit('fixture-updated', selectedFixture.value!)
    emit('match-ended')
    showWalkoverModal.value = false
    closeModal()

    useToast().add({
      title: 'Walkover Recorded',
      description: `${winner === 'home' ? selectedFixture.value.homeTeam?.customName || 'Home' : selectedFixture.value.awayTeam?.customName || 'Away'} wins by walkover (${homeScore}-${awayScore}).`,
      icon: 'i-heroicons-flag',
      color: 'success'
    })
  } catch (error: any) {
    errorMessage.value = extractErrorMessage(error)
    handleError(error, { title: 'Failed to record walkover' })
  } finally {
    updatingMatch.value = false
  }
}

const reopenMatch = async () => {
  if (!selectedFixture.value) return
  
  updatingMatch.value = true
  try {
    const now = new Date().toISOString()
    const updatePayload = {
      status: FixtureStatus.LIVE,
      timerStartedAt: now,
      timerIsRunning: true
    }
    await fixtureStore.updateFixture(selectedFixture.value.id, updatePayload)
    
    selectedFixture.value = {
      ...selectedFixture.value,
      ...updatePayload
    }
    emit('fixture-updated', selectedFixture.value!)
    
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

const recordPenaltyShot = async (team: 'home' | 'away', outcome: 'scored' | 'missed' | 'saved', playerId?: string | null) => {
  if (!selectedFixture.value) return

  const participantId = team === 'home'
    ? selectedFixture.value.homeTeamId
    : selectedFixture.value.awayTeamId
  if (!participantId) return

  const isIndividual = props.tournament?.participantType === ParticipantType.INDIVIDUAL
  const eventType = outcome === 'scored'
    ? MatchEventType.PENALTY
    : outcome === 'missed'
      ? MatchEventType.MISSED_PENALTY
      : MatchEventType.PENALTY_SAVE

  const currentHomePen = selectedFixture.value.homePenaltyScore ?? 0
  const currentAwayPen = selectedFixture.value.awayPenaltyScore ?? 0
  const newHomePen = team === 'home' && outcome === 'scored' ? currentHomePen + 1 : currentHomePen
  const newAwayPen = team === 'away' && outcome === 'scored' ? currentAwayPen + 1 : currentAwayPen

  updatingMatch.value = true
  try {
    await fixtureStore.updateFixture(selectedFixture.value.id, {
      homePenaltyScore: newHomePen,
      awayPenaltyScore: newAwayPen
    })

    if (!isIndividual) {
      const shootoutOrder = penaltyShootoutEvents.value.length + 1
      await fixtureStore.createMatchEvent({
        fixtureId: selectedFixture.value.id,
        participantId: participantId,
        playerId: playerId || null,
        type: eventType,
        half: getMatchHalf(120, { isPenaltyShootout: true }),
        minute: 120 + shootoutOrder,
        description: `Penalty shootout ${shootoutOrder}`,
        metadata: { isPenaltyShootout: true, shootoutOrder }
      })
    }

    selectedFixture.value.homePenaltyScore = newHomePen
    selectedFixture.value.awayPenaltyScore = newAwayPen

    emit('fixture-updated', selectedFixture.value!)

    if (!isIndividual) {
      await refreshMatchEvents()
    }

    useToast().add({
      title: outcome === 'scored' ? 'Penalty Scored' : outcome === 'missed' ? 'Penalty Missed' : 'Penalty Saved',
      description: `${team === 'home' ? 'Home' : 'Away'} penalty recorded.`,
      icon: 'i-heroicons-bolt',
      color: outcome === 'scored' ? 'success' : 'warning'
    })
  } catch (error: any) {
    selectedFixture.value.homePenaltyScore = currentHomePen
    selectedFixture.value.awayPenaltyScore = currentAwayPen
    handleError(error, { title: 'Failed to record penalty' })
  } finally {
    updatingMatch.value = false
  }
}

const openRemovePenaltiesModal = () => {
  showRemovePenaltiesModal.value = true
}

const removePenalties = async () => {
  if (!selectedFixture.value) return

  updatingMatch.value = true
  try {
    const shootoutEvents = matchEvents.value.filter(
      e => e.metadata?.isPenaltyShootout === true
    )

    await Promise.all(
      shootoutEvents.map(event => fixtureStore.deleteMatchEvent(event.id))
    )

    await fixtureStore.updateFixture(selectedFixture.value.id, {
      homePenaltyScore: null,
      awayPenaltyScore: null
    })

    selectedFixture.value.homePenaltyScore = null
    selectedFixture.value.awayPenaltyScore = null
    showPenaltyOverride.value = false
    showRemovePenaltiesModal.value = false

    await refreshMatchEvents()
    emit('fixture-updated', selectedFixture.value!)

    useToast().add({
      title: 'Penalties Removed',
      description: 'Penalty shootout scores have been cleared.',
      icon: 'i-heroicons-trash',
      color: 'success'
    })
  } catch (error: any) {
    handleError(error, { title: 'Failed to remove penalties' })
  } finally {
    updatingMatch.value = false
  }
}

const saveManOfTheMatch = async () => {
  if (!selectedFixture.value) return

  savingMotm.value = true
  try {
    await fixtureStore.updateFixture(selectedFixture.value.id, {
      manOfTheMatchPlayerId: selectedManOfTheMatchPlayerId.value
    })

    selectedFixture.value.manOfTheMatchPlayerId = selectedManOfTheMatchPlayerId.value
    const selectedPlayer = [...homePlayers.value, ...awayPlayers.value].find(p => p.id === selectedManOfTheMatchPlayerId.value)
    selectedFixture.value.manOfTheMatchPlayer = selectedPlayer || null

    emit('fixture-updated', selectedFixture.value!)

    useToast().add({
      title: 'Man of the Match Saved',
      description: selectedPlayer ? `${selectedPlayer.name} is the Man of the Match.` : 'Man of the Match selection saved.',
      color: 'success'
    })
  } catch (error: any) {
    handleError(error, { title: 'Failed to save Man of the Match' })
  } finally {
    savingMotm.value = false
  }
}

const clearManOfTheMatch = async () => {
  if (!selectedFixture.value) return

  savingMotm.value = true
  try {
    await fixtureStore.updateFixture(selectedFixture.value.id, {
      manOfTheMatchPlayerId: null
    })

    selectedManOfTheMatchPlayerId.value = null
    selectedFixture.value.manOfTheMatchPlayerId = null
    selectedFixture.value.manOfTheMatchPlayer = null

    emit('fixture-updated', selectedFixture.value!)

    useToast().add({
      title: 'Man of the Match Cleared',
      description: 'The Man of the Match selection has been removed.',
      color: 'neutral'
    })
  } catch (error: any) {
    handleError(error, { title: 'Failed to clear Man of the Match' })
  } finally {
    savingMotm.value = false
  }
}

// Player selection items for dropdowns
const scorerOptions = computed(() => {
  return scoringTeamPlayers.value.map(p => ({
    label: `${p.number ? `#${p.number} ` : ''}${p.name}`,
    value: p.id
  }))
})

const homePenaltyPlayerOptions = computed(() => {
  return homePlayers.value.map(p => ({
    label: `${p.number ? `#${p.number} ` : ''}${p.name}`,
    value: p.id
  }))
})

const awayPenaltyPlayerOptions = computed(() => {
  return awayPlayers.value.map(p => ({
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
    case MatchEventType.PENALTY_SAVE: return 'i-heroicons-hand'
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
    case MatchEventType.PENALTY_SAVE: return 'text-amber-500'
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

const getMatchHalf = (minute?: number | null, metadata?: Record<string, any> | null): MatchHalf => {
  if (metadata?.isPenaltyShootout) return MatchHalf.PENALTY_SHOOTOUT
  if (!selectedFixture.value) return MatchHalf.FIRST_HALF

  const normalDuration = 90
  const duration = selectedFixture.value.matchDuration ?? normalDuration
  const halfTime = duration / 2

  if (selectedFixture.value.status === FixtureStatus.EXTRATIME) {
    return MatchHalf.EXTRA_TIME
  }

  const min = minute ?? 0
  if (min > normalDuration) return MatchHalf.EXTRA_TIME
  if (min > halfTime) return MatchHalf.SECOND_HALF
  return MatchHalf.FIRST_HALF
}

const getMatchHalfLabel = (half?: MatchHalf | null) => {
  switch (half) {
    case MatchHalf.FIRST_HALF: return 'First Half'
    case MatchHalf.SECOND_HALF: return 'Second Half'
    case MatchHalf.EXTRA_TIME: return 'Extra Time'
    case MatchHalf.PENALTY_SHOOTOUT: return 'Penalty Shootout'
    default: return 'Other'
  }
}

const getEventMinuteDisplay = (event: MatchEvent) => {
  if (event.metadata?.isPenaltyShootout) {
    const order = getShootoutOrder(event)
    return order ? `P${order}` : 'P'
  }
  return event.minute != null ? `${event.minute}'` : '–'
}

const groupedMatchEvents = computed(() => {
  const grouped: Record<MatchHalf, MatchEvent[]> = {
    [MatchHalf.FIRST_HALF]: [],
    [MatchHalf.SECOND_HALF]: [],
    [MatchHalf.EXTRA_TIME]: [],
    [MatchHalf.PENALTY_SHOOTOUT]: []
  }

  for (const event of matchEvents.value) {
    const half = event.half ?? getMatchHalf(event.minute, event.metadata)
    grouped[half].push(event)
  }

  const sectionOrder = [MatchHalf.FIRST_HALF, MatchHalf.SECOND_HALF, MatchHalf.EXTRA_TIME, MatchHalf.PENALTY_SHOOTOUT]
  return sectionOrder
    .map(half => ({
      half,
      label: getMatchHalfLabel(half),
      events: grouped[half].sort((a, b) => (a.minute || 0) - (b.minute || 0))
    }))
    .filter(group => group.events.length > 0)
})

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

const confirmSwapTeams = async () => {
  showSwapConfirmModal.value = false
  await swapTeams()
}

const swapTeams = async () => {
  if (!selectedFixture.value || swappingTeams.value) return
  
  swappingTeams.value = true
  const f = selectedFixture.value
  
  try {
    // Send swap to backend
    await fixtureStore.updateFixture(f.id, {
      homeTeamId: f.awayTeamId,
      awayTeamId: f.homeTeamId,
      homeScore: f.awayScore ?? 0,
      awayScore: f.homeScore ?? 0,
      homePenaltyScore: f.awayPenaltyScore ?? null,
      awayPenaltyScore: f.homePenaltyScore ?? null,
      homeTeamPlaceholder: f.awayTeamPlaceholder ?? null,
      awayTeamPlaceholder: f.homeTeamPlaceholder ?? null,
      homeFormation: f.awayFormation ?? null,
      awayFormation: f.homeFormation ?? null,
    })
    
    // Swap local state
    const newFixture = {
      ...f,
      homeTeamId: f.awayTeamId,
      awayTeamId: f.homeTeamId,
      homeTeam: f.awayTeam,
      awayTeam: f.homeTeam,
      homeScore: f.awayScore ?? 0,
      awayScore: f.homeScore ?? 0,
      homePenaltyScore: f.awayPenaltyScore,
      awayPenaltyScore: f.homePenaltyScore,
      homeTeamPlaceholder: f.awayTeamPlaceholder,
      awayTeamPlaceholder: f.homeTeamPlaceholder,
      homeFormation: f.awayFormation,
      awayFormation: f.homeFormation,
    }
    selectedFixture.value = newFixture
    
    // Swap local refs
    const tempForm = homeFormation.value
    homeFormation.value = awayFormation.value
    awayFormation.value = tempForm
    
    // Swap players too
    const tempPlayers = homePlayers.value
    homePlayers.value = awayPlayers.value
    awayPlayers.value = tempPlayers
    
    emit('fixture-updated', newFixture)
    
    useToast().add({
      title: 'Teams Swapped',
      description: 'Home and away teams have been swapped.',
      icon: 'i-heroicons-arrows-right-left',
      color: 'success'
    })
  } catch (error: any) {
    handleError(error, { title: 'Failed to swap teams' })
  } finally {
    swappingTeams.value = false
  }
}

const closeModal = () => {
  emit('update:open', false)
}

const togglePlayerLineup = (playerId: string, isChecked: boolean) => {
  if (isChecked) {
    if (!selectedLineupIds.value.includes(playerId)) {
      selectedLineupIds.value.push(playerId)
    }
  } else {
    selectedLineupIds.value = selectedLineupIds.value.filter(id => id !== playerId)
  }
}

const selectAllRoster = (team: 'home' | 'away') => {
  const players = team === 'home' ? homePlayers.value : awayPlayers.value
  const ids = players.map(p => p.id)
  selectedLineupIds.value = [...new Set([...selectedLineupIds.value, ...ids])]
}

const clearRosterLineup = (team: 'home' | 'away') => {
  const players = team === 'home' ? homePlayers.value : awayPlayers.value
  const idsToRemove = new Set(players.map(p => p.id))
  selectedLineupIds.value = selectedLineupIds.value.filter(id => !idsToRemove.has(id))
}

const handlePlayerPositionUpdate = (team: 'home' | 'away', playerId: string, newPosition: string) => {
  lineupPositions.value[playerId] = newPosition
}

const saveLineups = async () => {
  if (!selectedFixture.value) return
  savingLineups.value = true
  try {
    // Clean up lineupPositions for players no longer in selectedLineupIds
    const cleanedPositions = { ...lineupPositions.value }
    for (const playerId of Object.keys(cleanedPositions)) {
      if (!selectedLineupIds.value.includes(playerId)) {
        delete cleanedPositions[playerId]
      }
    }

    const res = await fixtureStore.updateFixture(selectedFixture.value.id, {
      lineupPlayerIds: selectedLineupIds.value,
      homeFormation: homeFormation.value || null,
      awayFormation: awayFormation.value || null,
      lineupPositions: cleanedPositions
    })

    if (res.data) {
      selectedFixture.value = {
        ...selectedFixture.value,
        lineupPlayers: res.data.lineupPlayers || [],
        homeFormation: res.data.homeFormation,
        awayFormation: res.data.awayFormation,
        lineupPositions: res.data.lineupPositions || {}
      }
      lineupPositions.value = (res.data.lineupPositions as Record<string, string>) || {}
      emit('fixture-updated', selectedFixture.value!)
      
      useToast().add({
        title: 'Lineups Saved',
        description: 'Match lineups and positions have been successfully updated.',
        icon: 'i-heroicons-check-circle',
        color: 'success'
      })
    }
  } catch (error: any) {
    handleError(error, { title: 'Failed to save lineups' })
  } finally {
    savingLineups.value = false
  }
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
            
            <!-- Live Clock Badge -->
            <span
              v-if="selectedFixture && isFixtureLiveStatus(selectedFixture.status)"
              class="mc-timer-badge ml-2"
              :class="{ 'mc-timer-badge--paused': isTimerPaused }"
            >
              <UIcon :name="isTimerPaused ? 'i-heroicons-pause-circle' : 'i-heroicons-clock'" class="w-3.5 h-3.5" />
              <span class="tabular-nums font-semibold">{{ liveClock }}</span>
              <span v-if="isTimerPaused" class="text-[9px] font-bold tracking-wider ml-1 opacity-75 animate-pulse">PAUSED</span>
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
                <span v-else class="mc-team__initial">{{ (selectedFixture.homeTeam?.customShortName || selectedFixture.homeTeam?.customName || 'H').charAt(0) }}</span>
              </div>
              <span class="mc-team__name">{{ selectedFixture.homeTeam?.customShortName || selectedFixture.homeTeam?.customName || 'Home' }}</span>
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
              <!-- Swap Teams Button -->
              <button
                class="mc-swap-btn"
                :disabled="swappingTeams || updatingMatch"
                @click="showSwapConfirmModal = true"
                title="Swap home and away"
              >
                <UIcon :name="swappingTeams ? 'i-heroicons-arrow-path' : 'i-heroicons-arrows-right-left'" :class="['w-3 h-3', swappingTeams && 'animate-spin']" />
                <span>Swap</span>
              </button>
              <div v-if="isFixtureLiveStatus(selectedFixture.status)"
                   class="mc-match-time mc-match-time--live"
                   :class="{ 'mc-match-time--live-paused': isTimerPaused }"
              >
                <span class="mc-match-time__live-dot" />
                <span>{{ liveClock }}</span>
                <span class="text-[10px] opacity-75">({{ liveMinuteLabel }})</span>
              </div>
              <div v-else-if="selectedFixture.startTime" class="mc-match-time">
                {{ new Date(selectedFixture.startTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }}
                · {{ new Date(selectedFixture.startTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) }}
              </div>
            </div>

            <!-- Away team -->
            <div class="mc-team mc-team--away">
              <div class="mc-team__logo">
                <img v-if="selectedFixture.awayTeam?.logoUrl" :src="selectedFixture.awayTeam.logoUrl" class="w-full h-full object-cover" />
                <span v-else class="mc-team__initial">{{ (selectedFixture.awayTeam?.customShortName || selectedFixture.awayTeam?.customName || 'A').charAt(0) }}</span>
              </div>
              <span class="mc-team__name">{{ selectedFixture.awayTeam?.customShortName || selectedFixture.awayTeam?.customName || 'Away' }}</span>
            </div>
          </div>

          <!-- ── Score Controls ─────────────────────────────── -->
          <div v-if="['LIVE', 'NORMAL_TIME_ENDED', 'EXTRATIME', 'COMPLETED'].includes(selectedFixture.status)" class="mc-controls">
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
                <span>Missed Pen</span>
              </button>
              <button
                v-if="props.tournament?.participantType !== ParticipantType.INDIVIDUAL"
                class="mc-btn mc-btn--sub"
                :disabled="loadingPlayers || updatingMatch"
                @click="openSubstitutionModal('home')"
              >
                <UIcon name="i-heroicons-arrow-path" class="w-3.5 h-3.5" />
                <span>Sub</span>
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
                <span>Missed Pen</span>
              </button>
              <button
                v-if="props.tournament?.participantType !== ParticipantType.INDIVIDUAL"
                class="mc-btn mc-btn--sub"
                :disabled="loadingPlayers || updatingMatch"
                @click="openSubstitutionModal('away')"
              >
                <UIcon name="i-heroicons-arrow-path" class="w-3.5 h-3.5" />
                <span>Sub</span>
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
            <div v-if="['SCHEDULED', 'LIVE', 'NORMAL_TIME_ENDED', 'EXTRATIME', 'COMPLETED'].includes(selectedFixture.status)" class="mc-section">
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
                      <UCalendar v-model="matchDateVal" />
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
                <!-- Match Duration Slider -->
                <div class="mt-3 flex flex-col gap-1.5 p-3 rounded-lg bg-gray-50/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04]">
                  <div class="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                    <span>Match Duration</span>
                    <span class="font-bold text-emerald-500 dark:text-emerald-400">{{ matchDuration }} mins</span>
                  </div>
                  <input
                    type="range"
                    v-model.number="matchDuration"
                    min="10"
                    max="120"
                    step="5"
                    class="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    :disabled="updatingTime"
                  />
                </div>
                <UButton color="primary" variant="solid" size="sm"
                  :loading="updatingTime" :disabled="isUpdateDisabled"
                  @click="updateMatchTime" class="mt-3 w-full sm:w-auto">
                  Update Schedule
                </UButton>

                <!-- Adjust Live Timer (Only visible when LIVE, NORMAL_TIME_ENDED or EXTRATIME) -->
                <div v-if="['LIVE', 'NORMAL_TIME_ENDED', 'EXTRATIME'].includes(selectedFixture.status)" class="mt-3 flex flex-col gap-1.5 p-3 rounded-lg bg-amber-500/5 dark:bg-amber-500/[0.02] border border-amber-500/10">
                  <div class="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                    <span class="flex items-center gap-1">
                      <UIcon name="i-heroicons-clock" class="w-3.5 h-3.5 text-amber-500" />
                      <span>Adjust Running Time (minutes)</span>
                    </span>
                    <span class="font-bold text-amber-500">{{ adjustedMinute }}'</span>
                  </div>
                  <div class="flex gap-2 items-center">
                    <UInput
                      type="number"
                      v-model.number="adjustedMinute"
                      min="0"
                      :max="adjustTimerMaxMinutes"
                      class="flex-1"
                      size="sm"
                      :disabled="updatingTime"
                    />
                    <UButton
                      color="warning"
                      variant="solid"
                      size="sm"
                      :loading="updatingTime"
                      @click="adjustMatchTimer"
                    >
                      Apply
                    </UButton>
                  </div>
                </div>
              </div>
            </div>

            <!-- Lineups Selection -->
            <div v-if="tournament?.participantType !== ParticipantType.INDIVIDUAL" class="mc-section">
              <button class="mc-section__toggle" @click="showLineupCollapsible = !showLineupCollapsible">
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-users" class="w-3.5 h-3.5 text-emerald-500" />
                  <span>Lineups Selection</span>
                  <span class="mc-tag">{{ selectedLineupIds.length }} selected</span>
                </div>
                <UIcon :name="showLineupCollapsible ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" class="w-4 h-4 text-gray-400" />
              </button>
              <div v-if="showLineupCollapsible" class="mc-section__body">
                <!-- Formation Selection -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-100 dark:border-white/[0.06]">
                  <UFormField label="Home Formation">
                    <select
                      v-model="homeFormation"
                      class="relative w-full rounded-md border border-gray-300 dark:border-white/10 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option v-for="preset in formationPresets" :key="preset.value" :value="preset.value">
                        {{ preset.label }}
                      </option>
                    </select>
                  </UFormField>
                  <UFormField label="Away Formation">
                    <select
                      v-model="awayFormation"
                      class="relative w-full rounded-md border border-gray-300 dark:border-white/10 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option v-for="preset in formationPresets" :key="preset.value" :value="preset.value">
                        {{ preset.label }}
                      </option>
                    </select>
                  </UFormField>
                </div>

                <!-- View Mode Toggle -->
                <div class="flex items-center justify-between mb-4 pb-4 border-b border-gray-100 dark:border-white/[0.06]">
                  <span class="text-xs font-semibold text-gray-500 dark:text-gray-400">Builder Mode:</span>
                  <div class="flex items-center gap-1.5 bg-gray-100 dark:bg-white/[0.06] p-0.5 rounded-lg border border-gray-200 dark:border-white/[0.04]">
                    <button
                      type="button"
                      class="px-3 py-1 rounded-md text-[11px] font-bold transition-all"
                      :class="lineupViewMode === 'pitch' ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'"
                      @click="lineupViewMode = 'pitch'"
                    >
                      Visual Pitch
                    </button>
                    <button
                      type="button"
                      class="px-3 py-1 rounded-md text-[11px] font-bold transition-all"
                      :class="lineupViewMode === 'list' ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'"
                      @click="lineupViewMode = 'list'"
                    >
                      Roster List
                    </button>
                  </div>
                </div>

                <!-- Team Switcher Tabs -->
                <div class="flex justify-center mb-6">
                  <div class="inline-flex bg-gray-100 dark:bg-white/[0.06] p-0.5 rounded-lg border border-gray-200 dark:border-white/[0.04] w-full max-w-[320px] sm:max-w-[400px]">
                    <button
                      type="button"
                      class="flex-1 text-center py-1.5 px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer min-w-0"
                      :class="activeLineupTeam === 'home' ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'"
                      @click="activeLineupTeam = 'home'"
                    >
                      <img v-if="selectedFixture.homeTeam?.logoUrl" :src="selectedFixture.homeTeam.logoUrl" class="w-3.5 h-3.5 object-contain flex-shrink-0" />
                      <span class="truncate block min-w-0 flex-1 text-center">
                        {{ selectedFixture.homeTeam?.customShortName || selectedFixture.homeTeam?.customName || 'Home Team' }}
                      </span>
                      <span v-if="lineupViewMode === 'pitch' && homeFormation" class="text-[10px] opacity-75 font-semibold flex-shrink-0">({{ homeFormation }})</span>
                    </button>
                    <button
                      type="button"
                      class="flex-1 text-center py-1.5 px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer min-w-0"
                      :class="activeLineupTeam === 'away' ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'"
                      @click="activeLineupTeam = 'away'"
                    >
                      <span v-if="lineupViewMode === 'pitch' && awayFormation" class="text-[10px] opacity-75 font-semibold flex-shrink-0">({{ awayFormation }})</span>
                      <span class="truncate block min-w-0 flex-1 text-center">
                        {{ selectedFixture.awayTeam?.customShortName || selectedFixture.awayTeam?.customName || 'Away Team' }}
                      </span>
                      <img v-if="selectedFixture.awayTeam?.logoUrl" :src="selectedFixture.awayTeam.logoUrl" class="w-3.5 h-3.5 object-contain flex-shrink-0" />
                    </button>
                  </div>
                </div>

                <!-- Visual Pitch Editor -->
                <div v-if="lineupViewMode === 'pitch'">
                  <div v-if="!homeFormation && !awayFormation" class="border border-dashed border-gray-200 dark:border-white/10 rounded-xl p-8 text-center bg-gray-50/50 dark:bg-white/[0.01]">
                    <UIcon name="i-heroicons-information-circle" class="w-8 h-8 text-gray-400 mb-2 mx-auto" />
                    <p class="text-xs text-gray-500 dark:text-gray-400">Please select a formation for the teams above to use the visual pitch builder.</p>
                  </div>
                  <div v-else>
                    <!-- Home Team Visual Builder -->
                    <div v-if="activeLineupTeam === 'home'" class="w-full">
                      <div class="w-full" v-if="homeFormation">
                        <FormationPitchEditor
                          :players="homePlayers"
                          v-model:selectedLineupIds="selectedLineupIds"
                          :formation="homeFormation"
                          :teamName="selectedFixture.homeTeam?.customShortName || selectedFixture.homeTeam?.customName || 'Home'"
                          :is-dark="isDark"
                          :lineupPositions="lineupPositions"
                          @update-player-position="(playerId, pos) => handlePlayerPositionUpdate('home', playerId, pos)"
                        />
                      </div>
                      <div v-else class="border border-dashed border-gray-200 dark:border-white/10 rounded-xl p-8 text-center bg-gray-50/50 dark:bg-white/[0.01] flex flex-col justify-center items-center">
                        <UIcon name="i-heroicons-information-circle" class="w-6 h-6 text-gray-400 mb-1" />
                        <p class="text-[11px] text-gray-500">Select Home formation to show pitch.</p>
                      </div>
                    </div>

                    <!-- Away Team Visual Builder -->
                    <div v-if="activeLineupTeam === 'away'" class="w-full">
                      <div class="w-full" v-if="awayFormation">
                        <FormationPitchEditor
                          :players="awayPlayers"
                          v-model:selectedLineupIds="selectedLineupIds"
                          :formation="awayFormation"
                          :teamName="selectedFixture.awayTeam?.customShortName || selectedFixture.awayTeam?.customName || 'Away'"
                          :is-dark="isDark"
                          :lineupPositions="lineupPositions"
                          @update-player-position="(playerId, pos) => handlePlayerPositionUpdate('away', playerId, pos)"
                        />
                      </div>
                      <div v-else class="border border-dashed border-gray-200 dark:border-white/10 rounded-xl p-8 text-center bg-gray-50/50 dark:bg-white/[0.01] flex flex-col justify-center items-center">
                        <UIcon name="i-heroicons-information-circle" class="w-6 h-6 text-gray-400 mb-1" />
                        <p class="text-[11px] text-gray-500">Select Away formation to show pitch.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Roster Checkbox Lists (List Mode) -->
                <div v-else>
                  <!-- Home Roster -->
                  <div v-if="activeLineupTeam === 'home'" class="mc-roster-box">
                    <div class="flex items-center justify-between mb-3">
                      <div class="flex items-center gap-2 min-w-0">
                        <img v-if="selectedFixture.homeTeam?.logoUrl" :src="selectedFixture.homeTeam.logoUrl" class="w-4 h-4 object-contain flex-shrink-0" />
                        <span class="text-xs font-bold uppercase tracking-wider text-gray-500 truncate min-w-0">
                          {{ selectedFixture.homeTeam?.customShortName || selectedFixture.homeTeam?.customName || 'Home Roster' }}
                        </span>
                      </div>
                      <div class="flex gap-1.5 flex-shrink-0">
                        <UButton size="xs" variant="ghost" color="primary" label="All" @click="selectAllRoster('home')" />
                        <UButton size="xs" variant="ghost" color="neutral" label="Clear" @click="clearRosterLineup('home')" />
                      </div>
                    </div>
                    <div v-if="loadingPlayers" class="flex justify-center py-4">
                      <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin text-gray-400" />
                    </div>
                    <div v-else-if="homePlayers.length === 0" class="text-xs text-gray-500 text-center py-4">
                      No roster players listed.
                    </div>
                    <div v-else class="mc-roster-list">
                      <div v-for="player in homePlayers" :key="player.id" class="mc-roster-item">
                        <UCheckbox
                          :model-value="selectedLineupIds.includes(player.id)"
                          @update:model-value="(val) => togglePlayerLineup(player.id, !!val)"
                          :id="`lineup-player-home-${player.id}`"
                          :label="`${player.number ? '#' + player.number + ' ' : ''}${player.name} ${player.position ? '(' + player.position.split('-')[0] + ')' : ''}`"
                        />
                      </div>
                    </div>
                  </div>

                  <!-- Away Roster -->
                  <div v-if="activeLineupTeam === 'away'" class="mc-roster-box">
                    <div class="flex items-center justify-between mb-3">
                      <div class="flex items-center gap-2 min-w-0">
                        <img v-if="selectedFixture.awayTeam?.logoUrl" :src="selectedFixture.awayTeam.logoUrl" class="w-4 h-4 object-contain flex-shrink-0" />
                        <span class="text-xs font-bold uppercase tracking-wider text-gray-500 truncate min-w-0">
                          {{ selectedFixture.awayTeam?.customShortName || selectedFixture.awayTeam?.customName || 'Away Roster' }}
                        </span>
                      </div>
                      <div class="flex gap-1.5 flex-shrink-0">
                        <UButton size="xs" variant="ghost" color="primary" label="All" @click="selectAllRoster('away')" />
                        <UButton size="xs" variant="ghost" color="neutral" label="Clear" @click="clearRosterLineup('away')" />
                      </div>
                    </div>
                    <div v-if="loadingPlayers" class="flex justify-center py-4">
                      <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin text-gray-400" />
                    </div>
                    <div v-else-if="awayPlayers.length === 0" class="text-xs text-gray-500 text-center py-4">
                      No roster players listed.
                    </div>
                    <div v-else class="mc-roster-list">
                      <div v-for="player in awayPlayers" :key="player.id" class="mc-roster-item">
                        <UCheckbox
                          :model-value="selectedLineupIds.includes(player.id)"
                          @update:model-value="(val) => togglePlayerLineup(player.id, !!val)"
                          :id="`lineup-player-away-${player.id}`"
                          :label="`${player.number ? '#' + player.number + ' ' : ''}${player.name} ${player.position ? '(' + player.position.split('-')[0] + ')' : ''}`"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Save button -->
                <div class="mt-6 flex justify-end">
                  <UButton
                    color="primary"
                    variant="solid"
                    size="sm"
                    icon="i-heroicons-check"
                    label="Save Lineups"
                    :loading="savingLineups"
                    @click="saveLineups"
                  />
                </div>
              </div>
            </div>

            <!-- Penalty shootout -->
            <div
              v-if="['LIVE', 'NORMAL_TIME_ENDED', 'EXTRATIME', 'COMPLETED'].includes(selectedFixture.status) && (isScoreTiedOrAggregateTied || hasPenalties || showPenaltyOverride)"
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
                <!-- Scores -->
                <div class="flex items-center justify-center gap-6 mb-4">
                  <div class="flex flex-col items-center gap-2">
                    <span class="mc-pen-label">{{ selectedFixture.homeTeam?.customShortName || selectedFixture.homeTeam?.customName || 'Home' }}</span>
                    <span class="text-2xl font-bold text-gray-900 dark:text-white">{{ selectedFixture.homePenaltyScore ?? 0 }}</span>
                  </div>
                  <span class="text-gray-400 font-medium">–</span>
                  <div class="flex flex-col items-center gap-2">
                    <span class="mc-pen-label">{{ selectedFixture.awayTeam?.customShortName || selectedFixture.awayTeam?.customName || 'Away' }}</span>
                    <span class="text-2xl font-bold text-gray-900 dark:text-white">{{ selectedFixture.awayPenaltyScore ?? 0 }}</span>
                  </div>
                </div>

                <!-- Per-shot buttons -->
                <div class="grid grid-cols-2 gap-4">
                  <div class="flex flex-col gap-2">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-gray-500 text-center">Home</span>
                    <USelect
                      v-if="homePenaltyPlayerOptions.length > 0"
                      v-model="homePenaltyPlayerId"
                      :items="homePenaltyPlayerOptions"
                      placeholder="Select shooter…"
                      value-key="value"
                      size="xs"
                      class="w-full"
                    />
                    <div class="flex gap-2 justify-center">
                      <button class="mc-pen-btn mc-pen-btn--scored" :disabled="updatingMatch" @click="recordPenaltyShot('home', 'scored', homePenaltyPlayerId)">
                        Scored
                      </button>
                      <button class="mc-pen-btn mc-pen-btn--missed" :disabled="updatingMatch" @click="recordPenaltyShot('home', 'missed', homePenaltyPlayerId)">
                        Missed
                      </button>
                      <button class="mc-pen-btn mc-pen-btn--saved" :disabled="updatingMatch" @click="recordPenaltyShot('home', 'saved', homePenaltyPlayerId)">
                        Saved
                      </button>
                    </div>
                  </div>
                  <div class="flex flex-col gap-2">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-gray-500 text-center">Away</span>
                    <USelect
                      v-if="awayPenaltyPlayerOptions.length > 0"
                      v-model="awayPenaltyPlayerId"
                      :items="awayPenaltyPlayerOptions"
                      placeholder="Select shooter…"
                      value-key="value"
                      size="xs"
                      class="w-full"
                    />
                    <div class="flex gap-2 justify-center">
                      <button class="mc-pen-btn mc-pen-btn--scored" :disabled="updatingMatch" @click="recordPenaltyShot('away', 'scored', awayPenaltyPlayerId)">
                        Scored
                      </button>
                      <button class="mc-pen-btn mc-pen-btn--missed" :disabled="updatingMatch" @click="recordPenaltyShot('away', 'missed', awayPenaltyPlayerId)">
                        Missed
                      </button>
                      <button class="mc-pen-btn mc-pen-btn--saved" :disabled="updatingMatch" @click="recordPenaltyShot('away', 'saved', awayPenaltyPlayerId)">
                        Saved
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Recent shootout events -->
                <div v-if="penaltyShootoutEvents.length > 0" class="mt-6 space-y-6">
                  <!-- Team round indicators -->
                  <div class="flex items-center justify-center gap-4 md:gap-8">
                    <div class="flex flex-wrap items-center justify-center gap-1.5 md:gap-2 max-w-[45%]">
                      <div
                        v-for="n in maxPenaltyRounds"
                        :key="`home-${n}`"
                        class="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold"
                        :class="homePenaltyShootoutEvents[n - 1]?.type === MatchEventType.PENALTY
                          ? 'bg-emerald-500 text-white'
                          : homePenaltyShootoutEvents[n - 1]
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400'"
                      >
                        <UIcon v-if="homePenaltyShootoutEvents[n - 1]?.type === MatchEventType.PENALTY" name="i-heroicons-check" class="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <UIcon v-else-if="homePenaltyShootoutEvents[n - 1]" name="i-heroicons-x-mark" class="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span v-else>{{ n }}</span>
                      </div>
                    </div>
                    <div class="w-px h-6 bg-gray-300 dark:bg-white/10" />
                    <div class="flex flex-wrap items-center justify-center gap-1.5 md:gap-2 max-w-[45%]">
                      <div
                        v-for="n in maxPenaltyRounds"
                        :key="`away-${n}`"
                        class="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold"
                        :class="awayPenaltyShootoutEvents[n - 1]?.type === MatchEventType.PENALTY
                          ? 'bg-emerald-500 text-white'
                          : awayPenaltyShootoutEvents[n - 1]
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400'"
                      >
                        <UIcon v-if="awayPenaltyShootoutEvents[n - 1]?.type === MatchEventType.PENALTY" name="i-heroicons-check" class="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <UIcon v-else-if="awayPenaltyShootoutEvents[n - 1]" name="i-heroicons-x-mark" class="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span v-else>{{ n }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Chronological shootout list -->
                  <div class="space-y-3">
                    <div
                      v-for="event in chronologicalPenaltyEvents"
                      :key="event.id"
                      class="flex items-center text-sm"
                      :class="event.isHome ? 'flex-row' : 'flex-row-reverse'"
                    >
                      <div class="flex-1 min-w-0" :class="event.isHome ? 'pr-3 md:pr-4' : 'pl-3 md:pl-4'">
                        <div class="flex items-center gap-1.5" :class="event.isHome ? 'justify-end' : 'justify-start'">
                          <span class="font-semibold text-gray-900 dark:text-white truncate">
                            {{ getPlayerName(event.playerId) || (event.isHome ? 'Home' : 'Away') }}
                          </span>
                          <UDropdownMenu :items="getEventActionItems(event)" :content="{ align: event.isHome ? 'end' : 'start' }">
                            <UButton color="neutral" variant="ghost" icon="i-heroicons-ellipsis-vertical" size="xs" />
                          </UDropdownMenu>
                        </div>
                      </div>
                      <div
                        class="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        :class="event.isScored ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'"
                      >
                        <UIcon :name="event.isScored ? 'i-heroicons-check' : 'i-heroicons-x-mark'" class="w-4 h-4 md:w-5 md:h-5" />
                      </div>
                      <div class="flex-1 min-w-0" :class="event.isHome ? 'text-left pl-3 md:pl-4' : 'text-right pr-3 md:pr-4'">
                        <span class="font-semibold text-gray-900 dark:text-white">
                          ({{ event.homeScore }} - {{ event.awayScore }})
                        </span>
                      </div>
                    </div>
                  </div>

                </div>

                <div class="flex items-center justify-center gap-2 mt-4">
                  <UButton
                    v-if="hasPenalties"
                    size="xs" color="warning" variant="soft" icon="i-heroicons-trash" label="Remove Penalties"
                    :loading="updatingMatch" @click="openRemovePenaltiesModal"
                  />
                </div>
                <p class="text-xs text-center text-gray-400 dark:text-gray-500 mt-2">Record each penalty shootout shot. End the match when the shootout is decided.</p>
              </div>
            </div>

            <!-- Edit penalties toggle -->
            <div v-if="selectedFixture.status === 'COMPLETED' && !isScoreTiedOrAggregateTied && !hasPenalties && !showPenaltyOverride" class="flex justify-center">
              <UButton size="xs" variant="link" color="neutral" icon="i-heroicons-bolt" label="Edit Penalties" @click="showPenaltyOverride = true;" />
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
                    v-for="group in groupedMatchEvents"
                    :key="group.half"
                    class="mc-events-group"
                  >
                    <div class="mc-events-group__header">{{ group.label }}</div>
                    <div
                      v-for="event in group.events"
                      :key="event.id"
                    >
                    <!-- Home event -->
                    <div v-if="event.participant_id === selectedFixture?.homeTeamId" class="mc-event mc-event--home">
                      <div class="mc-event__min">{{ getEventMinuteDisplay(event) }}</div>
                      <div class="mc-event__info">
                        <div class="flex items-center gap-1.5">
                          <IconsSoccerBallIcon v-if="['GOAL','PENALTY','OWN_GOAL'].includes(event.type)" class="w-4 h-4 flex-shrink-0" :class="getEventColor(event.type)" />
                          <UIcon v-else :name="getEventIcon(event.type)" :class="['w-4 h-4 flex-shrink-0', getEventColor(event.type)]" />
                          <span class="mc-event__player">{{ getPlayerName(event.playerId) || 'Unknown' }}</span>
                          <span v-if="event.type === 'PENALTY'" class="mc-event__tag">(P)</span>
                          <span v-if="event.type === 'OWN_GOAL'" class="mc-event__tag">(OG)</span>
                        </div>
                        <div v-if="event.relatedPlayerId && event.type !== 'OWN_GOAL' && event.type !== 'SUBSTITUTION'" class="mc-event__assist">
                          <IconsAssistIcon class="w-2.5 h-2.5 flex-shrink-0" /> {{ getPlayerName(event.relatedPlayerId) }}
                        </div>
                        <div v-if="event.type === 'SUBSTITUTION' && event.relatedPlayerId" class="text-red-500 text-[10px] font-semibold flex items-center gap-1 mt-0.5">
                          <UIcon name="i-heroicons-arrow-down-circle" class="w-3 h-3 text-red-500 flex-shrink-0" />
                          <span>off: {{ getPlayerName(event.relatedPlayerId) }}</span>
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
                        <div v-if="event.relatedPlayerId && event.type !== 'OWN_GOAL' && event.type !== 'SUBSTITUTION'" class="mc-event__assist mc-event__assist--right">
                          {{ getPlayerName(event.relatedPlayerId) }} <IconsAssistIcon class="w-2.5 h-2.5 flex-shrink-0" />
                        </div>
                        <div v-if="event.type === 'SUBSTITUTION' && event.relatedPlayerId" class="text-red-500 text-[10px] font-semibold flex items-center justify-end gap-1 mt-0.5">
                          <span>off: {{ getPlayerName(event.relatedPlayerId) }}</span>
                          <UIcon name="i-heroicons-arrow-down-circle" class="w-3 h-3 text-red-500 flex-shrink-0" />
                        </div>
                      </div>
                      <div class="mc-event__min">{{ getEventMinuteDisplay(event) }}</div>
                    </div>
                      </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Man of the Match -->
            <div v-if="tournament?.participantType !== ParticipantType.INDIVIDUAL && selectedFixture.status === 'COMPLETED'" class="mc-section">
              <button class="mc-section__toggle" @click="showMotmCollapsible = !showMotmCollapsible">
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-star" class="w-3.5 h-3.5 text-amber-500" />
                  <span>Man of the Match</span>
                  <span v-if="motmDisplayName" class="mc-tag">{{ motmDisplayName.name }}</span>
                </div>
                <UIcon :name="showMotmCollapsible ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" class="w-4 h-4 text-gray-400" />
              </button>
              <div v-if="showMotmCollapsible" class="mc-section__body">
                <div v-if="loadingPlayers" class="flex items-center justify-center gap-2 py-6 text-sm text-gray-400">
                  <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" /> Loading…
                </div>
                <div v-else-if="motmPlayerOptions.length === 0" class="py-6 text-center text-sm text-gray-400">
                  No players available to select.
                </div>
                <div v-else class="space-y-4">
                  <UFormField label="Select Man of the Match">
                    <USelect
                      v-model="selectedMotmModel"
                      :items="motmPlayerOptions"
                      placeholder="Choose a player..."
                      value-key="value"
                      class="w-full"
                    />
                  </UFormField>
                  <div class="flex items-center justify-end gap-2">
                    <UButton
                      v-if="selectedManOfTheMatchPlayerId"
                      size="xs"
                      color="warning"
                      variant="soft"
                      icon="i-heroicons-trash"
                      label="Clear"
                      :loading="savingMotm"
                      @click="clearManOfTheMatch"
                    />
                    <UButton
                      size="xs"
                      color="success"
                      variant="soft"
                      icon="i-heroicons-check"
                      label="Save"
                      :loading="savingMotm"
                      @click="saveManOfTheMatch"
                    />
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

              <!-- Live Match Timer Control Buttons -->
              <template v-if="['LIVE', 'EXTRATIME'].includes(selectedFixture.status)">
                <div class="mc-action-group">
                  <!-- Pause / Resume Clock -->
                  <button
                    v-if="selectedFixture.timerIsRunning"
                    class="mc-primary-btn mc-primary-btn--pause"
                    :disabled="updatingMatch"
                    @click="openConfirmModal({
                      title: 'Pause Clock',
                      message: 'Are you sure you want to pause the match clock?',
                      confirmLabel: 'Pause Clock',
                      confirmColor: 'warning',
                      onConfirm: pauseMatch
                    })"
                  >
                    <UIcon name="i-heroicons-pause" class="w-4 h-4" />
                    <span class="hidden sm:inline">Pause Clock</span>
                    <span class="sm:hidden">Pause</span>
                  </button>
                  <button
                    v-else
                    class="mc-primary-btn mc-primary-btn--resume"
                    :disabled="updatingMatch"
                    @click="openConfirmModal({
                      title: 'Resume Clock',
                      message: 'Are you sure you want to resume the match clock?',
                      confirmLabel: 'Resume Clock',
                      confirmColor: 'success',
                      onConfirm: resumeMatch
                    })"
                  >
                    <UIcon name="i-heroicons-play" class="w-4 h-4" />
                    <span class="hidden sm:inline">Resume Clock</span>
                    <span class="sm:hidden">Resume</span>
                  </button>

                  <!-- Halftime / Start 2nd Half / End Normal Time (only in normal time) -->
                  <template v-if="selectedFixture.status === FixtureStatus.LIVE">
                    <button
                      v-if="!isSecondHalf && !isHalftime"
                      class="mc-primary-btn mc-primary-btn--halftime"
                      :disabled="updatingMatch"
                      @click="openConfirmModal({
                        title: 'Halftime',
                        message: 'Are you sure you want to set the match to halftime?',
                        confirmLabel: 'Halftime',
                        confirmColor: 'warning',
                        onConfirm: setHalftime
                      })"
                    >
                      <UIcon name="i-heroicons-clock" class="w-4 h-4" />
                      <span class="hidden sm:inline">Halftime</span>
                      <span class="sm:hidden">HT</span>
                    </button>
                    <button
                      v-else-if="!isSecondHalf && isHalftime"
                      class="mc-primary-btn mc-primary-btn--secondhalf"
                      :disabled="updatingMatch"
                      @click="openConfirmModal({
                        title: 'Start 2nd Half',
                        message: 'Are you sure you want to start the second half?',
                        confirmLabel: 'Start 2nd Half',
                        confirmColor: 'success',
                        onConfirm: startSecondHalf
                      })"
                    >
                      <UIcon name="i-heroicons-forward" class="w-4 h-4" />
                      <span class="hidden sm:inline">Start 2nd Half</span>
                      <span class="sm:hidden">2nd Half</span>
                    </button>
                    <button
                      v-else-if="isSecondHalf"
                      class="mc-primary-btn mc-primary-btn--halftime"
                      :disabled="updatingMatch"
                      @click="openConfirmModal({
                        title: 'End Normal Time',
                        message: 'Are you sure you want to end normal time?',
                        confirmLabel: 'End Normal Time',
                        confirmColor: 'warning',
                        onConfirm: endNormalTime
                      })"
                    >
                      <UIcon name="i-heroicons-flag" class="w-4 h-4" />
                      <span class="hidden sm:inline">End Normal Time</span>
                      <span class="sm:hidden">End FT</span>
                    </button>
                  </template>
                </div>

                <div class="mc-action-divider" role="separator" aria-hidden="true" />

                <div class="mc-action-group">
                  <button
                    class="mc-primary-btn mc-primary-btn--undo"
                    :disabled="updatingMatch"
                    @click="openConfirmModal({
                      title: 'Undo Start',
                      message: 'Are you sure you want to undo the match start? This will revert the fixture to scheduled.',
                      confirmLabel: 'Undo Start',
                      confirmColor: 'warning',
                      onConfirm: undoStartMatch
                    })"
                  >
                    <UIcon name="i-heroicons-arrow-uturn-left" class="w-4 h-4" />
                    <span class="hidden sm:inline">Undo Start</span>
                    <span class="sm:hidden">Undo</span>
                  </button>
                  <button
                    class="mc-primary-btn mc-primary-btn--end"
                    :disabled="updatingMatch"
                    @click="openConfirmModal({
                      title: 'End Match',
                      message: 'Are you sure you want to end this match? This action cannot be undone.',
                      confirmLabel: 'End Match',
                      confirmColor: 'error',
                      onConfirm: endMatch
                    })"
                  >
                    <UIcon name="i-heroicons-flag" class="w-4 h-4" />
                    <span class="hidden sm:inline">{{ updatingMatch ? 'Ending…' : 'End Match' }}</span>
                    <span class="sm:hidden">{{ updatingMatch ? 'Ending…' : 'End' }}</span>
                  </button>
                </div>
              </template>

              <!-- Normal Time Ended Controls -->
              <template v-if="selectedFixture.status === FixtureStatus.NORMAL_TIME_ENDED">
                <div class="mc-action-group">
                  <button
                    v-if="canStartExtraTime"
                    class="mc-primary-btn mc-primary-btn--halftime"
                    :disabled="updatingMatch"
                    @click="openConfirmModal({
                      title: 'Start Extra Time',
                      message: 'Are you sure you want to start extra time?',
                      confirmLabel: 'Start Extra Time',
                      confirmColor: 'success',
                      onConfirm: startExtraTime
                    })"
                  >
                    <UIcon name="i-heroicons-clock" class="w-4 h-4" />
                    <span class="hidden sm:inline">Start Extra Time</span>
                    <span class="sm:hidden">ET</span>
                  </button>
                </div>

                <div class="mc-action-divider" role="separator" aria-hidden="true" />

                <div class="mc-action-group">
                  <button
                    class="mc-primary-btn mc-primary-btn--undo"
                    :disabled="updatingMatch"
                    @click="openConfirmModal({
                      title: 'Undo Start',
                      message: 'Are you sure you want to undo the match start? This will revert the fixture to scheduled.',
                      confirmLabel: 'Undo Start',
                      confirmColor: 'warning',
                      onConfirm: undoStartMatch
                    })"
                  >
                    <UIcon name="i-heroicons-arrow-uturn-left" class="w-4 h-4" />
                    <span class="hidden sm:inline">Undo Start</span>
                    <span class="sm:hidden">Undo</span>
                  </button>
                  <button
                    class="mc-primary-btn mc-primary-btn--end"
                    :disabled="updatingMatch"
                    @click="openConfirmModal({
                      title: 'End Match',
                      message: 'Are you sure you want to end this match? This action cannot be undone.',
                      confirmLabel: 'End Match',
                      confirmColor: 'error',
                      onConfirm: endMatch
                    })"
                  >
                    <UIcon name="i-heroicons-flag" class="w-4 h-4" />
                    <span class="hidden sm:inline">{{ updatingMatch ? 'Ending…' : 'End Match' }}</span>
                    <span class="sm:hidden">{{ updatingMatch ? 'Ending…' : 'End' }}</span>
                  </button>
                </div>
              </template>

              <button
                v-if="selectedFixture.status === 'COMPLETED'"
                class="mc-primary-btn mc-primary-btn--reopen"
                :disabled="updatingMatch"
                @click="openConfirmModal({
                  title: 'Reopen Match',
                  message: 'Are you sure you want to reopen this match? This will set it back to LIVE.',
                  confirmLabel: 'Reopen Match',
                  confirmColor: 'warning',
                  onConfirm: reopenMatch
                })"
              >
                <UIcon name="i-heroicons-arrow-path" class="w-4 h-4" />
                <span>{{ updatingMatch ? 'Reopening…' : 'Reopen Match' }}</span>
              </button>
            </div>

            <!-- Secondary actions -->
            <div class="mc-action-bar__secondary">
              <button
                v-if="selectedFixture.status !== 'COMPLETED'"
                class="mc-sec-btn"
                :disabled="updatingMatch"
                @click="showWalkoverModal = true"
              >
                <UIcon name="i-heroicons-flag" class="w-3.5 h-3.5" />
                <span>Walkover</span>
              </button>
              <button v-if="canShare" class="mc-sec-btn" :disabled="sharingMatch" @click="handleShareGraphic">
                <UIcon name="i-heroicons-share" class="w-3.5 h-3.5" />
                <span>Share</span>
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
          <div class="flex items-center justify-between gap-4 min-w-0">
            <div class="flex items-center gap-2 min-w-0">
              <UIcon name="i-heroicons-trophy" class="w-5 h-5 text-green-500 shrink-0" />
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white shrink-0">
                Record Goal
              </h3>
              <UBadge :color="scoringTeam === 'home' ? 'primary' : 'warning'" variant="subtle" size="sm" class="min-w-0">
                <span class="truncate max-w-[120px] sm:max-w-[200px] block">
                  {{ scoringTeam === 'home' ? selectedFixture?.homeTeam?.customShortName || selectedFixture?.homeTeam?.customName : selectedFixture?.awayTeam?.customShortName || selectedFixture?.awayTeam?.customName }}
                </span>
              </UBadge>
            </div>
            <UButton 
              icon="i-heroicons-x-mark" 
              variant="ghost" 
              color="neutral" 
              size="sm"
              class="shrink-0"
              @click="showGoalModal = false;"
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
              @click="showGoalModal = false;"
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
          <div class="flex items-center justify-between gap-4 min-w-0">
            <div class="flex items-center gap-2 min-w-0">
              <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-warning-500 shrink-0" />
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white shrink-0">
                Record Card
              </h3>
              <UBadge :color="cardTeam === 'home' ? 'primary' : 'warning'" variant="subtle" size="sm" class="min-w-0">
                <span class="truncate max-w-[120px] sm:max-w-[200px] block">
                  {{ cardTeam === 'home' ? selectedFixture?.homeTeam?.customShortName || selectedFixture?.homeTeam?.customName : selectedFixture?.awayTeam?.customShortName || selectedFixture?.awayTeam?.customName }}
                </span>
              </UBadge>
            </div>
            <UButton icon="i-heroicons-x-mark" variant="ghost" color="neutral" size="sm" class="shrink-0" @click="showCardModal = false;" />
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
            <UButton label="Cancel" variant="ghost" color="neutral" @click="showCardModal = false;" />
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

  <!-- Substitution Modal -->
  <UModal v-model:open="showSubstitutionModal">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-4 min-w-0">
            <div class="flex items-center gap-2 min-w-0">
              <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 text-purple-500 shrink-0" />
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white shrink-0">
                Record Substitution
              </h3>
              <UBadge :color="subTeam === 'home' ? 'primary' : 'warning'" variant="subtle" size="sm" class="min-w-0">
                <span class="truncate max-w-[120px] sm:max-w-[200px] block">
                  {{ subTeam === 'home' ? selectedFixture?.homeTeam?.customShortName || selectedFixture?.homeTeam?.customName : selectedFixture?.awayTeam?.customShortName || selectedFixture?.awayTeam?.customName }}
                </span>
              </UBadge>
            </div>
            <UButton icon="i-heroicons-x-mark" variant="ghost" color="neutral" size="sm" class="shrink-0" @click="showSubstitutionModal = false;" />
          </div>
        </template>

        <div class="space-y-4">
          <!-- Minute -->
          <UFormField label="Minute (optional)">
            <UInput 
              v-model.number="subData.minute" 
              type="number" 
              placeholder="e.g. 45"
              icon="i-heroicons-clock"
              :min="0"
              :max="120"
            />
          </UFormField>

          <!-- Player Out -->
          <UFormField label="Player Out (Leaving)">
            <USelect
              v-model="subData.playerOutId"
              :items="subPlayerOutOptions"
              placeholder="Select player leaving..."
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <!-- Player In -->
          <UFormField label="Player In (Entering)">
            <USelect
              v-model="subData.playerInId"
              :items="subPlayerInOptions"
              placeholder="Select player entering..."
              value-key="value"
              :disabled="!subData.playerOutId"
              class="w-full"
            />
          </UFormField>

          <p v-if="subTeamPlayers.length === 0" class="text-sm text-gray-500">
            No players registered for this team.
          </p>

          <!-- Actions -->
          <div class="flex justify-end gap-3 pt-2">
            <UButton label="Cancel" variant="ghost" color="neutral" @click="showSubstitutionModal = false;" />
            <UButton 
              label="Record Substitution" 
              icon="i-heroicons-check"
              color="primary"
              :loading="updatingMatch"
              :disabled="!subData.playerOutId || !subData.playerInId || updatingMatch"
              @click="confirmSubstitution"
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
              @click="showEditEventModal = false;"
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
          <UFormField :label="eventBeingEdited?.type === 'SUBSTITUTION' ? 'Player In (Entering)' : 'Player'">
            <USelect
              v-model="editEventData.playerId"
              :items="editEventPlayerOptions"
              placeholder="Select player..."
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <!-- Assister/Related -->
          <UFormField :label="eventBeingEdited?.type === 'SUBSTITUTION' ? 'Player Out (Leaving)' : 'Related Player / Assist (optional)'">
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
              @click="showEditEventModal = false;"
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
              @click="showDeleteEventModal = false;"
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
              @click="showDeleteEventModal = false;"
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

  <!-- Remove Penalties Confirmation Modal -->
  <UModal v-model:open="showRemovePenaltiesModal">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-error-500" />
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                Remove Penalties
              </h3>
            </div>
            <UButton 
              icon="i-heroicons-x-mark" 
              variant="ghost" 
              color="neutral" 
              size="sm"
              @click="showRemovePenaltiesModal = false;"
            />
          </div>
        </template>

        <div class="space-y-4">
          <p class="text-gray-600 dark:text-gray-300">
            Are you sure you want to remove all penalty shootout scores? This action cannot be undone.
          </p>

          <!-- Actions -->
          <div class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <UButton 
              label="Cancel" 
              variant="ghost" 
              color="neutral"
              @click="showRemovePenaltiesModal = false;"
            />
            <UButton 
              label="Remove Penalties" 
              icon="i-heroicons-trash"
              color="error"
              :loading="updatingMatch"
              @click="removePenalties"
            />
          </div>
        </div>
      </UCard>
    </template>
  </UModal>

  <!-- Walkover Modal -->
  <UModal v-model:open="showWalkoverModal">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-flag" class="w-5 h-5 text-error-500" />
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                Record Walkover
              </h3>
            </div>
            <UButton
              icon="i-heroicons-x-mark"
              variant="ghost"
              color="neutral"
              size="sm"
              @click="showWalkoverModal = false;"
            />
          </div>
        </template>

        <div class="space-y-4">
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Select the team that wins by walkover. This will end the match and set the score to <span class="font-semibold">3-0</span> by default.
          </p>

          <UFormField label="Walkover score">
            <UInput
              v-model.number="walkoverScore"
              type="number"
              :min="1"
              :max="99"
              icon="i-heroicons-trophy"
            />
          </UFormField>

          <div class="grid grid-cols-2 gap-3">
            <UButton
              color="primary"
              variant="soft"
              :label="`Home Walkover (${selectedFixture?.homeTeam?.customShortName || selectedFixture?.homeTeam?.customName || 'Home'})`"
              :loading="updatingMatch"
              @click="setWalkover('home')"
            />
            <UButton
              color="warning"
              variant="soft"
              :label="`Away Walkover (${selectedFixture?.awayTeam?.customShortName || selectedFixture?.awayTeam?.customName || 'Away'})`"
              :loading="updatingMatch"
              @click="setWalkover('away')"
            />
          </div>
        </div>
      </UCard>
    </template>
  </UModal>

  <!-- Swap Teams Confirmation Modal -->
  <UModal v-model:open="showSwapConfirmModal">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-arrows-right-left" class="w-5 h-5 text-warning-500" />
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                Swap Teams
              </h3>
            </div>
            <UButton
              icon="i-heroicons-x-mark"
              variant="ghost"
              color="neutral"
              size="sm"
              @click="showSwapConfirmModal = false;"
            />
          </div>
        </template>

        <div class="space-y-4">
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Are you sure you want to swap home and away teams? This will also swap scores, penalties, and lineups.
          </p>

          <div class="flex justify-end gap-3 pt-2">
            <UButton
              label="Cancel"
              variant="ghost"
              color="neutral"
              @click="showSwapConfirmModal = false;"
            />
            <UButton
              label="Swap Teams"
              icon="i-heroicons-arrows-right-left"
              color="warning"
              :loading="swappingTeams"
              @click="confirmSwapTeams"
            />
          </div>
        </div>
      </UCard>
    </template>
  </UModal>

  <!-- Generic Confirmation Modal -->
  <UModal v-model:open="showConfirmModal">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-error-500" />
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ confirmModalTitle }}
              </h3>
            </div>
            <UButton
              icon="i-heroicons-x-mark"
              variant="ghost"
              color="neutral"
              size="sm"
              @click="showConfirmModal = false;"
            />
          </div>
        </template>

        <div class="space-y-4">
          <p class="text-gray-600 dark:text-gray-300">
            {{ confirmModalMessage }}
          </p>

          <div class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <UButton
              label="Cancel"
              variant="ghost"
              color="neutral"
              @click="showConfirmModal = false;"
            />
            <UButton
              :label="confirmModalConfirmLabel"
              icon="i-heroicons-exclamation-triangle"
              :color="confirmModalConfirmColor"
              :loading="updatingMatch"
              @click="handleConfirmModal"
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

.mc-swap-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.625rem;
  font-weight: 600;
  color: #9ca3af;
  background: transparent;
  border: 1px solid #e5e7eb;
  padding: 2px 8px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;
  text-transform: uppercase;
  margin-top: 4px;
}

.mc-swap-btn:hover:not(:disabled) {
  background: #f3f4f6;
  color: #4b5563;
  border-color: #d1d5db;
}

.mc-swap-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

:root.dark .mc-swap-btn {
  border-color: rgba(255,255,255,0.08);
}
:root.dark .mc-swap-btn:hover:not(:disabled) {
  background: rgba(255,255,255,0.05);
  color: #d1d5db;
}

.mc-match-time {
  font-size: 0.625rem;
  color: #9ca3af;
  font-weight: 500;
  white-space: nowrap;
}

.mc-match-time--live {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(239, 68, 68, 0.12);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.2);
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 0.725rem;
  font-weight: 600;
  margin-top: 4px;
}
.mc-match-time--live-paused {
  background: rgba(245, 158, 11, 0.12);
  color: #fbbf24;
  border-color: rgba(245, 158, 11, 0.2);
}
.mc-match-time__live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: currentColor;
  animation: pulse 1.2s ease-in-out infinite;
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

.mc-btn--sub {
  border-color: rgba(139, 92, 246, 0.2);
  color: #8b5cf6;
}
.mc-btn--sub:hover:not(:disabled) { background: rgba(139, 92, 246, 0.1); }

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
  max-width: 5rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}

/* Penalty shootout buttons */
.mc-pen-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 28px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 6px;
  font-size: 0.6875rem;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  transition: transform 0.12s ease, opacity 0.12s ease;
}

.mc-pen-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.mc-pen-btn:disabled {
  cursor: default;
  opacity: 0.55;
}

.mc-pen-btn--scored {
  color: #047857;
  background: rgba(16, 185, 129, 0.12);
  border-color: rgba(16, 185, 129, 0.22);
}

:root.dark .mc-pen-btn--scored {
  color: #34d399;
  background: rgba(16, 185, 129, 0.14);
  border-color: rgba(16, 185, 129, 0.24);
}

.mc-pen-btn--missed,
.mc-pen-btn--saved {
  color: #b45309;
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.22);
}

:root.dark .mc-pen-btn--missed,
:root.dark .mc-pen-btn--saved {
  color: #fbbf24;
  background: rgba(245, 158, 11, 0.14);
  border-color: rgba(245, 158, 11, 0.24);
}

/* ── Events ────────────────────────────────────────────────── */
.mc-events-body {
  border-top: 1px solid #f3f4f6;
}

:root.dark .mc-events-body { border-color: rgba(255,255,255,0.05); }

.mc-events-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 260px;
  overflow-y: auto;
  padding: 8px;
}

.mc-events-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mc-events-group__header {
  position: sticky;
  top: 0;
  z-index: 1;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #6b7280;
  background: rgba(249, 250, 251, 0.95);
  padding: 4px 6px;
  border-radius: 4px;
  margin-bottom: 2px;
}

:root.dark .mc-events-group__header {
  color: #9ca3af;
  background: rgba(20, 20, 20, 0.95);
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

.mc-action-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.mc-action-divider {
  width: 1px;
  height: 24px;
  background: #e5e7eb;
  margin: 0 4px;
  flex-shrink: 0;
}

:root.dark .mc-action-divider { background: rgba(255,255,255,0.08); }

/* Primary action buttons */
.mc-primary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 0.8125rem;
  font-weight: 700;
  padding: 8px 14px;
  border-radius: 9px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s, border-color 0.15s;
  white-space: nowrap;
  line-height: 1.4;
  min-height: 36px;
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
  background: #fff;
  color: #dc2626;
  border-color: #dc2626;
  box-shadow: 0 1px 3px rgba(220,38,38,0.08);
}
.mc-primary-btn--end:hover:not(:disabled) { background: #fef2f2; }
:root.dark .mc-primary-btn--end {
  background: rgba(220,38,38,0.1);
  color: #f87171;
  border-color: rgba(220,38,38,0.4);
}
:root.dark .mc-primary-btn--end:hover:not(:disabled) { background: rgba(220,38,38,0.18); }

.mc-primary-btn--reopen {
  background: #d97706;
  color: #fff;
  border-color: #b45309;
  box-shadow: 0 2px 6px rgba(217,119,6,0.3);
}
.mc-primary-btn--reopen:hover:not(:disabled) { background: #b45309; }

.mc-primary-btn--undo {
  background: #fff;
  color: #6b7280;
  border-color: #d1d5db;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.mc-primary-btn--undo:hover:not(:disabled) { background: #f3f4f6; }
:root.dark .mc-primary-btn--undo {
  background: rgba(255,255,255,0.05);
  color: #9ca3af;
  border-color: rgba(255,255,255,0.1);
}
:root.dark .mc-primary-btn--undo:hover:not(:disabled) { background: rgba(255,255,255,0.08); }

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

.mc-timer-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 20px;
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.2);
}
.mc-timer-badge--paused {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  border-color: rgba(245, 158, 11, 0.2);
}

.mc-primary-btn--pause {
  background: #4f46e5;
  color: #fff;
  border-color: #4338ca;
  box-shadow: 0 2px 6px rgba(79, 70, 229, 0.3);
}
.mc-primary-btn--pause:hover:not(:disabled) { background: #4338ca; }

.mc-primary-btn--resume {
  background: #10b981;
  color: #fff;
  border-color: #059669;
  box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
}
.mc-primary-btn--resume:hover:not(:disabled) { background: #059669; }

.mc-primary-btn--halftime {
  background: #f59e0b;
  color: #fff;
  border-color: #d97706;
  box-shadow: 0 2px 6px rgba(245, 158, 11, 0.3);
}
.mc-primary-btn--halftime:hover:not(:disabled) { background: #d97706; }

.mc-primary-btn--secondhalf {
  background: #06b6d4;
  color: #fff;
  border-color: #0891b2;
  box-shadow: 0 2px 6px rgba(6, 182, 212, 0.3);
}
.mc-primary-btn--secondhalf:hover:not(:disabled) { background: #0891b2; }

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

/* Roster Box & Lists (Lineups selection) */
.mc-roster-box {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  background: #f9fafb;
}

:root.dark .mc-roster-box {
  border-color: rgba(255, 255, 255, 0.06);
  background: rgba(0, 0, 0, 0.3);
}

.mc-roster-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 240px;
  overflow-y: auto;
  padding-right: 4px;
}

/* Custom Scrollbars */
.mc-roster-list::-webkit-scrollbar {
  width: 5px;
}
.mc-roster-list::-webkit-scrollbar-track {
  background: transparent;
}
.mc-roster-list::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
:root.dark .mc-roster-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
}

.mc-roster-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 4px 6px;
  border-radius: 6px;
  transition: background 0.15s;
}

.mc-roster-item:hover {
  background: #f1f5f9;
}

:root.dark .mc-roster-item:hover {
  background: rgba(255, 255, 255, 0.04);
}

.mc-roster-item :deep(label),
.mc-roster-item :deep(.u-checkbox-label),
.mc-roster-item label {
  white-space: normal !important;
  word-break: break-all !important;
  overflow-wrap: break-word !important;
}

/* ── Mobile compact layout ───────────────────────────────────── */
@media (max-width: 640px) {
  .mc-shell {
    border-radius: 12px;
  }

  .mc-header {
    padding: 10px 12px;
  }

  .mc-header__title {
    font-size: 0.75rem;
  }

  .mc-header__icon {
    width: 20px;
    height: 20px;
  }

  .mc-header__close {
    width: 24px;
    height: 24px;
  }

  .mc-body {
    padding: 10px;
  }

  .mc-scoreboard {
    padding: 12px 6px;
    gap: 8px;
    margin-bottom: 8px;
  }

  .mc-team__logo {
    width: 42px;
    height: 42px;
  }

  .mc-team__initial {
    font-size: 0.9rem;
  }

  .mc-team__name {
    font-size: 0.6875rem;
    max-width: 80px;
  }

  .mc-score-val {
    font-size: 1.75rem;
    min-width: 1.6rem;
  }

  .mc-score-sep {
    font-size: 1.25rem;
  }

  .mc-swap-btn {
    font-size: 0.55rem;
    padding: 1px 6px;
  }

  .mc-match-time--live {
    font-size: 0.6rem;
    padding: 2px 6px;
  }

  .mc-controls {
    gap: 8px;
  }

  .mc-ctrl-side {
    gap: 4px;
  }

  .mc-btn {
    font-size: 0.6rem;
    padding: 3px 6px;
    border-radius: 6px;
  }

  .mc-btn--minus {
    padding: 3px 6px;
  }

  .card-icon {
    width: 6px;
    height: 9px;
  }

  .mc-sections {
    gap: 6px;
    margin-top: 8px;
  }

  .mc-section {
    border-radius: 8px;
  }

  .mc-section__head,
  .mc-section__toggle {
    padding: 8px 10px;
    font-size: 0.6875rem;
  }

  .mc-section__body {
    padding: 8px;
  }

  .mc-events-list {
    max-height: 200px;
    padding: 6px;
  }

  .mc-event {
    gap: 6px;
    padding: 4px 3px;
  }

  .mc-event__min {
    width: 26px;
    height: 26px;
    font-size: 0.55rem;
  }

  .mc-event__player {
    font-size: 0.75rem;
  }

  .mc-event__assist {
    font-size: 0.55rem;
    padding-left: 16px;
  }

  .mc-event__assist--right {
    padding-right: 16px;
  }

  .mc-action-bar {
    margin-top: 10px;
    padding-top: 10px;
    gap: 6px;
  }

  .mc-primary-btn {
    font-size: 0.75rem;
    padding: 6px 10px;
    min-height: 30px;
    border-radius: 7px;
  }

  .mc-sec-btn {
    font-size: 0.625rem;
    padding: 4px 8px;
    border-radius: 6px;
  }

  .mc-timer-badge {
    font-size: 0.6rem;
    padding: 1px 6px;
  }

  .mc-roster-box {
    padding: 10px;
  }

  .mc-roster-list {
    max-height: 180px;
  }

  .mc-pen-label {
    font-size: 0.55rem;
  }

  .mc-pen-btn {
    padding: 0 6px;
    min-height: 24px;
    font-size: 0.6rem;
  }

  .mc-tag {
    font-size: 0.525rem;
    padding: 1px 5px;
  }
}
</style>
