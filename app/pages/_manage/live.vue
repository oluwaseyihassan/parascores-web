<script setup lang="ts">
import { FixtureStatus } from '~/types'
import type { Fixture } from '~/types'

definePageMeta({
  middleware: ['require-organizer'],
  layout: 'dashboard'
})

const fixtureStore = useFixtureStore()
const authStore = useAuthStore()
const { liveFixtures, loading, error } = storeToRefs(fixtureStore)

// Trigger connection to live stream SSE
useLiveStream()

// Fetch live fixtures on mount (scoped to active organization)
onMounted(async () => {
  await fixtureStore.fetchLiveFixtures(authStore.activeOrganizationId || undefined)
})



// Group fixtures by tournament
const fixturesByTournament = computed((): Record<string, { tournamentName: string; customName?: string; fixtures: Fixture[] }> => {
  const grouped: Record<string, { tournamentName: string; customName?: string; fixtures: Fixture[] }> = {}
  
  liveFixtures.value.forEach(fixture => {
    const tournamentId = fixture.tournament_id
    if (!grouped[tournamentId]) {
      grouped[tournamentId] = {
        tournamentName: (fixture as any).tournament?.name || 'Tournament',
        customName: (fixture as any).tournament?.customName,
        fixtures: []
      }
    }
    grouped[tournamentId].fixtures.push(fixture)
  })
  
  return grouped
})

// Match control modal
const showMatchControlModal = ref(false)
const selectedFixture = ref<Fixture | null>(null)

const openMatchControl = (fixture: Fixture) => {
  selectedFixture.value = { ...fixture }
  showMatchControlModal.value = true
}

const handleFixtureUpdated = async (fixture: Fixture) => {
  selectedFixture.value = fixture
  // Refresh live fixtures list
  await fixtureStore.fetchLiveFixtures(authStore.activeOrganizationId || undefined)
}

const handleMatchEnded = async () => {
  // Refresh live fixtures list (match will be removed since it's completed)
  await fixtureStore.fetchLiveFixtures(authStore.activeOrganizationId || undefined)
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <div class="flex items-center gap-3">
          <div class="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
            <UIcon name="i-heroicons-signal" class="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Live Matches</h1>
            <p class="text-gray-500">Monitor and control all ongoing matches</p>
          </div>
        </div>
      </div>
      <UButton 
        icon="i-heroicons-arrow-path" 
        variant="ghost" 
        color="neutral"
        :loading="loading"
        @click="fixtureStore.fetchLiveFixtures(authStore.activeOrganizationId || undefined);"
      >
        Refresh
      </UButton>
    </div>

    <!-- Live Indicator -->
    <div v-if="liveFixtures.length > 0" class="flex items-center gap-2 mb-6">
      <span class="relative flex h-3 w-3">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
      </span>
      <span class="text-sm font-medium text-gray-600 dark:text-gray-300">
        {{ liveFixtures.length }} match{{ liveFixtures.length === 1 ? '' : 'es' }} live
      </span>
    </div>

    <!-- Loading State -->
    <div v-if="loading && liveFixtures.length === 0" class="flex flex-col items-center justify-center py-20">
      <UIcon name="i-heroicons-arrow-path" class="w-12 h-12 animate-spin text-gray-400 mb-4" />
      <p class="text-gray-500">Loading live matches...</p>
    </div>

    <!-- Error State -->
    <UAlert 
      v-else-if="error && liveFixtures.length === 0" 
      color="error" 
      variant="subtle"
      icon="i-heroicons-exclamation-triangle"
      :title="error"
      class="mb-6"
    />

    <!-- Empty State -->
    <UCard 
      v-else-if="!loading && liveFixtures.length === 0" 
      class="flex flex-col items-center justify-center py-16 text-center"
    >
      <div class="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center mb-6">
        <UIcon name="i-heroicons-signal-slash" class="w-10 h-10 text-gray-400" />
      </div>
      <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">No live matches</h3>
      <p class="text-gray-500 max-w-md mx-auto mb-8">
        There are currently no matches in progress. Start a match from a tournament's fixtures tab to see it here.
      </p>
      <UButton 
        label="Go to Tournaments" 
        icon="i-heroicons-trophy"
        variant="outline" 
        to="/"
      />
    </UCard>

    <!-- Live Matches List -->
    <div v-else class="space-y-6">
      <UCard 
        v-for="(group, tournamentId) in fixturesByTournament" 
        :key="tournamentId"
      >
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-trophy" class="w-5 h-5 text-indigo-500" />
            <NuxtLink 
              :to="`/tournaments/${group.customName || tournamentId}`"
              class="font-medium text-gray-900 dark:text-white hover:text-indigo-500 transition-colors"
            >
              {{ group.tournamentName }}
            </NuxtLink>
            <UBadge color="warning" variant="subtle" size="sm">
              {{ group.fixtures.length }} live
            </UBadge>
          </div>
        </template>

        <div class="space-y-3">
          <div 
            v-for="fixture in group.fixtures" 
            :key="fixture.id"
            class="flex flex-col lg:flex-row items-center justify-between p-3 sm:p-4 gap-3 lg:gap-0 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            @click="openMatchControl(fixture)"
          >
            <!-- Match Info -->
            <div class="flex items-center gap-2 sm:gap-6 w-full lg:flex-1 min-w-0">
              <!-- Home Team -->
              <div class="flex items-center gap-2 sm:gap-3 flex-1 justify-end min-w-0">
                <span class="font-medium text-gray-900 dark:text-white text-right truncate">
                  {{ fixture.homeTeam?.customShortName || fixture.homeTeam?.customName || 'Home' }}
                </span>
                <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden shrink-0">
                  <img 
                    v-if="fixture.homeTeam?.logoUrl" 
                    :src="fixture.homeTeam.logoUrl" 
                    class="w-full h-full object-cover"
                  />
                  <span v-else class="text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-300">
                    {{ (fixture.homeTeam?.customShortName || fixture.homeTeam?.customName || 'H').charAt(0).toUpperCase() }}
                  </span>
                </div>
              </div>

              <!-- Score -->
              <div class="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 shrink-0">
                <span class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white min-w-[1.5rem] sm:min-w-[2rem] text-center">
                  {{ fixture.homeScore ?? 0 }}
                </span>
                <span class="text-gray-400 text-base sm:text-lg">-</span>
                <span class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white min-w-[1.5rem] sm:min-w-[2rem] text-center">
                  {{ fixture.awayScore ?? 0 }}
                </span>
              </div>

              <!-- Away Team -->
              <div class="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden shrink-0">
                  <img 
                    v-if="fixture.awayTeam?.logoUrl" 
                    :src="fixture.awayTeam.logoUrl" 
                    class="w-full h-full object-cover"
                  />
                  <span v-else class="text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-300">
                    {{ (fixture.awayTeam?.customShortName || fixture.awayTeam?.customName || 'A').charAt(0).toUpperCase() }}
                  </span>
                </div>
                <span class="font-medium text-gray-900 dark:text-white truncate">
                  {{ fixture.awayTeam?.customShortName || fixture.awayTeam?.customName || 'Away' }}
                </span>
              </div>
            </div>

            <!-- Live Badge & Control -->
            <div class="flex items-center justify-between lg:justify-end gap-3 w-full lg:w-auto mt-2 lg:mt-0 lg:ml-4 pt-3 lg:pt-0 border-t border-gray-200 dark:border-gray-700 lg:border-t-0 shrink-0">
              <UBadge color="warning" variant="soft" class="animate-pulse">
                <span class="flex items-center gap-1">
                  <span class="w-2 h-2 bg-red-500 rounded-full"></span>
                  LIVE
                </span>
              </UBadge>
              <UButton 
                size="xs" 
                color="primary" 
                variant="soft"
                icon="i-heroicons-adjustments-horizontal"
              >
                <span class="hidden sm:inline">Control</span>
                <span class="sm:hidden">Control Match</span>
              </UButton>
            </div>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Match Control Component -->
    <MatchControl
      :fixture="selectedFixture"
      v-model:open="showMatchControlModal"
      @fixture-updated="handleFixtureUpdated"
      @match-ended="handleMatchEnded"
    />
  </div>
</template>
