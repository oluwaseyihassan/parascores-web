<script setup lang="ts">
import type { Fixture, Tournament } from '~/types'

definePageMeta({
  layout: 'dashboard'
})
const route = useRoute()
const tournamentId = route.params.id as string

// Stores
const fixtureStore = useFixtureStore()
const participantStore = useParticipantStore()
const standingStore = useStandingStore()
const sponsorStore = useSponsorStore()
const socialStore = useSocialStore()

// State
const tournament = ref<Tournament | null>(null)
const fixtures = ref<Fixture[]>([])
const loading = ref(true)
const selectedFixtureId = ref<string | undefined>(undefined)
const previewUrl = ref<string | null>(null)
const generating = ref(false)
const error = ref<string | null>(null)
const graphicType = ref<'match' | 'standing' | 'bracket' | 'matchday'>('match')
const selectedGroup = ref<string>('all')
const selectedRound = ref<number | undefined>(undefined)

// Computed
const selectedFixture = computed(() => 
  fixtures.value.find(f => f.id === selectedFixtureId.value)
)

const groupOptions = computed(() => {
  const groups = standingStore.getStandingsByGroup || {}
  const keys = Object.keys(groups)
  
  // If no standings, return empty or default
  if (keys.length === 0) return []

  // Map groups to options
  const options = keys.map(g => ({ 
      label: g === 'default' ? 'Main Table' : g, 
      value: g 
  }))
  
  // Always add "All Groups" option
  return [
      { label: 'All Groups', value: 'all' },
      ...options
  ]
})

const showGroupSelector = computed(() => {
    // Only show if we have actual choices beyond just "All" vs "Main Table" (which are usually the same for single group)
    // If we have > 2 options (All + A + B), show it.
    // If we have 2 options (All + Default/A), it might be redundant, but let's show it if it's NOT 'default'.
    
    if (groupOptions.value.length <= 1) return false
    
    // If we have 2 options: All + 1 Group. 
    // If that 1 group is 'default', hide it.
    if (groupOptions.value.length === 2 && groupOptions.value[1]?.value === 'default') return false
    
    return true
})

const fixtureOptions = computed(() => {
  return fixtures.value.map(f => {
    const home = f.homeTeam?.customName || 'TBD'
    const away = f.awayTeam?.customName || 'TBD'
    const date = f.startTime ? new Date(f.startTime).toLocaleDateString() : 'Unscheduled'
    return {
      label: `${home} vs ${away} (${date})`,
      value: f.id,
      description: f.status,
      round: f.round || 1,
      roundName: f.roundName
    }
  })
})

// Group fixtures by round for accordion display
const fixturesByRound = computed(() => {
  const grouped: Record<number, typeof fixtureOptions.value> = {}
  
  fixtureOptions.value.forEach(f => {
    const round = f.round
    if (!grouped[round]) {
      grouped[round] = []
    }
    grouped[round].push(f)
  })
  
  // Sort rounds and return as array of accordion items
  return Object.keys(grouped)
    .map(Number)
    .sort((a, b) => a - b)
    .map(round => {
      // Use round name from the first fixture in the group if available
      const roundName = grouped[round]?.[0]?.roundName || `Round ${round}`
      return {
        label: roundName,
        value: `round-${round}`,
        slot: `round-${round}`,
        fixtures: grouped[round]
      }
    })
})

// Available rounds for matchday selector
const roundOptions = computed(() => {
  const rounds = [...new Set(fixtures.value.map(f => f.round || 1))].sort((a, b) => a - b)
  return rounds.map(r => {
      // Find a fixture in this round to get the name
      const fixture = fixtures.value.find(f => f.round === r)
      return { 
          label: fixture?.roundName || `Round ${r}`, 
          value: r 
      }
  })
})

// Validation for generation
const canGenerate = computed(() => {
  if (graphicType.value === 'standing') {
      // Require tournament AND standings data
      return !!tournament.value && standingStore.standings.length > 0
  }
  if (graphicType.value === 'bracket') {
      return !!tournament.value
  }
  if (graphicType.value === 'matchday') {
      return !!tournament.value && selectedRound.value !== undefined && fixtures.value.some(f => f.round === selectedRound.value)
  }
  if (!selectedFixture.value) return false
  // Check if teams exist (at least basics)
  return !!selectedFixture.value.homeTeamId && !!selectedFixture.value.awayTeamId
})

// Methods
const fetchData = async () => {
  loading.value = true
  try {
    const [tournRes, fixRes, partRes] = await Promise.all([
      $api<any>(`/tournaments/${tournamentId}`),
      $api<any>(`/tournaments/${tournamentId}/fixtures`),
      $api<any>(`/tournaments/${tournamentId}/participants`)
    ])

    // Load standings, sponsors, and socials too
    await Promise.all([
      standingStore.fetchStandings(tournamentId),
      sponsorStore.fetchSponsors(tournamentId),
      socialStore.fetchSocials(tournamentId)
    ])

    tournament.value = tournRes.data || tournRes
    
    // Handle fixtures
    const fixturesData = fixRes.data || fixRes
    if (fixturesData && fixturesData.rounds) {
      fixtures.value = fixturesData.rounds.flatMap((r: any) => r.fixtures)
    } else if (Array.isArray(fixturesData)) {
      fixtures.value = fixturesData
    } else {
      fixtures.value = []
    }
    
    // Map teams
    const participants = partRes.data || []
    fixtures.value.forEach((f: any) => {
      if (!f.homeTeam && f.homeTeamId) {
        f.homeTeam = participants.find((p: any) => p.id === f.homeTeamId)
      }
      if (!f.awayTeam && f.awayTeamId) {
        f.awayTeam = participants.find((p: any) => p.id === f.awayTeamId)
      }
    })

  } catch (e: any) {
    error.value = e.message || 'Failed to load tournament data'
  } finally {
    loading.value = false
  }
}

const generatePreview = async () => {
  if (!tournament.value) return
  if (graphicType.value === 'match' && !selectedFixture.value) return
  
  generating.value = true
  error.value = null
  
  try {
    if (previewUrl.value) {
      window.URL.revokeObjectURL(previewUrl.value)
    }

    let response: Blob
    
    if (graphicType.value === 'match' && selectedFixture.value) {
        // Fetch match events for this fixture
        let matchEvents: any[] = []
        try {
            const eventsRes = await $api<any>(`/fixtures/${selectedFixture.value.id}/events`)
            matchEvents = eventsRes.data || []
        } catch (e) {
            console.warn('Could not fetch match events:', e)
        }

        response = await $fetch<Blob>('/api/graphics/match-result', {
            method: 'POST',
            body: {
                match: selectedFixture.value,
                homeTeam: selectedFixture.value.homeTeam,
                awayTeam: selectedFixture.value.awayTeam,
                tournament: tournament.value,
                events: matchEvents,
                sponsors: sponsorStore.sponsors,
                socials: socialStore.socials
            },
            responseType: 'blob'
        })
    } else if (graphicType.value === 'bracket') {
        // Prepare bracket data
        const roundsSet = new Set<number>()
        const fixturesByRound: Record<number, Fixture[]> = {}
        
        fixtures.value.forEach(f => {
            roundsSet.add(f.round)
            if (!fixturesByRound[f.round]) fixturesByRound[f.round] = []
            fixturesByRound[f.round]?.push(f)
        })
        
        const rounds = Array.from(roundsSet).sort((a,b) => a - b)

        response = await $fetch<Blob>('/api/graphics/bracket', {
            method: 'POST',
            body: {
                tournament: tournament.value,
                fixturesByRound,
                rounds,
                sponsors: sponsorStore.sponsors,
                socials: socialStore.socials
            },
            responseType: 'blob'
        })
    } else if (graphicType.value === 'matchday' && selectedRound.value !== undefined) {
        // Get fixtures for the selected round
        const roundFixtures = fixtures.value.filter(f => f.round === selectedRound.value)
        
        response = await $fetch<Blob>('/api/graphics/matchday', {
            method: 'POST',
            body: {
                fixtures: roundFixtures,
                tournament: tournament.value,
                round: selectedRound.value,
                sponsors: sponsorStore.sponsors,
                socials: socialStore.socials
            },
            responseType: 'blob'
        })
    } else {
        // Prepare standings data
        let standingsData = standingStore.standings
        let title = 'Standings'

        if (Object.keys(standingStore.getStandingsByGroup).length > 0 && selectedGroup.value !== 'all') {
             standingsData = standingStore.getStandingsByGroup[selectedGroup.value] || []
             title = `${selectedGroup.value} Standings`
        }

        response = await $fetch<Blob>('/api/graphics/standing', {
            method: 'POST',
            body: {
                standings: standingsData,
                tournament: tournament.value,
                title,
                sponsors: sponsorStore.sponsors,
                socials: socialStore.socials
            },
            responseType: 'blob'
        })
    }
    
    previewUrl.value = window.URL.createObjectURL(response)
  } catch (e: any) {
    console.error('Generation failed', e)
    error.value = 'Failed to generate graphic. Please try again.'
  } finally {
    generating.value = false
  }
}

const downloadGraphic = () => {
  if (!previewUrl.value) return
  
  const link = document.createElement('a')
  link.href = previewUrl.value
  
  let filename = 'graphic.png'
  if (graphicType.value === 'match' && selectedFixture.value) {
      filename = `match-${selectedFixture.value.id}.png`
  } else if (graphicType.value === 'matchday' && tournament.value && selectedRound.value) {
      filename = `${tournament.value.name}-round-${selectedRound.value}.png`
  } else if (tournament.value) {
      const suffix = graphicType.value === 'bracket' ? 'bracket' : 'standings'
      filename = `${tournament.value.name}-${suffix}.png`
  }

  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Watchers
watch(selectedFixtureId, () => {
  if (selectedFixtureId.value && graphicType.value === 'match') {
    generatePreview()
  }
})

watch(graphicType, () => {
    previewUrl.value = null
    error.value = null
})

onMounted(() => {
  fetchData()
})

onUnmounted(() => {
  if (previewUrl.value) {
    window.URL.revokeObjectURL(previewUrl.value)
  }
})
</script>

<template>
  <div class="max-w-6xl mx-auto pb-12">
    <!-- Header -->
    <div class="mb-8">
      <NuxtLink 
        :to="`/tournaments/${tournamentId}`" 
        class="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-4"
      >
        <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
        Back to Tournament
      </NuxtLink>
      
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <UIcon name="i-heroicons-photo" class="w-7 h-7 text-indigo-500" />
            Graphics Generator
          </h1>
          <p class="text-gray-500 mt-1">
            Create professional social media graphics for your matches.
          </p>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <!-- Sidebar / Config -->
      <div class="lg:col-span-4 space-y-6">
        <UCard>
          <template #header>
            <h3 class="font-semibold">Configuration</h3>
          </template>

            <!-- Graphic Type Switcher -->
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Graphic Type</label>
              <div class="flex rounded-md shadow-sm">
                <button 
                  type="button"
                  class="flex-1 px-4 py-2 text-sm font-medium border rounded-l-md focus:z-10 focus:ring-2 focus:ring-indigo-500"
                  :class="graphicType === 'match' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'"
                  @click="graphicType = 'match'"
                >
                  Match Result
                </button>
                <button 
                  v-if="tournament && ['ROUND_ROBIN', 'GROUP'].includes(tournament.type)"
                  type="button"
                  class="flex-1 px-4 py-2 text-sm font-medium border-t border-b focus:z-10 focus:ring-2 focus:ring-indigo-500"
                  :class="graphicType === 'standing' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'"
                  @click="graphicType = 'standing'"
                >
                  Standings
                </button>
                <button 
                  v-if="tournament && tournament.type === 'KNOCKOUT'"
                  type="button"
                  class="flex-1 px-4 py-2 text-sm font-medium border border-l-0 rounded-r-md focus:z-10 focus:ring-2 focus:ring-indigo-500"
                  :class="graphicType === 'bracket' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'"
                  @click="graphicType = 'bracket'"
                >
                  Bracket
                </button>
                <button 
                  type="button"
                  class="flex-1 px-4 py-2 text-sm font-medium border border-l-0 rounded-r-md focus:z-10 focus:ring-2 focus:ring-indigo-500"
                  :class="graphicType === 'matchday' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'"
                  @click="graphicType = 'matchday'"
                >
                  Matchday
                </button>
              </div>
            </div>

            <!-- Match List -->
            <div v-if="graphicType === 'match'" class="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
              <UAccordion :items="fixturesByRound" multiple>
                <template v-for="roundData in fixturesByRound" :key="roundData.value" #[roundData.slot]>
                  <div class="space-y-2 p-2">
                    <div 
                      v-for="item in roundData.fixtures" 
                      :key="item.value"
                      @click="selectedFixtureId = item.value"
                      class="p-3 rounded-lg border cursor-pointer transition-colors"
                      :class="[
                        selectedFixtureId === item.value 
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' 
                          : 'border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700'
                      ]"
                    >
                      <div class="flex items-center justify-between mb-1">
                         <span class="font-medium text-sm" :class="selectedFixtureId === item.value ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-900 dark:text-gray-100'">
                           {{ item.label }}
                         </span>
                      </div>
                      <div class="text-xs text-gray-500 capitalize flex justify-between">
                        <span>{{ item.description }}</span>
                      </div>
                    </div>
                  </div>
                </template>
              </UAccordion>
              
              <div v-if="fixtureOptions.length === 0" class="text-center py-4 text-gray-500 text-sm">
                No matches found.
              </div>
            </div>

            <!-- Standings Config -->
            <div v-else-if="graphicType === 'standing'" class="space-y-4">
                <div v-if="showGroupSelector">
                    <UFormGroup label="Select Group">
                        <USelect 
                            v-model="selectedGroup"
                            :items="groupOptions"
                            value-key="value"
                            option-label="label"
                            class="w-full"
                        />
                    </UFormGroup>
                </div>
                <div v-else-if="standingStore.standings.length === 0" class="text-center py-4 text-gray-500 text-sm">
                    No standings data available.
                </div>
                <p class="text-sm text-gray-500">
                    Generate a table graphic for the current tournament standings. 
                    {{ showGroupSelector ? 'Select a specific group or generate all.' : '' }}
                </p>
            </div>

            <!-- Bracket Config -->
            <div v-else-if="graphicType === 'bracket'" class="space-y-4">
               <div class="text-center py-4 text-gray-500 text-sm">
                  Generates a full tournament bracket based on all fixtures.
               </div>
                <p class="text-sm text-gray-500">
                    Useful for knockout stages. Ensure all matches are scheduled for the best layout.
                </p>
            </div>

            <!-- Matchday Config -->
            <div v-else-if="graphicType === 'matchday'" class="space-y-4">
                <UFormGroup label="Select Round">
                    <USelect 
                        v-model="selectedRound"
                        :items="roundOptions"
                        value-key="value"
                        option-label="label"
                        placeholder="Select a round"
                        class="w-full"
                    />
                </UFormGroup>
                <div v-if="selectedRound !== undefined" class="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm">
                    <span class="text-gray-500">Matches in {{ roundOptions.find(r => r.value === selectedRound)?.label }}:</span>
                    <span class="font-medium ml-2">{{ fixtures.filter(f => f.round === selectedRound).length }}</span>
                </div>
                <p class="text-sm text-gray-500">
                    Generate a graphic showing all matches for a specific matchday/round.
                </p>
            </div>
          
          <div v-if="graphicType === 'match' && selectedFixture" class="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm space-y-2 mb-4 mt-4">
             <div class="flex justify-between">
                <span class="text-gray-500">Status</span>
                <UBadge :color="selectedFixture.status === 'LIVE' ? 'warning' : selectedFixture.status === 'COMPLETED' ? 'success' : 'neutral'" size="xs" variant="subtle">
                    {{ selectedFixture.status }}
                </UBadge>
             </div>
             <div class="flex justify-between">
                <span class="text-gray-500">Score</span>
                <span class="font-medium">{{ selectedFixture.homeScore ?? 0 }} - {{ selectedFixture.awayScore ?? 0 }}</span>
             </div>
          </div>

          <UButton 
            class="mt-4"
            block 
            label="Regenerate Preview" 
            icon="i-heroicons-arrow-path"
            variant="soft"
            :loading="generating"
            :disabled="!canGenerate"
            @click="generatePreview"
          />
        </UCard>
      </div>

      <!-- Preview Area -->
      <div class="lg:col-span-8">
        <UCard class="h-full flex flex-col">
          <template #header>
            <div class="flex items-center justify-between">
               <h3 class="font-semibold">Preview</h3>
               <UButton 
                  v-if="previewUrl"
                  label="Download Image" 
                  icon="i-heroicons-arrow-down-tray"
                  color="primary"
                  @click="downloadGraphic"
               />
            </div>
          </template>

          <div class="flex-1 flex items-center justify-center bg-gray-100 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-800 min-h-[400px] overflow-hidden relative">
             <!-- Placeholder (Match Mode) -->
             <div v-if="graphicType === 'match' && !selectedFixtureId" class="text-center text-gray-400">
                <UIcon name="i-heroicons-cursor-arrow-rays" class="w-12 h-12 mx-auto mb-2" />
                <p>Select a match to generate a graphic</p>
             </div>

             <!-- Placeholder (Standings Mode) -->
             <div v-else-if="graphicType === 'standing' && !previewUrl && !generating && !error" class="text-center text-gray-400">
                <UIcon name="i-heroicons-table-cells" class="w-12 h-12 mx-auto mb-2" />
                <p>Click generate to create standings graphic</p>
             </div>

             <!-- Placeholder (Bracket Mode) -->
             <div v-else-if="graphicType === 'bracket' && !previewUrl && !generating && !error" class="text-center text-gray-400">
                <UIcon name="i-heroicons-rectangle-group" class="w-12 h-12 mx-auto mb-2" />
                <p>Click generate to create tournament bracket</p>
             </div>
             
             <!-- Generating -->
             <div v-else-if="generating" class="text-center text-gray-400">
                <UIcon name="i-heroicons-photo" class="w-12 h-12 mx-auto mb-2 animate-pulse" />
                <p>Generating graphic...</p>
             </div>

             <!-- Error -->
             <div v-else-if="error" class="text-center text-red-500 px-4">
                <UIcon name="i-heroicons-exclamation-triangle" class="w-12 h-12 mx-auto mb-2" />
                <p>{{ error }}</p>
             </div>

             <!-- Preview Image -->
             <img 
              v-else-if="previewUrl" 
              :src="previewUrl" 
              alt="Generated Graphic" 
              class="max-w-full max-h-full object-contain shadow-xl"
             />
          </div>
          
           <template #footer>
            <p class="text-xs text-center text-gray-500">
               Generate high-quality PNGs suitable for Instagram, Twitter, and Facebook.
            </p>
          </template>
        </UCard>
      </div>
    </div>
  </div>
</template>
