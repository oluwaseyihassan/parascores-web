<script setup lang="ts">
/**
 * Live Control — redesigned (see parascores-designs/ui/dashboard/REDESIGN.md).
 * Rollback: restore from live.vue.bak or `git checkout -- app/pages/_manage/live.vue`.
 */
import { FixtureStatus } from '~/types'
import type { Fixture } from '~/types'

definePageMeta({
  middleware: ['require-organizer'],
  layout: 'dashboard-v2'
})

useSeoMeta({ title: 'Live Control — ParaScores' })

const fixtureStore = useFixtureStore()
const authStore = useAuthStore()
const { liveFixtures, loading, error } = storeToRefs(fixtureStore)

// Trigger connection to live stream SSE
useLiveStream()

// Fetch live fixtures on mount (scoped to active organization)
onMounted(async () => {
  await fixtureStore.fetchLiveFixtures(authStore.activeOrganizationId || undefined)
})

const refreshLive = async () => {
  await fixtureStore.fetchLiveFixtures(authStore.activeOrganizationId || undefined)
}

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

const liveCount = computed(() => liveFixtures.value.length)

const statusLabel = (fixture: Fixture) => {
  if (fixture.status === FixtureStatus.EXTRATIME) return 'ET'
  if (fixture.status === FixtureStatus.NORMAL_TIME_ENDED) return 'FT'
  return 'LIVE'
}

const teamName = (side: 'home' | 'away', fixture: Fixture) => {
  const team = side === 'home' ? fixture.homeTeam : fixture.awayTeam
  return team?.customShortName || team?.customName || (side === 'home' ? 'Home' : 'Away')
}
const teamInitial = (side: 'home' | 'away', fixture: Fixture) =>
  teamName(side, fixture).charAt(0).toUpperCase()

// Match control modal
const showMatchControlModal = ref(false)
const selectedFixture = ref<Fixture | null>(null)

const openMatchControl = (fixture: Fixture) => {
  selectedFixture.value = { ...fixture }
  showMatchControlModal.value = true
}

const handleFixtureUpdated = async (fixture: Fixture) => {
  selectedFixture.value = fixture
  await refreshLive()
}

const handleMatchEnded = async () => {
  await refreshLive()
}
</script>

<template>
  <div class="flex flex-col gap-6 max-w-5xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <h1 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
        Live Control
        <span
          v-if="liveCount > 0"
          class="inline-flex items-center gap-1.5 bg-red-500/10 text-red-500 border border-red-500/40 text-[10px] font-extrabold tracking-widest uppercase px-2.5 py-1 rounded-full"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
          {{ liveCount }} match{{ liveCount === 1 ? '' : 'es' }} live
        </span>
      </h1>
      <div class="flex items-center gap-3">
        <span class="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <UIcon name="i-heroicons-arrow-path" class="w-3.5 h-3.5" />
          Scores update in real time
        </span>
        <UButton
          icon="i-heroicons-arrow-path"
          variant="ghost"
          color="neutral"
          size="sm"
          :loading="loading"
          @click="refreshLive"
        >
          Refresh
        </UButton>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && liveFixtures.length === 0" class="flex flex-col gap-4 animate-pulse">
      <div v-for="i in 2" :key="i" class="h-40 bg-gray-100 dark:bg-white/5 rounded-2xl"></div>
    </div>

    <!-- Error State -->
    <UAlert
      v-else-if="error && liveFixtures.length === 0"
      color="error"
      variant="subtle"
      icon="i-heroicons-exclamation-triangle"
      :title="error"
    />

    <!-- Empty State -->
    <div
      v-else-if="!loading && liveFixtures.length === 0"
      class="flex flex-col items-center justify-center text-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl px-6 py-16"
    >
      <div class="w-16 h-16 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4">
        <UIcon name="i-heroicons-signal-slash" class="w-8 h-8 text-gray-400" />
      </div>
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-1.5">Nothing live right now</h3>
      <p class="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-6">
        When a match kicks off, it shows up here with one-tap control. Start a fixture from a tournament page to see it here.
      </p>
      <UButton label="Go to Tournaments" icon="i-heroicons-trophy" variant="outline" color="neutral" to="/tournaments" />
    </div>

    <!-- Live fixtures grouped by tournament -->
    <div v-else class="flex flex-col gap-4">
      <section
        v-for="(group, tournamentId) in fixturesByTournament"
        :key="tournamentId"
        class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/[0.06] rounded-2xl overflow-hidden"
      >
        <header class="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-white/5">
          <NuxtLink
            :to="`/tournaments/${group.customName || tournamentId}`"
            class="text-sm font-bold text-gray-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            {{ group.tournamentName }}
          </NuxtLink>
          <span class="inline-flex items-center gap-1.5 bg-red-500/10 text-red-500 border border-red-500/30 text-[10px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-full ml-auto">
            {{ group.fixtures.length }} live
          </span>
        </header>

        <div
          v-for="fixture in group.fixtures"
          :key="fixture.id"
          class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-5 py-3.5 border-b border-gray-100 dark:border-white/5 last:border-b-0 bg-red-50/40 dark:bg-red-500/[0.04] hover:bg-red-50 dark:hover:bg-red-500/[0.07] transition-colors cursor-pointer"
          @click="openMatchControl(fixture)"
        >
          <!-- status -->
          <div class="flex items-center gap-2 shrink-0 w-16">
            <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <span class="font-mono text-xs font-bold text-red-600 dark:text-red-400">{{ statusLabel(fixture) }}</span>
          </div>

          <!-- teams + score -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 text-sm">
              <span class="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-gray-300 shrink-0 overflow-hidden">
                <img v-if="fixture.homeTeam?.logoUrl" :src="fixture.homeTeam.logoUrl" class="w-full h-full object-cover" alt="" />
                <template v-else>{{ teamInitial('home', fixture) }}</template>
              </span>
              <span class="font-semibold text-gray-900 dark:text-white truncate">{{ teamName('home', fixture) }}</span>
              <span class="font-mono font-bold text-gray-900 dark:text-white whitespace-nowrap px-1">
                {{ fixture.homeScore ?? 0 }} - {{ fixture.awayScore ?? 0 }}
              </span>
              <span class="font-semibold text-gray-900 dark:text-white truncate">{{ teamName('away', fixture) }}</span>
              <span class="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-gray-300 shrink-0 overflow-hidden">
                <img v-if="fixture.awayTeam?.logoUrl" :src="fixture.awayTeam.logoUrl" class="w-full h-full object-cover" alt="" />
                <template v-else>{{ teamInitial('away', fixture) }}</template>
              </span>
            </div>
          </div>

          <!-- control -->
          <div class="flex items-center gap-2 shrink-0 pl-7 sm:pl-0">
            <UBadge color="warning" variant="soft" size="sm">Live</UBadge>
            <UButton
              size="xs"
              color="error"
              variant="soft"
              icon="i-heroicons-adjustments-horizontal"
              @click.stop="openMatchControl(fixture)"
            >
              Control match
            </UButton>
          </div>
        </div>
      </section>
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
