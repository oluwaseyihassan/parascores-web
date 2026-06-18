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
const toast = useToast()

// LocalStorage key scoped to this tournament
const STORAGE_KEY = `gsw-progress-${props.tournament.id}`

const config = reactive({
  assignmentMethod: 'auto' as 'existing' | 'auto',
  numberOfGroups: props.tournament.type === TournamentType.ROUND_ROBIN ? 1 : (props.tournament.numberOfGroups || 2),
  startDate: props.tournament.start_date ? new Date(props.tournament.start_date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
  intervalMinutes: 90,
  shuffleParticipants: false,
  schedulingMethod: 'auto' as 'auto' | 'manual'
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
    return true
  } catch {
    return false
  }
}

const clearProgress = () => {
  try { localStorage.removeItem(STORAGE_KEY) } catch {}
}

// Auto-save whenever key state changes
watch([step, config, groupAssignments, manualFixtures], () => {
  if (props.open) saveProgress()
}, { deep: true })

const venueOptions = computed(() => {
  return venues.value.map(v => ({ label: v.name, value: v.name }))
})

const roundOptions = computed(() => {
  const teamsCount = props.participants.length
  const groupsCount = config.numberOfGroups
  if (!groupsCount || teamsCount <= 1) return [{ label: 'Group 1', value: 1 }]
  
  const avgTeamsPerGroup = Math.ceil(teamsCount / groupsCount)
  
  // Single Round Robin: N-1 if even, N if odd
  let expectedRounds = avgTeamsPerGroup % 2 === 0 ? avgTeamsPerGroup - 1 : avgTeamsPerGroup
  
  // Double the rounds if tournament is double round robin
  if (props.tournament.doubleRoundRobin) {
    expectedRounds *= 2
  }
  
  // Return exactly the expected number of matchdays
  const count = Math.max(1, expectedRounds)
  return Array.from({ length: count }, (_, i) => ({ label: `Group ${i + 1}`, value: i + 1 }))
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

    // Initialize groups
    initializeGroups()
  }
})

// Re-initialize groups if essential config changes
watch([() => config.assignmentMethod, () => config.numberOfGroups, () => config.shuffleParticipants], () => {
    initializeGroups()
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
      // Reset add fixture time to tournament start date by default
      addFixtureState.startTime = config.startDate
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
        startDate: config.startDate,
        intervalMinutes: config.intervalMinutes,
        numberOfGroups: config.numberOfGroups,
        groupAssignments: groupAssignments.value,
        shuffleParticipants: false, 
        clearExisting: true
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
          startTime: f.startTime,
          venue: f.venue,
          roundName: `Group ${f.round}`,
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
    // Error handled by store/toast
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
      const endDate = new Date(props.tournament.end_date)
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
  <UModal :open="open" @update:open="closeWizard" :ui="{ content: 'sm:max-w-3xl' }">
    <template #content>
      <div class="flex flex-col overflow-hidden" style="max-height: 100dvh;">
        <!-- Header -->
        <!-- Header (always visible) -->
        <div class="p-6 border-b border-gray-100 dark:border-white/[0.05] shrink-0">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold text-gray-900 dark:text-white">Group Stage Setup</h3>
            <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark" @click="closeWizard" />
          </div>
          
          <!-- Stepper -->
          <div class="mt-6 flex items-center justify-center">
            <div class="flex items-center gap-4">
              <div class="flex items-center gap-2">
                <div :class="[
                  'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all',
                  step >= 1 ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                ]">1</div>
                <span :class="['text-sm font-medium', step >= 1 ? 'text-gray-900 dark:text-white' : 'text-gray-400']">General</span>
              </div>
              <div class="w-12 h-px bg-gray-100 dark:bg-gray-800"></div>
              <div class="flex items-center gap-2">
                <div :class="[
                  'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all',
                  step >= 2 ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                ]">2</div>
                <span :class="['text-sm font-medium', step >= 2 ? 'text-gray-900 dark:text-white' : 'text-gray-400']">Groups</span>
              </div>
              <div class="w-12 h-px bg-gray-100 dark:bg-gray-800"></div>
              <div class="flex items-center gap-2">
                <div :class="[
                  'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all',
                  step >= 3 ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                ]">3</div>
                <span :class="['text-sm font-medium', step >= 3 ? 'text-gray-900 dark:text-white' : 'text-gray-400']">Schedule</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Steps 1 & 2: normal scrollable body -->
        <!-- Steps 1 & 2: scrollable body -->
        <div v-if="step !== 3" class="p-8 flex-1 min-h-0 overflow-y-auto scroll-smooth">
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
          </div>

          <!-- Step 2: Review -->
          <div v-if="step === 2" class="space-y-6">
            <div class="flex items-center justify-between">
               <div>
                  <h4 class="font-bold text-gray-900 dark:text-white">Review Group Structure</h4>
                  <p class="text-sm text-gray-500">Verify the group structure before generating fixtures.</p>
               </div>
               <div class="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-xs font-bold">
                  {{ participants.length }} Teams
               </div>
            </div>

            <!-- Group Grid (Read-only) -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
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
        <div v-if="step === 3" class="flex flex-col flex-1 min-h-0">
           <!-- Fixed form area -->
           <div class="p-6 border-b border-gray-100 dark:border-white/[0.05] bg-gray-50/80 dark:bg-gray-800/30 shrink-0">
              <h4 class="text-sm font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">Add New Fixture</h4>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                 <UFormField label="Round / Group">
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
           <div class="flex-1 overflow-y-auto scroll-smooth p-6 space-y-3">
              <div class="flex items-center justify-between px-1 mb-2">
                 <span class="text-xs font-bold uppercase tracking-wider text-gray-400">Fixtures ({{ manualFixtures.length }} / {{ expectedFixturesCount }})</span>
                 <UButton v-if="manualFixtures.length > 0" size="xs" variant="ghost" color="error" icon="i-heroicons-trash" label="Clear All" @click="manualFixtures = []" />
              </div>

              <div v-if="manualFixtures.length === 0" class="text-center py-12 border-2 border-dashed border-gray-100 dark:border-white/5 rounded-2xl">
                 <UIcon name="i-heroicons-calendar" class="w-10 h-10 text-gray-300 mx-auto mb-2" />
                 <p class="text-sm text-gray-500">No manual fixtures added yet.</p>
              </div>

              <div 
                 v-for="(f, index) in manualFixtures" 
                 :key="index"
                 class="flex items-center gap-4 p-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 rounded-xl shadow-sm group"
              >
                 <div class="flex flex-col items-center justify-center px-4 border-r border-gray-100 dark:border-white/5">
                    <span class="text-[10px] font-bold text-gray-400 uppercase">MD</span>
                    <span class="text-lg font-black text-primary-500">{{ f.round }}</span>
                 </div>

                 <div class="flex-1 flex items-center justify-center gap-4">
                    <div class="flex-1 text-right font-medium truncate">{{ getParticipantById(f.homeTeamId)?.customName }}</div>
                    <div class="text-[10px] font-bold text-gray-300 px-2 py-1 bg-gray-50 dark:bg-gray-800 rounded">VS</div>
                    <div class="flex-1 text-left font-medium truncate">{{ getParticipantById(f.awayTeamId)?.customName }}</div>
                 </div>

                 <div class="text-xs text-gray-500 min-w-[200px] hidden sm:block">
                    <div class="flex flex-col">
                       <span>{{ new Date(f.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) }}</span>
                       <span v-if="f.venue" class="text-[10px] text-gray-400 italic truncate max-w-[180px]">{{ f.venue }}</span>
                    </div>
                 </div>

                 <UButton 
                    icon="i-heroicons-trash" 
                    color="error" 
                    variant="ghost" 
                    size="xs" 
                    class="opacity-0 group-hover:opacity-100 transition-opacity"
                    @click="removeManualFixture(index)"
                 />
              </div>
           </div>
        </div>

        <!-- Footer (always visible) -->
        <div class="p-6 border-t border-gray-100 dark:border-white/[0.05] bg-white dark:bg-gray-900 shrink-0">
          <!-- Step 1 Footer -->
          <div v-if="step === 1" class="flex justify-end">
            <UButton color="primary" @click="nextStep" size="lg">
              {{ config.schedulingMethod === 'manual' ? 'Next: Review Groups' : 'Review & Generate' }}
              <template #trailing>
                <UIcon name="i-heroicons-arrow-right" />
              </template>
            </UButton>
          </div>

          <!-- Step 2 Footer -->
          <div v-if="step === 2" class="flex justify-between">
            <UButton color="neutral" variant="ghost" @click="step = 1">Back to Setup</UButton>
            <UButton 
              color="primary" 
              @click="nextStep" 
              :loading="loading"
              size="lg"
            >
              {{ config.schedulingMethod === 'manual' ? 'Next: Schedule Fixtures' : 'Finish & Generate' }}
              <template #trailing>
                <UIcon :name="config.schedulingMethod === 'manual' ? 'i-heroicons-arrow-right' : 'i-heroicons-check'" />
              </template>
            </UButton>
          </div>

          <!-- Step 3 Footer -->
          <div v-if="step === 3" class="flex justify-between">
            <UButton color="neutral" variant="ghost" @click="step = 2" :disabled="loading">Back to Groups</UButton>
            <UButton 
              color="success" 
              @click="() => handleFinish()" 
              :loading="loading"
              size="lg"
            >
              Finish & Generate Fixtures
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
            <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark" class="-my-1" @click="showConfirmFinishModal = false" />
          </div>
        </template>

        <div class="py-4">
          <p class="text-sm text-gray-600 dark:text-gray-300">
            You have scheduled only <span class="font-bold text-amber-500">{{ manualFixtures.length }}</span> of the <span class="font-semibold text-gray-950 dark:text-white">{{ expectedFixturesCount }}</span> expected fixtures.
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-300 mt-2">
            Finishing now will leave the tournament stage incomplete. Are you sure you want to finish and generate?
          </p>
        </div>

        <template #footer>
          <div class="flex items-center justify-end gap-3">
            <UButton 
              color="neutral" 
              variant="ghost" 
              label="Go Back" 
              @click="showConfirmFinishModal = false" 
              :disabled="loading"
            />
            <UButton 
              color="warning" 
              label="Finish & Generate"
              :loading="loading"
              @click="handleFinish(true)"
            />
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
