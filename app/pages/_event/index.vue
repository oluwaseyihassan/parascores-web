<script setup lang="ts">
import { hubMeta, type HubSport } from '~/components/event/mock'
import type { LiveCard, EventHubFixture } from '~/composables/useEventHub'
import type { TournamentDetail } from '~/components/event/EventHubMatchModal.vue'

definePageMeta({
  layout: 'event',
})

const hub = useEventHub()
await hub.fetchHub()

// Connect the singleton SSE stream (registers its own lifecycle hooks in setup)
if (!hub.isMock.value) {
  useLiveStream()
}
onMounted(() => hub.startLiveUpdates())
onUnmounted(() => hub.stopLiveUpdates())

const { meta, sports, schedule, medals, ticker, liveCards, isMock, pending } = hub

useSeoMeta({
  title: () => `${meta.value.name} — Live Results Hub | Powered by ParaScores`,
  description: () => `Live scores, results, schedules and medal table for ${meta.value.name}.`,
})

const activeTab = ref('overview')
const activeSport = ref<HubSport | null>(null)
const activeLiveCard = ref<LiveCard | null>(null)

const switchTab = (tab: string) => {
  activeTab.value = tab
  if (import.meta.client) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const openSport = (sport: HubSport) => {
  activeSport.value = sport
}

// Real tournament detail for the modal (derived from live hub data)
const activeTournament = computed<TournamentDetail | null>(() => {
  const tid = activeSport.value?.tournamentId
  if (!tid || !hub.liveData.value) return null
  return {
    name: activeSport.value!.name,
    live: hub.liveData.value.live.filter((f) => f.tournament_id === tid),
    upcoming: hub.liveData.value.upcoming.filter((f) => f.tournament_id === tid),
    results: hub.liveData.value.results.filter((f) => f.tournament_id === tid),
  }
})

// Open a fixture's match centre from within the tournament view.
// Live rows reuse the shared card; completed rows get a card built on the fly
// so set scores / events are viewable after the match too.
const teamDisplayFor = (
  team: EventHubFixture['homeTeam'],
  placeholder: string | null,
) => {
  const name = team?.customName ?? team?.team?.name ?? placeholder ?? 'TBD'
  const abbr = (team?.customShortName ?? name.slice(0, 3)).toUpperCase()
  return { name, abbr, logoUrl: team?.logoUrl ?? null }
}

const openFixtureFromTournament = (fixture: EventHubFixture) => {
  const existing = liveCards.value.find((c) => c.fixture.id === fixture.id)
  activeSport.value = null
  activeLiveCard.value = existing ?? {
    fixture,
    label: [fixture.tournament.name, fixture.roundName, fixture.venue].filter(Boolean).join(' · '),
    clock: null,
    home: teamDisplayFor(fixture.homeTeam, fixture.homeTeamPlaceholder),
    away: teamDisplayFor(fixture.awayTeam, fixture.awayTeamPlaceholder),
    hs: fixture.homeScore ?? 0,
    as: fixture.awayScore ?? 0,
    lastEvent: null,
  }
}
</script>

<template>
  <div>
    <EventHubHeader
      :active-tab="activeTab"
      :meta="meta"
      :real-data="!isMock"
      @update:active-tab="switchTab"
    />

    <EventHubHero :meta="meta" />

    <EventHubTicker :items="ticker" />

    <main class="max-w-7xl mx-auto px-4 py-6 space-y-10">
      <!-- Overview tab -->
      <div v-if="activeTab === 'overview'" class="space-y-10">
        <EventHubLiveNow
          :cards="isMock ? null : liveCards"
          @open="(key) => openSport(sports.find(s => s.detail === key)!)"
          @open-fixture="(card) => (activeLiveCard = card)"
        />

        <EventHubMedalTable :medals="medals" mode="preview" @view-all="switchTab('medals')" />

        <section>
          <h2 class="text-xl font-black tracking-tight mb-3">All {{ sports.length }} Disciplines</h2>
          <EventHubSportsGrid :sports="sports" @open="openSport" />
        </section>

        <EventHubSchedule :items="schedule" :limit="3" header @view-all="switchTab('schedule')" />
      </div>

      <!-- Medals tab -->
      <div v-else-if="activeTab === 'medals'">
        <EventHubMedalTable :medals="medals" mode="full" />
      </div>

      <!-- Sports tab -->
      <div v-else-if="activeTab === 'sports'">
        <h2 class="text-xl font-black tracking-tight mb-3">All {{ sports.length }} Disciplines — tap any sport</h2>
        <EventHubSportsGrid :sports="sports" big @open="openSport" />
      </div>

      <!-- Schedule tab -->
      <div v-else-if="activeTab === 'schedule'">
        <h2 class="text-xl font-black tracking-tight mb-3">Today's Schedule</h2>
        <EventHubSchedule :items="schedule" />
      </div>
    </main>

    <footer class="border-t border-white/10 mt-12">
      <div class="max-w-7xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center gap-3 text-xs text-white/40">
        <img :src="meta.logo" :alt="meta.name" class="h-8 w-auto">
        <span>{{ meta.name }} · {{ meta.venue }}, {{ meta.location }} · {{ meta.dates }}</span>
        <span class="sm:ml-auto flex items-center gap-1.5">
          Powered by <img :src="meta.parascoresLogo" class="h-4 w-4 rounded" alt=""> <b class="text-emerald-400">ParaScores</b>
        </span>
      </div>
    </footer>

    <!-- Live refresh indicator (SSE-driven refetches) -->
    <Transition name="fade">
      <div
        v-if="pending"
        class="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full px-3 py-1.5 bg-[#0b1226]/90 border border-white/10"
      >
        <img :src="meta.mascotHead" alt="" class="h-5 w-auto animate-pulse">
        <span class="text-[10px] text-white/50 font-bold uppercase tracking-wider">Updating</span>
      </div>
    </Transition>

    <EventHubMatchModal
      :sport="activeSport"
      :live-card="activeLiveCard"
      :tournament="activeTournament"
      @close="activeSport = null; activeLiveCard = null"
      @open-fixture="openFixtureFromTournament"
    />
  </div>
</template>

<style>
.live-dot {
  animation: pulse 1.5s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
