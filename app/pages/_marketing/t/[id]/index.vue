<script setup lang="ts">
import type { Tournament, Fixture, Standing, Participant, Sponsor, Social } from '~/types'
import { TournamentType, FixtureStatus, FixtureStage, ParticipantType } from '~/types'

definePageMeta({
  layout: 'widget'
})

const route = useRoute()
const tournamentId = route.params.id as string

// Theme (injected from widget layout)
const isDark = inject<Ref<boolean>>('widgetIsDark', ref(true))

// State
const tournament = ref<Tournament | null>(null)
const fixtures = ref<Fixture[]>([])
const standings = ref<Standing[]>([])
const participants = ref<Participant[]>([])
const sponsors = ref<Sponsor[]>([])
const socials = ref<Social[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
import MarketingFixtureDetails from '~/components/marketing/FixtureDetails.vue'
const activeTab = ref<'fixtures' | 'standings' | 'bracket' | 'info' | 'participants'>('fixtures')
const selectedFixtureId = ref<string | null>(null)

watch(activeTab, () => {
  selectedFixtureId.value = null
})

// Establish Live Stream connection to receive realtime push notifications
useLiveStream()

if (typeof window !== 'undefined') {
  window.addEventListener('live-match-update', (e: Event) => {
    const customEvent = e as CustomEvent
    const { type, data } = customEvent.detail

    if (type === 'fixture_updated') {
      const targetIdx = fixtures.value.findIndex((f) => f.id === data.id)
      if (targetIdx !== -1) {
        fixtures.value[targetIdx] = { ...fixtures.value[targetIdx], ...data }
      }
    }
  })
}

// Fetch data
async function fetchData() {
  loading.value = true
  error.value = null
  try {
    const [tournamentRes, fixturesRes, standingsRes, participantsRes, sponsorsRes, socialsRes] = await Promise.all([
      $publicApi<any>(`/tournaments/${tournamentId}`),
      $publicApi<any>(`/fixtures/tournaments/${tournamentId}`).catch(() => null),
      $publicApi<any>(`/standings/tournament/${tournamentId}`).catch(() => null),
      $publicApi<any>(`/participants/tournaments/${tournamentId}`).catch(() => null),
      $publicApi<any>(`/sponsors/tournaments/${tournamentId}`).catch(() => null),
      $publicApi<any>(`/socials/tournaments/${tournamentId}`).catch(() => null)
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
    
    // Handle participants
    const participantsData = participantsRes?.data || participantsRes
    if (Array.isArray(participantsData)) {
      participants.value = participantsData
    } else if (participantsData?.participants) {
      participants.value = participantsData.participants
    } else {
      participants.value = []
    }
    
    // Handle sponsors
    const sponsorsData = sponsorsRes?.data || sponsorsRes
    if (Array.isArray(sponsorsData)) {
      sponsors.value = sponsorsData
    } else if (sponsorsData?.sponsors) {
      sponsors.value = sponsorsData.sponsors
    } else {
      sponsors.value = []
    }
    
    // Handle socials
    const socialsData = socialsRes?.data || socialsRes
    if (Array.isArray(socialsData)) {
      socials.value = socialsData
    } else if (socialsData?.socials) {
      socials.value = socialsData.socials
    } else {
      socials.value = []
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

const isTeams = computed(() => tournament.value?.participantType === ParticipantType.TEAM)
const participantsTabName = computed(() => isTeams.value ? 'Teams' : 'Participants')

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
function formatTime24(dateStr?: string | null) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
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
function getTeamClass(fixture: Fixture, isHome: boolean, isDark: boolean) {
  if (fixture.status !== FixtureStatus.COMPLETED) return isDark ? 'text-gray-200 group-hover:text-white' : 'text-gray-800 group-hover:text-gray-900'
  const hs = fixture.homeScore ?? 0
  const as = fixture.awayScore ?? 0
  if (hs === as) return 'font-medium text-gray-500'
  const isWinner = isHome ? hs > as : as > hs
  return isWinner ? (isDark ? 'font-bold text-white' : 'font-bold text-gray-900') : 'font-medium text-gray-500'
}
function getScoreClass(fixture: Fixture, isHome: boolean, isDark: boolean) {
  if (fixture.status !== FixtureStatus.COMPLETED) return isDark ? 'text-white' : 'text-gray-900'
  const hs = fixture.homeScore ?? 0
  const as = fixture.awayScore ?? 0
  if (hs === as) return 'font-bold text-gray-500'
  const isWinner = isHome ? hs > as : as > hs
  return isWinner ? (isDark ? 'font-bold text-white' : 'font-bold text-gray-900') : 'font-bold text-gray-500'
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

          <div class="flex flex-col items-center text-center">
            <!-- Logo -->
            <div class="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden bg-white/10 backdrop-blur-md border border-white/20 flex-shrink-0 shadow-xl mb-4">
              <img v-if="tournament.logoUrl" :src="tournament.logoUrl" class="w-full h-full object-cover" />
              <span v-else class="flex items-center justify-center w-full h-full text-3xl font-bold text-white/60">
                {{ tournament.name.charAt(0).toUpperCase() }}
              </span>
            </div>

            <div class="max-w-2xl mx-auto flex flex-col items-center">
              <!-- Type Badge -->
              <span :class="['px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded border mb-3 inline-block', getTypeBadgeClasses(tournament.type)]">
                {{ formatType(tournament.type) }}
              </span>

              <!-- Name -->
              <h1 class="text-3xl md:text-5xl font-bold leading-tight mb-4" :class="isDark ? 'text-white' : 'text-gray-900'">
                {{ tournament.name }}
              </h1>

              <!-- Live Indicator (Optional, can keep it here if live) -->
              <div v-if="hasLiveFixtures" class="flex items-center gap-1.5 text-red-400 text-sm font-semibold">
                <span class="w-2 h-2 bg-red-400 rounded-full animate-pulse"></span>
                Live Now
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Tabs -->
      <section class="border-b sticky top-0 z-20 backdrop-blur-md transition-colors" :class="isDark ? 'border-white/10 bg-gray-950/95' : 'border-gray-200 bg-gray-50/95'">
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
            <button
              v-if="participants.length > 0"
              @click="activeTab = 'participants'"
              :class="[
                'px-5 py-3.5 text-sm font-medium border-b-2 transition-all duration-200',
                activeTab === 'participants'
                  ? 'text-emerald-400 border-emerald-400'
                  : 'text-gray-500 border-transparent hover:text-gray-300 hover:border-white/20'
              ]"
            >
              {{ participantsTabName }}
            </button>
            <button
              @click="activeTab = 'info'"
              :class="[
                'px-5 py-3.5 text-sm font-medium border-b-2 transition-all duration-200',
                activeTab === 'info'
                  ? 'text-emerald-400 border-emerald-400'
                  : 'text-gray-500 border-transparent hover:text-gray-300 hover:border-white/20'
              ]"
            >
              Info
            </button>
          </nav>
        </div>
      </section>

      <!-- Tab Content -->
      <section class="max-w-5xl mx-auto px-4 py-8 relative min-h-[500px]">
        
        <div v-if="selectedFixtureId" class="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <MarketingFixtureDetails 
            :tournamentId="tournamentId" 
            :fixtureId="selectedFixtureId" 
            @back="selectedFixtureId = null" 
          />
        </div>

        <div v-show="!selectedFixtureId" class="animate-in fade-in duration-300">
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

            <div v-for="round in sortedRounds" :key="round" :class="isDark ? 'bg-[#1a1a1a] border-white/[0.06]' : 'bg-white shadow-sm border-gray-100'" class="border rounded-xl overflow-hidden transition-colors">
              <!-- Round Header -->
              <button
                @click="toggleRound(round)"
                class="w-full flex items-center justify-between px-5 py-3 cursor-pointer select-none border-b"
                :class="collapsedRounds.has(round) ? 'border-transparent' : (isDark ? 'border-white/[0.06]' : 'border-gray-100')"
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
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                  <button
                    type="button"
                    @click="selectedFixtureId = fixture.id"
                    v-for="(fixture, i) in fixturesByRound[round]?.fixtures"
                    :key="fixture.id"
                    class="rounded-xl border overflow-hidden transition-all group flex flex-col text-left focus:outline-none focus:ring-2 focus:ring-emerald-500/50 w-full"
                    :class="isDark ? 'bg-[#1a1a1a] border-white/[0.08] hover:border-emerald-500/50' : 'bg-white border-gray-100 shadow-sm hover:border-emerald-500/30'"
                  >
                    <!-- Header -->
                    <div class="flex items-center justify-between px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wider border-b transition-colors" :class="isDark ? 'bg-[#1a1a1a] border-white/[0.06] text-gray-400' : 'bg-gray-50 border-gray-100 text-gray-500'">
                      <span>{{ fixture.group?.name || fixture.roundName || `Group ${round}` }}</span>
                      <div class="flex items-center gap-2">
                        <template v-if="fixture.status === FixtureStatus.LIVE">
                          <span class="text-[9px] font-semibold text-red-500 flex items-center gap-1">
                            <span class="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_4px_rgba(239,68,68,0.5)]"></span>
                            LIVE
                          </span>
                        </template>
                        <template v-else-if="fixture.status === FixtureStatus.COMPLETED">
                          <span>FT</span>
                        </template>
                        <template v-else-if="fixture.status === FixtureStatus.CANCELLED">
                          <span class="text-red-400">CANC</span>
                        </template>
                        <template v-else>
                          <span v-if="fixture.startTime" class="text-gray-500">{{ formatTime24(fixture.startTime) }}</span>
                          <span v-else class="text-gray-500">TBD</span>
                        </template>
                      </div>
                    </div>
                    
                    <!-- Body -->
                    <div class="flex items-center justify-between p-3.5 flex-1 gap-4">
                      <!-- Teams -->
                      <div class="flex flex-col gap-3 min-w-0 flex-1">
                        <!-- Home -->
                        <div class="flex items-center gap-2.5 min-w-0">
                          <div class="w-6 h-6 md:w-7 md:h-7 rounded-full overflow-hidden flex-shrink-0" :class="isDark ? 'bg-white/10' : 'bg-gray-100 ring-1 ring-gray-200'">
                            <img v-if="fixture.homeTeam?.logoUrl" :src="fixture.homeTeam.logoUrl" class="w-full h-full object-cover p-0.5" />
                            <span v-else class="flex items-center justify-center w-full h-full text-[9px] md:text-[10px] font-bold text-gray-500 uppercase">
                              {{ (fixture.homeTeam?.customName || fixture.homeTeamPlaceholder || 'TBD').charAt(0) }}
                            </span>
                          </div>
                          <span class="text-[13px] truncate transition-colors" :class="getTeamClass(fixture, true, isDark)">
                            {{ fixture.homeTeam?.customName || fixture.homeTeamPlaceholder || 'TBD' }}
                          </span>
                        </div>
                        
                        <!-- Away -->
                        <div class="flex items-center gap-2.5 min-w-0">
                          <div class="w-6 h-6 md:w-7 md:h-7 rounded-full overflow-hidden flex-shrink-0" :class="isDark ? 'bg-white/10' : 'bg-gray-100 ring-1 ring-gray-200'">
                            <img v-if="fixture.awayTeam?.logoUrl" :src="fixture.awayTeam.logoUrl" class="w-full h-full object-cover p-0.5" />
                            <span v-else class="flex items-center justify-center w-full h-full text-[9px] md:text-[10px] font-bold text-gray-500 uppercase">
                              {{ (fixture.awayTeam?.customName || fixture.awayTeamPlaceholder || 'TBD').charAt(0) }}
                            </span>
                          </div>
                          <span class="text-[13px] truncate transition-colors" :class="getTeamClass(fixture, false, isDark)">
                            {{ fixture.awayTeam?.customName || fixture.awayTeamPlaceholder || 'TBD' }}
                          </span>
                        </div>
                      </div>

                      <!-- Score -->
                      <div class="flex flex-col items-center justify-center pl-4 border-l min-w-[2rem]" :class="isDark ? 'border-white/[0.06]' : 'border-gray-100'">
                        <template v-if="fixture.status === FixtureStatus.LIVE || fixture.status === FixtureStatus.COMPLETED">
                          <div class="flex flex-col items-center gap-3">
                            <span class="text-[14px] leading-none transition-colors" :class="getScoreClass(fixture, true, isDark)">{{ fixture.homeScore ?? 0 }}</span>
                            <span class="text-[14px] leading-none transition-colors" :class="getScoreClass(fixture, false, isDark)">{{ fixture.awayScore ?? 0 }}</span>
                          </div>
                        </template>
                        <template v-else>
                          <div class="flex flex-col items-center gap-3 text-gray-600">
                            <span class="text-[13px] font-bold leading-none">-</span>
                            <span class="text-[13px] font-bold leading-none">-</span>
                          </div>
                        </template>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <!-- Knockout fixtures for hybrid -->
            <template v-if="isHybrid && knockoutFixtures.length > 0">
              <div class="flex items-center gap-2 px-1 mt-3 mb-1">
                <div class="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                <span class="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Knockout Stage</span>
              </div>

              <div v-for="round in knockoutRounds" :key="'ko-' + round" :class="isDark ? 'bg-[#1a1a1a] border-white/[0.06]' : 'bg-white shadow-sm border-gray-100'" class="border rounded-xl overflow-hidden transition-colors">
                <button
                  @click="toggleRound(round + 1000)"
                  class="w-full flex items-center justify-between px-5 py-3 cursor-pointer select-none border-b"
                  :class="collapsedRounds.has(round + 1000) ? 'border-transparent' : (isDark ? 'border-white/[0.06]' : 'border-gray-100')"
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
                  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                    <button
                      type="button"
                      @click="selectedFixtureId = fixture.id"
                      v-for="(fixture, i) in knockoutByRound[round]?.fixtures"
                      :key="fixture.id"
                      class="rounded-xl border overflow-hidden transition-all group flex flex-col text-left focus:outline-none focus:ring-2 focus:ring-emerald-500/50 w-full"
                      :class="isDark ? 'bg-[#1a1a1a] border-white/[0.08] hover:border-emerald-500/50' : 'bg-white border-gray-100 shadow-sm hover:border-emerald-500/30'"
                    >
                      <!-- Header -->
                      <div class="flex items-center justify-between px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wider border-b transition-colors" :class="isDark ? 'bg-[#1a1a1a] border-white/[0.06] text-gray-400' : 'bg-gray-50 border-gray-100 text-gray-500'">
                        <span>{{ fixture.group?.name || fixture.roundName || knockoutByRound[round]?.name || `Round ${round}` }}</span>
                        <div class="flex items-center gap-2">
                          <template v-if="fixture.status === FixtureStatus.LIVE">
                            <span class="text-[9px] font-semibold text-red-500 flex items-center gap-1">
                              <span class="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_4px_rgba(239,68,68,0.5)]"></span>
                              LIVE
                            </span>
                          </template>
                          <template v-else-if="fixture.status === FixtureStatus.COMPLETED">
                            <span>FT</span>
                          </template>
                          <template v-else-if="fixture.status === FixtureStatus.CANCELLED">
                            <span class="text-red-400">CANC</span>
                          </template>
                          <template v-else>
                            <span v-if="fixture.startTime" class="text-gray-500">{{ formatTime24(fixture.startTime) }}</span>
                            <span v-else class="text-gray-500">TBD</span>
                          </template>
                        </div>
                      </div>
                      
                      <!-- Body -->
                      <div class="flex items-center justify-between p-3.5 flex-1 gap-4">
                        <!-- Teams -->
                        <div class="flex flex-col gap-3 min-w-0 flex-1">
                          <!-- Home -->
                          <div class="flex items-center gap-2.5 min-w-0">
                            <div class="w-6 h-6 md:w-7 md:h-7 rounded-full overflow-hidden flex-shrink-0" :class="isDark ? 'bg-white/10' : 'bg-gray-100 ring-1 ring-gray-200'">
                              <img v-if="fixture.homeTeam?.logoUrl" :src="fixture.homeTeam.logoUrl" class="w-full h-full object-cover p-0.5" />
                              <span v-else class="flex items-center justify-center w-full h-full text-[9px] md:text-[10px] font-bold text-gray-500 uppercase">
                                {{ (fixture.homeTeam?.customName || fixture.homeTeamPlaceholder || 'TBD').charAt(0) }}
                              </span>
                            </div>
                            <span class="text-[13px] truncate transition-colors" :class="getTeamClass(fixture, true, isDark)">
                              {{ fixture.homeTeam?.customName || fixture.homeTeamPlaceholder || 'TBD' }}
                            </span>
                          </div>
                          
                          <!-- Away -->
                          <div class="flex items-center gap-2.5 min-w-0">
                            <div class="w-6 h-6 md:w-7 md:h-7 rounded-full overflow-hidden flex-shrink-0" :class="isDark ? 'bg-white/10' : 'bg-gray-100 ring-1 ring-gray-200'">
                              <img v-if="fixture.awayTeam?.logoUrl" :src="fixture.awayTeam.logoUrl" class="w-full h-full object-cover p-0.5" />
                              <span v-else class="flex items-center justify-center w-full h-full text-[9px] md:text-[10px] font-bold text-gray-500 uppercase">
                                {{ (fixture.awayTeam?.customName || fixture.awayTeamPlaceholder || 'TBD').charAt(0) }}
                              </span>
                            </div>
                            <span class="text-[13px] truncate transition-colors" :class="getTeamClass(fixture, false, isDark)">
                              {{ fixture.awayTeam?.customName || fixture.awayTeamPlaceholder || 'TBD' }}
                            </span>
                          </div>
                        </div>

                        <!-- Score -->
                        <div class="flex flex-col items-center justify-center pl-4 border-l min-w-[2rem]" :class="isDark ? 'border-white/[0.06]' : 'border-gray-100'">
                          <template v-if="fixture.status === FixtureStatus.LIVE || fixture.status === FixtureStatus.COMPLETED">
                            <div class="flex flex-col items-center gap-3">
                              <span class="text-[14px] leading-none transition-colors" :class="getScoreClass(fixture, true, isDark)">{{ fixture.homeScore ?? 0 }}</span>
                              <span class="text-[14px] leading-none transition-colors" :class="getScoreClass(fixture, false, isDark)">{{ fixture.awayScore ?? 0 }}</span>
                            </div>
                          </template>
                          <template v-else>
                            <div class="flex flex-col items-center gap-3 text-gray-600">
                              <span class="text-[13px] font-bold leading-none">-</span>
                              <span class="text-[13px] font-bold leading-none">-</span>
                            </div>
                          </template>
                        </div>
                      </div>
                    </button>
                  </div>
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
              <div :class="isDark ? 'bg-[#1a1a1a] border-white/[0.06]' : 'bg-white shadow-sm border-gray-100'" class="border rounded-xl overflow-hidden transition-colors">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b transition-colors" :class="isDark ? 'border-white/[0.06]' : 'border-gray-100'">
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
                      class="border-t transition-colors" :class="isDark ? 'border-white/[0.04] hover:bg-white/[0.02]' : 'border-gray-100 hover:bg-gray-50'"
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
                          <span class="text-[13px] font-medium truncate" :class="isDark ? 'text-gray-200' : 'text-gray-800'">{{ standing.participant?.customName || 'Unknown' }}</span>
                        </div>
                      </td>
                      <td class="text-center px-2 py-3 text-[13px] text-gray-400 hidden sm:table-cell">{{ standing.played }}</td>
                      <td class="text-center px-2 py-3 text-[13px] text-gray-400 hidden sm:table-cell">{{ standing.wins }}</td>
                      <td class="text-center px-2 py-3 text-[13px] text-gray-400 hidden sm:table-cell">{{ standing.draws }}</td>
                      <td class="text-center px-2 py-3 text-[13px] text-gray-400 hidden sm:table-cell">{{ standing.losses }}</td>
                      <td class="text-center px-2 py-3 text-[13px] hidden md:table-cell" :class="standing.goalDiff > 0 ? 'text-emerald-400' : standing.goalDiff < 0 ? 'text-red-400' : 'text-gray-500'">
                        {{ standing.goalDiff > 0 ? '+' : '' }}{{ standing.goalDiff }}
                      </td>
                      <td class="text-center px-4 py-3 text-[13px] font-bold" :class="isDark ? 'text-white' : 'text-gray-900'">{{ standing.points }}</td>
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
                  <button
                    type="button"
                    @click="selectedFixtureId = fixture.id"
                    v-for="fixture in bracketByRound[round]"
                    :key="fixture.id"
                    class="w-56 rounded-xl border overflow-hidden hover:border-emerald-500/30 transition-all group text-left focus:outline-none focus:ring-2 focus:ring-emerald-500/50" :class="isDark ? 'bg-gray-900 border-white/[0.08]' : 'bg-white border-gray-200 shadow-sm'"
                  >
                    <!-- Home -->
                    <div 
                      class="flex items-center justify-between px-3.5 py-2.5 border-b transition-colors" 
                      :class="[isDark ? 'border-white/[0.06]' : 'border-gray-100', getTeamClass(fixture, true, isDark)]"
                    >
                      <div class="flex items-center gap-2 flex-1 min-w-0">
                        <div class="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 transition-colors" :class="isDark ? 'bg-white/10' : 'bg-gray-100'">
                          <img v-if="fixture.homeTeam?.logoUrl" :src="fixture.homeTeam.logoUrl" class="w-full h-full object-cover" />
                          <span v-else class="flex items-center justify-center w-full h-full text-[8px] font-bold text-gray-500">
                            {{ (fixture.homeTeam?.customName || 'TBD').charAt(0) }}
                          </span>
                        </div>
                        <span class="text-xs truncate transition-colors" :class="isDark ? 'text-gray-200' : 'text-gray-800'">{{ fixture.homeTeam?.customName || 'TBD' }}</span>
                      </div>
                      <span 
                        class="text-sm font-bold min-w-[1.5rem] text-center"
                        :class="fixture.status === FixtureStatus.COMPLETED || fixture.status === FixtureStatus.LIVE ? 'text-white' : 'text-gray-600'"
                      >
                        {{ fixture.status === FixtureStatus.COMPLETED || fixture.status === FixtureStatus.LIVE ? (fixture.homeScore ?? 0) : '-' }}
                      </span>
                    </div>
                    <!-- Away -->
                    <div class="flex items-center justify-between px-3.5 py-2.5" :class="getTeamClass(fixture, false, isDark)">
                      <div class="flex items-center gap-2 flex-1 min-w-0">
                        <div class="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 transition-colors" :class="isDark ? 'bg-white/10' : 'bg-gray-100'">
                          <img v-if="fixture.awayTeam?.logoUrl" :src="fixture.awayTeam.logoUrl" class="w-full h-full object-cover" />
                          <span v-else class="flex items-center justify-center w-full h-full text-[8px] font-bold text-gray-500">
                            {{ (fixture.awayTeam?.customName || 'TBD').charAt(0) }}
                          </span>
                        </div>
                        <span class="text-xs truncate transition-colors" :class="isDark ? 'text-gray-200' : 'text-gray-800'">{{ fixture.awayTeam?.customName || 'TBD' }}</span>
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
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ====== PARTICIPANTS TAB ====== -->
        <div v-else-if="activeTab === 'participants'">
          <div v-if="participants.length === 0" class="text-center py-16">
            <p class="text-sm text-gray-500">No {{ participantsTabName.toLowerCase() }} available yet.</p>
          </div>
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="participant in participants"
              :key="participant.id"
              :class="isDark ? 'bg-[#1a1a1a] border-white/[0.06]' : 'bg-white shadow-sm border-gray-100'"
              class="border rounded-xl p-4 flex flex-col gap-4 transition-colors hover:border-emerald-500/30 group"
            >
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 transition-colors" :class="isDark ? 'bg-white/10' : 'bg-gray-100'">
                  <img v-if="participant.logoUrl" :src="participant.logoUrl" class="w-full h-full object-cover" />
                  <span v-else class="flex items-center justify-center w-full h-full text-lg font-bold text-gray-500">
                    {{ (participant.customName || 'P').charAt(0).toUpperCase() }}
                  </span>
                </div>
                <div class="flex-1 min-w-0">
                  <h4 class="text-base font-semibold truncate transition-colors" :class="isDark ? 'text-gray-200 group-hover:text-white' : 'text-gray-800 group-hover:text-gray-900'">
                    {{ participant.customName || 'Unknown' }}
                  </h4>
                </div>
              </div>

              <!-- Players List -->
              <div v-if="participant.players && participant.players.length > 0" class="mt-2 pt-3 border-t transition-colors" :class="isDark ? 'border-white/[0.06]' : 'border-gray-100'">
                <h5 class="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Players</h5>
                <div class="space-y-1.5 flex flex-col">
                  <div
                    v-for="player in participant.players"
                    :key="player.id"
                    class="flex items-center justify-between py-1 px-2 rounded-lg transition-colors"
                    :class="isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-gray-50'"
                  >
                    <div class="flex items-center gap-2">
                      <div v-if="player.number != null" class="w-5 h-5 flex items-center justify-center rounded bg-gray-500/10 text-xs font-bold text-gray-500">
                        {{ player.number }}
                      </div>
                      <span class="text-sm font-medium" :class="isDark ? 'text-gray-300' : 'text-gray-700'">{{ player.name }}</span>
                    </div>
                    <div v-if="player.position" class="text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider bg-gray-500/10 text-gray-500">
                      {{ player.position }}
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="mt-2 pt-3 border-t transition-colors" :class="isDark ? 'border-white/[0.06]' : 'border-gray-100'">
                <p class="text-[12px] text-gray-500 italic">No players available</p>
              </div>
            </div>
          </div>
        </div>

        <!-- ====== INFO TAB ====== -->
        <div v-else-if="activeTab === 'info'" class="">
          <div class="flex flex-col gap-6">
            <div :class="isDark ? 'bg-[#1a1a1a] border-white/[0.06]' : 'bg-white border-gray-200 shadow-sm'" class="border rounded-xl overflow-hidden">
              <div class="px-5 py-3.5 border-b transition-colors" :class="isDark ? 'border-white/[0.06]' : 'border-gray-100'">
                <h3 class="text-[12px] font-semibold uppercase tracking-wider text-gray-400">Tournament Info</h3>
              </div>
              <div class="divide-y transition-colors" :class="isDark ? 'divide-white/[0.04]' : 'divide-gray-100'">
                <div class="flex items-center justify-between px-5 py-3">
                  <span class="text-sm text-gray-500">Dates</span>
                  <span class="text-sm transition-colors" :class="isDark ? 'text-gray-200' : 'text-gray-800'">{{ formatDate(tournament.start_date) }} — {{ formatDate(tournament.end_date) }}</span>
                </div>
                <div class="flex items-center justify-between px-5 py-3">
                  <span class="text-sm text-gray-500">Sport</span>
                  <span class="text-sm transition-colors capitalize" :class="isDark ? 'text-gray-200' : 'text-gray-800'">{{ tournament.sport }}</span>
                </div>
                <div class="flex items-center justify-between px-5 py-3">
                  <span class="text-sm text-gray-500">Type</span>
                  <span class="text-sm transition-colors" :class="isDark ? 'text-gray-200' : 'text-gray-800'">{{ formatType(tournament.type) }}</span>
                </div>
                <div v-if="tournament.location" class="flex items-center justify-between px-5 py-3">
                  <span class="text-sm text-gray-500">Location</span>
                  <span class="text-sm transition-colors" :class="isDark ? 'text-gray-200' : 'text-gray-800'">{{ tournament.location }}</span>
                </div>
              </div>
            </div>

            <div v-if="tournament.description || (socials && socials.length > 0)" :class="isDark ? 'bg-[#1a1a1a] border-white/[0.06]' : 'bg-white border-gray-200 shadow-sm'" class="border rounded-xl overflow-hidden">
              <div class="px-5 py-3.5 border-b transition-colors flex items-center justify-between" :class="isDark ? 'border-white/[0.06]' : 'border-gray-100'">
                <h3 class="text-[12px] font-semibold uppercase tracking-wider text-gray-400">About</h3>
                
                <!-- Socials in Header -->
                <div v-if="socials && socials.length > 0" class="flex items-center gap-3">
                  <a
                    v-for="social in socials"
                    :key="social.id"
                    :href="social.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-gray-400 hover:text-emerald-400 transition-colors tooltip"
                    :title="social.handle || social.platform"
                  >
                    <UIcon v-if="social.platform === 'twitter'" name="i-simple-icons-x" class="w-4 h-4" />
                    <UIcon v-else-if="social.platform === 'instagram'" name="i-simple-icons-instagram" class="w-4 h-4" />
                    <UIcon v-else-if="social.platform === 'facebook'" name="i-simple-icons-facebook" class="w-4 h-4" />
                    <UIcon v-else-if="social.platform === 'youtube'" name="i-simple-icons-youtube" class="w-4 h-4" />
                    <UIcon v-else-if="social.platform === 'tiktok'" name="i-simple-icons-tiktok" class="w-4 h-4" />
                    <UIcon v-else-if="social.platform === 'discord'" name="i-simple-icons-discord" class="w-4 h-4" />
                    <UIcon v-else-if="social.platform === 'twitch'" name="i-simple-icons-twitch" class="w-4 h-4" />
                    <UIcon v-else name="i-heroicons-globe-alt" class="w-4 h-4" />
                  </a>
                </div>
              </div>
              <div v-if="tournament.description" class="p-5">
                <p class="text-sm leading-relaxed whitespace-pre-line" :class="isDark ? 'text-gray-300' : 'text-gray-600'">
                  {{ tournament.description }}
                </p>
              </div>
            </div>

            <div v-if="sponsors && sponsors.length > 0" :class="isDark ? 'bg-[#1a1a1a] border-white/[0.06]' : 'bg-white border-gray-200 shadow-sm'" class="border rounded-xl overflow-hidden mt-6">
              <div class="px-5 py-3.5 border-b transition-colors flex items-center gap-2" :class="isDark ? 'border-white/[0.06]' : 'border-gray-100'">
                <UIcon name="i-heroicons-building-office-2" class="w-4 h-4 text-gray-400" />
                <h3 class="text-[12px] font-semibold uppercase tracking-wider text-gray-400">Sponsors</h3>
              </div>
              <div class="p-8 flex flex-wrap justify-center items-center gap-8 sm:gap-12 md:gap-16">
                <template v-for="sponsor in sponsors" :key="sponsor.id">
                  <component
                    :is="sponsor.websiteUrl ? 'a' : 'div'"
                    :href="sponsor.websiteUrl || undefined"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="group flex flex-col items-center justify-center transition-transform duration-300"
                    :class="[sponsor.websiteUrl ? 'cursor-pointer hover:scale-105' : '']"
                  >
                    <div class="h-16 sm:h-20 lg:h-24 max-w-[160px] sm:max-w-[200px] flex items-center justify-center mb-0">
                      <img v-if="sponsor.logoUrl" :src="sponsor.logoUrl" :alt="sponsor.name" class="w-full h-full object-contain filter " :class="isDark ? 'brightness-90 group-hover:brightness-100 transition-all' : ''" />
                      <span v-else class="text-xl font-bold text-gray-400">{{ sponsor.name }}</span>
                    </div>
                  </component>
                </template>
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
