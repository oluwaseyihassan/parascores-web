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
const fixtureStore = useFixtureStore()
const venueStore = useVenueStore()
const { venues } = storeToRefs(venueStore)
const toast = useToast()

const config = reactive({
  assignmentMethod: 'auto' as 'existing' | 'auto',
  numberOfGroups: props.tournament.numberOfGroups || 2,
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

// Group Assignments State
// Record<string, string[]> where keys are "Group A", "Group B", etc.
const groupAssignments = ref<Record<string, string[]>>({})

// Initialize group assignments when opening
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    step.value = 1
    
    // Check for existing groups to set initial config
    const existingGroups = props.groups || props.tournament.groups || []
    if (existingGroups.length > 0) {
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

const moveParticipant = (participantId: string, toGroup: string | null) => {
    // Manual moves disabled as per user request to keep assignments in the groups tab
}

const handleFinish = async () => {
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
      // Handle manual fixtures
      if (manualFixtures.value.length === 0) {
        toast.add({ title: 'Please add at least one fixture', color: 'error' })
        loading.value = false
        return
      }

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
      <UCard class="ring-0 shadow-none border-none overflow-hidden" :ui="{ body: 'p-0', header: 'p-0', footer: 'p-0' }">
        <!-- Header -->
        <div class="p-6 border-b border-gray-100 dark:border-white/[0.05]">
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

        <div class="p-8 max-h-[calc(100dvh-200px)] overflow-y-auto">
          <!-- Step 1: Config -->
          <div v-if="step === 1" class="max-w-md mx-auto space-y-6">
            <div class="bg-primary-50/50 dark:bg-primary-950/20 p-4 rounded-xl border border-primary-100 dark:border-primary-900/30 mb-8">
              <p class="text-sm text-primary-700 dark:text-primary-300">
                Configure your group stage structure. You can use existing assignments or auto-generate new ones.
              </p>
            </div>

            <UFormField label="Setup Method" required>
               <URadioGroup
                  v-model="config.assignmentMethod"
                  :items="[
                     { label: 'Use Existing Groups', value: 'existing', description: 'Use the groups and assignments already set up.', icon: 'i-heroicons-rectangle-group', disabled: !(props.groups?.length || props.tournament.groups?.length) },
                     { label: 'Auto-Generate & Distribute', value: 'auto', description: 'Automatically create groups and distribute teams.', icon: 'i-heroicons-sparkles' }
                  ]"
               />
            </UFormField>

            <UFormField v-if="config.assignmentMethod === 'auto'" label="Number of Groups" required>
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

            <div class="pt-8 pb-12 flex justify-end">
              <UButton color="primary" @click="nextStep" size="lg">
                {{ config.schedulingMethod === 'manual' ? 'Next: Review Groups' : 'Review & Generate' }}
                <template #trailing>
                  <UIcon name="i-heroicons-arrow-right" />
                </template>
              </UButton>
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

            <div class="pt-8 pb-12 flex justify-between border-t border-gray-100 dark:border-white/[0.05]">
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
          </div>

      <!-- Step 3: Manual Schedule -->
      <div v-if="step === 3" class="space-y-6">
         <div class="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-100 dark:border-white/5">
            <h4 class="text-sm font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">Add New Fixture</h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-end">
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

         <div class="space-y-3 px-1">
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

         <div class="pt-8 pb-12 flex justify-between border-t border-gray-100 dark:border-white/[0.05]">
            <UButton color="neutral" variant="ghost" @click="step = 2" :disabled="loading">Back to Groups</UButton>
            <UButton 
              color="success" 
              @click="handleFinish" 
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
      </UCard>
    </template>
  </UModal>
</template>
