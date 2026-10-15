<script setup lang="ts">
import { z } from 'zod'
import { type Participant, type Tournament, type Group, TournamentType } from '~/types'
import { storeToRefs } from 'pinia'

const props = defineProps<{
  open: boolean
  participants: Participant[]
  tournament: Tournament
  groups?: Group[]
}>()

const emit = defineEmits(['update:open', 'finish'])

const step = ref(1)
const loading = ref(false)
const showConfirmFinishModal = ref(false)
const fixtureStore = useFixtureStore()
const venueStore = useVenueStore()
const { venues } = storeToRefs(venueStore)
const { extractErrorMessage } = useErrors()
const toast = useToast()

// LocalStorage key scoped to this tournament
const STORAGE_KEY = `gsw-progress-${props.tournament.id}`

const isHybrid = computed(() => props.tournament.type === TournamentType.HYBRID)

const config = reactive({
  assignmentMethod: 'auto' as 'existing' | 'auto',
  numberOfGroups: props.tournament.type === TournamentType.ROUND_ROBIN ? 1 : (props.tournament.numberOfGroups || 2),
  shuffleParticipants: false,
  schedulingMethod: 'auto' as 'auto' | 'manual',
  generateKnockout: props.tournament.type === TournamentType.HYBRID,
  advancingPerGroup: 2,
  hasThirdPlace: false
})

const totalAdvancingTeams = computed(() => {
  return config.numberOfGroups * config.advancingPerGroup
})

const startingKnockoutRoundName = computed(() => {
  const teams = totalAdvancingTeams.value
  if (teams <= 2) return 'Final'
  if (teams <= 4) return 'Semifinals'
  if (teams <= 8) return 'Quarterfinals'
  if (teams <= 16) return 'Round of 16'
  if (teams <= 32) return 'Round of 32'
  return `${teams}-Team Playoff`
})

interface KnockoutMatchup {
  home: string
  away: string
}

const knockoutMatchups = ref<KnockoutMatchup[]>([])

const computeDefaultKnockoutMatchups = (numGroups: number, adv: number): KnockoutMatchup[] => {
  const pairs: KnockoutMatchup[] = []

  if (numGroups === 2 && adv === 2) {
    pairs.push({ home: 'Winner Group A', away: 'Runner-up Group B' })
    pairs.push({ home: 'Winner Group B', away: 'Runner-up Group A' })
  } else if (numGroups === 4 && adv === 2) {
    pairs.push({ home: 'Winner Group A', away: 'Runner-up Group B' })
    pairs.push({ home: 'Winner Group C', away: 'Runner-up Group D' })
    pairs.push({ home: 'Winner Group B', away: 'Runner-up Group A' })
    pairs.push({ home: 'Winner Group D', away: 'Runner-up Group C' })
  } else if (adv === 1) {
    for (let i = 0; i < numGroups; i += 2) {
      const g1 = String.fromCharCode(65 + i)
      const g2 = i + 1 < numGroups ? String.fromCharCode(65 + i + 1) : null
      pairs.push({ home: `Winner Group ${g1}`, away: g2 ? `Winner Group ${g2}` : 'BYE' })
    }
  } else if (adv === 2) {
    for (let i = 0; i < numGroups; i++) {
      const gHome = String.fromCharCode(65 + i)
      const targetGroupIndex = (i + 1) % numGroups
      const gAway = String.fromCharCode(65 + targetGroupIndex)
      pairs.push({ home: `Winner Group ${gHome}`, away: `Runner-up Group ${gAway}` })
    }
  } else {
    const allQualifiers: string[] = []
    for (let g = 0; g < numGroups; g++) {
      const gLetter = String.fromCharCode(65 + g)
      allQualifiers.push(`Winner Group ${gLetter}`)
      if (adv >= 2) allQualifiers.push(`Runner-up Group ${gLetter}`)
      for (let p = 3; p <= adv; p++) {
        const suffix = p === 3 ? 'rd' : 'th'
        allQualifiers.push(`${p}${suffix} Place Group ${gLetter}`)
      }
    }
    const matchCount = Math.ceil(allQualifiers.length / 2)
    for (let i = 0; i < matchCount; i++) {
      const home = allQualifiers[i] || 'BYE'
      const away = allQualifiers[allQualifiers.length - 1 - i] || 'BYE'
      pairs.push({ home, away })
    }
  }

  return pairs
}

const initializeKnockoutMatchups = (force = false) => {
  if (!isHybrid.value || !config.generateKnockout) {
    knockoutMatchups.value = []
    return
  }
  const defaults = computeDefaultKnockoutMatchups(config.numberOfGroups, config.advancingPerGroup)
  if (force || knockoutMatchups.value.length === 0 || knockoutMatchups.value.length !== defaults.length) {
    knockoutMatchups.value = defaults
  }
}

const isMatchupsCustomized = computed(() => {
  if (!isHybrid.value || !config.generateKnockout) return false
  const defaults = computeDefaultKnockoutMatchups(config.numberOfGroups, config.advancingPerGroup)
  if (knockoutMatchups.value.length !== defaults.length) return true
  return knockoutMatchups.value.some((m, idx) => m.home !== defaults[idx]?.home || m.away !== defaults[idx]?.away)
})

const resetKnockoutMatchups = () => {
  knockoutMatchups.value = computeDefaultKnockoutMatchups(config.numberOfGroups, config.advancingPerGroup)
  toast.add({
    title: 'Matchups Reset',
    description: 'First round matchups restored to default cross-group pairings.',
    color: 'neutral',
    icon: 'i-heroicons-arrow-path'
  })
}

const shuffleKnockoutMatchups = () => {
  if (knockoutMatchups.value.length <= 1) return
  const aways = knockoutMatchups.value.map(m => m.away)
  for (let i = aways.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = aways[i]!
    aways[i] = aways[j]!
    aways[j] = temp
  }
  knockoutMatchups.value.forEach((m, idx) => {
    m.away = aways[idx]!
  })
  toast.add({
    title: 'Matchups Shuffled',
    description: 'Opponents randomly re-paired.',
    icon: 'i-heroicons-arrows-right-left',
    color: 'neutral'
  })
}

const swapMatchupHomeAway = (index: number) => {
  const m = knockoutMatchups.value[index]
  if (!m) return
  const temp = m.home
  m.home = m.away
  m.away = temp
}

const updateMatchupSlot = (matchIndex: number, side: 'home' | 'away', newValue: string) => {
  if (!newValue) return
  const trimmed = newValue.trim()
  if (!trimmed) return

  // Smart swap: if newValue already assigned in another slot (unless BYE)
  if (trimmed.toUpperCase() !== 'BYE') {
    for (let i = 0; i < knockoutMatchups.value.length; i++) {
      const m = knockoutMatchups.value[i]!
      if (i === matchIndex && side === 'home' && m.away === trimmed) {
        m.away = m.home
        m.home = trimmed
        return
      }
      if (i === matchIndex && side === 'away' && m.home === trimmed) {
        m.home = m.away
        m.away = trimmed
        return
      }
      if (i !== matchIndex) {
        if (m.home === trimmed) {
          const oldVal = knockoutMatchups.value[matchIndex]![side]
          m.home = oldVal
          knockoutMatchups.value[matchIndex]![side] = trimmed
          return
        }
        if (m.away === trimmed) {
          const oldVal = knockoutMatchups.value[matchIndex]![side]
          m.away = oldVal
          knockoutMatchups.value[matchIndex]![side] = trimmed
          return
        }
      }
    }
  }

  knockoutMatchups.value[matchIndex]![side] = trimmed
}

const getKnockoutMatchLabel = (index: number) => {
  const roundName = startingKnockoutRoundName.value
  let prefix = `Match ${index + 1}`
  if (roundName === 'Quarterfinals') prefix = `QF ${index + 1}`
  else if (roundName === 'Semifinals') prefix = `SF ${index + 1}`
  else if (roundName === 'Round of 16') prefix = `R16 ${index + 1}`
  else if (roundName === 'Round of 32') prefix = `R32 ${index + 1}`
  else if (roundName === 'Final') prefix = 'Final'
  return prefix
}

const qualifierOptions = computed(() => {
  const options: { label: string; value: string }[] = []
  const numGroups = config.numberOfGroups
  const adv = config.advancingPerGroup

  for (let i = 0; i < numGroups; i++) {
    const letter = String.fromCharCode(65 + i)
    options.push({ label: `Winner Group ${letter}`, value: `Winner Group ${letter}` })
    if (adv >= 2) {
      options.push({ label: `Runner-up Group ${letter}`, value: `Runner-up Group ${letter}` })
    }
    for (let p = 3; p <= adv; p++) {
      const suffix = p === 3 ? 'rd' : 'th'
      options.push({ label: `${p}${suffix} Place Group ${letter}`, value: `${p}${suffix} Place Group ${letter}` })
    }
  }

  options.push({ label: 'BYE', value: 'BYE' })
  options.push({ label: 'Best 3rd Place', value: 'Best 3rd Place' })

  // Keep any custom placeholder values in the options list so they can be selected
  knockoutMatchups.value.forEach(m => {
    if (m.home && !options.some(o => o.value === m.home)) {
      options.push({ label: m.home, value: m.home })
    }
    if (m.away && !options.some(o => o.value === m.away)) {
      options.push({ label: m.away, value: m.away })
    }
  })

  return options
})

// Manual Schedule State
const manualFixtures = ref<{
  homeTeamId: string;
  awayTeamId: string;
  round: number;
  startTime: string;
  venue?: string;
}[]>([])

const addFixtureState = reactive({
  homeTeamId: '',
  awayTeamId: '',
  round: 1,
  startTime: '',
  venue: ''
})

// Group Assignments State
// Record<string, string[]> where keys are "Group A", "Group B", etc.
const groupAssignments = ref<Record<string, string[]>>({})

// ── LocalStorage persistence ─────────────────────────────────
const saveProgress = () => {
  try {
    const data = {
      step: step.value,
      config: { ...config },
      groupAssignments: groupAssignments.value,
      manualFixtures: manualFixtures.value,
      knockoutMatchups: knockoutMatchups.value,
      savedAt: Date.now()
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch { /* quota exceeded or SSR */ }
}

const loadProgress = (): boolean => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const data = JSON.parse(raw)
    // Expire after 24 hours
    if (Date.now() - data.savedAt > 24 * 60 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY)
      return false
    }
    // Restore state
    step.value = data.step || 1
    Object.assign(config, data.config)
    groupAssignments.value = data.groupAssignments || {}
    manualFixtures.value = data.manualFixtures || []
    if (data.knockoutMatchups?.length) {
      knockoutMatchups.value = data.knockoutMatchups
    } else {
      initializeKnockoutMatchups(true)
    }
    return true
  } catch {
    return false
  }
}

const clearProgress = () => {
  try { localStorage.removeItem(STORAGE_KEY) } catch {}
}

// Auto-save whenever key state changes
watch([step, config, groupAssignments, manualFixtures, knockoutMatchups], () => {
  if (props.open) saveProgress()
}, { deep: true })

const venueOptions = computed(() => {
  return venues.value.map(v => ({ label: v.name, value: v.name }))
})

const roundOptions = computed(() => {
  const teamsCount = props.participants.length
  const groupsCount = config.numberOfGroups
  if (!groupsCount || teamsCount <= 1) return [{ label: 'Matchday 1', value: 1 }]
  
  const avgTeamsPerGroup = Math.ceil(teamsCount / groupsCount)
  
  // Single Round Robin: N-1 if even, N if odd
  let expectedRounds = avgTeamsPerGroup % 2 === 0 ? avgTeamsPerGroup - 1 : avgTeamsPerGroup
  
  // Double the rounds if tournament is double round robin
  if (props.tournament.doubleRoundRobin) {
    expectedRounds *= 2
  }
  
  // Return exactly the expected number of matchdays
  const count = Math.max(1, expectedRounds)
  return Array.from({ length: count }, (_, i) => ({ label: `Matchday ${i + 1}`, value: i + 1 }))
})

// Filter participants based on current round selections
const homeParticipantOptions = computed(() => {
  const round = addFixtureState.round
  const teamsInRound = new Set(
    manualFixtures.value
      .filter(f => f.round === round)
      .flatMap(f => [f.homeTeamId, f.awayTeamId])
  )
  
  return props.participants
    .filter(p => !teamsInRound.has(p.id) && p.id !== addFixtureState.awayTeamId)
    .map(p => ({
      label: p.customName ?? undefined,
      value: p.id,
      logoUrl: p.logoUrl ?? undefined
    }))
})

const awayParticipantOptions = computed(() => {
  const round = addFixtureState.round
  const teamsInRound = new Set(
    manualFixtures.value
      .filter(f => f.round === round)
      .flatMap(f => [f.homeTeamId, f.awayTeamId])
  )
  
  return props.participants
    .filter(p => !teamsInRound.has(p.id) && p.id !== addFixtureState.homeTeamId)
    .map(p => ({
      label: p.customName ?? undefined,
      value: p.id,
      logoUrl: p.logoUrl ?? undefined
    }))
})

// Initialize group assignments when opening
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    // Try to restore saved progress first
    const restored = loadProgress()
    if (restored) {
      toast.add({ title: 'Progress Restored', description: 'Your previous wizard progress has been loaded.', color: 'neutral', icon: 'i-heroicons-arrow-path' })
      return
    }
    
    step.value = 1
    
    // Check for existing groups to set initial config
    const existingGroups = props.groups || props.tournament.groups || []
    if (props.tournament.type === TournamentType.ROUND_ROBIN) {
       config.assignmentMethod = 'auto'
       config.numberOfGroups = 1
    } else if (existingGroups.length > 0) {
       config.assignmentMethod = 'existing'
       config.numberOfGroups = existingGroups.length
    } else {
       config.assignmentMethod = 'auto'
       if (!props.tournament.numberOfGroups) {
          config.numberOfGroups = props.participants.length <= 4 ? 1 : Math.ceil(props.participants.length / 4)
       } else {
          config.numberOfGroups = props.tournament.numberOfGroups
       }
    }

    // Initialize groups and knockout matchups
    initializeGroups()
    initializeKnockoutMatchups(true)
  }
})

// Re-initialize groups if essential config changes
watch([() => config.assignmentMethod, () => config.numberOfGroups, () => config.shuffleParticipants], () => {
    initializeGroups()
})

// Re-initialize knockout matchups if group count, progression or hybrid status changes
watch([() => config.numberOfGroups, () => config.advancingPerGroup, () => config.generateKnockout], () => {
    if (isHybrid.value && config.generateKnockout) {
      initializeKnockoutMatchups(true)
    }
})

// Clear selected teams if they are already scheduled in the newly selected round
watch(() => addFixtureState.round, (newRound) => {
  const teamsInRound = new Set(
    manualFixtures.value
      .filter(f => f.round === newRound)
      .flatMap(f => [f.homeTeamId, f.awayTeamId])
  )
  
  if (addFixtureState.homeTeamId && teamsInRound.has(addFixtureState.homeTeamId)) {
    addFixtureState.homeTeamId = ''
  }
  if (addFixtureState.awayTeamId && teamsInRound.has(addFixtureState.awayTeamId)) {
    addFixtureState.awayTeamId = ''
  }
})


const initializeGroups = () => {
  const groups: Record<string, string[]> = {}
  const existingGroups = props.groups || props.tournament.groups || []

  // Use existing assignments if requested
  if (config.assignmentMethod === 'existing' && existingGroups.length > 0) {
      existingGroups.forEach(g => {
          // Import participants that belong to this group
          groups[g.name] = props.participants
              .filter(p => p.groupId === g.id)
              .map(p => p.id)
      })
      groupAssignments.value = groups
      return
  }

  // Otherwise, default to automatic generation/distribution
  for (let i = 0; i < config.numberOfGroups; i++) {
    const label = `Group ${String.fromCharCode(65 + i)}`
    groups[label] = []
  }
  
  // Distribute teams evenly initially
  const teams = [...props.participants]
  if (config.shuffleParticipants) {
    teams.sort(() => Math.random() - 0.5)
  }

  teams.forEach((p, index) => {
    const groupIndex = index % config.numberOfGroups
    const label = `Group ${String.fromCharCode(65 + groupIndex)}`
    if (!groups[label]) {
      groups[label] = []
    }
    groups[label].push(p.id)
  })

  groupAssignments.value = groups
}

const nextStep = () => {
  if (step.value === 1) {
    if (config.numberOfGroups < 1) {
      toast.add({ title: 'Invalid group count', color: 'error' })
      return
    }
    initializeGroups()
    step.value = 2
  } else if (step.value === 2) {
    if (config.schedulingMethod === 'manual') {
      // Time is optional for fixtures
      addFixtureState.startTime = ''
      step.value = 3
    } else {
      handleFinish()
    }
  }
}

const unassignedParticipants = computed(() => {
    const assignedIds = new Set(Object.values(groupAssignments.value).flat())
    return props.participants.filter(p => !assignedIds.has(p.id))
})

const expectedFixturesCount = computed(() => {
  let count = 0
  const groupsList = Object.values(groupAssignments.value)
  for (const teamIds of groupsList) {
    const N = teamIds.length
    if (N < 2) continue
    let groupMatches = (N * (N - 1)) / 2
    if (props.tournament.doubleRoundRobin) {
      groupMatches *= 2
    }
    count += groupMatches
  }
  return count
})

const manualFixturesByRound = computed(() => {
  const grouped: Record<number, { originalIndex: number, fixture: typeof manualFixtures.value[0] }[]> = {}
  manualFixtures.value.forEach((f, index) => {
    if (!grouped[f.round]) grouped[f.round] = []
    grouped[f.round]!.push({ originalIndex: index, fixture: f })
  })

  return Object.keys(grouped)
    .sort((a, b) => Number(a) - Number(b))
    .map((round, index) => {
      const safeSlot = `round-${index}`
      const roundFixtures = grouped[Number(round)]!
      return {
        label: `Matchday ${round}`,
        value: safeSlot,
        slot: safeSlot,
        round: Number(round),
        fixtures: roundFixtures.sort((a, b) => new Date(a.fixture.startTime).getTime() - new Date(b.fixture.startTime).getTime())
      }
    })
})

const handleFinish = async (force = false) => {
  if (config.schedulingMethod === 'manual') {
    if (manualFixtures.value.length === 0) {
      toast.add({ title: 'Please add at least one fixture', color: 'error' })
      return
    }

    const expected = expectedFixturesCount.value
    if (manualFixtures.value.length < expected && !force) {
      showConfirmFinishModal.value = true
      return
    }
  }

  showConfirmFinishModal.value = false
  loading.value = true
  try {
    if (config.schedulingMethod === 'auto') {
      await fixtureStore.generateFixtures(props.tournament.id, {
        numberOfGroups: config.numberOfGroups,
        groupAssignments: groupAssignments.value,
        shuffleParticipants: false,
        clearExisting: true,
        generateKnockoutStage: isHybrid.value && config.generateKnockout,
        advancingPerGroup: config.advancingPerGroup,
        hasThirdPlace: config.hasThirdPlace,
        knockoutMatchups: isHybrid.value && config.generateKnockout ? knockoutMatchups.value : undefined
      })
    } else {
      // Clear existing first
      await fixtureStore.deleteAllFixtures(props.tournament.id)

      // Create each fixture
      await Promise.all(manualFixtures.value.map(f =>
        fixtureStore.createFixture({
          tournament_id: props.tournament.id,
          homeTeamId: f.homeTeamId,
          awayTeamId: f.awayTeamId,
          round: f.round,
          startTime: f.startTime || undefined,
          venue: f.venue,
          roundName: `Matchday ${f.round}`,
          stage: props.tournament.type === TournamentType.KNOCKOUT ? 'KNOCKOUT' : 'GROUP_STAGE'
        })
      ))
    }
    
    toast.add({
      title: 'Group Stage Setup Complete',
      description: 'Fixtures have been generated successfully.',
      color: 'success'
    })
    
    clearProgress()
    emit('finish')
    closeWizard()
  } catch (err: any) {
    const message = err?.data?.message || err?.message || extractErrorMessage(err) || 'Could not generate fixtures. Please try again.'
    toast.add({
      title: 'Generation Failed',
      description: message,
      color: 'error'
    })
    console.error('Group setup generation failed:', err)
  } finally {
    loading.value = false
  }
}

const addManualFixture = () => {
  if (!addFixtureState.homeTeamId || !addFixtureState.awayTeamId) {
    toast.add({ title: 'Select both teams', color: 'error' })
    return
  }
  if (addFixtureState.homeTeamId === addFixtureState.awayTeamId) {
    toast.add({ title: 'Teams must be different', color: 'error' })
    return
  }
  if (addFixtureState.startTime && props.tournament.start_date && props.tournament.end_date) {
    const fixtureDate = new Date(addFixtureState.startTime)
    if (!isNaN(fixtureDate.getTime())) {
      const startDate = new Date(props.tournament.start_date)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(props.tournament.end_date)
      endDate.setHours(23, 59, 59, 999)
      if (fixtureDate < startDate || fixtureDate > endDate) {
        toast.add({
          title: 'Date out of range',
          description: `The fixture date must be between the tournament start date (${new Date(props.tournament.start_date).toLocaleDateString()}) and end date (${new Date(props.tournament.end_date).toLocaleDateString()}). Please adjust the tournament's start or end date to select this date.`,
          color: 'error'
        })
        return
      }
    }
  }

  manualFixtures.value.push({ ...addFixtureState })
  // Clear selection but keep round/time/venue for next entry convenience
  addFixtureState.homeTeamId = ''
  addFixtureState.awayTeamId = ''
}

const removeManualFixture = (index: number) => {
  manualFixtures.value.splice(index, 1)
}

const closeWizard = () => {
  emit('update:open', false)
}

const getParticipantById = (id: string) => props.participants.find(p => p.id === id)

// Read-only preview - drag and drop helper removed as per user request
</script>

<template>
  <UModal :open="open" @update:open="closeWizard" :ui="{ content: 'w-[calc(100vw-1rem)] sm:max-w-3xl' }">
    <template #content>
      <div class="flex flex-col overflow-hidden" style="max-height: 100dvh;">
        <!-- Header -->
        <!-- Header (always visible) -->
        <div class="p-4 sm:p-6 border-b border-gray-100 dark:border-white/[0.05] shrink-0">
          <div class="flex items-center justify-between">
            <h3 class="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Group Stage Setup</h3>
            <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark" size="sm" @click="closeWizard" />
          </div>
          
          <!-- Stepper -->
          <div class="mt-5 sm:mt-6">
            <div class="grid grid-cols-3 items-start gap-2 sm:flex sm:items-center sm:justify-center sm:gap-4">
              <div class="flex min-w-0 flex-col items-center gap-1.5 sm:flex-row sm:gap-2">
                <div :class="[
                  'w-8 h-8 rounded-full flex shrink-0 items-center justify-center font-bold text-sm transition-all',
                  step >= 1 ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                ]">1</div>
                <span :class="['max-w-full truncate text-xs font-semibold sm:text-sm sm:font-medium', step >= 1 ? 'text-gray-900 dark:text-white' : 'text-gray-400']">General</span>
              </div>
              <div class="hidden w-12 h-px bg-gray-100 dark:bg-gray-800 sm:block"></div>
              <div class="flex min-w-0 flex-col items-center gap-1.5 sm:flex-row sm:gap-2">
                <div :class="[
                  'w-8 h-8 rounded-full flex shrink-0 items-center justify-center font-bold text-sm transition-all',
                  step >= 2 ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                ]">2</div>
                <span :class="['max-w-full truncate text-xs font-semibold sm:text-sm sm:font-medium', step >= 2 ? 'text-gray-900 dark:text-white' : 'text-gray-400']">Groups</span>
              </div>
              <div class="hidden w-12 h-px bg-gray-100 dark:bg-gray-800 sm:block"></div>
              <div class="flex min-w-0 flex-col items-center gap-1.5 sm:flex-row sm:gap-2">
                <div :class="[
                  'w-8 h-8 rounded-full flex shrink-0 items-center justify-center font-bold text-sm transition-all',
                  step >= 3 ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                ]">3</div>
                <span :class="['max-w-full truncate text-xs font-semibold sm:text-sm sm:font-medium', step >= 3 ? 'text-gray-900 dark:text-white' : 'text-gray-400']">Schedule</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Steps 1 & 2: normal scrollable body -->
        <!-- Steps 1 & 2: scrollable body -->
        <div v-if="step !== 3" class="p-4 sm:p-8 flex-1 min-h-0 overflow-y-auto scroll-smooth">
          <!-- Step 1: Config -->
          <div v-if="step === 1" class="max-w-md mx-auto space-y-6">
            <div class="bg-primary-50/50 dark:bg-primary-950/20 p-4 rounded-xl border border-primary-100 dark:border-primary-900/30 mb-8">
              <p class="text-sm text-primary-700 dark:text-primary-300">
                {{ props.tournament.type === TournamentType.ROUND_ROBIN ? 'Configure scheduling method for the Round Robin fixtures.' : 'Configure your group stage structure. You can use existing assignments or auto-generate new ones.' }}
              </p>
            </div>

            <UFormField v-if="props.tournament.type !== TournamentType.ROUND_ROBIN" label="Setup Method" required>
               <URadioGroup
                  v-model="config.assignmentMethod"
                  :items="[
                     { label: 'Use Existing Groups', value: 'existing', description: 'Use the groups and assignments already set up.', icon: 'i-heroicons-rectangle-group', disabled: !(props.groups?.length || props.tournament.groups?.length) },
                     { label: 'Auto-Generate & Distribute', value: 'auto', description: 'Automatically create groups and distribute teams.', icon: 'i-heroicons-sparkles' }
                  ]"
               />
            </UFormField>

            <UFormField v-if="config.assignmentMethod === 'auto' && props.tournament.type !== TournamentType.ROUND_ROBIN" label="Number of Groups" required>
              <USelect 
                v-model.number="config.numberOfGroups" 
                :items="[1, 2, 4, 8, 16, 32].map(n => ({ label: `${n} Group${n > 1 ? 's' : ''}`, value: n }))"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Scheduling Method" required>
               <URadioGroup
                 v-model="config.schedulingMethod"
                 :items="[
                   { label: 'Automatic', value: 'auto', description: 'System-generated match schedule based on your settings.', icon: 'i-heroicons-bolt' },
                   { label: 'Manual', value: 'manual', description: 'Create and assign each fixture yourself in the next step.', icon: 'i-heroicons-hand-raised' }
                 ]"
               />
            </UFormField>

            <div v-if="config.schedulingMethod === 'auto'" class="flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-white/[0.05]">
                <USwitch v-model="config.shuffleParticipants" />
                <div>
                   <p class="text-sm font-medium text-gray-900 dark:text-white">Randomize Initial Order</p>
                   <p class="text-xs text-gray-500">Shuffle teams before distributing them into groups.</p>
                </div>
            </div>

            <!-- Knockout Progression (Hybrid Tournaments) -->
            <div v-if="isHybrid" class="p-4 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 space-y-4">
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                    <UIcon name="i-heroicons-trophy" class="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <p class="text-sm font-bold text-gray-900 dark:text-white">Knockout Stage Progression</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">Pre-generate the playoff bracket with group placeholders</p>
                  </div>
                </div>
                <USwitch v-model="config.generateKnockout" />
              </div>

              <div v-if="config.generateKnockout" class="space-y-3.5 pt-3 border-t border-amber-500/15">
                <UFormField label="Advancing per group" required>
                  <USelect
                    v-model.number="config.advancingPerGroup"
                    :items="[
                      { label: 'Top 1 (Winner only)', value: 1 },
                      { label: 'Top 2 (Winner & Runner-up)', value: 2 },
                      { label: 'Top 3 (Top 3 teams)', value: 3 },
                      { label: 'Top 4 (Top 4 teams)', value: 4 }
                    ]"
                    class="w-full"
                  />
                </UFormField>

                <div class="flex items-center justify-between p-2.5 rounded-lg bg-white/70 dark:bg-black/30 border border-amber-500/10 text-xs">
                  <span class="text-gray-500 dark:text-gray-400">Bracket format:</span>
                  <span class="font-bold text-gray-900 dark:text-white">{{ totalAdvancingTeams }} teams · Starts at {{ startingKnockoutRoundName }}</span>
                </div>

                <div class="flex items-center justify-between pt-1">
                  <div>
                    <p class="text-xs font-semibold text-gray-900 dark:text-white">3rd Place Playoff</p>
                    <p class="text-[11px] text-gray-500">Include a bronze medal match for semifinal losers</p>
                  </div>
                  <USwitch v-model="config.hasThirdPlace" />
                </div>

                <div v-if="knockoutMatchups.length > 0" class="pt-2">
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-1.5">
                      <p class="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">First Round Matchups</p>
                      <UBadge v-if="isMatchupsCustomized" color="primary" variant="subtle" size="xs">Customized</UBadge>
                    </div>
                    <div class="flex items-center gap-1">
                      <UButton
                        v-if="knockoutMatchups.length > 1"
                        size="xs"
                        variant="ghost"
                        color="neutral"
                        icon="i-heroicons-arrows-right-left"
                        label="Shuffle"
                        title="Randomly pair opponents"
                        @click="shuffleKnockoutMatchups"
                      />
                      <UButton
                        v-if="isMatchupsCustomized"
                        size="xs"
                        variant="ghost"
                        color="neutral"
                        icon="i-heroicons-arrow-path"
                        label="Reset"
                        title="Restore default pairings"
                        @click="resetKnockoutMatchups"
                      />
                    </div>
                  </div>

                  <div class="space-y-2 max-h-56 overflow-y-auto pr-1">
                    <div
                      v-for="(pair, idx) in knockoutMatchups"
                      :key="idx"
                      class="p-2.5 rounded-lg bg-white dark:bg-gray-900/80 border border-gray-200/80 dark:border-white/10 shadow-xs space-y-1.5 transition-all hover:border-gray-300 dark:hover:border-white/20"
                    >
                      <div class="flex items-center justify-between">
                        <span class="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          {{ getKnockoutMatchLabel(idx) }}
                        </span>
                        <button
                          type="button"
                          class="flex items-center gap-1 text-[10px] font-medium text-gray-400 hover:text-amber-500 transition-colors cursor-pointer"
                          title="Swap Home and Away"
                          @click="swapMatchupHomeAway(idx)"
                        >
                          <UIcon name="i-heroicons-arrows-right-left" class="w-3 h-3" />
                          <span>Swap</span>
                        </button>
                      </div>

                      <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
                        <USelectMenu
                          :model-value="pair.home"
                          :items="qualifierOptions"
                          value-key="value"
                          searchable
                          :create-item="true"
                          size="xs"
                          class="w-full"
                          :ui="{ base: 'font-medium text-emerald-600 dark:text-emerald-400 text-xs' }"
                          @update:model-value="val => updateMatchupSlot(idx, 'home', val as string)"
                          @create="val => updateMatchupSlot(idx, 'home', val)"
                        />
                        <span class="text-[9px] font-bold text-gray-400 px-0.5">VS</span>
                        <USelectMenu
                          :model-value="pair.away"
                          :items="qualifierOptions"
                          value-key="value"
                          searchable
                          :create-item="true"
                          size="xs"
                          class="w-full"
                          :ui="{ base: 'font-medium text-gray-700 dark:text-gray-300 text-xs' }"
                          @update:model-value="val => updateMatchupSlot(idx, 'away', val as string)"
                          @create="val => updateMatchupSlot(idx, 'away', val)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 2: Review -->
          <div v-if="step === 2" class="space-y-5 sm:space-y-6">
            <!-- Knockout Roadmap Summary (Hybrid) -->
            <div v-if="isHybrid && config.generateKnockout" class="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-3">
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-2.5">
                  <UIcon name="i-heroicons-trophy" class="w-5 h-5 text-amber-500 shrink-0" />
                  <div>
                    <p class="text-xs font-bold text-gray-900 dark:text-white">Knockout Stage will be generated with placeholders</p>
                    <p class="text-[11px] text-gray-500 dark:text-gray-400">{{ totalAdvancingTeams }} teams (Top {{ config.advancingPerGroup }} per group) · Starts at {{ startingKnockoutRoundName }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-1.5">
                  <UBadge v-if="isMatchupsCustomized" color="primary" variant="subtle" size="xs">Custom Matchups</UBadge>
                  <UBadge color="warning" variant="subtle" size="xs">Roadmap Active</UBadge>
                </div>
              </div>

              <!-- Quick preview of first round matchups in review step -->
              <div v-if="knockoutMatchups.length > 0" class="pt-2 border-t border-amber-500/15">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                  <div
                    v-for="(pair, idx) in knockoutMatchups"
                    :key="idx"
                    class="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-white/70 dark:bg-black/30 border border-amber-500/10"
                  >
                    <span class="font-semibold text-[10px] text-gray-400 mr-1.5">{{ getKnockoutMatchLabel(idx) }}:</span>
                    <span class="font-medium text-emerald-600 dark:text-emerald-400 truncate">{{ pair.home }}</span>
                    <span class="text-[9px] text-gray-400 font-bold px-1 shrink-0">VS</span>
                    <span class="font-medium text-gray-700 dark:text-gray-300 truncate">{{ pair.away }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
               <div class="min-w-0">
                  <h4 class="font-bold text-gray-900 dark:text-white">Review Group Structure</h4>
                  <p class="text-sm text-gray-500">Verify the group structure before generating fixtures.</p>
               </div>
               <div class="self-start px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-xs font-bold sm:self-auto">
                  {{ participants.length }} Teams
               </div>
            </div>

            <!-- Group Grid (Read-only) -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 sm:p-1">
               <div 
                  v-for="(teams, label) in groupAssignments" 
                  :key="label"
                  class="flex flex-col border border-gray-100 dark:border-white/10 rounded-xl bg-white dark:bg-gray-900/50 shadow-sm transition-all"
               >
                  <div class="p-3 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 rounded-t-xl">
                     <span class="text-xs font-bold uppercase tracking-wider text-gray-500">{{ label }}</span>
                     <span class="text-[10px] font-medium text-gray-400">{{ teams.length }} Teams</span>
                  </div>
                  
                  <div class="p-2 space-y-1 min-h-[60px]">
                     <div 
                        v-for="id in teams" 
                        :key="id"
                        class="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-white/5 shadow-sm"
                     >
                        <UAvatar v-if="getParticipantById(id)?.logoUrl" :src="getParticipantById(id)?.logoUrl ?? undefined" size="xs" />
                        <span class="text-sm truncate flex-1">{{ getParticipantById(id)?.customName }}</span>
                     </div>
                     <div v-if="teams.length === 0" class="h-full flex items-center justify-center py-6">
                        <p class="text-xs text-gray-400 italic">No teams in this group</p>
                     </div>
                  </div>
               </div>
            </div>

            <!-- Unassigned Warning -->
            <div v-if="unassignedParticipants.length > 0" class="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-xl border border-orange-200 dark:border-orange-900/30 font-semibold">
               <div class="flex gap-3">
                  <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-orange-500 shrink-0" />
                  <div>
                     <p class="text-sm font-bold text-orange-800 dark:text-orange-300">Warning: {{ unassignedParticipants.length }} Teams Unassigned</p>
                     <p class="text-xs text-orange-700/80 dark:text-orange-400/80 mt-1">
                        These teams will NOT be included in the fixture generation. If this is intentional, you can proceed. Otherwise, please go back to the Groups tab to assign them.
                     </p>
                  </div>
                </div>
             </div>
          </div>
        </div>

        <!-- Step 3: Manual Schedule — split layout: fixed form + scrollable list -->
        <div v-if="step === 3" class="flex-1 min-h-0 overflow-y-auto scroll-smooth">
           <!-- Fixed form area -->
           <div class="p-4 sm:p-6 border-b border-gray-100 dark:border-white/[0.05] bg-gray-50/80 dark:bg-gray-800/30">
              <h4 class="text-sm font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">Add New Fixture</h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                 <UFormField label="Round / Matchday">
                    <USelectMenu 
                      v-model="addFixtureState.round" 
                      :items="roundOptions" 
                      value-key="value"
                      class="w-full" 
                    />
                 </UFormField>
                 
                 <UFormField label="Home Team">
                    <USelectMenu 
                      v-model="addFixtureState.homeTeamId" 
                      :items="homeParticipantOptions" 
                      value-key="value"
                      placeholder="Select team..."
                      class="w-full"
                    />
                 </UFormField>

                 <UFormField label="Away Team">
                    <USelectMenu 
                      v-model="addFixtureState.awayTeamId" 
                      :items="awayParticipantOptions" 
                      value-key="value"
                      placeholder="Select team..."
                      class="w-full"
                    />
                 </UFormField>

                 <UFormField label="Date & Time">
                    <UInput v-model="addFixtureState.startTime" type="datetime-local" class="w-full" />
                 </UFormField>

                 <UFormField label="Venue">
                    <USelectMenu 
                      v-model="addFixtureState.venue" 
                      :items="venueOptions"
                      value-key="value"
                      searchable
                      creatable
                      placeholder="Select or enter venue"
                      class="w-full"
                    />
                 </UFormField>
                 
                 <div class="flex justify-end">
                    <UButton 
                       icon="i-heroicons-plus" 
                       label="Add Fixture" 
                       @click="addManualFixture" 
                       variant="solid"
                       color="primary"
                       block
                    />
                 </div>
              </div>
           </div>

            <!-- Scrollable fixture list -->
            <div class="p-4 sm:p-6 space-y-3">
               <div class="flex items-center justify-between px-1 mb-2">
                  <span class="text-xs font-bold uppercase tracking-wider text-gray-400">Fixtures ({{ manualFixtures.length }} / {{ expectedFixturesCount }})</span>
                  <UButton v-if="manualFixtures.length > 0" size="xs" variant="ghost" color="error" icon="i-heroicons-trash" label="Clear All" @click="manualFixtures = []" />
               </div>

               <div v-if="manualFixtures.length === 0" class="text-center py-12 border-2 border-dashed border-gray-100 dark:border-white/5 rounded-2xl">
                  <UIcon name="i-heroicons-calendar" class="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p class="text-sm text-gray-500">No manual fixtures added yet.</p>
               </div>

               <UAccordion v-else :items="manualFixturesByRound" multiple>
                  <template v-for="roundData in manualFixturesByRound" :key="roundData.value" #[roundData.slot]>
                     <div class="space-y-2">
                        <div
                           v-for="item in roundData.fixtures"
                           :key="item.originalIndex"
                           class="flex items-center gap-3 sm:gap-4 p-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 rounded-xl shadow-sm group"
                        >
                           <div class="min-w-0 flex-1 flex items-center justify-center gap-2 sm:gap-4">
                              <div class="flex-1 text-right font-medium truncate">{{ getParticipantById(item.fixture.homeTeamId)?.customName }}</div>
                              <div class="text-[10px] font-bold text-gray-300 px-2 py-1 bg-gray-50 dark:bg-gray-800 rounded">VS</div>
                              <div class="flex-1 text-left font-medium truncate">{{ getParticipantById(item.fixture.awayTeamId)?.customName }}</div>
                           </div>

                           <div class="text-xs text-gray-500 min-w-[200px] hidden sm:block">
                              <div class="flex flex-col">
                                 <span>{{ new Date(item.fixture.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) }}</span>
                                 <span v-if="item.fixture.venue" class="text-[10px] text-gray-400 italic truncate max-w-[180px]">{{ item.fixture.venue }}</span>
                              </div>
                           </div>

                           <UButton
                              icon="i-heroicons-trash"
                              color="error"
                              variant="ghost"
                              size="xs"
                              class="shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                              @click="removeManualFixture(item.originalIndex)"
                           />
                        </div>
                     </div>
                  </template>
               </UAccordion>
            </div>
        </div>

        <!-- Footer (always visible) -->
        <div class="p-4 sm:p-6 border-t border-gray-100 dark:border-white/[0.05] bg-white dark:bg-gray-900 shrink-0">
          <!-- Step 1 Footer -->
          <div v-if="step === 1" class="flex justify-end">
            <UButton color="primary" @click="nextStep" size="lg" class="w-full sm:w-auto">
              <span class="sm:hidden">Next</span>
              <span class="hidden sm:inline">{{ config.schedulingMethod === 'manual' ? 'Next: Review Groups' : 'Review & Generate' }}</span>
              <template #trailing>
                <UIcon name="i-heroicons-arrow-right" />
              </template>
            </UButton>
          </div>

          <!-- Step 2 Footer -->
          <div v-if="step === 2" class="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-3 sm:flex sm:justify-between">
            <UButton color="neutral" variant="ghost" class="justify-center" @click="step = 1;">
              <span class="sm:hidden">Back</span>
              <span class="hidden sm:inline">Back to Setup</span>
            </UButton>
            <UButton 
              color="primary" 
              @click="nextStep" 
              :loading="loading"
              size="lg"
              class="justify-center"
            >
              <span class="sm:hidden">{{ config.schedulingMethod === 'manual' ? 'Next' : 'Generate' }}</span>
              <span class="hidden sm:inline">{{ config.schedulingMethod === 'manual' ? 'Next: Schedule Fixtures' : 'Finish & Generate' }}</span>
              <template #trailing>
                <UIcon :name="config.schedulingMethod === 'manual' ? 'i-heroicons-arrow-right' : 'i-heroicons-check'" />
              </template>
            </UButton>
          </div>

          <!-- Step 3 Footer -->
          <div v-if="step === 3" class="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-3 sm:flex sm:justify-between">
            <UButton color="neutral" variant="ghost" class="justify-center" @click="step = 2;" :disabled="loading">
              <span class="sm:hidden">Back</span>
              <span class="hidden sm:inline">Back to Groups</span>
            </UButton>
            <UButton 
              color="success" 
              @click="() => handleFinish()" 
              :loading="loading"
              size="lg"
              class="justify-center"
            >
              <span class="sm:hidden">Generate</span>
              <span class="hidden sm:inline">Finish & Generate Fixtures</span>
              <template #trailing>
                <UIcon name="i-heroicons-check" />
              </template>
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </UModal>

  <!-- Confirmation Modal for Incomplete Fixtures -->
  <UModal v-model:open="showConfirmFinishModal" :ui="{ content: 'sm:max-w-md' }">
    <template #content>
      <UCard :ui="{ root: 'divide-y divide-gray-100 dark:divide-gray-800' }">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white flex items-center gap-2">
              <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-amber-500" />
              Incomplete Fixtures
            </h3>
            <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark" class="-my-1" @click="showConfirmFinishModal = false;" />
          </div>
        </template>

        <div class="py-4">
          <p class="text-sm text-gray-600 dark:text-gray-300">
            You have scheduled only <span class="font-bold text-amber-500">{{ manualFixtures.length }}</span> of the <span class="font-semibold text-gray-950 dark:text-white">{{ expectedFixturesCount }}</span> expected fixtures.
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-300 mt-2">
            You can finish now and complete the remaining fixtures later from the tournament dashboard. Clicking <span class="font-semibold text-gray-950 dark:text-white">Generate Fixtures</span> will create the {{ manualFixtures.length }} fixtures you've added so far.
          </p>
        </div>

        <template #footer>
          <div class="flex items-center justify-end gap-3">
            <UButton
              color="neutral"
              variant="ghost"
              label="Go Back"
              @click="showConfirmFinishModal = false;"
              :disabled="loading"
            />
            <UButton
              color="warning"
              label="Generate Fixtures"
              :loading="loading"
              @click="handleFinish(true)"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
