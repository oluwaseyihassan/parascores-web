<script setup lang="ts">
import type { Tournament, Fixture } from '~/types'
import { FixtureStatus, FixtureStage, TournamentType } from '~/types'

definePageMeta({
  layout: 'widget'
})

const route = useRoute()
const tournamentId = route.params.tournamentId as string
const limit = parseInt(route.query.limit as string) || 50

// Theme (injected from widget layout)
const isDark = inject<Ref<boolean>>('widgetIsDark', ref(true))

// State
const tournament = ref<Tournament | null>(null)
const fixtures = ref<Fixture[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

// Connect to Live Stream SSE for the widget
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
const fetchData = async () => {
  loading.value = true
  error.value = null
  try {
    const tournamentRes = await $api<any>(`/tournaments/${tournamentId}`)
    tournament.value = tournamentRes.data
    
    if (tournament.value?.id) {
      const fixturesRes = await $api<any>(`/fixtures/tournaments/${tournament.value.id}`)
      
      // Handle API response: may be { rounds: [...] } or flat array
      const fixturesData = fixturesRes.data
      let allFixtures: Fixture[] = []
      if (fixturesData?.rounds) {
        allFixtures = fixturesData.rounds.flatMap((r: any) => r.fixtures || [])
      } else if (Array.isArray(fixturesData)) {
        allFixtures = fixturesData
      }
      fixtures.value = allFixtures.slice(0, limit)
    }
  } catch (e: any) {
    error.value = e.message || 'Failed to load tournament data'
    console.error('Widget error:', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})

// Group fixtures by stage then round (for hybrid tournaments)
const isHybrid = computed(() => tournament.value?.type === TournamentType.HYBRID)

const groupStageFixtures = computed(() => 
  fixtures.value.filter(f => f.stage === FixtureStage.GROUP_STAGE)
)
const knockoutStageFixtures = computed(() => 
  fixtures.value.filter(f => f.stage === FixtureStage.KNOCKOUT)
)

const groupedByRound = computed(() => {
  const source = isHybrid.value ? groupStageFixtures.value : fixtures.value
  return groupFixturesByRound(source)
})

const knockoutGroupedByRound = computed(() => {
  return groupFixturesByRound(knockoutStageFixtures.value)
})

function groupFixturesByRound(list: Fixture[]) {
  const grouped: Record<number, { name: string; fixtures: Fixture[] }> = {}
  for (const fixture of list) {
    const round = fixture.round || 1
    if (!grouped[round]) {
      grouped[round] = {
        name: fixture.roundName || `Round ${round}`,
        fixtures: []
      }
    }
    grouped[round].fixtures.push(fixture)
  }
  return grouped
}

const sortedRounds = computed(() => {
  return Object.keys(groupedByRound.value).map(Number).sort((a, b) => a - b)
})

const sortedKnockoutRounds = computed(() => {
  return Object.keys(knockoutGroupedByRound.value).map(Number).sort((a, b) => a - b)
})

const hasLiveFixtures = computed(() => fixtures.value.some(f => f.status === FixtureStatus.LIVE))

// Collapsible rounds
const collapsedRounds = ref<Set<number>>(new Set())
function toggleRound(round: number) {
  const s = new Set(collapsedRounds.value)
  if (s.has(round)) s.delete(round)
  else s.add(round)
  collapsedRounds.value = s
}

// Format time from startTime
function formatTime(dateStr?: string | null) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

// Format date for round headers
function formatDate(dateStr?: string | null) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
</script>

<template>
  <div class="max-w-xl mx-auto px-2 py-4">
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-16">
      <div class="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-16 text-red-400">
      <p class="text-sm">{{ error }}</p>
    </div>

    <!-- Content -->
    <div v-else>
      <!-- Tournament Header -->
      <div :class="isDark ? 'bg-[#1a1a1a]' : 'bg-white shadow-sm'" class="rounded-xl mb-4 overflow-hidden">
        <div class="flex items-center gap-3 px-4 py-3.5">
          <div :class="isDark ? 'bg-gray-800' : 'bg-gray-100'" class="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
            <img v-if="tournament?.logoUrl" :src="tournament.logoUrl" class="w-full h-full object-cover" />
            <span v-else class="flex items-center justify-center w-full h-full text-xs font-bold text-gray-500">
              {{ (tournament?.name || 'T').charAt(0) }}
            </span>
          </div>
          <div class="flex-1 min-w-0">
            <h2 :class="isDark ? 'text-white' : 'text-gray-900'" class="text-[15px] font-bold truncate">{{ tournament?.name }}</h2>
            <p class="text-[11px] text-gray-500">
              {{ tournament?.type?.replace(/_/g, ' ') }} · {{ fixtures.length }} fixtures
              <span v-if="hasLiveFixtures" class="ml-1 text-red-400 inline-flex items-center gap-1">
                <span class="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse inline-block"></span>
                Live
              </span>
            </p>
          </div>
        </div>
      </div>

      <!-- Fixtures grouped by round -->
      <div v-if="fixtures.length > 0" class="space-y-3">
        <!-- Group Stage label for hybrid -->
        <div v-if="isHybrid && groupStageFixtures.length > 0" class="flex items-center gap-2 px-1">
          <div class="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
          <span class="text-[11px] font-semibold uppercase tracking-wider" :class="isDark ? 'text-gray-400' : 'text-gray-500'">Group Stage</span>
        </div>

        <div v-for="round in sortedRounds" :key="round" :class="isDark ? 'bg-[#1a1a1a]' : 'bg-white shadow-sm'" class="rounded-xl overflow-hidden">
          <!-- Round Header (clickable) -->
          <button
            @click="toggleRound(round)"
            :class="[isDark ? 'border-white/[0.06]' : 'border-gray-100', collapsedRounds.has(round) ? 'border-b-0' : 'border-b']"
            class="w-full flex items-center justify-between px-4 py-2.5 cursor-pointer select-none"
          >
            <h3 :class="isDark ? 'text-gray-400' : 'text-gray-500'" class="text-[12px] font-semibold uppercase tracking-wide">
              {{ groupedByRound[round]?.name }}
            </h3>
            <svg
              class="w-3.5 h-3.5 transition-transform duration-200"
              :class="[collapsedRounds.has(round) ? '-rotate-90' : 'rotate-0', isDark ? 'text-gray-500' : 'text-gray-400']"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <!-- Fixtures in this round (collapsible) -->
          <div
            class="round-content"
            :class="{ collapsed: collapsedRounds.has(round) }"
          >
            <div
              v-for="(fixture, i) in groupedByRound[round]?.fixtures"
              :key="fixture.id"
              class="fixture-row"
              :class="{ [isDark ? 'border-t border-white/[0.06]' : 'border-t border-gray-100']: i > 0 }"
            >
              <div class="flex items-center px-4 py-3">
                <!-- Home Team -->
                <div class="flex-1 flex items-center justify-end gap-2.5 min-w-0">
                  <span :class="isDark ? 'text-gray-200' : 'text-gray-800'" class="text-[13px] font-medium truncate text-right">
                    {{ fixture.homeTeam?.customName || fixture.homeTeamPlaceholder || 'TBD' }}
                  </span>
                  <div :class="isDark ? 'bg-gray-800' : 'bg-gray-100'" class="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                    <img v-if="fixture.homeTeam?.logoUrl" :src="fixture.homeTeam.logoUrl" class="w-full h-full object-cover" />
                    <span v-else class="flex items-center justify-center w-full h-full text-[10px] font-bold text-gray-500">
                      {{ (fixture.homeTeam?.customName || 'H').charAt(0) }}
                    </span>
                  </div>
                </div>

                <!-- Center: Score or Time -->
                <div class="w-20 flex-shrink-0 flex flex-col items-center justify-center mx-2">
                  <!-- Live -->
                  <template v-if="fixture.status === FixtureStatus.LIVE">
                    <div class="flex items-center gap-1.5">
                      <span :class="isDark ? 'text-white' : 'text-gray-900'" class="text-base font-bold">{{ fixture.homeScore ?? 0 }}</span>
                      <span class="text-[10px] text-gray-600">-</span>
                      <span class="text-base font-bold text-white">{{ fixture.awayScore ?? 0 }}</span>
                    </div>
                    <span class="text-[9px] font-semibold text-red-400 mt-0.5 flex items-center gap-1">
                      <span class="w-1 h-1 bg-red-400 rounded-full animate-pulse"></span>
                      LIVE
                    </span>
                  </template>
                  <!-- Completed -->
                  <template v-else-if="fixture.status === FixtureStatus.COMPLETED">
                    <div class="flex items-center gap-1.5">
                      <span :class="isDark ? 'text-white' : 'text-gray-900'" class="text-base font-bold">{{ fixture.homeScore ?? 0 }}</span>
                      <span class="text-[10px] text-gray-600">-</span>
                      <span :class="isDark ? 'text-white' : 'text-gray-900'" class="text-base font-bold">{{ fixture.awayScore ?? 0 }}</span>
                    </div>
                    <span class="text-[9px] font-medium text-gray-500 mt-0.5">FT</span>
                  </template>
                  <!-- Cancelled -->
                  <template v-else-if="fixture.status === FixtureStatus.CANCELLED">
                    <span class="text-[10px] font-medium text-gray-600">CANC</span>
                  </template>
                  <!-- Scheduled / Default -->
                  <template v-else>
                    <span v-if="fixture.startTime" :class="isDark ? 'text-gray-300' : 'text-gray-700'" class="text-[13px] font-semibold">
                      {{ formatTime(fixture.startTime) }}
                    </span>
                    <span v-else class="text-[11px] font-medium text-gray-500">vs</span>
                  </template>
                </div>

                <!-- Away Team -->
                <div class="flex-1 flex items-center gap-2.5 min-w-0">
                  <div :class="isDark ? 'bg-gray-800' : 'bg-gray-100'" class="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                    <img v-if="fixture.awayTeam?.logoUrl" :src="fixture.awayTeam.logoUrl" class="w-full h-full object-cover" />
                    <span v-else class="flex items-center justify-center w-full h-full text-[10px] font-bold text-gray-500">
                      {{ (fixture.awayTeam?.customName || 'A').charAt(0) }}
                    </span>
                  </div>
                  <span :class="isDark ? 'text-gray-200' : 'text-gray-800'" class="text-[13px] font-medium truncate">
                    {{ fixture.awayTeam?.customName || fixture.awayTeamPlaceholder || 'TBD' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Knockout Stage for hybrid tournaments -->
        <template v-if="isHybrid && knockoutStageFixtures.length > 0">
          <div class="flex items-center gap-2 px-1 mt-2">
            <div class="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
            <span class="text-[11px] font-semibold uppercase tracking-wider" :class="isDark ? 'text-gray-400' : 'text-gray-500'">Knockout Stage</span>
          </div>

          <div v-for="round in sortedKnockoutRounds" :key="'ko-' + round" :class="isDark ? 'bg-[#1a1a1a]' : 'bg-white shadow-sm'" class="rounded-xl overflow-hidden">
            <button
              @click="toggleRound(round + 1000)"
              :class="[isDark ? 'border-white/[0.06]' : 'border-gray-100', collapsedRounds.has(round + 1000) ? 'border-b-0' : 'border-b']"
              class="w-full flex items-center justify-between px-4 py-2.5 cursor-pointer select-none"
            >
              <h3 :class="isDark ? 'text-gray-400' : 'text-gray-500'" class="text-[12px] font-semibold uppercase tracking-wide">
                {{ knockoutGroupedByRound[round]?.name }}
              </h3>
              <svg
                class="w-3.5 h-3.5 transition-transform duration-200"
                :class="[collapsedRounds.has(round + 1000) ? '-rotate-90' : 'rotate-0', isDark ? 'text-gray-500' : 'text-gray-400']"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div
              class="round-content"
              :class="{ collapsed: collapsedRounds.has(round + 1000) }"
            >
              <div
                v-for="(fixture, i) in knockoutGroupedByRound[round]?.fixtures"
                :key="fixture.id"
                class="fixture-row"
                :class="{ [isDark ? 'border-t border-white/[0.06]' : 'border-t border-gray-100']: i > 0 }"
              >
                <div class="flex items-center px-4 py-3">
                  <div class="flex-1 flex items-center justify-end gap-2.5 min-w-0">
                    <span :class="isDark ? 'text-gray-200' : 'text-gray-800'" class="text-[13px] font-medium truncate text-right">
                      {{ fixture.homeTeam?.customName || fixture.homeTeamPlaceholder || 'TBD' }}
                    </span>
                    <div :class="isDark ? 'bg-gray-800' : 'bg-gray-100'" class="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                      <img v-if="fixture.homeTeam?.logoUrl" :src="fixture.homeTeam.logoUrl" class="w-full h-full object-cover" />
                      <span v-else class="flex items-center justify-center w-full h-full text-[10px] font-bold text-gray-500">
                        {{ (fixture.homeTeam?.customName || 'H').charAt(0) }}
                      </span>
                    </div>
                  </div>

                  <div class="w-20 flex-shrink-0 flex flex-col items-center justify-center mx-2">
                    <template v-if="fixture.status === FixtureStatus.LIVE">
                      <div class="flex items-center gap-1.5">
                        <span :class="isDark ? 'text-white' : 'text-gray-900'" class="text-base font-bold">{{ fixture.homeScore ?? 0 }}</span>
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
                        <span :class="isDark ? 'text-white' : 'text-gray-900'" class="text-base font-bold">{{ fixture.homeScore ?? 0 }}</span>
                        <span class="text-[10px] text-gray-600">-</span>
                        <span :class="isDark ? 'text-white' : 'text-gray-900'" class="text-base font-bold">{{ fixture.awayScore ?? 0 }}</span>
                      </div>
                      <span class="text-[9px] font-medium text-gray-500 mt-0.5">FT</span>
                    </template>
                    <template v-else-if="fixture.status === FixtureStatus.CANCELLED">
                      <span class="text-[10px] font-medium text-gray-600">CANC</span>
                    </template>
                    <template v-else>
                      <span v-if="fixture.startTime" :class="isDark ? 'text-gray-300' : 'text-gray-700'" class="text-[13px] font-semibold">
                        {{ formatTime(fixture.startTime) }}
                      </span>
                      <span v-else class="text-[11px] font-medium text-gray-500">vs</span>
                    </template>
                  </div>

                  <div class="flex-1 flex items-center gap-2.5 min-w-0">
                    <div :class="isDark ? 'bg-gray-800' : 'bg-gray-100'" class="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                      <img v-if="fixture.awayTeam?.logoUrl" :src="fixture.awayTeam.logoUrl" class="w-full h-full object-cover" />
                      <span v-else class="flex items-center justify-center w-full h-full text-[10px] font-bold text-gray-500">
                        {{ (fixture.awayTeam?.customName || 'A').charAt(0) }}
                      </span>
                    </div>
                    <span :class="isDark ? 'text-gray-200' : 'text-gray-800'" class="text-[13px] font-medium truncate">
                      {{ fixture.awayTeam?.customName || fixture.awayTeamPlaceholder || 'TBD' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Empty state -->
      <div v-if="fixtures.length === 0" class="text-center py-16">
        <p class="text-sm text-gray-500">No fixtures found for this tournament.</p>
      </div>
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
  max-height: 2000px;
  overflow: hidden;
  transition: max-height 0.35s ease, opacity 0.25s ease;
  opacity: 1;
}
.round-content.collapsed {
  max-height: 0;
  opacity: 0;
}
</style>
