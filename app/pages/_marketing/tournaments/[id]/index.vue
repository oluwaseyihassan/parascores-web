<script setup lang="ts">
import type { Tournament, Fixture, Standing } from '~/types'
import { TournamentType, FixtureStatus, FixtureStage } from '~/types'

definePageMeta({
  layout: 'widget'
})

const route = useRoute()
const tournamentId = route.params.id as string

// State
const tournament = ref<Tournament | null>(null)
const fixtures = ref<Fixture[]>([])
const standings = ref<Standing[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const activeTab = ref<'fixtures' | 'standings' | 'bracket'>('fixtures')

// Fetch data
async function fetchData() {
  loading.value = true
  error.value = null
  try {
    const [tournamentRes, fixturesRes, standingsRes] = await Promise.all([
      $publicApi<any>(`/tournaments/${tournamentId}`),
      $publicApi<any>(`/tournaments/${tournamentId}/fixtures`).catch(() => null),
      $publicApi<any>(`/tournaments/${tournamentId}/standings`).catch(() => null)
    ])
    
    tournament.value = tournamentRes?.data || tournamentRes
    
    // Handle fixtures: may be { rounds: [...] } or flat array
    const fixturesData = fixturesRes?.data || fixturesRes
    if (fixturesData?.rounds) {
      fixtures.value = fixturesData.rounds.flatMap((r: any) => r.fixtures || [])
    } else if (Array.isArray(fixturesData)) {
      fixtures.value = fixturesData
    } else {
      fixtures.value = []
    }
    
    // Handle standings
    const standingsData = standingsRes?.data || standingsRes
    if (Array.isArray(standingsData)) {
      standings.value = standingsData
    } else if (standingsData?.standings) {
      standings.value = standingsData.standings
    } else {
      standings.value = []
    }
  } catch (e: any) {
    error.value = e.message || 'Failed to load tournament'
    console.error('Tournament detail error:', e)
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)

// SEO
watchEffect(() => {
  if (tournament.value) {
    useSeoMeta({
      title: `${tournament.value.name} | ParaScores`,
      description: tournament.value.description || `Follow ${tournament.value.name} live scores, fixtures, standings, and brackets.`,
      ogTitle: `${tournament.value.name} | ParaScores`,
      ogDescription: tournament.value.description || `Follow ${tournament.value.name} live scores, fixtures, standings, and brackets.`,
    })
  }
})

// Computed
const hasLiveFixtures = computed(() => fixtures.value.some(f => f.status === FixtureStatus.LIVE))

const isHybrid = computed(() => tournament.value?.type === TournamentType.HYBRID)
const showBracketTab = computed(() => {
  if (!tournament.value) return false
  return tournament.value.type === TournamentType.KNOCKOUT || tournament.value.type === TournamentType.HYBRID
})

// Fixtures grouped by round
const groupStageFixtures = computed(() => fixtures.value.filter(f => f.stage === FixtureStage.GROUP_STAGE))
const knockoutFixtures = computed(() => fixtures.value.filter(f => f.stage === FixtureStage.KNOCKOUT))

function groupByRound(list: Fixture[]) {
  const grouped: Record<number, { name: string; fixtures: Fixture[] }> = {}
  for (const fixture of list) {
    const round = fixture.round || 1
    if (!grouped[round]) {
      grouped[round] = { name: fixture.roundName || `Round ${round}`, fixtures: [] }
    }
    grouped[round].fixtures.push(fixture)
  }
  return grouped
}

const fixturesByRound = computed(() => {
  if (isHybrid.value) return groupByRound(groupStageFixtures.value)
  return groupByRound(fixtures.value)
})
const sortedRounds = computed(() => Object.keys(fixturesByRound.value).map(Number).sort((a, b) => a - b))

const knockoutByRound = computed(() => groupByRound(knockoutFixtures.value))
const knockoutRounds = computed(() => Object.keys(knockoutByRound.value).map(Number).sort((a, b) => a - b))

// Standings grouped by group
const standingsByGroup = computed(() => {
  const grouped: Record<string, Standing[]> = {}
  standings.value.forEach(s => {
    const group = s.group || 'default'
    if (!grouped[group]) grouped[group] = []
    grouped[group].push(s)
  })
  Object.keys(grouped).forEach(key => {
    grouped[key]!.sort((a, b) => (a.position || 0) - (b.position || 0))
  })
  return grouped
})

// Bracket
const bracketFixtures = computed(() => {
  if (isHybrid.value) return knockoutFixtures.value
  return fixtures.value
})
const bracketRounds = computed(() => {
  const grouped: Record<number, Fixture[]> = {}
  for (const f of bracketFixtures.value) {
    const r = f.round || 1
    if (!grouped[r]) grouped[r] = []
    grouped[r].push(f)
  }
  return Object.keys(grouped).map(Number).sort((a, b) => a - b)
})
const bracketByRound = computed(() => {
  const grouped: Record<number, Fixture[]> = {}
  for (const f of bracketFixtures.value) {
    const r = f.round || 1
    if (!grouped[r]) grouped[r] = []
    grouped[r].push(f)
  }
  return grouped
})

// Collapsible rounds
const collapsedRounds = ref<Set<number>>(new Set())
function toggleRound(round: number) {
  const s = new Set(collapsedRounds.value)
  if (s.has(round)) s.delete(round)
  else s.add(round)
  collapsedRounds.value = s
}

// Helpers
function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function formatTime(dateStr?: string | null) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}
function formatType(type: string) {
  const map: Record<string, string> = {
    KNOCKOUT: 'Knockout', ROUND_ROBIN: 'Round Robin', GROUP: 'Group Stage',
    HYBRID: 'Hybrid', FRIENDLY: 'Friendly'
  }
  return map[type] || type
}
function getTypeBadgeClasses(type: string) {
  switch (type) {
    case 'KNOCKOUT': return 'bg-red-500/20 text-red-400 border-red-500/30'
    case 'ROUND_ROBIN': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    case 'GROUP': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    case 'HYBRID': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    case 'FRIENDLY': return 'bg-green-500/20 text-green-400 border-green-500/30'
    default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }
}
function getRoundDisplayName(roundIndex: number, totalRounds: number, roundName?: string | null) {
  if (roundName) return roundName
  const remaining = totalRounds - roundIndex
  switch (remaining) {
    case 1: return 'Final'
    case 2: return 'Semi-Final'
    case 3: return 'Quarter-Final'
    case 4: return 'Round of 16'
    default: return `Round ${roundIndex + 1}`
  }
}
function getTeamClass(fixture: Fixture, isHome: boolean) {
  if (fixture.status !== FixtureStatus.COMPLETED) return ''
  const hs = fixture.homeScore ?? 0
  const as = fixture.awayScore ?? 0
  const isWinner = isHome ? hs > as : as > hs
  const isLoser = isHome ? hs < as : as < hs
  if (isWinner) return 'font-bold'
  if (isLoser) return 'opacity-50'
  return ''
}
</script>

<template>
  <div>
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center min-h-[60vh]">
      <div class="flex flex-col items-center gap-4">
        <div class="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <span class="text-sm text-gray-400">Loading tournament...</span>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex items-center justify-center min-h-[60vh]">
      <div class="text-center">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 class="text-lg font-semibold mb-2">Failed to load tournament</h3>
        <p class="text-sm text-gray-400 mb-4">{{ error }}</p>
        <NuxtLink to="/explore" class="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
          ← Back to Explore
        </NuxtLink>
      </div>
    </div>

    <!-- Content -->
    <div v-else-if="tournament">
      <!-- Hero Banner -->
      <section class="relative overflow-hidden">
        <!-- Banner Background -->
        <div class="absolute inset-0 h-64 md:h-80">
          <img
            v-if="tournament.bannerUrl"
            :src="tournament.bannerUrl"
            class="w-full h-full object-cover"
          />
          <div
            v-else
            class="w-full h-full"
            :style="{ background: 'linear-gradient(135deg, #0a1628 0%, #1a3050 40%, #0d1f35 100%)' }"
          ></div>
          <div class="absolute inset-0 bg-gradient-to-b from-[#0A0F1C]/40 via-[#0A0F1C]/70 to-[#0A0F1C]"></div>
        </div>

        <!-- Header Content -->
        <div class="relative max-w-5xl mx-auto px-6 pt-24 md:pt-32 pb-8">
          <!-- Back link -->
          <NuxtLink to="/explore" class="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-emerald-400 transition-colors mb-6">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Explore
          </NuxtLink>

          <div class="flex items-start gap-5">
            <!-- Logo -->
            <div class="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden bg-white/10 backdrop-blur-md border border-white/20 flex-shrink-0 shadow-xl">
              <img v-if="tournament.logoUrl" :src="tournament.logoUrl" class="w-full h-full object-cover" />
              <span v-else class="flex items-center justify-center w-full h-full text-2xl font-bold text-white/60">
                {{ tournament.name.charAt(0).toUpperCase() }}
              </span>
            </div>

            <div class="flex-1 min-w-0">
              <!-- Type Badge -->
              <span :class="['px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded border mb-2 inline-block', getTypeBadgeClasses(tournament.type)]">
                {{ formatType(tournament.type) }}
              </span>

              <!-- Name -->
              <h1 class="text-2xl md:text-4xl font-bold text-white leading-tight mb-2">
                {{ tournament.name }}
              </h1>

              <!-- Meta -->
              <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-400">
                <div class="flex items-center gap-1.5">
                  <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {{ formatDate(tournament.start_date) }} — {{ formatDate(tournament.end_date) }}
                </div>
                <div v-if="tournament.location" class="flex items-center gap-1.5">
                  <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {{ tournament.location }}
                </div>
                <div class="flex items-center gap-1.5">
                  <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {{ tournament.sport }}
                </div>
                <div v-if="hasLiveFixtures" class="flex items-center gap-1.5 text-red-400">
                  <span class="w-2 h-2 bg-red-400 rounded-full animate-pulse"></span>
                  Live Now
                </div>
              </div>

              <p v-if="tournament.description" class="text-sm text-gray-500 mt-3 max-w-2xl line-clamp-2">
                {{ tournament.description }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Tabs -->
      <section class="border-b border-white/10 sticky top-0 z-20 bg-[#0A0F1C]/95 backdrop-blur-md">
        <div class="max-w-5xl mx-auto px-6">
          <nav class="flex gap-1 -mb-px">
            <button
              @click="activeTab = 'fixtures'"
              :class="[
                'px-5 py-3.5 text-sm font-medium border-b-2 transition-all duration-200',
                activeTab === 'fixtures'
                  ? 'text-emerald-400 border-emerald-400'
                  : 'text-gray-500 border-transparent hover:text-gray-300 hover:border-white/20'
              ]"
            >
              Fixtures
              <span v-if="fixtures.length" class="ml-1.5 text-xs opacity-60">{{ fixtures.length }}</span>
            </button>
            <button
              v-if="standings.length > 0"
              @click="activeTab = 'standings'"
              :class="[
                'px-5 py-3.5 text-sm font-medium border-b-2 transition-all duration-200',
                activeTab === 'standings'
                  ? 'text-emerald-400 border-emerald-400'
                  : 'text-gray-500 border-transparent hover:text-gray-300 hover:border-white/20'
              ]"
            >
              Standings
            </button>
            <button
              v-if="showBracketTab"
              @click="activeTab = 'bracket'"
              :class="[
                'px-5 py-3.5 text-sm font-medium border-b-2 transition-all duration-200',
                activeTab === 'bracket'
                  ? 'text-emerald-400 border-emerald-400'
                  : 'text-gray-500 border-transparent hover:text-gray-300 hover:border-white/20'
              ]"
            >
              Bracket
            </button>
          </nav>
        </div>
      </section>

      <!-- Tab Content -->
      <section class="max-w-5xl mx-auto px-6 py-8">

        <!-- ====== FIXTURES TAB ====== -->
        <div v-if="activeTab === 'fixtures'">
          <div v-if="fixtures.length === 0" class="text-center py-16">
            <p class="text-sm text-gray-500">No fixtures available yet.</p>
          </div>
          <div v-else class="space-y-4">
            <!-- Group Stage label for hybrid -->
            <div v-if="isHybrid && groupStageFixtures.length > 0" class="flex items-center gap-2 px-1 mb-1">
              <div class="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
              <span class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Group Stage</span>
            </div>

            <div v-for="round in sortedRounds" :key="round" class="bg-[#111827] border border-white/[0.08] rounded-xl overflow-hidden">
              <!-- Round Header -->
              <button
                @click="toggleRound(round)"
                class="w-full flex items-center justify-between px-5 py-3 cursor-pointer select-none border-b"
                :class="collapsedRounds.has(round) ? 'border-transparent' : 'border-white/[0.06]'"
              >
                <h3 class="text-[12px] font-semibold uppercase tracking-wide text-gray-400">
                  {{ fixturesByRound[round]?.name }}
                </h3>
                <svg
                  class="w-4 h-4 text-gray-500 transition-transform duration-200"
                  :class="collapsedRounds.has(round) ? '-rotate-90' : 'rotate-0'"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <!-- Fixtures -->
              <div class="round-content" :class="{ collapsed: collapsedRounds.has(round) }">
                <NuxtLink
                  v-for="(fixture, i) in fixturesByRound[round]?.fixtures"
                  :key="fixture.id"
                  :to="`/tournaments/${tournamentId}/fixture/${fixture.id}`"
                  class="fixture-row flex items-center px-5 py-3.5"
                  :class="{ 'border-t border-white/[0.06]': i > 0 }"
                >
                  <!-- Home -->
                  <div class="flex-1 flex items-center justify-end gap-2.5 min-w-0">
                    <span class="text-[13px] font-medium text-gray-200 truncate text-right">
                      {{ fixture.homeTeam?.customName || fixture.homeTeamPlaceholder || 'TBD' }}
                    </span>
                    <div class="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-white/10">
                      <img v-if="fixture.homeTeam?.logoUrl" :src="fixture.homeTeam.logoUrl" class="w-full h-full object-cover" />
                      <span v-else class="flex items-center justify-center w-full h-full text-[10px] font-bold text-gray-500">
                        {{ (fixture.homeTeam?.customName || 'H').charAt(0) }}
                      </span>
                    </div>
                  </div>

                  <!-- Score / Time -->
                  <div class="w-24 flex-shrink-0 flex flex-col items-center justify-center mx-3">
                    <template v-if="fixture.status === FixtureStatus.LIVE">
                      <div class="flex items-center gap-1.5">
                        <span class="text-base font-bold text-white">{{ fixture.homeScore ?? 0 }}</span>
                        <span class="text-[10px] text-gray-600">-</span>
                        <span class="text-base font-bold text-white">{{ fixture.awayScore ?? 0 }}</span>
                      </div>
                      <span class="text-[9px] font-semibold text-red-400 mt-0.5 flex items-center gap-1">
                        <span class="w-1 h-1 bg-red-400 rounded-full animate-pulse"></span>
                        LIVE
                      </span>
                    </template>
                    <template v-else-if="fixture.status === FixtureStatus.COMPLETED">
                      <div class="flex items-center gap-1.5">
                        <span class="text-base font-bold text-white">{{ fixture.homeScore ?? 0 }}</span>
                        <span class="text-[10px] text-gray-600">-</span>
                        <span class="text-base font-bold text-white">{{ fixture.awayScore ?? 0 }}</span>
                      </div>
                      <span class="text-[9px] font-medium text-gray-500 mt-0.5">FT</span>
                    </template>
                    <template v-else-if="fixture.status === FixtureStatus.CANCELLED">
                      <span class="text-[10px] font-medium text-gray-600">CANC</span>
                    </template>
                    <template v-else>
                      <span v-if="fixture.startTime" class="text-[13px] font-semibold text-gray-300">
                        {{ formatTime(fixture.startTime) }}
                      </span>
                      <span v-else class="text-[11px] font-medium text-gray-500">vs</span>
                    </template>
                  </div>

                  <!-- Away -->
                  <div class="flex-1 flex items-center gap-2.5 min-w-0">
                    <div class="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-white/10">
                      <img v-if="fixture.awayTeam?.logoUrl" :src="fixture.awayTeam.logoUrl" class="w-full h-full object-cover" />
                      <span v-else class="flex items-center justify-center w-full h-full text-[10px] font-bold text-gray-500">
                        {{ (fixture.awayTeam?.customName || 'A').charAt(0) }}
                      </span>
                    </div>
                    <span class="text-[13px] font-medium text-gray-200 truncate">
                      {{ fixture.awayTeam?.customName || fixture.awayTeamPlaceholder || 'TBD' }}
                    </span>
                  </div>

                  <!-- Arrow -->
                  <svg class="w-4 h-4 text-gray-600 ml-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </NuxtLink>
              </div>
            </div>

            <!-- Knockout fixtures for hybrid -->
            <template v-if="isHybrid && knockoutFixtures.length > 0">
              <div class="flex items-center gap-2 px-1 mt-3 mb-1">
                <div class="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                <span class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Knockout Stage</span>
              </div>

              <div v-for="round in knockoutRounds" :key="'ko-' + round" class="bg-[#111827] border border-white/[0.08] rounded-xl overflow-hidden">
                <button
                  @click="toggleRound(round + 1000)"
                  class="w-full flex items-center justify-between px-5 py-3 cursor-pointer select-none border-b"
                  :class="collapsedRounds.has(round + 1000) ? 'border-transparent' : 'border-white/[0.06]'"
                >
                  <h3 class="text-[12px] font-semibold uppercase tracking-wide text-gray-400">
                    {{ knockoutByRound[round]?.name }}
                  </h3>
                  <svg
                    class="w-4 h-4 text-gray-500 transition-transform duration-200"
                    :class="collapsedRounds.has(round + 1000) ? '-rotate-90' : 'rotate-0'"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <div class="round-content" :class="{ collapsed: collapsedRounds.has(round + 1000) }">
                  <NuxtLink
                    v-for="(fixture, i) in knockoutByRound[round]?.fixtures"
                    :key="fixture.id"
                    :to="`/tournaments/${tournamentId}/fixture/${fixture.id}`"
                    class="fixture-row flex items-center px-5 py-3.5"
                    :class="{ 'border-t border-white/[0.06]': i > 0 }"
                  >
                    <div class="flex-1 flex items-center justify-end gap-2.5 min-w-0">
                      <span class="text-[13px] font-medium text-gray-200 truncate text-right">{{ fixture.homeTeam?.customName || fixture.homeTeamPlaceholder || 'TBD' }}</span>
                      <div class="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-white/10">
                        <img v-if="fixture.homeTeam?.logoUrl" :src="fixture.homeTeam.logoUrl" class="w-full h-full object-cover" />
                        <span v-else class="flex items-center justify-center w-full h-full text-[10px] font-bold text-gray-500">{{ (fixture.homeTeam?.customName || 'H').charAt(0) }}</span>
                      </div>
                    </div>
                    <div class="w-24 flex-shrink-0 flex flex-col items-center justify-center mx-3">
                      <template v-if="fixture.status === FixtureStatus.LIVE">
                        <div class="flex items-center gap-1.5">
                          <span class="text-base font-bold text-white">{{ fixture.homeScore ?? 0 }}</span>
                          <span class="text-[10px] text-gray-600">-</span>
                          <span class="text-base font-bold text-white">{{ fixture.awayScore ?? 0 }}</span>
                        </div>
                        <span class="text-[9px] font-semibold text-red-400 mt-0.5 flex items-center gap-1">
                          <span class="w-1 h-1 bg-red-400 rounded-full animate-pulse"></span>LIVE
                        </span>
                      </template>
                      <template v-else-if="fixture.status === FixtureStatus.COMPLETED">
                        <div class="flex items-center gap-1.5">
                          <span class="text-base font-bold text-white">{{ fixture.homeScore ?? 0 }}</span>
                          <span class="text-[10px] text-gray-600">-</span>
                          <span class="text-base font-bold text-white">{{ fixture.awayScore ?? 0 }}</span>
                        </div>
                        <span class="text-[9px] font-medium text-gray-500 mt-0.5">FT</span>
                      </template>
                      <template v-else>
                        <span v-if="fixture.startTime" class="text-[13px] font-semibold text-gray-300">{{ formatTime(fixture.startTime) }}</span>
                        <span v-else class="text-[11px] font-medium text-gray-500">vs</span>
                      </template>
                    </div>
                    <div class="flex-1 flex items-center gap-2.5 min-w-0">
                      <div class="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-white/10">
                        <img v-if="fixture.awayTeam?.logoUrl" :src="fixture.awayTeam.logoUrl" class="w-full h-full object-cover" />
                        <span v-else class="flex items-center justify-center w-full h-full text-[10px] font-bold text-gray-500">{{ (fixture.awayTeam?.customName || 'A').charAt(0) }}</span>
                      </div>
                      <span class="text-[13px] font-medium text-gray-200 truncate">{{ fixture.awayTeam?.customName || fixture.awayTeamPlaceholder || 'TBD' }}</span>
                    </div>
                    <svg class="w-4 h-4 text-gray-600 ml-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </NuxtLink>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- ====== STANDINGS TAB ====== -->
        <div v-else-if="activeTab === 'standings'">
          <div v-if="standings.length === 0" class="text-center py-16">
            <p class="text-sm text-gray-500">No standings available yet.</p>
          </div>
          <div v-else class="space-y-6">
            <div v-for="(groupStandings, groupName) in standingsByGroup" :key="groupName">
              <h4 v-if="groupName !== 'default'" class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
                {{ groupName }}
              </h4>
              <div class="bg-[#111827] border border-white/[0.08] rounded-xl overflow-hidden">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b border-white/[0.06]">
                      <th class="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 w-8">#</th>
                      <th class="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Team</th>
                      <th class="text-center px-2 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 hidden sm:table-cell">P</th>
                      <th class="text-center px-2 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 hidden sm:table-cell">W</th>
                      <th class="text-center px-2 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 hidden sm:table-cell">D</th>
                      <th class="text-center px-2 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 hidden sm:table-cell">L</th>
                      <th class="text-center px-2 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 hidden md:table-cell">GD</th>
                      <th class="text-center px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-emerald-400">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr 
                      v-for="standing in groupStandings" 
                      :key="standing.id"
                      class="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                    >
                      <td class="px-4 py-3 text-xs font-bold text-gray-500">{{ standing.position }}</td>
                      <td class="px-4 py-3">
                        <div class="flex items-center gap-2.5">
                          <div class="w-6 h-6 rounded-full bg-white/10 overflow-hidden flex-shrink-0">
                            <img v-if="standing.participant?.logoUrl" :src="standing.participant.logoUrl" class="w-full h-full object-cover" />
                            <span v-else class="flex items-center justify-center w-full h-full text-[9px] font-bold text-gray-500">
                              {{ (standing.participant?.customName || 'T').charAt(0) }}
                            </span>
                          </div>
                          <span class="text-[13px] font-medium text-gray-200 truncate">{{ standing.participant?.customName || 'Unknown' }}</span>
                        </div>
                      </td>
                      <td class="text-center px-2 py-3 text-[13px] text-gray-400 hidden sm:table-cell">{{ standing.played }}</td>
                      <td class="text-center px-2 py-3 text-[13px] text-gray-400 hidden sm:table-cell">{{ standing.wins }}</td>
                      <td class="text-center px-2 py-3 text-[13px] text-gray-400 hidden sm:table-cell">{{ standing.draws }}</td>
                      <td class="text-center px-2 py-3 text-[13px] text-gray-400 hidden sm:table-cell">{{ standing.losses }}</td>
                      <td class="text-center px-2 py-3 text-[13px] hidden md:table-cell" :class="standing.goalDiff > 0 ? 'text-emerald-400' : standing.goalDiff < 0 ? 'text-red-400' : 'text-gray-500'">
                        {{ standing.goalDiff > 0 ? '+' : '' }}{{ standing.goalDiff }}
                      </td>
                      <td class="text-center px-4 py-3 text-[13px] font-bold text-white">{{ standing.points }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- ====== BRACKET TAB ====== -->
        <div v-else-if="activeTab === 'bracket'">
          <div v-if="bracketRounds.length === 0" class="text-center py-16">
            <p class="text-sm text-gray-500">No bracket data available yet.</p>
          </div>
          <div v-else class="overflow-x-auto pb-6">
            <div class="flex gap-8 min-w-max">
              <div v-for="(round, roundIndex) in bracketRounds" :key="round" class="flex flex-col">
                <!-- Round Header -->
                <div class="text-center mb-4">
                  <span class="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    {{ getRoundDisplayName(roundIndex, bracketRounds.length, bracketByRound[round]?.[0]?.roundName) }}
                  </span>
                </div>

                <!-- Matches -->
                <div 
                  class="flex flex-col justify-around flex-1 gap-4"
                  :style="{ minHeight: `${(bracketByRound[bracketRounds[0] ?? 0]?.length || 1) * 90}px` }"
                >
                  <NuxtLink
                    v-for="fixture in bracketByRound[round]"
                    :key="fixture.id"
                    :to="`/tournaments/${tournamentId}/fixture/${fixture.id}`"
                    class="w-56 rounded-xl border bg-[#111827] border-white/[0.08] overflow-hidden hover:border-emerald-500/30 transition-all group"
                  >
                    <!-- Home -->
                    <div 
                      class="flex items-center justify-between px-3.5 py-2.5 border-b border-white/[0.06]"
                      :class="getTeamClass(fixture, true)"
                    >
                      <div class="flex items-center gap-2 flex-1 min-w-0">
                        <div class="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 bg-white/10">
                          <img v-if="fixture.homeTeam?.logoUrl" :src="fixture.homeTeam.logoUrl" class="w-full h-full object-cover" />
                          <span v-else class="flex items-center justify-center w-full h-full text-[8px] font-bold text-gray-500">
                            {{ (fixture.homeTeam?.customName || 'TBD').charAt(0) }}
                          </span>
                        </div>
                        <span class="text-xs text-gray-200 truncate">{{ fixture.homeTeam?.customName || 'TBD' }}</span>
                      </div>
                      <span 
                        class="text-sm font-bold min-w-[1.5rem] text-center"
                        :class="fixture.status === FixtureStatus.COMPLETED || fixture.status === FixtureStatus.LIVE ? 'text-white' : 'text-gray-600'"
                      >
                        {{ fixture.status === FixtureStatus.COMPLETED || fixture.status === FixtureStatus.LIVE ? (fixture.homeScore ?? 0) : '-' }}
                      </span>
                    </div>
                    <!-- Away -->
                    <div class="flex items-center justify-between px-3.5 py-2.5" :class="getTeamClass(fixture, false)">
                      <div class="flex items-center gap-2 flex-1 min-w-0">
                        <div class="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 bg-white/10">
                          <img v-if="fixture.awayTeam?.logoUrl" :src="fixture.awayTeam.logoUrl" class="w-full h-full object-cover" />
                          <span v-else class="flex items-center justify-center w-full h-full text-[8px] font-bold text-gray-500">
                            {{ (fixture.awayTeam?.customName || 'TBD').charAt(0) }}
                          </span>
                        </div>
                        <span class="text-xs text-gray-200 truncate">{{ fixture.awayTeam?.customName || 'TBD' }}</span>
                      </div>
                      <span 
                        class="text-sm font-bold min-w-[1.5rem] text-center"
                        :class="fixture.status === FixtureStatus.COMPLETED || fixture.status === FixtureStatus.LIVE ? 'text-white' : 'text-gray-600'"
                      >
                        {{ fixture.status === FixtureStatus.COMPLETED || fixture.status === FixtureStatus.LIVE ? (fixture.awayScore ?? 0) : '-' }}
                      </span>
                    </div>
                    <!-- Live badge -->
                    <div v-if="fixture.status === FixtureStatus.LIVE" class="text-center py-1 bg-red-500/10">
                      <span class="text-[10px] font-medium text-red-400">● LIVE</span>
                    </div>
                  </NuxtLink>
                </div>
              </div>
            </div>
          </div>
        </div>

      </section>
    </div>
  </div>
</template>

<style scoped>
.fixture-row {
  transition: background-color 0.15s ease;
}
.fixture-row:hover {
  background-color: rgba(128, 128, 128, 0.06);
}
.round-content {
  max-height: 3000px;
  overflow: hidden;
  transition: max-height 0.35s ease, opacity 0.25s ease;
  opacity: 1;
}
.round-content.collapsed {
  max-height: 0;
  opacity: 0;
}
</style>
