<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { Visibility, TournamentType, ParticipantType, ParticipantStatus, FixtureStatus } from '~/types'
import type { Participant, Fixture } from '~/types'

definePageMeta({
  layout: 'dashboard'
})

const route = useRoute()
const tournamentStore = useTournamentStore()
const participantStore = useParticipantStore()
const fixtureStore = useFixtureStore()
const standingStore = useStandingStore()
const { currentTournament: tournament, loading, error } = storeToRefs(tournamentStore)
const { participants, loading: participantsLoading } = storeToRefs(participantStore)
const { fixtures, fixturesByRound, rounds, loading: fixturesLoading, generating } = storeToRefs(fixtureStore)
const { standings, loading: standingsLoading } = storeToRefs(standingStore)

// Fetch tournament, participants, and fixtures on mount
const tournamentId = computed(() => route.params.id as string)

onMounted(async () => {
  if (tournamentId.value) {
    await Promise.all([
      tournamentStore.fetchTournament(tournamentId.value),
      participantStore.fetchParticipants(tournamentId.value),
      fixtureStore.fetchFixtures(tournamentId.value),
      standingStore.fetchStandings(tournamentId.value)
    ])
  }
})

// Check if standings should be shown
const showStandings = computed(() => {
  if (!tournament.value) return false
  return [TournamentType.ROUND_ROBIN, TournamentType.GROUP].includes(tournament.value.type)
})

// Generate fixtures
const generateError = ref<string | null>(null)
const showGenerateModal = ref(false)
const generateConfig = reactive({
  teamsPerGroup: null as number | null,
  numberOfGroups: null as number | null,
  doubleRoundRobin: false
})

const openGenerateModal = () => {
  // Reset config
  generateConfig.teamsPerGroup = null
  generateConfig.numberOfGroups = null
  generateConfig.doubleRoundRobin = false
  generateError.value = null
  
  // If not a group or round robin tournament, proceed directly
  if (tournament.value?.type !== TournamentType.GROUP && tournament.value?.type !== TournamentType.ROUND_ROBIN) {
    handleGenerateFixtures()
  } else {
    showGenerateModal.value = true
  }
}

const handleGenerateFixtures = async () => {
  if (participants.value.length < 2) {
    generateError.value = 'At least 2 participants are required to generate fixtures'
    return
  }
  
  
  generateError.value = null
  try {
    await fixtureStore.generateFixtures(tournamentId.value, {
      teamsPerGroup: generateConfig.teamsPerGroup || undefined,
      numberOfGroups: generateConfig.numberOfGroups || undefined,
      doubleRoundRobin: generateConfig.doubleRoundRobin
    })
    
    showGenerateModal.value = false
    
    // Auto-refresh fixtures
    await fixtureStore.fetchFixtures(tournamentId.value)
    
    // Refresh standings if applicable
    if (showStandings.value) {
      await standingStore.fetchStandings(tournamentId.value)
    }
    
    // Show success toast
    const toast = useToast()
    toast.add({
      title: 'Fixtures Generated',
      description: 'Fixtures have been successfully generated and refreshed.',
      icon: 'i-heroicons-check-circle',
      color: 'success'
    })
  } catch (err: any) {
    generateError.value = err?.data?.message || err?.message || 'Failed to generate fixtures'
  }
}

// Fixture status colors
const fixtureStatusColors: Record<FixtureStatus, 'info' | 'success' | 'warning' | 'neutral'> = {
  [FixtureStatus.SCHEDULED]: 'info',
  [FixtureStatus.LIVE]: 'warning',
  [FixtureStatus.COMPLETED]: 'success',
  [FixtureStatus.CANCELLED]: 'neutral'
}



// Add participant modal
const showAddModal = ref(false)
const addingParticipant = ref(false)
const addError = ref<string | null>(null)

const addParticipantSchema = z.object({
  customName: z.string().min(1, 'Name is required').max(100),
  seed: z.number().positive().optional().nullable(),
  logoUrl: z.string().optional().nullable()
})

type AddParticipantSchema = z.output<typeof addParticipantSchema>

const addParticipantState = reactive<Partial<AddParticipantSchema>>({
  customName: '',
  seed: null,
  logoUrl: null
})

// Logo upload state
const logoFileInput = ref<HTMLInputElement | null>(null)
const logoFile = ref<File | null>(null)
const logoPreview = ref<string | null>(null)
const uploadingLogo = ref(false)

const triggerLogoInput = () => {
  logoFileInput.value?.click()
}

const handleLogoChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return
  
  // Validate file type
  if (!file.type.startsWith('image/')) {
    addError.value = 'Please select an image file'
    return
  }
  
  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    addError.value = 'Image must be less than 5MB'
    return
  }
  
  // Clear error
  addError.value = null
  
  logoFile.value = file
  logoPreview.value = URL.createObjectURL(file)
}

// Participant Management
const newParticipantName = ref('')
const selectedParticipant = ref<Participant | null>(null)
const showManagePlayersModal = ref(false)
const newPlayer = reactive({
  name: '',
  number: null as number | null,
  position: 'FWD'
})
const positions = ['GK', 'DEF', 'MID', 'FWD']

const openManagePlayers = async (participant: Participant) => {
  selectedParticipant.value = participant
  newPlayer.name = ''
  newPlayer.number = null
  newPlayer.position = 'FWD'
  showManagePlayersModal.value = true
  
  // Fetch players on open
  try {
    await participantStore.fetchPlayers(tournamentId.value, participant.id)
  } catch (e) {
    // Silent fail or toast
  }
}

const handleAddPlayer = async () => {
  if (!selectedParticipant.value || !newPlayer.name) return
  
  try {
    await participantStore.addPlayer(tournamentId.value, selectedParticipant.value.id, {
      name: newPlayer.name,
      number: newPlayer.number,
      position: newPlayer.position
    })
    
    // Reset form
    newPlayer.name = ''
    newPlayer.number = null
    newPlayer.position = 'FWD'
    
    useToast().add({ title: 'Player added successfully', color: 'success' })
  } catch (error) {
    // Error handled by store
  }
}

const removeParticipant = async (participantId: string) => {
  if (!confirm('Are you sure you want to remove this participant?')) return
  
  try {
    await participantStore.removeParticipant(participantId)
    useToast().add({ title: 'Participant removed successfully', color: 'success' })
  } catch (error: any) {
    useToast().add({ 
      title: 'Failed to remove participant', 
      description: error.message || 'Unknown error', 
      color: 'error' 
    })
  }
}



const removeLogo = () => {
  logoFile.value = null
  logoPreview.value = null
  if (logoFileInput.value) {
    logoFileInput.value.value = ''
  }
}

const resetAddForm = () => {
  addParticipantState.customName = ''
  addParticipantState.seed = null
  addParticipantState.logoUrl = null
  removeLogo()
  addError.value = null
}

const openAddModal = () => {
  resetAddForm()
  showAddModal.value = true
}

const handleAddParticipant = async (event: FormSubmitEvent<AddParticipantSchema>) => {
  addingParticipant.value = true
  addError.value = null
  
  try {
    let logoUrl: string | null = null
    
    // Upload logo if selected
    if (logoFile.value) {
      // Use internal upload endpoint or similar logic
      const formData = new FormData()
      formData.append('file', logoFile.value)
      
      const uploadResponse = await $api<{success: boolean, data: { url: string }, message: string}>('/upload/image?folder=participants', {
        method: 'POST',
        body: formData
      })
      
      if (uploadResponse.data?.url) {
        logoUrl = uploadResponse.data.url
      }
    }
    
    await participantStore.addParticipant(tournamentId.value, {
      customName: event.data.customName,
      seed: event.data.seed,
      logoUrl: logoUrl
    })
    showAddModal.value = false
    resetAddForm()
  } catch (err: any) {
    addError.value = err?.data?.message || err?.message || 'Failed to add participant'
  } finally {
    addingParticipant.value = false
  }
}

// Status badge colors
const statusColors: Record<ParticipantStatus, 'success' | 'warning' | 'error' | 'neutral'> = {
  [ParticipantStatus.CONFIRMED]: 'success',
  [ParticipantStatus.PENDING]: 'warning',
  [ParticipantStatus.DECLINED]: 'error',
  [ParticipantStatus.DISQUALIFIED]: 'neutral'
}

// Format date for display
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

// Tournament status
const tournamentStatus = computed(() => {
  if (!tournament.value) return null
  const now = new Date()
  const start = new Date(tournament.value.start_date)
  const end = new Date(tournament.value.end_date)
  
  if (now < start) return { label: 'Upcoming', color: 'info' as const }
  if (now > end) return { label: 'Completed', color: 'neutral' as const }
  return { label: 'Active', color: 'success' as const }
})

// Type labels
const typeLabels: Record<TournamentType, string> = {
  [TournamentType.KNOCKOUT]: 'Knockout',
  [TournamentType.ROUND_ROBIN]: 'Round Robin',
  [TournamentType.GROUP]: 'Group Stage'
}

const participantLabels: Record<ParticipantType, string> = {
  [ParticipantType.TEAM]: 'Teams',
  [ParticipantType.INDIVIDUAL]: 'Individuals'
}

const visibilityLabels: Record<Visibility, { label: string; icon: string }> = {
  [Visibility.PUBLIC]: { label: 'Public', icon: 'i-heroicons-globe-alt' },
  [Visibility.UNLISTED]: { label: 'Unlisted', icon: 'i-heroicons-eye-slash' },
  [Visibility.PRIVATE]: { label: 'Private', icon: 'i-heroicons-lock-closed' }
}

// Placeholder images
const PLACEHOLDER_LOGO = 'https://res.cloudinary.com/djsnerfzp/image/upload/v1769695792/parascores_logo_placeholder.png'
const PLACEHOLDER_BANNER = 'https://res.cloudinary.com/djsnerfzp/image/upload/v1769696842/parascores_banner_placeholder.png'

// Accordion items for fixtures
const accordionItems = computed(() => {
  return rounds.value.map(round => {
    const roundFixtures = fixturesByRound.value[round] || []
    const total = roundFixtures.length
    const completed = roundFixtures.filter(f => f.status === FixtureStatus.COMPLETED).length
    const live = roundFixtures.filter(f => f.status === FixtureStatus.LIVE).length
    
    let label = fixtureStore.getRoundDisplayName(round)
    
    let stats = ''
    const parts = []
    if (live > 0) parts.push(`🔴 ${live} Live`)
    if (completed > 0) parts.push(`${completed}/${total} Completed`)
    else if (total > 0) parts.push(`${total} Scheduled`)
    
    if (parts.length > 0) {
      stats = `(${parts.join(' • ')})`
    }
    
    return {
      label,
      stats,
      fixtures: roundFixtures,
      defaultOpen: true,
      color: 'neutral' as const,
      variant: 'soft' as const
    }
  })
})

// Match Control Modal
const showMatchControlModal = ref(false)
const selectedFixture = ref<Fixture | null>(null)
const updatingMatch = ref(false)

const openMatchControl = (fixture: Fixture) => {
  selectedFixture.value = { ...fixture }
  showMatchControlModal.value = true
}

const startMatch = async (fixture: Fixture) => {
  updatingMatch.value = true
  try {
    await fixtureStore.updateFixture(fixture.id, {
      status: FixtureStatus.LIVE,
      homeScore: fixture.homeScore ?? 0,
      awayScore: fixture.awayScore ?? 0
    })
    
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

const handleFixtureUpdated = (fixture: Fixture) => {
  // Update the fixture in the store/list if needed
  selectedFixture.value = fixture
}

const handleMatchEnded = async () => {
  // Refresh standings if applicable
  if (showStandings.value) {
    await standingStore.fetchStandings(tournamentId.value)
  }
}


// Tab configuration
const tabItems = computed(() => {
  const items = [
    {
      slot: 'overview',
      label: 'Overview',
      icon: 'i-heroicons-information-circle'
    },
    {
      slot: 'participants',
      label: 'Participants',
      icon: 'i-heroicons-user-group'
    },
    {
      slot: 'fixtures',
      label: 'Fixtures',
      icon: 'i-heroicons-calendar-days'
    }
  ]

  if (showStandings.value) {
    items.push({
      slot: 'standings',
      label: 'Standings',
      icon: 'i-heroicons-chart-bar'
    })
  }

  return items
})
</script>

<template>
  <div class="max-w-5xl mx-auto">
    <!-- Back link -->
    <NuxtLink 
      to="/" 
      class="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-6"
    >
      <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
      Back to Dashboard
    </NuxtLink>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
    </div>

    <!-- Error State -->
    <UAlert 
      v-else-if="error" 
      color="error" 
      variant="subtle"
      icon="i-heroicons-exclamation-triangle"
      :title="error"
      class="mb-6"
    />

    <!-- Tournament Content -->
    <template v-else-if="tournament">
      <!-- Banner -->
      <div 
        class="w-full h-48 rounded-xl overflow-hidden mb-6"
      >
        <img 
          :src="tournament.bannerUrl || PLACEHOLDER_BANNER" 
          :alt="tournament.name"
          class="w-full h-full object-cover opacity-70"
        />
      </div>

      <!-- Header -->
      <div class="flex items-start gap-4 mb-8">
        <!-- Logo -->
        <div 
          class="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0"
        >
          <img 
            :src="tournament.logoUrl || PLACEHOLDER_LOGO" 
            :alt="tournament.name"
            class="w-full h-full object-cover"
          />
        </div>

        <!-- Title & Meta -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-3 mb-2">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white truncate">
              {{ tournament.name }}
            </h1>
            <UBadge v-if="tournamentStatus" :color="tournamentStatus.color" variant="subtle">
              {{ tournamentStatus.label }}
            </UBadge>
          </div>
          
          <div class="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <div class="flex items-center gap-1">
              <UIcon name="i-heroicons-calendar" class="w-4 h-4" />
              <span>{{ formatDate(tournament.start_date) }} - {{ formatDate(tournament.end_date) }}</span>
            </div>
            <div v-if="tournament.location" class="flex items-center gap-1">
              <UIcon name="i-heroicons-map-pin" class="w-4 h-4" />
              <span>{{ tournament.location }}</span>
            </div>
            <div class="flex items-center gap-1">
              <UIcon :name="visibilityLabels[tournament.visibility].icon" class="w-4 h-4" />
              <span>{{ visibilityLabels[tournament.visibility].label }}</span>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2">
          <UButton 
            icon="i-heroicons-pencil-square" 
            variant="outline" 
            color="neutral"
            :to="`/tournaments/${tournament.id}/edit`"
          >
            Edit
          </UButton>
          <UButton 
            icon="i-heroicons-photo" 
            variant="outline" 
            color="neutral"
            :to="`/tournaments/${tournament.id}/graphics`"
            label="Graphics"
          />
          <UButton 
            icon="i-heroicons-cog-6-tooth" 
            variant="ghost" 
            color="neutral"
          />
        </div>
      </div>

      <!-- Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main Content -->
        <div class="lg:col-span-2">
          <UTabs :items="tabItems" class="w-full">
            <!-- Overview Tab -->
            <template #overview>
              <UCard v-if="tournament.description" class="mt-4">
                <template #header>
                  <div class="flex items-center gap-2">
                    <UIcon name="i-heroicons-document-text" class="w-5 h-5 text-indigo-500" />
                    <span class="font-medium">About</span>
                  </div>
                </template>
                <p class="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                  {{ tournament.description }}
                </p>
              </UCard>
              <div v-else class="text-center py-8 text-gray-500 mt-4">
                No description available.
              </div>
            </template>

            <!-- Participants Tab -->
            <template #participants>
              <UCard class="mt-4">
                <template #header>
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <UIcon name="i-heroicons-user-group" class="w-5 h-5 text-indigo-500" />
                      <span class="font-medium">Participants</span>
                      <UBadge v-if="participants.length" size="sm" variant="subtle">
                        {{ participants.length }}
                      </UBadge>
                    </div>
                    <UButton size="xs" variant="ghost" icon="i-heroicons-plus" @click="openAddModal">
                      Add
                    </UButton>
                  </div>
                </template>
                
                <!-- Loading -->
                <div v-if="participantsLoading && !participants.length" class="py-8 text-center text-gray-400">
                  <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 mx-auto mb-2 animate-spin" />
                  <p>Loading participants...</p>
                </div>
                
                <!-- Empty State -->
                <div v-else-if="!participants.length" class="py-8 text-center text-gray-400">
                  <UIcon name="i-heroicons-user-group" class="w-12 h-12 mx-auto mb-2" />
                  <p>No participants yet</p>
                  <p class="text-sm">Add teams or individuals to get started</p>
                  <UButton 
                    size="sm" 
                    variant="outline" 
                    icon="i-heroicons-plus" 
                    class="mt-4"
                    @click="openAddModal"
                  >
                    Add Participant
                  </UButton>
                </div>
                
                <!-- Participant List -->
                <div v-else class="divide-y divide-gray-100 dark:divide-gray-800">
                  <div 
                    v-for="participant in participants" 
                    :key="participant.id"
                    class="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                        <img 
                          v-if="participant.logoUrl" 
                          :src="participant.logoUrl" 
                          :alt="participant.customName || 'Participant'"
                          class="w-full h-full object-cover"
                        />
                        <span v-else class="text-sm font-medium text-gray-600 dark:text-gray-300">
                          {{ participant.seed || '-' }}
                        </span>
                      </div>
                      <div>
                        <p class="font-medium text-gray-900 dark:text-white">
                          {{ participant.customName || 'Unnamed' }}
                        </p>
                        <p class="text-xs text-gray-500">
                          Added {{ new Date(participant.created_at).toLocaleDateString() }}
                        </p>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <UChip
                        :show="!!participant.players?.length"
                        :text="participant.players?.length"
                        size="xl"
                        color="error"
                        inset
                      >
                        <UButton 
                          size="xs" 
                          color="neutral" 
                          variant="ghost" 
                          icon="i-heroicons-users"
                          @click="openManagePlayers(participant)"
                          title="Manage Players"
                        />
                      </UChip>
                      <UButton 
                        size="xs" 
                        color="error" 
                        variant="ghost" 
                        icon="i-heroicons-trash"
                        :loading="loading"
                        @click="removeParticipant(participant.id)"
                        title="Remove Participant"
                      />
                      <UBadge :color="statusColors[participant.status]" variant="subtle" size="sm">
                        {{ participant.status }}
                      </UBadge>
                    </div>
                  </div>
                </div>
              </UCard>
            </template>

            <!-- Standings Tab -->
             <template #standings>
              <UCard v-if="showStandings" :loading="standingsLoading" class="mt-4">
                <template #header>
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <UIcon name="i-heroicons-chart-bar" class="w-5 h-5 text-indigo-500" />
                      <span class="font-medium">Standings</span>
                    </div>
                    <!-- Optional: Add manual recalculate button if needed -->
                  </div>
                </template>

                <!-- Group Stage (Multiple Tables) -->
                <div v-if="tournament.type === 'GROUP' && Object.keys(standingStore.getStandingsByGroup).length > 0" class="space-y-6">
                  <div v-for="(groupStandings, groupName) in standingStore.getStandingsByGroup" :key="groupName">
                    <h4 v-if="groupName !== 'default'" class="text-sm font-medium text-gray-500 mb-3 px-1">
                      {{ groupName }}
                    </h4>
                    <StandingTable :standings="groupStandings" :loading="standingsLoading" />
                  </div>
                </div>

                <!-- Single Table (League/Round Robin) -->
                <StandingTable 
                  v-else 
                  :standings="standings" 
                  :loading="standingsLoading" 
                />
              </UCard>
            </template>

            <!-- Fixtures Tab -->
            <template #fixtures>
              <UCard class="mt-4">
                <template #header>
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <UIcon name="i-heroicons-calendar-days" class="w-5 h-5 text-indigo-500" />
                      <span class="font-medium">Fixtures</span>
                      <UBadge v-if="fixtures.length" size="sm" variant="subtle">
                        {{ fixtures.length }}
                      </UBadge>
                    </div>
                    <UButton 
                      size="xs" 
                      variant="ghost" 
                      icon="i-heroicons-sparkles"
                      :loading="generating"
                      :disabled="participants.length < 2"
                      @click="openGenerateModal"
                    >
                      Generate
                    </UButton>
                  </div>
                </template>
                
                <!-- Error -->
                <UAlert 
                  v-if="generateError" 
                  color="error" 
                  variant="subtle"
                  icon="i-heroicons-exclamation-triangle"
                  :title="generateError"
                  class="mb-4"
                  :close-button="{ icon: 'i-heroicons-x-mark', color: 'error', variant: 'link' }"
                  @close="generateError = null"
                />
                
                <!-- Loading -->
                <div v-if="fixturesLoading && !fixtures.length" class="py-8 text-center text-gray-400">
                  <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 mx-auto mb-2 animate-spin" />
                  <p>Loading fixtures...</p>
                </div>
                
                <!-- Empty State -->
                <div v-else-if="!fixtures.length" class="py-8 text-center text-gray-400">
                  <UIcon name="i-heroicons-calendar-days" class="w-12 h-12 mx-auto mb-2" />
                  <p>No fixtures scheduled</p>
                  <p class="text-sm mb-4">Generate fixtures after adding participants</p>
                  <UButton 
                    v-if="participants.length >= 2"
                    size="sm" 
                    variant="outline" 
                    icon="i-heroicons-sparkles"
                    :loading="generating"
                    @click="openGenerateModal"
                  >
                    Generate Fixtures
                  </UButton>
                  <p v-else class="text-xs text-gray-400 mt-2">
                    Need at least 2 participants
                  </p>
                </div>
                
                <!-- Fixtures Display -->
                <template v-else>
                  <!-- Knockout Bracket for knockout tournaments -->
                  <KnockoutBracket
                    v-if="tournament?.type === TournamentType.KNOCKOUT"
                    :fixtures-by-round="fixturesByRound"
                    :rounds="rounds"
                    :get-round-display-name="fixtureStore.getRoundDisplayName"
                    :updating-match="updatingMatch"
                    @start-match="startMatch"
                    @control-match="openMatchControl"
                  />
                  
                  <!-- List view for other tournament types (League, Round Robin) -->
                  <div v-else class="space-y-6">
                    <UAccordion 
                      :items="accordionItems" 
                      class="mb-4 w-full"
                      :ui="{ 
                        item: 'p-0',
                        trigger: 'p-4'
                      }"
                      multiple
                      :default-open="true"
                    >
                      <template #default="{ item, open }">
                        <UButton 
                          :color="item.color" 
                          :variant="item.variant"
                          class="mb-2 w-full justify-between rounded"
                        >
                          <div class="flex items-center gap-2 truncate">
                            <span class="font-medium text-gray-900 dark:text-white">{{ item.label }}</span>
                            <span v-if="item.stats" class="text-sm font-normal text-gray-500 dark:text-gray-400">
                              {{ item.stats }}
                            </span>
                          </div>

                          <template #trailing>
                            <UIcon 
                              name="i-heroicons-chevron-down" 
                              class="w-5 h-5 ms-auto transform transition-transform duration-200" 
                              :class="[open && '-rotate-180']" 
                            />
                          </template>
                        </UButton>
                      </template>
                      
                      <template #content="{ item }">
                        <div class="space-y-2 p-4 pt-2">
                           <div 
                            v-for="fixture in item.fixtures" 
                            :key="fixture.id"
                            class="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                          >
                            <!-- Match Info -->
                            <div class="flex-1">
                              <div class="flex items-center gap-2 text-sm">
                                <div class="flex items-center gap-2 w-1/3 justify-end">
                                  <span class="font-medium text-gray-900 dark:text-white truncate">
                                    {{ fixture.homeTeam?.customName || 'TBD' }}
                                  </span>
                                  <div class="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0">
                                    <img 
                                      v-if="fixture.homeTeam?.logoUrl" 
                                      :src="fixture.homeTeam.logoUrl" 
                                      class="w-full h-full object-cover"
                                    />
                                    <span v-else class="text-[10px] font-medium text-gray-600 dark:text-gray-300">
                                      {{ (fixture.homeTeam?.customName || 'T').charAt(0).toUpperCase() }}
                                    </span>
                                  </div>
                                </div>
                                
                                <span class="text-gray-400 px-2">vs</span>
                                
                                <div class="flex items-center gap-2 w-1/3 justify-start">
                                  <div class="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0">
                                    <img 
                                      v-if="fixture.awayTeam?.logoUrl" 
                                      :src="fixture.awayTeam.logoUrl" 
                                      class="w-full h-full object-cover"
                                    />
                                    <span v-else class="text-[10px] font-medium text-gray-600 dark:text-gray-300">
                                      {{ (fixture.awayTeam?.customName || 'T').charAt(0).toUpperCase() }}
                                    </span>
                                  </div>
                                  <span class="font-medium text-gray-900 dark:text-white truncate">
                                    {{ fixture.awayTeam?.customName || 'TBD' }}
                                  </span>
                                </div>
                              </div>
                              <p v-if="fixture.startTime" class="text-xs text-gray-500 mt-1">
                                {{ new Date(fixture.startTime).toLocaleDateString() }}
                              </p>
                            </div>
                            
                            <!-- Score (if completed or live) -->
                            <div 
                              v-if="fixture.status === 'COMPLETED' || fixture.status === 'LIVE'"
                              class="flex items-center gap-2 px-3"
                            >
                              <span class="text-lg font-bold text-gray-900 dark:text-white">
                                {{ fixture.homeScore ?? 0 }}
                              </span>
                              <span class="text-gray-400">-</span>
                              <span class="text-lg font-bold text-gray-900 dark:text-white">
                                {{ fixture.awayScore ?? 0 }}
                              </span>
                            </div>
                            
                            <!-- Match Actions -->
                            <div class="flex items-center gap-2">
                              <!-- Start Match Button (for SCHEDULED) -->
                              <UButton 
                                v-if="fixture.status === 'SCHEDULED' && fixture.homeTeamId && fixture.awayTeamId"
                                size="xs" 
                                color="success" 
                                variant="soft"
                                icon="i-heroicons-play"
                                :loading="updatingMatch"
                                @click.stop="startMatch(fixture)"
                              >
                                Start
                              </UButton>
                              
                              <!-- Control Match Button (for LIVE) -->
                              <UButton 
                                v-if="fixture.status === 'LIVE'"
                                size="xs" 
                                color="warning" 
                                variant="soft"
                                icon="i-heroicons-adjustments-horizontal"
                                @click.stop="openMatchControl(fixture)"
                              >
                                Control
                              </UButton>
                              
                              <!-- Status Badge -->
                              <UBadge :color="fixtureStatusColors[fixture.status]" variant="subtle" size="sm">
                                {{ fixture.status }}
                              </UBadge>
                            </div>
                          </div>
                        </div>
                      </template>
                    </UAccordion>
                  </div>
                </template>
              </UCard>
            </template>
          </UTabs>
        </div>

        <!-- Sidebar -->
        <div class="space-y-6">
          <!-- Quick Info -->
          <UCard>
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-information-circle" class="w-5 h-5 text-indigo-500" />
                <span class="font-medium">Details</span>
              </div>
            </template>
            
            <div class="space-y-4">
              <div class="flex justify-between">
                <span class="text-gray-500">Sport</span>
                <span class="font-medium text-gray-900 dark:text-white">{{ tournament.sport }}</span>
              </div>
              <div class="flex justify-between border-t border-gray-100 dark:border-gray-800 pt-4">
                <span class="text-gray-500">Format</span>
                <span class="font-medium text-gray-900 dark:text-white">{{ typeLabels[tournament.type] }}</span>
              </div>
              <div class="flex justify-between border-t border-gray-100 dark:border-gray-800 pt-4">
                <span class="text-gray-500">Participants</span>
                <span class="font-medium text-gray-900 dark:text-white">{{ participantLabels[tournament.participantType] }}</span>
              </div>
              <div v-if="tournament.maxParticipants" class="flex justify-between border-t border-gray-100 dark:border-gray-800 pt-4">
                <span class="text-gray-500">Max Size</span>
                <span class="font-medium text-gray-900 dark:text-white">{{ tournament.maxParticipants }}</span>
              </div>
              <div class="flex justify-between border-t border-gray-100 dark:border-gray-800 pt-4">
                <span class="text-gray-500">Timezone</span>
                <span class="font-medium text-gray-900 dark:text-white text-sm">{{ tournament.timezone }}</span>
              </div>
              <div class="flex justify-between border-t border-gray-100 dark:border-gray-800 pt-4">
                <span class="text-gray-500">Auto-approve</span>
                <UBadge :color="tournament.autoApprove ? 'success' : 'neutral'" variant="subtle">
                  {{ tournament.autoApprove ? 'Yes' : 'No' }}
                </UBadge>
              </div>
            </div>
          </UCard>

          <!-- Organizer -->
          <UCard v-if="tournament.organizer">
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-user" class="w-5 h-5 text-indigo-500" />
                <span class="font-medium">Organizer</span>
              </div>
            </template>
            
            <div class="flex items-center gap-3">
              <UAvatar 
                v-if="tournament.organizer.picture" 
                :src="tournament.organizer.picture" 
                size="md"
              />
              <UAvatar 
                v-else 
                :text="tournament.organizer.name?.charAt(0).toUpperCase()" 
                size="md"
                class="bg-indigo-500 text-white"
              />
              <div>
                <p class="font-medium text-gray-900 dark:text-white">{{ tournament.organizer.name }}</p>
                <p class="text-sm text-gray-500">{{ tournament.organizer.email }}</p>
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </template>

    <!-- Not Found -->
    <div v-else class="text-center py-20">
      <UIcon name="i-heroicons-magnifying-glass" class="w-12 h-12 mx-auto text-gray-400 mb-4" />
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">Tournament not found</h2>
      <p class="text-gray-500 mb-6">The tournament you're looking for doesn't exist or has been deleted.</p>
      <UButton to="/" variant="outline">Back to Dashboard</UButton>
    </div>
  </div>

  <!-- Manage Players Modal -->
  <UModal v-model:open="showManagePlayersModal">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Manage Players - {{ selectedParticipant?.customName }}
            </h3>
            <UButton 
              icon="i-heroicons-x-mark" 
              variant="ghost" 
              color="neutral" 
              size="sm"
              @click="showManagePlayersModal = false"
            />
          </div>
        </template>

        <div class="space-y-6">
          <!-- Add Player Form -->
          <form @submit.prevent="handleAddPlayer" class="flex items-end gap-3">
            <div class="flex-1">
              <UFormField label="Name" required>
                <UInput v-model="newPlayer.name" placeholder="Player Name" class="w-full" />
              </UFormField>
            </div>
             <div class="w-24">
              <UFormField label="Number">
                <UInput v-model.number="newPlayer.number" type="number" placeholder="#" />
              </UFormField>
            </div>
             <div class="w-32">
              <UFormField label="Position">
                <USelect v-model="newPlayer.position" :items="positions" class="w-full" />
              </UFormField>
            </div>
            <UButton 
              type="submit" 
              icon="i-heroicons-plus" 
              :disabled="!newPlayer.name"
              :loading="loading"
            />
          </form>

          <USeparator />

          <!-- Player List -->
          <div class="space-y-2">
            <div v-if="!selectedParticipant?.players?.length" class="text-center py-8 text-gray-400">
              <p>No players added yet</p>
            </div>
            <div v-else class="space-y-2 max-h-60 overflow-y-auto pr-1">
              <div 
                v-for="player in selectedParticipant.players" 
                :key="player.id"
                class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
              >
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-medium text-xs">
                    {{ player.number || '#' }}
                  </div>
                  <div>
                    <p class="text-sm font-medium text-gray-900 dark:text-white">
                      {{ player.name }}
                    </p>
                    <p class="text-xs text-gray-500">
                      {{ player.position }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </UCard>
    </template>
  </UModal>

  <!-- Add Participant Modal -->
  <UModal v-model:open="showAddModal">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Add Participant
            </h3>
            <UButton 
              icon="i-heroicons-x-mark" 
              variant="ghost" 
              color="neutral" 
              size="sm"
              @click="showAddModal = false"
            />
          </div>
        </template>

        <UAlert 
          v-if="addError" 
          color="error" 
          variant="subtle"
          icon="i-heroicons-exclamation-triangle"
          :title="addError"
          class="mb-4"
          :close-button="{ icon: 'i-heroicons-x-mark', color: 'error', variant: 'link' }"
          @close="addError = null"
        />

        <UForm 
          :schema="addParticipantSchema" 
          :state="addParticipantState" 
          @submit="handleAddParticipant"
          class="space-y-4"
        >
          <!-- Logo Upload -->
          <div class="flex items-center gap-4">
             <!-- Hidden file input -->
            <input 
              ref="logoFileInput"
              type="file" 
              accept="image/*"
              class="hidden"
              @change="handleLogoChange"
            />
            
            <button 
              type="button"
              class="relative w-16 h-16 rounded-full overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 group shrink-0"
              @click="triggerLogoInput"
            >
              <img 
                v-if="logoPreview" 
                :src="logoPreview" 
                alt="Logo preview"
                class="w-full h-full object-cover"
              />
              <div 
                v-else
                class="w-full h-full flex flex-col items-center justify-center text-gray-400 group-hover:text-indigo-500 transition-colors"
              >
                <UIcon name="i-heroicons-camera" class="w-6 h-6" />
              </div>
            </button>
            
            <div class="flex-1">
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                {{ tournament?.participantType === 'TEAM' ? 'Team Logo' : 'Photo' }}
              </p>
              <div class="flex items-center gap-2 mt-1">
                 <UButton
                  size="xs"
                  variant="ghost"
                  color="primary"
                  @click="triggerLogoInput"
                >
                  {{ logoPreview ? 'Change' : 'Upload' }}
                </UButton>
                <UButton
                  v-if="logoPreview"
                  size="xs"
                  variant="ghost"
                  color="error"
                  @click="removeLogo"
                >
                  Remove
                </UButton>
              </div>
            </div>
          </div>
          <UFormField 
            :label="tournament?.participantType === 'TEAM' ? 'Team Name' : 'Participant Name'" 
            name="customName" 
            required
          >
            <UInput 
              v-model="addParticipantState.customName" 
              :placeholder="tournament?.participantType === 'TEAM' ? 'e.g. Manchester United' : 'e.g. John Doe'"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Seed (Optional)" name="seed">
            <UInput 
              v-model.number="addParticipantState.seed" 
              type="number"
              placeholder="e.g. 1"
              :min="1"
              class="w-full"
            />
          </UFormField>

          <div class="flex justify-end gap-3 pt-4">
            <UButton 
              label="Cancel" 
              variant="ghost" 
              color="neutral"
              @click="showAddModal = false"
            />
            <UButton 
              type="submit"
              label="Add Participant" 
              icon="i-heroicons-plus"
              :loading="addingParticipant"
            />
          </div>
        </UForm>
      </UCard>
    </template>
  </UModal>

  <!-- Generate Fixtures Modal -->
  <UModal v-model:open="showGenerateModal">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Generate Fixtures
            </h3>
            <UButton 
              icon="i-heroicons-x-mark" 
              variant="ghost" 
              color="neutral" 
              size="sm"
              @click="showGenerateModal = false"
            />
          </div>
        </template>

        <div class="space-y-4">
          <p class="text-gray-600 dark:text-gray-300">
            <span v-if="tournament?.type === 'GROUP'">
              Configure how the group stage should be generated. You can specify the number of groups or teams per group.
            </span>
            <span v-else>
              Configure how the {{ tournament?.type === 'ROUND_ROBIN' ? 'round robin' : 'fixtures' }} should be generated.
            </span>
          </p>

          <UAlert 
            v-if="generateError" 
            color="error" 
            variant="subtle"
            icon="i-heroicons-exclamation-triangle"
            :title="generateError"
            class="mb-4"
          />

          <!-- Group Stage Config -->
          <div v-if="tournament?.type === 'GROUP'" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormField label="Teams Per Group" name="teamsPerGroup">
              <UInput 
                v-model.number="generateConfig.teamsPerGroup" 
                type="number" 
                placeholder="e.g. 4"
                :min="2"
              />
            </UFormField>

            <UFormField label="Number of Groups" name="numberOfGroups">
              <UInput 
                v-model.number="generateConfig.numberOfGroups" 
                type="number" 
                placeholder="e.g. 4"
                :min="1"
              />
            </UFormField>
          </div>
          
          <!-- Double Round Robin Option -->
          <div 
            v-if="tournament?.type === 'ROUND_ROBIN' || tournament?.type === 'GROUP'" 
            class="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50"
          >
             <div>
              <p class="font-medium text-gray-900 dark:text-white">Double Round Robin</p>
              <p class="text-sm text-gray-500">Teams play each other twice (Home & Away)</p>
            </div>
            <USwitch v-model="generateConfig.doubleRoundRobin" />
          </div>

          <div v-if="tournament?.type === 'GROUP'" class="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg text-sm text-gray-500">
            <p v-if="generateConfig.teamsPerGroup && participants.length">
              With {{ participants.length }} participants and {{ generateConfig.teamsPerGroup }} teams per group, 
              you will have roughly {{ Math.ceil(participants.length / generateConfig.teamsPerGroup) }} groups.
            </p>
            <p v-else-if="generateConfig.numberOfGroups && participants.length">
              With {{ participants.length }} participants and {{ generateConfig.numberOfGroups }} groups, 
              you will have roughly {{ Math.ceil(participants.length / generateConfig.numberOfGroups) }} teams per group.
            </p>
            <p v-else>
              The system will automatically balance groups if no preference is set.
            </p>
          </div>

          <div class="flex justify-end gap-3 pt-4">
            <UButton 
              label="Cancel" 
              variant="ghost" 
              color="neutral"
              @click="showGenerateModal = false"
            />
            <UButton 
              label="Generate" 
              icon="i-heroicons-sparkles"
              :loading="generating"
              @click="handleGenerateFixtures"
            />
          </div>
        </div>
      </UCard>
    </template>
  </UModal>

  <!-- Match Control Component -->
  <MatchControl
    :fixture="selectedFixture"
    :tournament="tournament"
    v-model:open="showMatchControlModal"
    @fixture-updated="handleFixtureUpdated"
    @match-ended="handleMatchEnded"
  />
</template>
