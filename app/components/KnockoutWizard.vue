<script setup lang="ts">
import type { Participant, Tournament, Fixture } from '~/types'
import { TournamentType, FixtureStage } from '~/types'

interface Props {
  open?: boolean
  tournament: Tournament
  participants: Participant[]
}

const props = defineProps<Props>()
const emit = defineEmits(['update:open', 'generated'])

const fixtureStore = useFixtureStore()
const { handleError } = useErrors()
const toast = useToast()

// Wizard State
const step = ref(1)
const loading = ref(false)

const isModalOpen = computed({
  get: () => props.open || false,
  set: (val) => emit('update:open', val)
})

const config = reactive({
  bracketSize: 2,
  startDate: new Date().toISOString().split('T')[0],
  intervalMinutes: 60,
  shuffleParticipants: false
})

const selectedParticipantIds = ref<string[]>([])
const bracketAssignments = ref<string[]>([]) // Array of participant IDs mapped to bracket slots

// Reset wizard when opened
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    step.value = 1
    
    // Calculate ideal bracket size based on participants
    const count = props.participants.length
    if (count <= 2) config.bracketSize = 2
    else if (count <= 4) config.bracketSize = 4
    else if (count <= 8) config.bracketSize = 8
    else if (count <= 16) config.bracketSize = 16
    else config.bracketSize = 32

    selectedParticipantIds.value = []
    bracketAssignments.value = new Array(config.bracketSize).fill('bye')
  }
})

// Step 1 -> Step 2
const goToSelection = () => {
  if (props.participants.length < 2) {
    toast.add({ 
      title: 'Not enough teams', 
      description: 'You need at least 2 teams to create a bracket.', 
      color: 'error' 
    })
    return
  }
  step.value = 2
}

// Step 2 -> Step 3
const goToPairing = () => {
  if (selectedParticipantIds.value.length < 2) {
    toast.add({ 
      title: 'Selection required', 
      description: 'Please select at least 2 teams.', 
      color: 'error' 
    })
    return
  }
  
  if (selectedParticipantIds.value.length > config.bracketSize) {
    toast.add({ 
      title: 'Too many teams', 
      description: `You can only select up to ${config.bracketSize} teams for this bracket size.`, 
      color: 'error' 
    })
    return
  }
  
  // Initialize bracket assignments with selected teams or empty strings
  // We need enough slots for a perfect bracket (bracketSize)
  const slots = new Array(config.bracketSize).fill('bye')
  
  // Try to preserve existing assignments if they are still in the selection
  const currentSelections = new Set(selectedParticipantIds.value)
  for (let i = 0; i < config.bracketSize; i++) {
    const existing = bracketAssignments.value[i];
    if (existing && existing !== 'bye' && currentSelections.has(existing)) {
      slots[i] = existing
    }
  }
  
  // Fill empty slots with remaining selections automatically for convenience
  const assigned = new Set(slots.filter(id => id && id !== 'bye'))
  const remaining = selectedParticipantIds.value.filter(id => !assigned.has(id))
  
  let rIdx = 0
  for (let i = 0; i < config.bracketSize; i++) {
    if (slots[i] === 'bye' && rIdx < remaining.length) {
      slots[i] = remaining[rIdx++]
    }
  }
  
  bracketAssignments.value = slots
  step.value = 3
}

const closeWizard = () => {
  emit('update:open', false)
}

// Final Submit
const handleFinish = async () => {
  loading.value = true
  try {
    // Map 'bye' back to empty string for backend
    const orderedParticipantIds = bracketAssignments.value.map(id => id === 'bye' ? '' : id)
    
    if (props.tournament.type === TournamentType.HYBRID) {
      // In hybrid, we "Advance" to knockout
      // We pass both selected teams and their manual order
      await fixtureStore.advanceToKnockout(props.tournament.id, selectedParticipantIds.value, orderedParticipantIds)
    } else {
      // In standard knockout, we just generate
      await fixtureStore.generateFixtures(props.tournament.id, {
        clearExisting: true,
        shuffleParticipants: false,
        startDate: config.startDate,
        intervalMinutes: config.intervalMinutes,
        groupAssignments: { 'knockout': orderedParticipantIds }
      })
    }
    
    toast.add({ title: 'Brackets Created', color: 'success' })
    emit('generated')
    closeWizard()
  } catch (error: any) {
    handleError(error, { title: 'Failed to create brackets' })
  } finally {
    loading.value = false
  }
}

// Helpers for Pairing Step
const shufflePairings = () => {
  const currentSlots = [...bracketAssignments.value]
  const filledIds = currentSlots.filter(id => id !== '' && id !== 'bye')
  
  // Fisher-Yates shuffle
  for (let i = filledIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = filledIds[i]!;
    filledIds[i] = filledIds[j]!;
    filledIds[j] = temp;
  }
  
  // Put them back into the filled slots
  let fIdx = 0
  const newSlots: string[] = currentSlots.map(id => (id !== '' && id !== 'bye') ? (filledIds[fIdx++] || '') : id)
  bracketAssignments.value = newSlots
  
  toast.add({ title: 'Pairings Shuffled', icon: 'i-heroicons-arrows-right-left', color: 'neutral' })
}

const getParticipantOptions = () => {
  const selections = new Set(selectedParticipantIds.value)
  
  const options = props.participants
    .filter(p => selections.has(p.id))
    .map(p => ({
      label: p.customName || p.user?.name || p.team?.name || 'Unnamed',
      value: p.id
    }))
    
  // Add an "Empty / Bye" option
  options.unshift({ label: 'Empty (Bye)', value: 'bye' })
  
  return options
}

const handlePairingChange = (newId: string, index: number) => {
  if (newId === 'bye' || newId === '') {
    bracketAssignments.value[index] = 'bye'
    return
  }

  // Check if this ID is already assigned ELSEWHERE
  const existingIndex = bracketAssignments.value.findIndex((id, idx) => id === newId && idx !== index)
  
  if (existingIndex !== -1) {
    // SWAP!
    const oldId = bracketAssignments.value[index]!
    bracketAssignments.value[existingIndex] = oldId
  }
  
  bracketAssignments.value[index] = newId
}

const getMatchLabel = (index: number) => {
  const matchNum = Math.floor(index / 2) + 1
  const side = index % 2 === 0 ? 'Home' : 'Away'
  return `Match ${matchNum} (${side})`
}

// Computed for Preview
const previewFixturesByRound = computed(() => {
  // Mock fixtures for Bracket Preview
  const mockFixtures: Fixture[] = []
  
  // Only first round for manual setup preview
  for (let i = 0; i < config.bracketSize; i += 2) {
    const homeId = bracketAssignments.value[i]
    const awayId = bracketAssignments.value[i+1]
    
    const home = props.participants.find(p => p.id === homeId)
    const away = props.participants.find(p => p.id === awayId)
    
    mockFixtures.push({
      id: `preview-${i}`,
      tournament_id: props.tournament.id,
      round: 1,
      matchNumber: (i / 2) + 1,
      homeTeamId: homeId || null,
      awayTeamId: awayId || null,
      homeTeam: home as any,
      awayTeam: away as any,
      status: 'SCHEDULED' as any,
      stage: FixtureStage.KNOCKOUT
    } as any)
  }
  
  return { 1: mockFixtures }
})

</script>

<template>
  <UModal 
    v-model:open="isModalOpen"
    :ui="{ content: 'sm:max-w-2xl bg-transparent shadow-none border-0' }"
  >
    <template #content>
      <div class="bg-white dark:bg-gray-900 shadow-2xl rounded-xl overflow-hidden border border-gray-100 dark:border-white/[0.05]">
        <!-- Header -->
        <div class="p-6 border-b border-gray-100 dark:border-white/[0.05]">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold text-gray-900 dark:text-white">Knockout Bracket Setup</h3>
            <UButton color="neutral" variant="ghost" icon="i-heroicons-x-mark" @click="closeWizard" />
          </div>
          
          <!-- Progress Steps -->
          <div class="mt-4 flex items-center justify-center gap-4">
            <div v-for="i in 3" :key="i" class="flex items-center">
               <div 
                 class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
                 :class="step >= i ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-white/[0.05] text-gray-400'"
               >
                 {{ i }}
               </div>
               <div v-if="i < 3" class="w-12 h-px bg-gray-200 dark:bg-white/[0.1] mx-2"></div>
            </div>
          </div>
        </div>

        <div class="p-6">
          <!-- Step 1: Structure -->
          <div v-if="step === 1" class="space-y-6">
          <div class="text-center mb-4">
            <h4 class="font-medium text-gray-900 dark:text-white">Define Tournament Structure</h4>
            <p class="text-sm text-gray-500">Pick how many teams will start in the knockout phase.</p>
          </div>

          <UFormField label="Bracket Starting Size" description="Total slots in the first knockout round">
            <USelect
              v-model.number="config.bracketSize"
              :items="[
                { label: 'Round of 32 (32 Teams)', value: 32 },
                { label: 'Round of 16 (16 Teams)', value: 16 },
                { label: 'Quarter-Finals (8 Teams)', value: 8 },
                { label: 'Semi-Finals (4 Teams)', value: 4 },
                { label: 'Finals (2 Teams)', value: 2 }
              ].filter(opt => opt.value <= 32 && (opt.value >= props.participants.length / 2))"
              value-key="value"
            />
          </UFormField>

          <!-- Settings Information -->
          <div class="grid grid-cols-2 gap-4">
            <div class="p-3 rounded-lg border border-gray-100 dark:border-white/[0.05] bg-gray-50/50 dark:bg-white/[0.02]">
              <div class="text-[10px] uppercase font-bold text-gray-400 mb-1">Knockout Format</div>
              <div class="flex items-center gap-2">
                <UIcon 
                  :name="tournament.twoLegsKnockout ? 'i-heroicons-check-circle-solid' : 'i-heroicons-x-circle'" 
                  class="w-4 h-4"
                  :class="tournament.twoLegsKnockout ? 'text-green-500' : 'text-gray-400'"
                />
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ tournament.twoLegsKnockout ? 'Two-legged Matches' : 'Single Match' }}
                </span>
              </div>
            </div>

            <div class="p-3 rounded-lg border border-gray-100 dark:border-white/[0.05] bg-gray-50/50 dark:bg-white/[0.02]">
              <div class="text-[10px] uppercase font-bold text-gray-400 mb-1">Extra Matches</div>
              <div class="flex items-center gap-2">
                <UIcon 
                  :name="tournament.thirdPlaceMatch ? 'i-heroicons-check-circle-solid' : 'i-heroicons-x-circle'" 
                  class="w-4 h-4"
                  :class="tournament.thirdPlaceMatch ? 'text-green-500' : 'text-gray-400'"
                />
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ tournament.thirdPlaceMatch ? 'Third Place Play-off' : 'No Third Place' }}
                </span>
              </div>
            </div>
          </div>

          <div class="flex items-start gap-2 p-3 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
            <UIcon name="i-heroicons-information-circle" class="w-5 h-5 mt-0.5" />
            <p class="text-xs">
              These settings are based on the global tournament configuration. 
              To change them, please visit the <strong>Tournament Settings</strong> page.
            </p>
          </div>

          <div class="pt-4 flex justify-end">
            <UButton color="primary" @click="goToSelection">
              Next: Select Teams
              <template #trailing>
                <UIcon name="i-heroicons-arrow-right" />
              </template>
            </UButton>
          </div>
        </div>

        <!-- Step 2: Selection -->
        <div v-if="step === 2" class="space-y-6">
          <div class="text-center mb-4">
            <h4 class="font-medium text-gray-900 dark:text-white">Select Participating Teams</h4>
            <p class="text-sm text-gray-500">Choose the {{ config.bracketSize }} teams that will play in the brackets.</p>
          </div>

          <div class="max-h-80 overflow-y-auto p-2 border border-gray-100 dark:border-white/[0.05] rounded-lg">
             <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
               <div 
                 v-for="p in participants" 
                 :key="p.id"
                 class="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-white/[0.02] cursor-pointer"
                 @click="selectedParticipantIds.includes(p.id) ? selectedParticipantIds = selectedParticipantIds.filter(id => id !== p.id) : (selectedParticipantIds.length < config.bracketSize && selectedParticipantIds.push(p.id))"
               >
                 <UCheckbox :model-value="selectedParticipantIds.includes(p.id)" />
                 <UAvatar v-if="p.logoUrl" :src="p.logoUrl" size="xs" />
                 <span class="text-sm truncate">{{ p.customName || p.user?.name || p.team?.name }}</span>
               </div>
             </div>
          </div>

          <div class="flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
             <span class="text-sm font-medium text-indigo-700 dark:text-indigo-300">
               Teams Selected: {{ selectedParticipantIds.length }} / {{ config.bracketSize }}
             </span>
             <UButton size="xs" variant="ghost" color="primary" @click="selectedParticipantIds = []">Clear All</UButton>
          </div>

          <div class="pt-4 flex justify-between">
            <UButton color="neutral" variant="ghost" @click="step = 1">Back</UButton>
            <UButton color="primary" @click="goToPairing">
              Next: Match Pairing
              <template #trailing>
                <UIcon name="i-heroicons-arrow-right" />
              </template>
            </UButton>
          </div>
        </div>

        <!-- Step 3: Pairing -->
        <div v-if="step === 3" class="space-y-6">
          <div class="flex items-center justify-between mb-4">
            <div class="text-center flex-1">
              <h4 class="font-medium text-gray-900 dark:text-white">Match Pairing</h4>
              <p class="text-sm text-gray-500">Assign teams to their specific starting positions.</p>
            </div>
            <UButton 
              size="xs" 
              variant="soft" 
              color="neutral" 
              icon="i-heroicons-arrows-right-left" 
              label="Shuffle" 
              @click="shufflePairings"
            />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 max-h-96 overflow-y-auto pr-2 py-2">
             <div v-for="i in config.bracketSize" :key="i" class="space-y-2">
               <div class="flex items-center justify-between px-1">
                 <label class="text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                   {{ getMatchLabel(i-1) }}
                 </label>
                 <span v-if="bracketAssignments[i-1] === 'bye'" class="text-[10px] font-medium text-amber-500 uppercase">Will be a Bye</span>
               </div>
               <USelectMenu
                 :model-value="bracketAssignments[i-1]"
                 @update:model-value="val => handlePairingChange(val as string, i-1)"
                 :items="getParticipantOptions()"
                 value-key="value"
                 placeholder="Select team..."
                 class="w-full"
                 :ui="{ 
                   base: (bracketAssignments[i-1] && bracketAssignments[i-1] !== 'bye') ? 'border-indigo-100 dark:border-indigo-900/30' : 'border-dashed border-gray-200 dark:border-white/10'
                 }"
               />
             </div>
          </div>

          <div class="pt-4 flex justify-between border-t border-gray-100 dark:border-white/[0.05]">
            <UButton color="neutral" variant="ghost" @click="step = 2" :disabled="loading">Back</UButton>
            <UButton color="success" @click="handleFinish" :loading="loading">
              Finish & Generate Bracket
              <template #trailing>
                <UIcon name="i-heroicons-check" />
              </template>
            </UButton>
          </div>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
